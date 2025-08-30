/**
 * 网站处理器基类
 * 消除各个网站JS文件的重复代码
 */

class BaseSiteHandler {
    constructor() {
        this.rankSpanList = [];
        this.processedElements = new WeakSet();
    }

    /**
     * 添加排名显示函数
     * @param {Function} getRankSpan - 排名显示函数
     */
    addRankSpanFunction(getRankSpan) {
        this.rankSpanList.push(getRankSpan);
    }

    /**
     * 运行处理器 - 子类必须实现
     */
    run() {
        throw new Error('子类必须实现run方法');
    }

    /**
     * 创建排名span元素
     * @param {Object} rankInfo - 排名信息
     * @returns {HTMLElement} 排名span元素
     */
    createRankSpan(rankInfo) {
        if (!rankInfo) {
            return this.createRankSpan({
                rank: 'none',
                fullName: 'Not Found',
                displayText: 'CCF None'
            });
        }

        const span = document.createElement('span');
        span.className = `ccf-rank ${rankInfo.rankClass || 'ccf-none'}`;
        span.textContent = rankInfo.displayText || `CCF ${rankInfo.rank}`;

        // 添加工具提示
        if (rankInfo.fullName && rankInfo.fullName !== 'Not Found') {
            span.className += ' ccf-tooltip';
            const tooltip = document.createElement('pre');
            tooltip.className = 'ccf-tooltiptext';
            tooltip.textContent = rankInfo.fullName;
            span.appendChild(tooltip);
        }

        return span;
    }

    /**
     * 检查元素是否已处理
     * @param {HTMLElement} element - 要检查的元素
     * @returns {boolean} 是否已处理
     */
    isProcessed(element) {
        return this.processedElements.has(element) ||
            element.nextElementSibling?.classList.contains('ccf-rank');
    }

    /**
     * 标记元素为已处理
     * @param {HTMLElement} element - 要标记的元素
     */
    markAsProcessed(element) {
        this.processedElements.add(element);
    }

    /**
     * 在元素后添加排名信息
     * @param {HTMLElement} element - 目标元素
     * @param {Object} rankInfo - 排名信息
     */
    appendRankInfo(element, rankInfo) {
        if (this.isProcessed(element)) return;

        const rankSpan = this.createRankSpan(rankInfo);
        element.after(rankSpan);
        this.markAsProcessed(element);
    }

    /**
     * 批量处理元素
     * @param {NodeList|Array} elements - 要处理的元素列表
     * @param {Function} processor - 处理函数
     */
    processElements(elements, processor) {
        elements.forEach((element, index) => {
            if (this.isProcessed(element)) return;

            // 添加延迟避免阻塞UI
            setTimeout(() => {
                processor(element, index);
            }, index * 50);
        });
    }

    /**
     * 设置观察者监听DOM变化
     * @param {HTMLElement} targetNode - 目标节点
     * @param {Function} callback - 回调函数
     */
    setupObserver(targetNode, callback) {
        if (!targetNode) return;

        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    callback();
                }
            }
        });

        observer.observe(targetNode, {
            childList: true,
            subtree: true
        });

        return observer;
    }

    /**
     * 防抖函数
     * @param {Function} func - 要防抖的函数
     * @param {number} wait - 等待时间
     * @returns {Function} 防抖后的函数
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}

export default BaseSiteHandler;
