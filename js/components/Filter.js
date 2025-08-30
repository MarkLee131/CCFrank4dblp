/**
 * 过滤器组件 - 改进原有的filter.js
 * 提供更好的性能和用户体验
 */

class Filter {
    constructor() {
        this.currentFilter = "ALL";
        this.processedEntries = new WeakSet();
        this.observer = null;
        this.scrollHandler = null;
    }

    /**
     * 初始化过滤器
     */
    init() {
        if (!window.location.hostname.startsWith("dblp")) {
            return;
        }

        this.createFilterButtons();
        this.bindEvents();
        this.setupInfiniteScrollHandler();

        console.log('Filter initialized for DBLP');
    }

    /**
     * 创建过滤按钮
     */
    createFilterButtons() {
        // 检查是否已存在过滤器
        if (document.querySelector('.ccf-filter')) {
            return;
        }

        const filterDiv = document.createElement("div");
        filterDiv.className = "ccf-filter";
        filterDiv.innerHTML = `
      <button data-rank="ALL" class="active">ALL</button>
      <button data-rank="A">CCF A</button>
      <button data-rank="B">CCF B</button>
      <button data-rank="C">CCF C</button>
    `;

        // 插入到页面顶部
        const firstElement = document.body.firstChild;
        document.body.insertBefore(filterDiv, firstElement);
    }

    /**
     * 设置无限滚动处理器
     */
    setupInfiniteScrollHandler() {
        // 使用Intersection Observer API
        this.observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    this.applyFilter(true);
                }
            });
        });

        const trigger = document.querySelector("#completesearch-publs");
        if (trigger) {
            this.observer.observe(trigger);
        }

        // 滚动事件处理（带防抖）
        this.scrollHandler = this.debounce(() => {
            this.applyFilter(true);
        }, 200);

        window.addEventListener("scroll", this.scrollHandler);
    }

    /**
     * 应用过滤器
     * @param {boolean} preserveExisting - 是否保留现有处理状态
     */
    applyFilter(preserveExisting = false) {
        const entries = document.querySelectorAll(
            "#completesearch-publs > div > ul > li"
        );

        if (entries.length === 0) return;

        let processedCount = 0;
        let visibleCount = 0;

        entries.forEach((entry) => {
            const entryId = this._getEntryId(entry);

            if (this.processedEntries.has(entryId) && preserveExisting) {
                return;
            }

            this.processedEntries.add(entryId);
            processedCount++;

            const shouldShow = this._shouldShowEntry(entry);
            const currentlyVisible = entry.style.display !== "none";

            if (currentlyVisible !== shouldShow || !preserveExisting) {
                entry.style.display = shouldShow ? "" : "none";
                if (shouldShow) visibleCount++;
            }
        });

        if (processedCount > 0) {
            console.debug(`Filter applied: ${processedCount} entries processed, ${visibleCount} visible`);
        }
    }

    /**
     * 获取条目ID
     * @param {HTMLElement} entry - 条目元素
     * @returns {string} 条目ID
     */
    _getEntryId(entry) {
        const link = entry.querySelector("a");
        return link?.href || entry.innerHTML || entry.textContent;
    }

    /**
     * 判断条目是否应该显示
     * @param {HTMLElement} entry - 条目元素
     * @returns {boolean} 是否应该显示
     */
    _shouldShowEntry(entry) {
        if (this.currentFilter === "ALL") {
            return true;
        }

        const content = entry.textContent;

        switch (this.currentFilter) {
            case "A":
                return content.includes("CCF A");
            case "B":
                return content.includes("CCF B");
            case "C":
                return content.includes("CCF C");
            default:
                return true;
        }
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

    /**
     * 绑定事件
     */
    bindEvents() {
        const filterContainer = document.querySelector(".ccf-filter");
        if (!filterContainer) return;

        filterContainer.addEventListener("click", (e) => {
            if (e.target.tagName === "BUTTON") {
                this._handleFilterChange(e.target);
            }
        });
    }

    /**
     * 处理过滤器变化
     * @param {HTMLElement} button - 被点击的按钮
     */
    _handleFilterChange(button) {
        // 更新按钮状态
        document.querySelectorAll(".ccf-filter button").forEach((btn) => {
            btn.classList.remove("active");
        });
        button.classList.add("active");

        // 更新当前过滤器
        this.currentFilter = button.dataset.rank;

        // 应用过滤器
        this.applyFilter(false);

        console.log(`Filter changed to: ${this.currentFilter}`);
    }

    /**
     * 获取当前过滤器状态
     * @returns {Object} 过滤器状态
     */
    getStatus() {
        return {
            currentFilter: this.currentFilter,
            processedEntries: this.processedEntries.size,
            observerActive: !!this.observer,
            scrollHandlerActive: !!this.scrollHandler
        };
    }

    /**
     * 重置过滤器
     */
    reset() {
        this.currentFilter = "ALL";
        this.processedEntries.clear();

        // 重置按钮状态
        const allButton = document.querySelector('.ccf-filter button[data-rank="ALL"]');
        if (allButton) {
            document.querySelectorAll(".ccf-filter button").forEach((btn) => {
                btn.classList.remove("active");
            });
            allButton.classList.add("active");
        }

        // 显示所有条目
        this.applyFilter(false);

        console.log('Filter reset to ALL');
    }

    /**
     * 清理资源
     */
    cleanup() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }

        if (this.scrollHandler) {
            window.removeEventListener("scroll", this.scrollHandler);
            this.scrollHandler = null;
        }

        this.processedEntries.clear();

        console.log('Filter cleaned up');
    }
}

// 导出单例实例
const filter = new Filter();
export default filter;
