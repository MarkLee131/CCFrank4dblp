/**
 * 主入口文件 - 重构后的统一入口
 * 替换原有的script.js，提供更清晰的初始化逻辑
 */

import siteManager from './core/SiteManager.js';
import filter from './components/Filter.js';

/**
 * 应用主类
 */
class CCFrankApp {
    constructor() {
        this.initialized = false;
        this.siteManager = siteManager;
        this.filter = filter;
    }

    /**
     * 初始化应用
     */
    async init() {
        if (this.initialized) {
            console.warn('App already initialized');
            return;
        }

        try {
            console.log('Initializing CCFrank4dblp...');

            // 初始化网站管理器
            this.siteManager.run();

            // 初始化过滤器（仅DBLP）
            if (window.location.hostname.startsWith('dblp')) {
                this.filter.init();
            }

            this.initialized = true;
            console.log('CCFrank4dblp initialized successfully');

            // 输出统计信息
            this.logStats();

        } catch (error) {
            console.error('Failed to initialize CCFrank4dblp:', error);
        }
    }

    /**
     * 输出统计信息
     */
    logStats() {
        const siteStats = this.siteManager.getStats();
        console.log('Site Manager Stats:', siteStats);

        // 可以添加更多统计信息
        if (window.location.hostname.startsWith('dblp')) {
            console.log('Filter initialized for DBLP');
        }
    }

    /**
     * 重新初始化应用
     */
    async reinit() {
        console.log('Reinitializing CCFrank4dblp...');
        this.initialized = false;
        this.siteManager.reinitialize();
        await this.init();
    }

    /**
     * 获取应用状态
     * @returns {Object} 应用状态
     */
    getStatus() {
        return {
            initialized: this.initialized,
            siteManager: this.siteManager.getStats(),
            currentUrl: window.location.href,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * 清理应用资源
     */
    cleanup() {
        // 清理观察者
        if (this.siteManager.currentHandler) {
            // 这里可以添加清理逻辑
        }

        this.initialized = false;
        console.log('CCFrank4dblp cleaned up');
    }
}

// 创建应用实例
const app = new CCFrankApp();

// 等待DOM加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        app.init();
    });
} else {
    // DOM已经加载完成，直接初始化
    app.init();
}

// 导出到全局作用域（用于调试）
if (typeof window !== 'undefined') {
    window.CCFrankApp = app;
    window.siteManager = siteManager;
}

// 处理页面卸载
window.addEventListener('beforeunload', () => {
    app.cleanup();
});

export default app;
