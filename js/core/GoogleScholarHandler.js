/**
 * Google Scholar网站处理器
 * 继承自BaseSiteHandler，消除重复代码
 */

import BaseSiteHandler from './BaseSiteHandler.js';
import { fetchRankFromAPI } from '../services/APIService.js';

class GoogleScholarHandler extends BaseSiteHandler {
    constructor() {
        super();
        this.currentUrl = window.location.pathname;
    }

    run() {
        if (this.currentUrl === '/scholar') {
            this.appendRank();
        } else if (this.currentUrl === '/citations') {
            this.appendRanks();
            this.observeCitations();
        }
    }

    appendRank() {
        const elements = document.querySelectorAll('#gs_res_ccl_mid > div > div.gs_ri');
        this.processElements(elements, (element, index) => {
            this.processSearchResult(element, index);
        });
    }

    processSearchResult(element, index) {
        const titleNode = element.querySelector('h3 > a');
        if (!titleNode || this.isProcessed(titleNode)) return;

        const title = titleNode.textContent;
        const authorData = element.querySelector('div.gs_a')?.textContent;
        if (!authorData) return;

        const { author, year } = this.extractAuthorAndYear(authorData);

        // 延迟处理避免阻塞UI
        setTimeout(() => {
            fetchRankFromAPI(title, author, year, titleNode);
        }, index * 100);
    }

    extractAuthorAndYear(authorData) {
        const cleanData = authorData.replace(/[\,\-\…]/g, '').split(' ');
        return {
            author: cleanData[1] || '',
            year: cleanData.slice(-3)[0] || ''
        };
    }

    observeCitations() {
        console.debug('Start citations observation...');

        const targetNode = document.getElementById('gsc_a_b');
        if (targetNode) {
            this.setupObserver(targetNode, () => {
                this.appendRanks();
            });
        }
    }

    appendRanks() {
        const elements = document.querySelectorAll('tr.gsc_a_tr');
        this.processElements(elements, (element, index) => {
            this.processCitationEntry(element, index);
        });
    }

    processCitationEntry(element, index) {
        const titleNode = element.querySelector('td.gsc_a_t > a').firstElementChild;
        if (!titleNode || this.isProcessed(element)) return;

        const title = titleNode.textContent;
        const authorData = element.querySelector('div.gs_gray')?.textContent;
        const year = element.querySelector('td.gsc_a_y')?.textContent;

        if (!authorData || !year) return;

        const author = this.extractAuthorFromCitation(authorData);

        // 标记为已处理
        element.classList.add('ccf-ranked');

        setTimeout(() => {
            fetchRankFromAPI(title, author, year, titleNode);
        }, index * 100);
    }

    extractAuthorFromCitation(authorData) {
        return authorData.replace(/[\,\…]/g, '').split(' ')[1] || '';
    }
}

export default GoogleScholarHandler;
