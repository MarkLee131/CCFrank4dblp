/**
 * 缓存服务 - 改进原有的apiCache.js
 * 提供更好的错误处理和性能优化
 */

class CacheService {
    constructor() {
        this.expiresAfter = 86400000; // 24小时
        this.keyPrefix = "CCFrank4dblp_";
        this.maxCacheSize = 1000; // 最大缓存条目数
    }

    /**
     * 生成缓存键
     * @param {string} key - 原始键
     * @returns {string} 带前缀的缓存键
     */
    _getPrefixedKey(key) {
        return this.keyPrefix + key;
    }

    /**
     * 清理过期和超量的缓存
     */
    _cleanup() {
        const keys = [];
        const now = Date.now();

        // 收集所有键和过期时间
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(this.keyPrefix)) {
                try {
                    const itemStr = localStorage.getItem(key);
                    if (itemStr) {
                        const item = JSON.parse(itemStr);
                        if (item && item.expires) {
                            if (now > item.expires) {
                                // 过期，立即删除
                                localStorage.removeItem(key);
                            } else {
                                keys.push({ key, expires: item.expires });
                            }
                        }
                    }
                } catch (error) {
                    // 解析失败，删除损坏的条目
                    localStorage.removeItem(key);
                }
            }
        }

        // 如果缓存条目过多，删除最旧的
        if (keys.length > this.maxCacheSize) {
            keys.sort((a, b) => a.expires - b.expires);
            const toDelete = keys.slice(0, keys.length - this.maxCacheSize);
            toDelete.forEach(({ key }) => {
                localStorage.removeItem(key);
            });
        }
    }

    /**
     * 检查是否为配额超限错误
     * @param {Error} err - 错误对象
     * @returns {boolean} 是否为配额超限
     */
    _isQuotaExceededError(err) {
        return (
            err instanceof DOMException && // 除Firefox外的浏览器
            (err.name === "QuotaExceededError" ||
                // Firefox
                err.name === "NS_ERROR_DOM_QUOTA_REACHED")
        );
    }

    /**
     * 保存缓存项
     * @param {string} key - 缓存键
     * @param {any} value - 缓存值
     * @returns {boolean} 是否保存成功
     */
    setItem(key, value) {
        try {
            this._cleanup();

            const prefixedKey = this._getPrefixedKey(key);
            const now = Date.now();
            const item = {
                value,
                expires: now + this.expiresAfter,
                timestamp: now
            };

            localStorage.setItem(prefixedKey, JSON.stringify(item));
            return true;
        } catch (err) {
            if (this._isQuotaExceededError(err)) {
                // 配额超限，清理所有缓存后重试
                this.clearAll();
                try {
                    const prefixedKey = this._getPrefixedKey(key);
                    const now = Date.now();
                    const item = {
                        value,
                        expires: now + this.expiresAfter,
                        timestamp: now
                    };
                    localStorage.setItem(prefixedKey, JSON.stringify(item));
                    return true;
                } catch (retryErr) {
                    console.error('Failed to save cache item after cleanup:', retryErr);
                    return false;
                }
            } else {
                console.error('Failed to save cache item:', err);
                return false;
            }
        }
    }

    /**
     * 获取缓存项
     * @param {string} key - 缓存键
     * @returns {any|null} 缓存值或null
     */
    getItem(key) {
        try {
            const prefixedKey = this._getPrefixedKey(key);
            const itemStr = localStorage.getItem(prefixedKey);

            if (!itemStr) return null;

            const item = JSON.parse(itemStr);
            if (!item || !item.expires) return null;

            const now = Date.now();
            if (now > item.expires) {
                // 过期，删除
                localStorage.removeItem(prefixedKey);
                return null;
            }

            return item.value;
        } catch (error) {
            console.error('Failed to get cache item:', error);
            // 删除损坏的缓存条目
            try {
                const prefixedKey = this._getPrefixedKey(key);
                localStorage.removeItem(prefixedKey);
            } catch (removeErr) {
                console.error('Failed to remove corrupted cache item:', removeErr);
            }
            return null;
        }
    }

    /**
     * 删除缓存项
     * @param {string} key - 缓存键
     * @returns {boolean} 是否删除成功
     */
    removeItem(key) {
        try {
            const prefixedKey = this._getPrefixedKey(key);
            localStorage.removeItem(prefixedKey);
            return true;
        } catch (error) {
            console.error('Failed to remove cache item:', error);
            return false;
        }
    }

    /**
     * 检查缓存项是否存在且未过期
     * @param {string} key - 缓存键
     * @returns {boolean} 是否存在且有效
     */
    hasItem(key) {
        return this.getItem(key) !== null;
    }

    /**
     * 获取缓存统计信息
     * @returns {Object} 缓存统计
     */
    getStats() {
        let totalItems = 0;
        let expiredItems = 0;
        let validItems = 0;
        const now = Date.now();

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(this.keyPrefix)) {
                totalItems++;
                try {
                    const itemStr = localStorage.getItem(key);
                    if (itemStr) {
                        const item = JSON.parse(itemStr);
                        if (item && item.expires) {
                            if (now > item.expires) {
                                expiredItems++;
                            } else {
                                validItems++;
                            }
                        }
                    }
                } catch (error) {
                    // 忽略解析错误
                }
            }
        }

        return {
            total: totalItems,
            valid: validItems,
            expired: expiredItems,
            size: this._getCacheSize()
        };
    }

    /**
     * 获取缓存大小（字节）
     * @returns {number} 缓存大小
     */
    _getCacheSize() {
        let size = 0;
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(this.keyPrefix)) {
                size += key.length;
                try {
                    const value = localStorage.getItem(key);
                    if (value) {
                        size += value.length;
                    }
                } catch (error) {
                    // 忽略错误
                }
            }
        }
        return size;
    }

    /**
     * 清理所有缓存
     */
    clearAll() {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(this.keyPrefix)) {
                keysToRemove.push(key);
            }
        }

        keysToRemove.forEach(key => {
            try {
                localStorage.removeItem(key);
            } catch (error) {
                console.error('Failed to remove cache key:', key, error);
            }
        });
    }

    /**
     * 清理过期缓存
     */
    clearExpired() {
        const now = Date.now();
        const keysToRemove = [];

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(this.keyPrefix)) {
                try {
                    const itemStr = localStorage.getItem(key);
                    if (itemStr) {
                        const item = JSON.parse(itemStr);
                        if (item && item.expires && now > item.expires) {
                            keysToRemove.push(key);
                        }
                    }
                } catch (error) {
                    // 解析失败，删除损坏的条目
                    keysToRemove.push(key);
                }
            }
        }

        keysToRemove.forEach(key => {
            try {
                localStorage.removeItem(key);
            } catch (error) {
                console.error('Failed to remove expired cache key:', key, error);
            }
        });
    }
}

// 导出单例实例
const apiCache = new CacheService();
export default apiCache;
