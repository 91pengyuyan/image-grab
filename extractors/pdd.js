/* 拼多多详情页取图 */
(function (root) {
  'use strict';

  function pullFromObject(obj, add, depth) {
    if (!obj || depth > 8) return;
    if (typeof obj === 'string') {
      if (root.ImageGrab.looksLikeImage(obj)) add(obj, 0, 0, 'main');
      return;
    }
    if (Array.isArray(obj)) {
      obj.forEach((v) => pullFromObject(v, add, depth + 1));
      return;
    }
    if (typeof obj !== 'object') return;
    const keys = Object.keys(obj);
    keys.forEach((k) => {
      const v = obj[k];
      const lk = k.toLowerCase();
      if (typeof v === 'string' && root.ImageGrab.looksLikeImage(v)) {
        let source = 'other';
        if (/gallery|top_gallery|banner|hd_thumb/.test(lk)) source = 'main';
        else if (/sku|spec/.test(lk)) source = 'sku';
        else if (/detail|desc/.test(lk)) source = 'detail';
        add(v, 0, 0, source);
      } else {
        pullFromObject(v, add, depth + 1);
      }
    });
  }

  function extractPdd() {
    const G = root.ImageGrab;
    const { add, list } = G.createCollector();

    const raw = window.rawData || window.__NEXT_DATA__ || window._rawData;
    if (raw) {
      const store = raw.store || raw.props || raw;
      const goods = store.initDataObj || store.pageProps || store;
      if (goods.goods) pullFromObject(goods.goods, add, 0);
      else pullFromObject(goods, add, 0);
    }

    document.querySelectorAll('script').forEach((s) => {
      const t = s.textContent || '';
      if (t.includes('rawData') || t.includes('gallery') || t.includes('detailGallery')) {
        G.urlsFromJsonText(t, add, 'main');
      }
    });

    ['.enable-scroll img', '.goods-gallery img', '[class*="gallery"] img'].forEach((sel) => {
      document.querySelectorAll(sel).forEach((el) => {
        if (el.tagName === 'IMG') G.collectFromImgEl(el, (u, w, h) => add(u, w, h, 'main'));
      });
    });

    ['[class*="sku"] img', '[class*="spec"] img'].forEach((sel) => {
      document.querySelectorAll(sel).forEach((el) => {
        if (el.tagName === 'IMG') G.collectFromImgEl(el, (u, w, h) => add(u, w, h, 'sku'));
      });
    });

    ['[class*="detail"] img', '[class*="desc"] img', '#main img'].forEach((sel) => {
      document.querySelectorAll(sel).forEach((el) => {
        if (el.tagName === 'IMG') G.collectFromImgEl(el, (u, w, h) => add(u, w, h, 'detail'));
      });
    });

    return list;
  }

  root.ImageGrab = Object.assign(root.ImageGrab || {}, { extractPdd });
})(typeof window !== 'undefined' ? window : self);
