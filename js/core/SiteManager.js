/**
 * 网站管理器 - 统一管理所有网站处理器
 * 消除原有的分散式网站处理逻辑
 */

import DBLPSiteHandler from './DBLPSiteHandler.js';
import GoogleScholarHandler from './GoogleScholarHandler.js';
import ccfManager from './CCFManager.js';

class SiteManager {
    constructor() {
        this.handlers = new Map();
        this.currentHandler = null;
        this._initHandlers();
    }

    /**
     * 初始化所有网站处理器
     */
    _initHandlers() {
        // 注册DBLP处理器
        this.handlers.set('dblp', new DBLPSiteHandler());

        // 注册Google Scholar处理器
        this.handlers.set('scholar', new GoogleScholarHandler());

        // TODO: 注册其他网站处理器
        // this.handlers.set('connectedpapers', new ConnectedPapersHandler());
        // this.handlers.set('semanticscholar', new SemanticScholarHandler());
        // this.handlers.set('wos', new WebOfScienceHandler());
    }

    /**
     * 根据当前URL确定网站类型
     * @returns {string} 网站类型
     */
    _detectSiteType() {
        const hostname = window.location.hostname;

        if (hostname.startsWith('dblp')) {
            return 'dblp';
        } else if (hostname.startsWith('scholar.google')) {
            return 'scholar';
        } else if (hostname.includes('connectedpaper')) {
            return 'connectedpapers';
        } else if (hostname.includes('semanticscholar')) {
            return 'semanticscholar';
        } else if (hostname.includes('webofscience')) {
            return 'wos';
        }

        return null;
    }

    /**
     * 运行当前网站的处理器
     */
    run() {
        const siteType = this._detectSiteType();
        if (!siteType) {
            console.warn('Unknown site type:', window.location.hostname);
            return;
        }

        const handler = this.handlers.get(siteType);
        if (!handler) {
            console.warn('No handler found for site type:', siteType);
            return;
        }

        this.currentHandler = handler;

        // 为处理器添加CCF排名显示功能
        handler.addRankSpanFunction(ccfManager.getRankSpan.bind(ccfManager));

        // 运行处理器
        try {
            handler.run();
            console.log(`Running ${siteType} handler`);
        } catch (error) {
            console.error(`Error running ${siteType} handler:`, error);
        }
    }

    /**
     * 获取当前处理器
     * @returns {BaseSiteHandler|null} 当前处理器
     */
    getCurrentHandler() {
        return this.currentHandler;
    }

    /**
     * 获取所有处理器
     * @returns {Map} 处理器映射
     */
    getAllHandlers() {
        return new Map(this.handlers);
    }

    /**
     * 注册新的处理器
     * @param {string} siteType - 网站类型
     * @param {BaseSiteHandler} handler - 处理器实例
     */
    registerHandler(siteType, handler) {
        if (!handler || typeof handler.run !== 'function') {
            throw new Error('Handler must implement run method');
        }

        this.handlers.set(siteType, handler);
        console.log(`Registered handler for ${siteType}`);
    }

    /**
     * 移除处理器
     * @param {string} siteType - 网站类型
     * @returns {boolean} 是否移除成功
     */
    removeHandler(siteType) {
        const removed = this.handlers.delete(siteType);
        if (removed) {
            console.log(`Removed handler for ${siteType}`);
        }
        return removed;
    }

    /**
     * 检查处理器是否存在
     * @param {string} siteType - 网站类型
     * @returns {boolean} 是否存在
     */
    hasHandler(siteType) {
        return this.handlers.has(siteType);
    }

    /**
     * 获取处理器数量
     * @returns {number} 处理器数量
     */
    getHandlerCount() {
        return this.handlers.size;
    }

    /**
     * 获取支持的网站类型列表
     * @returns {Array} 网站类型列表
     */
    getSupportedSites() {
        return Array.from(this.handlers.keys());
    }

    /**
     * 重新初始化所有处理器
     */
    reinitialize() {
        this.handlers.clear();
        this.currentHandler = null;
        this._initHandlers();
        console.log('Reinitialized all handlers');
    }

    /**
     * 获取统计信息
     * @returns {Object} 统计信息
     */
    getStats() {
        const stats = {
            totalHandlers: this.handlers.size,
            supportedSites: this.getSupportedSites(),
            currentSite: this._detectSiteType(),
            currentHandler: this.currentHandler ? this.currentHandler.constructor.name : null
        };

        // 添加每个处理器的统计信息
        stats.handlers = {};
        for (const [siteType, handler] of this.handlers) {
            stats.handlers[siteType] = {
                className: handler.constructor.name,
                hasRankSpanFunctions: handler.rankSpanList ? handler.rankSpanList.length : 0
            };
        }

        return stats;
    }
}

// 导出单例实例
const siteManager = new SiteManager();
export default siteManager;
