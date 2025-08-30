/**
 * 统一的CCF数据结构
 * 消除原有的7个数据文件的冗余设计
 */

class CCFData {
    constructor() {
        this.conferences = new Map();
        this.journals = new Map();
        this._initData();
    }

    /**
     * 添加会议/期刊数据
     * @param {string} rank - CCF等级 (A/B/C/E/P)
     * @param {string} abbr - 缩写
     * @param {string} fullName - 全名
     * @param {string} url - DBLP URL路径
     * @param {string} type - 'conference' 或 'journal'
     */
    addEntry(rank, abbr, fullName, url, type) {
        const entry = {
            rank,
            abbr: abbr.toUpperCase(),
            fullName,
            url,
            type,
            // 计算属性，避免重复存储
            get rankClass() { return `ccf-${this.rank.toLowerCase()}`; },
            get displayText() {
                if (this.rank === 'E') return 'Expanded';
                if (this.rank === 'P') return 'Preprint';
                if (this.rank === 'none') return 'CCF None';
                return `CCF ${this.rank}`;
            }
        };

        if (type === 'conference') {
            this.conferences.set(abbr.toUpperCase(), entry);
            this.conferences.set(url, entry);
        } else {
            this.journals.set(abbr.toUpperCase(), entry);
            this.journals.set(url, entry);
        }
    }

    /**
     * 根据缩写查找排名信息
     * @param {string} abbr - 会议/期刊缩写
     * @returns {Object|null} 排名信息
     */
    getRankByAbbr(abbr) {
        if (!abbr) return null;

        // 先尝试精确匹配
        let entry = this.conferences.get(abbr.toUpperCase()) ||
            this.journals.get(abbr.toUpperCase());

        if (entry) return entry;

        // 模糊匹配 - 查找以该缩写开头的会议
        for (const [key, value] of this.conferences) {
            if (key.startsWith(abbr.toUpperCase()) && key !== abbr.toUpperCase()) {
                return value;
            }
        }

        return null;
    }

    /**
     * 根据URL查找排名信息
     * @param {string} url - DBLP URL路径
     * @returns {Object|null} 排名信息
     */
    getRankByUrl(url) {
        if (!url) return null;

        // 清理URL，移除年份等后缀
        const cleanUrl = this._cleanUrl(url);
        return this.conferences.get(cleanUrl) || this.journals.get(cleanUrl);
    }

    /**
     * 清理URL，移除年份等动态部分
     * @param {string} url - 原始URL
     * @returns {string} 清理后的URL
     */
    _cleanUrl(url) {
        // 移除年份模式: /conf/name/name2023 -> /conf/name/name
        return url.replace(/[0-9]{1,4}(-[0-9]{1,4})?$/, '');
    }

    /**
     * 获取排名CSS类
     * @param {string} rank - 排名
     * @returns {string} CSS类名
     */
    getRankClass(rank) {
        if (!rank) return 'ccf-none';

        for (const r of 'ABCEP') {
            if (rank.startsWith(r)) {
                return `ccf-${r.toLowerCase()}`;
            }
        }
        return 'ccf-none';
    }

    /**
     * 初始化数据 - 从原始dataGen.js迁移
     */
    _initData() {
        // 这里将包含从dataGen.js迁移的完整数据
        // 格式: this.addEntry('A', 'PPoPP', 'ACM SIGPLAN Symposium on Principles & Practice of Parallel Programming', '/conf/ppopp/ppopp', 'conference');

        // 示例数据 - 实际需要从dataGen.js迁移所有数据
        this.addEntry('A', 'PPoPP', 'ACM SIGPLAN Symposium on Principles & Practice of Parallel Programming', '/conf/ppopp/ppopp', 'conference');
        this.addEntry('A', 'FAST', 'Conference on File and Storage Technologies', '/conf/fast/fast', 'conference');
        this.addEntry('A', 'TOCS', 'ACM Transactions on Computer Systems', '/journals/tocs/tocs', 'journal');
        this.addEntry('A', 'TOS', 'ACM Transactions on Storage', '/journals/tos/tos', 'journal');

        // TODO: 从dataGen.js迁移所有数据
    }
}

// 导出单例实例
const ccfData = new CCFData();
export default ccfData;
