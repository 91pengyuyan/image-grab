/* 京东详情页取图 */
(function (root) {
  'use strict';

  function extractJd() {
    const G = root.ImageGrab;
    const { add, list } = G.createCollector();

    ['#spec-list img', '#spec-img', '.spec-items img', '#spec-n1 img'].forEach((sel) => {
      document.querySelectorAll(sel).forEach((el) => {
        if (el.tagName === 'IMG') G.collectFromImgEl(el, (u, w, h) => add(u, w, h, 'main'));
      });
    });

    ['.p-choose img', '#choose-attr-1 img', '.dd-inner img', '[data-sku] img'].forEach((sel) => {
      document.querySelectorAll(sel).forEach((el) => {
        if (el.tagName === 'IMG') G.collectFromImgEl(el, (u, w, h) => add(u, w, h, 'sku'));
      });
    });

    ['#J-detail-content img', '#detail-content img', '.ssd-module-wrap img', '#detail img'].forEach((sel) => {
      document.querySelectorAll(sel).forEach((el) => {
        if (el.tagName === 'IMG') G.collectFromImgEl(el, (u, w, h) => add(u, w, h, 'detail'));
      });
    });

    document.querySelectorAll('#J-detail-content [data-lazyload], #detail-content [data-lazyload]').forEach((el) => {
      add(el.getAttribute('data-lazyload'), 0, 0, 'detail');
    });

    document.querySelectorAll('script').forEach((s) => {
      const t = s.textContent || '';
      if (t.includes('imageList') || t.includes('mainImage') || t.includes('wdis')) {
        G.urlsFromJsonText(t, add, 'main');
      }
    });

    return list;
  }

  root.ImageGrab = Object.assign(root.ImageGrab || {}, { extractJd });
})(typeof window !== 'undefined' ? window : self);
