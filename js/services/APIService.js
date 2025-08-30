/**
 * API服务 - 统一处理DBLP API调用
 * 重构原有的fetchRank.js，消除重复逻辑
 */

import ccfData from '../core/CCFData.js';
import apiCache from './CacheService.js';

// PACM PL会议映射 - 集中配置
const PACM_PL_CONFERENCE_MAP = {
    "oopsla": "/conf/oopsla/oopsla",
    "oopsla1": "/conf/oopsla/oopsla",
    "oopsla2": "/conf/oopsla/oopsla",
    "popl": "/conf/popl/popl",
    "pldi": "/conf/pldi/pldi",
    "icfp": "/conf/icfp/icfp"
};

/**
 * 处理PACM PL期刊的特殊情况
 * @param {Object} resp - API响应
 * @returns {string} 会议URL
 */
function processPacmPlJournal(resp) {
    let number = "";

    // 查找有效的number字段
    for (let i = 0; i < resp["@sent"]; i++) {
        const hitNumber = resp.hit[i]?.info?.number;
        if (hitNumber) {
            number = hitNumber.toString().toLowerCase();
            break;
        }
    }

    // 使用集中配置映射
    return PACM_PL_CONFERENCE_MAP[number] || "/journals/pacmpl/pacmpl";
}

/**
 * 从缓存获取排名信息
 * @param {Object} cached - 缓存数据
 * @param {HTMLElement} node - 目标节点
 * @param {string} title - 论文标题
 * @param {string} author - 作者
 * @param {string} year - 年份
 * @param {Object} site - 网站处理器
 */
function fetchFromCache(cached, node, title, author, year, site) {
    console.debug('fetch from cache: %s (%s) "%s"', author, year, title);

    const { dblp_url, resp, flag } = cached;

    if (typeof dblp_url === "undefined" && flag !== false) {
        // 处理缩写情况
        const dblp_abbr = resp.hit[0]?.info?.number || resp.hit[0]?.info?.venue;
        if (dblp_abbr && isNaN(dblp_abbr)) {
            const rankInfo = ccfData.getRankByAbbr(dblp_abbr);
            if (rankInfo) {
                site.appendRankInfo(node, rankInfo);
            }
        }
    } else if (dblp_url === "/journals/pacmpl/pacmpl") {
        // 处理PACM PL会议
        const conferenceUrl = processPacmPlJournal(resp);
        const rankInfo = ccfData.getRankByUrl(conferenceUrl);
        if (rankInfo) {
            site.appendRankInfo(node, rankInfo);
        }
    } else if (dblp_url) {
        // 正常URL情况
        const rankInfo = ccfData.getRankByUrl(dblp_url);
        if (rankInfo) {
            site.appendRankInfo(node, rankInfo);
        }
    }
}

/**
 * 从DBLP API获取排名信息
 * @param {string} query_url - 查询URL
 * @param {HTMLElement} node - 目标节点
 * @param {string} title - 论文标题
 * @param {string} author - 作者
 * @param {string} year - 年份
 * @param {Object} site - 网站处理器
 */
function fetchFromDblpApi(query_url, node, title, author, year, site) {
    console.debug('fetch from API: %s (%s) "%s"', author, year, title);
    console.debug("query url: %s", query_url);

    const xhr = new XMLHttpRequest();
    xhr.open("GET", query_url, true);

    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
            try {
                const response = JSON.parse(xhr.responseText);
                const resp = response.result.hits;

                if (resp["@total"] === 0) {
                    // 没有找到结果
                    return;
                }

                let dblp_url = "";
                let resp_flag = true;

                if (resp["@total"] === 1) {
                    // 只有一个结果
                    const url = resp.hit[0].info.url;
                    dblp_url = url.substring(
                        url.indexOf("/rec/") + 4,
                        url.lastIndexOf("/")
                    );
                } else {
                    // 多个结果，需要匹配
                    dblp_url = findBestMatch(resp, author, year);
                }

                // 转换为排名数据库URL
                dblp_url = ccfData.getRankByUrl(dblp_url)?.url || dblp_url;

                // 缓存结果
                apiCache.setItem(query_url, {
                    dblp_url,
                    resp,
                    flag: resp_flag
                });

                // 处理结果
                if (typeof dblp_url === "undefined" && resp_flag !== false) {
                    // 处理缩写情况
                    const dblp_abbr = resp.hit[0]?.info?.number || resp.hit[0]?.info?.venue;
                    if (dblp_abbr && isNaN(dblp_abbr)) {
                        const rankInfo = ccfData.getRankByAbbr(dblp_abbr);
                        if (rankInfo) {
                            site.appendRankInfo(node, rankInfo);
                        }
                    }
                } else if (dblp_url === "/journals/pacmpl/pacmpl") {
                    // 处理PACM PL会议
                    const conferenceUrl = processPacmPlJournal(resp);
                    const rankInfo = ccfData.getRankByUrl(conferenceUrl);
                    if (rankInfo) {
                        site.appendRankInfo(node, rankInfo);
                    }
                } else if (dblp_url) {
                    // 正常URL情况
                    const rankInfo = ccfData.getRankByUrl(dblp_url);
                    if (rankInfo) {
                        site.appendRankInfo(node, rankInfo);
                    }
                }
            } catch (error) {
                console.error('Error parsing API response:', error);
            }
        }
    };

    xhr.send();
}

/**
 * 在多个结果中找到最佳匹配
 * @param {Object} resp - API响应
 * @param {string} author - 作者
 * @param {string} year - 年份
 * @returns {string} 最佳匹配的URL
 */
function findBestMatch(resp, author, year) {
    let dblp_url = "";
    let year_last_check = 0;

    for (let h = 0; h < resp["@sent"]; h++) {
        const info = resp.hit[h].info;

        // 跳过非正式出版物
        if (info.type === "Informal Publications") continue;

        // 获取第一作者
        let author_1st = "";
        if (Array.isArray(info.authors.author)) {
            author_1st = info.authors.author[0].text;
        } else {
            author_1st = info.authors.author.text;
        }

        const year_fuzzy = info.year;

        // 年份匹配（允许1年误差）
        if (Math.abs(Number(year) - year_fuzzy) <= 1 &&
            year_fuzzy !== year_last_check) {

            year_last_check = year_fuzzy;
            const url = info.url;
            const dblp_url_last_check = url.substring(
                url.indexOf("/rec/") + 4,
                url.lastIndexOf("/")
            );

            if (year_fuzzy === Number(year) + 1) {
                dblp_url = dblp_url_last_check;
            } else if (year_fuzzy === Number(year)) {
                dblp_url = dblp_url_last_check;
                break;
            } else {
                if (dblp_url === "") {
                    dblp_url = dblp_url_last_check;
                }
            }
        }
    }

    return dblp_url;
}

/**
 * 获取论文排名信息
 * @param {HTMLElement} node - 目标节点
 * @param {string} title - 论文标题
 * @param {string} author - 作者
 * @param {string} year - 年份
 * @param {Object} site - 网站处理器
 */
export function fetchRankFromAPI(node, title, author, year, site) {
    const manifest = chrome.runtime.getManifest();
    const version = manifest.version;

    const query_url = `https://dblp.org/search/publ/api?q=${encodeURIComponent(title + "  author:" + author)}&format=json&app=CCFrank4dblp_${version}`;

    // 检查缓存
    const cached = apiCache.getItem(query_url);
    if (cached) {
        fetchFromCache(cached, node, title, author, year, site);
    } else {
        fetchFromDblpApi(query_url, node, title, author, year, site);
    }
}
