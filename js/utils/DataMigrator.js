/**
 * 数据迁移工具
 * 将原有的7个数据文件合并到新的统一CCFData结构中
 */

import ccfData from '../core/CCFData.js';

class DataMigrator {
    constructor() {
        this.migrationLog = [];
    }

    /**
     * 从原有的数据文件迁移数据
     * 注意：这个函数需要在原有的数据文件加载后调用
     */
    migrateFromLegacyData() {
        console.log('Starting data migration...');

        try {
            // 检查是否存在原有的全局变量
            if (typeof window.ccf === 'undefined') {
                console.warn('Legacy CCF data not found, skipping migration');
                return false;
            }

            const legacyData = window.ccf;
            let migratedCount = 0;

            // 迁移会议和期刊数据
            if (legacyData.rankUrl) {
                migratedCount += this._migrateFromRankUrl(legacyData.rankUrl);
            }

            if (legacyData.abbrFull) {
                migratedCount += this._migrateFromAbbrFull(legacyData.abbrFull);
            }

            if (legacyData.rankDb) {
                migratedCount += this._migrateFromRankDb(legacyData.rankDb);
            }

            console.log(`Data migration completed: ${migratedCount} entries migrated`);
            return true;

        } catch (error) {
            console.error('Data migration failed:', error);
            return false;
        }
    }

    /**
     * 从rankUrl迁移数据
     * @param {Object} rankUrl - 原有的rankUrl数据
     * @returns {number} 迁移的条目数
     */
    _migrateFromRankUrl(rankUrl) {
        let count = 0;

        for (const [url, rank] of Object.entries(rankUrl)) {
            try {
                // 从URL推断类型
                const type = url.includes('/conf/') ? 'conference' : 'journal';

                // 从URL提取缩写
                const abbr = this._extractAbbrFromUrl(url);

                // 从其他数据源获取全名
                const fullName = this._getFullNameFromLegacy(url, abbr);

                if (abbr && fullName) {
                    ccfData.addEntry(rank, abbr, fullName, url, type);
                    count++;
                }
            } catch (error) {
                this.migrationLog.push(`Failed to migrate ${url}: ${error.message}`);
            }
        }

        return count;
    }

    /**
     * 从abbrFull迁移数据
     * @param {Object} abbrFull - 原有的abbrFull数据
     * @returns {number} 迁移的条目数
     */
    _migrateFromAbbrFull(abbrFull) {
        let count = 0;

        for (const [abbr, fullName] of Object.entries(abbrFull)) {
            try {
                // 尝试从其他数据源获取排名和URL
                const rank = this._getRankFromLegacy(abbr, fullName);
                const url = this._getUrlFromLegacy(abbr, fullName);

                if (rank && url) {
                    const type = url.includes('/conf/') ? 'conference' : 'journal';
                    ccfData.addEntry(rank, abbr, fullName, url, type);
                    count++;
                }
            } catch (error) {
                this.migrationLog.push(`Failed to migrate abbr ${abbr}: ${error.message}`);
            }
        }

        return count;
    }

    /**
     * 从rankDb迁移数据
     * @param {Object} rankDb - 原有的rankDb数据
     * @returns {number} 迁移的条目数
     */
    _migrateFromRankDb(rankDb) {
        let count = 0;

        for (const [dbPath, url] of Object.entries(rankDb)) {
            try {
                // 从数据库路径推断信息
                const abbr = this._extractAbbrFromDbPath(dbPath);
                const rank = this._getRankFromLegacy(abbr, '');
                const fullName = this._getFullNameFromLegacy(url, abbr);

                if (abbr && rank && fullName) {
                    const type = url.includes('/conf/') ? 'conference' : 'journal';
                    ccfData.addEntry(rank, abbr, fullName, url, type);
                    count++;
                }
            } catch (error) {
                this.migrationLog.push(`Failed to migrate db path ${dbPath}: ${error.message}`);
            }
        }

        return count;
    }

    /**
     * 从URL提取缩写
     * @param {string} url - DBLP URL
     * @returns {string} 缩写
     */
    _extractAbbrFromUrl(url) {
        // 从 /conf/name/name 或 /journals/name/name 提取name部分
        const parts = url.split('/');
        if (parts.length >= 3) {
            return parts[parts.length - 1].toUpperCase();
        }
        return '';
    }

    /**
     * 从数据库路径提取缩写
     * @param {string} dbPath - 数据库路径
     * @returns {string} 缩写
     */
    _extractAbbrFromDbPath(dbPath) {
        // 从 /db/conf/name/name 提取name部分
        const parts = dbPath.split('/');
        if (parts.length >= 4) {
            return parts[parts.length - 1].toUpperCase();
        }
        return '';
    }

    /**
     * 从原有数据源获取全名
     * @param {string} url - URL
     * @param {string} abbr - 缩写
     * @returns {string} 全名
     */
    _getFullNameFromLegacy(url, abbr) {
        // 尝试从多个数据源获取全名
        if (window.ccf && window.ccf.rankFullName) {
            return window.ccf.rankFullName[url] || window.ccf.rankFullName[abbr] || '';
        }
        return '';
    }

    /**
     * 从原有数据源获取排名
     * @param {string} abbr - 缩写
     * @param {string} fullName - 全名
     * @returns {string} 排名
     */
    _getRankFromLegacy(abbr, fullName) {
        // 尝试从多个数据源获取排名
        if (window.ccf && window.ccf.rankUrl) {
            // 这里需要反向查找，比较复杂
            for (const [url, rank] of Object.entries(window.ccf.rankUrl)) {
                if (url.includes(abbr.toLowerCase()) || url.includes(fullName.toLowerCase())) {
                    return rank;
                }
            }
        }
        return '';
    }

    /**
     * 从原有数据源获取URL
     * @param {string} abbr - 缩写
     * @param {string} fullName - 全名
     * @returns {string} URL
     */
    _getUrlFromLegacy(abbr, fullName) {
        // 尝试从多个数据源获取URL
        if (window.ccf && window.ccf.fullUrl) {
            return window.ccf.fullUrl[fullName] || window.ccf.fullUrl[abbr] || '';
        }
        return '';
    }

    /**
     * 获取迁移日志
     * @returns {Array} 迁移日志
     */
    getMigrationLog() {
        return [...this.migrationLog];
    }

    /**
     * 清空迁移日志
     */
    clearMigrationLog() {
        this.migrationLog = [];
    }

    /**
     * 验证迁移结果
     * @returns {Object} 验证结果
     */
    validateMigration() {
        const stats = ccfData.getStats();
        const validation = {
            success: stats.total > 0,
            totalEntries: stats.total,
            conferences: stats.conferences,
            journals: stats.journals,
            migrationLog: this.migrationLog,
            warnings: []
        };

        if (stats.total === 0) {
            validation.warnings.push('No data was migrated');
        }

        if (stats.conferences === 0) {
            validation.warnings.push('No conferences were migrated');
        }

        if (stats.journals === 0) {
            validation.warnings.push('No journals were migrated');
        }

        if (this.migrationLog.length > 0) {
            validation.warnings.push(`${this.migrationLog.length} migration errors occurred`);
        }

        return validation;
    }
}

export default DataMigrator;
