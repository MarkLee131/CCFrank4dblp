/**
 * CCF管理器 - 统一处理排名显示逻辑
 * 重构原有的ccf.js，提供更清晰的API
 */

import ccfData from './CCFData.js';

class CCFManager {
    constructor() {
        this.rankSpanList = [];
    }

    /**
     * 添加排名显示函数
     * @param {Function} getRankSpan - 排名显示函数
     */
    addRankSpanFunction(getRankSpan) {
        this.rankSpanList.push(getRankSpan);
    }

    /**
     * 获取排名信息
     * @param {string} refine - 搜索关键词
     * @param {string} type - 搜索类型 ('url', 'abbr', 'meeting', 'full')
     * @returns {Object} 排名信息
     */
    getRankInfo(refine, type) {
        if (!refine) {
            return this._createRankInfo('none', 'Not Found');
        }

        let rankInfo = null;

        switch (type) {
            case 'url':
                rankInfo = ccfData.getRankByUrl(refine);
                break;
            case 'abbr':
                rankInfo = ccfData.getRankByAbbr(refine);
                break;
            case 'meeting':
                rankInfo = ccfData.getRankByAbbr(refine);
                break;
            default:
                // 尝试作为全名查找
                rankInfo = ccfData.getRankByAbbr(refine);
                break;
        }

        if (!rankInfo) {
            return this._createRankInfo('none', 'Not Found');
        }

        return this._createRankInfo(rankInfo.rank, rankInfo.fullName, rankInfo.abbr);
    }

    /**
     * 创建排名信息对象
     * @param {string} rank - 排名
     * @param {string} fullName - 全名
     * @param {string} abbr - 缩写
     * @returns {Object} 排名信息
     */
    _createRankInfo(rank, fullName, abbr = '') {
        return {
            ranks: [rank],
            info: this._formatRankInfo(rank, fullName, abbr)
        };
    }

    /**
     * 格式化排名信息
     * @param {string} rank - 排名
     * @param {string} fullName - 全名
     * @param {string} abbr - 缩写
     * @returns {string} 格式化的信息
     */
    _formatRankInfo(rank, fullName, abbr) {
        let info = fullName;

        if (abbr && abbr !== fullName) {
            info += ` (${abbr})`;
        }

        if (rank === 'E') {
            info += ': Expanded';
        } else if (rank === 'P') {
            info += ': Preprint';
        } else if (rank === 'none') {
            info += ': Not Found';
        } else {
            info += `: CCF ${rank}`;
        }

        return info;
    }

    /**
     * 获取排名CSS类
     * @param {Array} ranks - 排名数组
     * @returns {string} CSS类名
     */
    getRankClass(ranks) {
        if (!ranks || ranks.length === 0) return 'ccf-none';

        for (const rank of 'ABCEP') {
            for (const r of ranks) {
                if (r.startsWith(rank)) {
                    return `ccf-${rank.toLowerCase()}`;
                }
            }
        }
        return 'ccf-none';
    }

    /**
     * 创建排名span元素
     * @param {string} refine - 搜索关键词
     * @param {string} type - 搜索类型
     * @returns {HTMLElement} 排名span元素
     */
    getRankSpan(refine, type) {
        const rankInfo = this.getRankInfo(refine, type);
        const span = document.createElement('span');

        span.className = `ccf-rank ${this.getRankClass(rankInfo.ranks)}`;

        // 设置显示文本
        if (rankInfo.ranks.includes('E')) {
            span.textContent = 'Expanded';
        } else if (rankInfo.ranks.includes('P')) {
            span.textContent = 'Preprint';
        } else if (rankInfo.ranks.includes('none')) {
            span.textContent = 'CCF None';
        } else {
            span.textContent = `CCF ${rankInfo.ranks.join('/')}`;
        }

        // 添加工具提示
        if (rankInfo.info && rankInfo.info !== 'Not Found') {
            span.className += ' ccf-tooltip';
            const tooltip = document.createElement('pre');
            tooltip.className = 'ccf-tooltiptext';
            tooltip.textContent = rankInfo.info;
            span.appendChild(tooltip);
        }

        return span;
    }

    /**
     * 批量处理排名显示
     * @param {Array} items - 要处理的项
     * @param {Function} getRankSpan - 排名显示函数
     */
    processRankSpans(items, getRankSpan) {
        if (!Array.isArray(items)) return;

        items.forEach((item, index) => {
            if (typeof item === 'function') {
                this.rankSpanList.push(item);
            } else if (typeof item === 'object' && item.getRankSpan) {
                this.rankSpanList.push(item.getRankSpan);
            }
        });
    }

    /**
     * 获取所有排名显示函数
     * @returns {Array} 排名显示函数数组
     */
    getRankSpanFunctions() {
        return [...this.rankSpanList];
    }

    /**
     * 清空排名显示函数列表
     */
    clearRankSpanFunctions() {
        this.rankSpanList = [];
    }

    /**
     * 获取统计数据
     * @returns {Object} 统计数据
     */
    getStats() {
        const conferences = ccfData.conferences.size;
        const journals = ccfData.journals.size;

        return {
            total: conferences + journals,
            conferences,
            journals,
            rankSpanFunctions: this.rankSpanList.length
        };
    }
}

// 导出单例实例
const ccfManager = new CCFManager();
export default ccfManager;
