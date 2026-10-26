/* 淘宝 / 天猫详情页取图 */
(function (root) {
  'use strict';

  function extractTaobao() {
    const G = root.ImageGrab;
    const { add, list } = G.createCollector();

    const mainSels = [
      '#J_UlThumb img',
      '#J_ImgBooth',
      '.tb-thumb img',
      '.Thumbnails--thumbnails img',
      '[class*="PicGallery"] img',
      '[class*="mainPic"] img'
    ];
    mainSels.forEach((sel) => {
      document.querySelectorAll(sel).forEach((el) => {
        if (el.tagName === 'IMG') G.collectFromImgEl(el, (u, w, h) => add(u, w, h, 'main'));
      });
    });

    const skuSels = [
      'ul.J_TSaleProp img',
      '.tb-sku img',
      '[class*="skuItem"] img',
      '[class*="SkuContent"] img',
      '.sku-item img'
    ];
    skuSels.forEach((sel) => {
      document.querySelectorAll(sel).forEach((el) => {
        if (el.tagName === 'IMG') G.collectFromImgEl(el, (u, w, h) => add(u, w, h, 'sku'));
      });
    });

    const detailSels = [
      '#description img',
      '#J_DivItemDesc img',
      '#J_DetailMeta img',
      '.descV8-container img',
      '[class*="detailDesc"] img',
      '#detail img'
    ];
    detailSels.forEach((sel) => {
      document.querySelectorAll(sel).forEach((el) => {
        if (el.tagName === 'IMG') G.collectFromImgEl(el, (u, w, h) => add(u, w, h, 'detail'));
      });
    });

    // 脚本变量兜底
    document.querySelectorAll('script').forEach((s) => {
      const t = s.textContent || '';
      if (t.includes('auctionImages') || t.includes('imageList') || t.includes('descUrl')) {
        G.urlsFromJsonText(t, add, 'main');
      }
    });

    if (G.isDescFrame && G.isDescFrame()) {
      G.scanDom(document, (u, w, h) => add(u, w, h, 'detail'));
    }

    return list;
  }

  root.ImageGrab = Object.assign(root.ImageGrab || {}, { extractTaobao });
})(typeof window !== 'undefined' ? window : self);
