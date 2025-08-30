/**
 * DBLP网站处理器
 * 继承自BaseSiteHandler，消除重复代码
 */

import BaseSiteHandler from './BaseSiteHandler.js';
import ccfData from './CCFData.js';

class DBLPSiteHandler extends BaseSiteHandler {
    constructor() {
        super();
        this.currentUrl = window.location.pathname;
    }

    run() {
        if (this.currentUrl.includes('/pid/')) {
            this.appendRanks();
        } else if (this.currentUrl.includes('/db/')) {
            if (this.currentUrl.includes('/index.html')) {
                this.appendRank('h1');
            } else {
                this.appendRank('#breadcrumbs > ul > li > span:nth-child(3) > a > span');
            }
        } else {
            this.setupSearchResultsHandler();
        }
    }

    setupSearchResultsHandler() {
        // 等待搜索结果加载完成
        const checkInterval = setInterval(() => {
            const waitingMessage = document.querySelector('#completesearch-publs > div > p.waiting');
            if (waitingMessage && waitingMessage.style.display === 'none') {
                clearInterval(checkInterval);

                // 绑定popstate事件
                window.addEventListener('popstate', () => {
                    this.appendRanks();
                });

                this.appendRanks();
            }
        }, 700);
    }

    appendRanks() {
        const elements = document.querySelectorAll('cite > a');
        this.processElements(elements, (element) => {
            this.processCitationElement(element);
        });
    }

    processCitationElement(element) {
        const source = element.getAttribute('href');
        if (!source || this.isProcessed(element)) return;

        // 尝试从issue number获取缩写
        const issueSpan = element.querySelector('span[itemprop=issueNumber]');
        if (issueSpan && issueSpan.textContent && isNaN(issueSpan.textContent)) {
            const rankInfo = ccfData.getRankByAbbr(issueSpan.textContent);
            if (rankInfo) {
                this.appendRankInfo(element, rankInfo);
                return;
            }
        }

        // 从URL获取会议信息
        const urlPath = this.extractUrlPath(source);
        if (urlPath) {
            const rankInfo = ccfData.getRankByUrl(urlPath);
            if (rankInfo) {
                this.appendRankInfo(element, rankInfo);
            }
        }
    }

    extractUrlPath(source) {
        if (!source.includes('/db/')) return null;

        let urlPath = source.substring(
            source.indexOf('/db/') + 3,
            source.lastIndexOf('.html')
        );

        // 移除年份等后缀
        const yearPattern = /[0-9]{1,4}(-[0-9]{1,4})?$/;
        if (yearPattern.test(urlPath)) {
            urlPath = urlPath.replace(yearPattern, '');
        }

        return urlPath;
    }

    appendRank(selector) {
        const element = document.querySelector(selector);
        if (!element) return;

        const urlPath = this.extractUrlPathFromHeadline();
        if (urlPath) {
            const rankInfo = ccfData.getRankByUrl(urlPath);
            if (rankInfo) {
                this.appendRankInfo(element, rankInfo);
            }
        }
    }

    extractUrlPathFromHeadline() {
        const headline = window.location.pathname;
        if (!headline.includes('/db/')) return null;

        return headline.substring(
            headline.indexOf('/db/') + 3,
            headline.lastIndexOf('/')
        );
    }
}

export default DBLPSiteHandler;
