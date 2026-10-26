/* 原图 URL 还原、过滤、去重 */
(function (root) {
  'use strict';

  const JUNK_RE = /(icon|logo|sprite|blank|placeholder|loading|1x1|pixel|tracker|beacon|avatar|captcha|qrcode|qr\.png)/i;
  const IMG_EXT_RE = /\.(jpe?g|png|webp|gif|bmp)(\?|$)/i;

  function toHttps(url) {
    return url.replace(/^http:\/\//i, 'https://');
  }

  function stripAliSize(url) {
    // xxx.jpg_50x50.jpg / xxx.jpg_Q50.jpg_.webp / xxx_sum.jpg
    let u = url;
    u = u.replace(/_\.webp$/i, '');
    u = u.replace(/\.(jpe?g|png|gif|webp)_[0-9]+x[0-9]+[a-z0-9_]*(\.(jpe?g|png|gif|webp))+$/i, '.$1');
    u = u.replace(/\.(jpe?g|png|gif|webp)_(q\d+|sum|b|m)(\.(jpe?g|png|gif|webp))*$/i, '.$1');
    u = u.replace(/_[0-9]+x[0-9]+[qQ]?[0-9]*\.(jpe?g|png|gif|webp)/gi, '.$1');
    return u;
  }

  function upgradeJdUrl(url) {
    let u = url;
    u = u.replace(/\/s\d+x\d+_jfs\//i, '/s800x800_jfs/');
    u = u.replace(/\/n[2-9]\//i, '/n1/');
    u = u.replace(/\/s\d+x\d+_\//i, '/s800x800_/');
    return u;
  }

  function stripPddProcess(url) {
    try {
      const u = new URL(url);
      [...u.searchParams.keys()].forEach((k) => {
        if (/imageView|imageMogr|^webp$/i.test(k)) u.searchParams.delete(k);
      });
      let href = u.toString();
      href = href.replace(/[?&]imageView2\/[^&]*/gi, '');
      href = href.replace(/[?&]imageMogr2\/[^&]*/gi, '');
      href = href.replace(/!thumbnail[^?&]*/gi, '');
      href = href.replace(/\?&/, '?').replace(/[?&]$/, '');
      return href;
    } catch (e) {
      return url.replace(/[?&]imageView2\/[^&]*/gi, '').replace(/[?&]imageMogr2\/[^&]*/gi, '');
    }
  }

  function upgradeImageUrl(raw, baseHref) {
    if (!raw || typeof raw !== 'string') return '';
    let url = raw.trim().replace(/^["']|["']$/g, '');
    if (!url || url.startsWith('data:') || url.startsWith('blob:')) return '';
    try {
      url = new URL(url, baseHref || (typeof location !== 'undefined' ? location.href : undefined)).href;
    } catch (e) {
      return '';
    }
    if (!/^https?:/i.test(url)) return '';
    url = toHttps(url);
    url = stripAliSize(url);
    url = upgradeJdUrl(url);
    url = stripPddProcess(url);
    return url;
  }

  function canonicalKey(url) {
    try {
      const u = new URL(url);
      u.hash = '';
      // 去掉常见缓存参数
      ['t', 'v', 'timestamp', '_t'].forEach((k) => u.searchParams.delete(k));
      return u.origin + u.pathname.replace(/\/+$/, '') + (u.search || '');
    } catch (e) {
      return url;
    }
  }

  function isJunkUrl(url) {
    if (!url) return true;
    if (/\.svg(\?|$)/i.test(url)) return true;
    if (JUNK_RE.test(url)) return true;
    if (/\/(stat|click|log|trace)\//i.test(url)) return true;
    return false;
  }

  function looksLikeImage(url) {
    if (IMG_EXT_RE.test(url)) return true;
    if (/alicdn|360buyimg|pddpic|taobaocdn|img\.jd/i.test(url)) return true;
    return false;
  }

  function collectFromImgEl(img, add) {
    const candidates = [
      img.currentSrc,
      img.src,
      img.dataset.src,
      img.dataset.lazySrc,
      img.dataset.lazyload,
      img.dataset.ksLazyload,
      img.dataset.original,
      img.dataset.img,
      img.getAttribute('data-original'),
      img.getAttribute('data-lazy-img')
    ];
    if (img.srcset) {
      img.srcset.split(',').forEach((s) => {
        const part = s.trim().split(/\s+/)[0];
        if (part) candidates.push(part);
      });
    }
    const w = img.naturalWidth || img.width || 0;
    const h = img.naturalHeight || img.height || 0;
    candidates.forEach((u) => add(u, w, h));
  }

  function scanDom(rootEl, add, extraSelectors) {
    const root = rootEl || document;
    root.querySelectorAll('img').forEach((img) => collectFromImgEl(img, add));
    root.querySelectorAll('[data-lazy-src], [data-ks-lazy], [data-src], [data-original], [data-img], [data-lazyload], [data-lazy-img]').forEach((el) => {
      ['data-lazy-src', 'data-ks-lazy', 'data-src', 'data-original', 'data-img', 'data-lazyload', 'data-lazy-img'].forEach((attr) => {
        const v = el.getAttribute(attr);
        if (v) add(v);
      });
    });
    if (extraSelectors) {
      extraSelectors.forEach((sel) => {
        root.querySelectorAll(sel).forEach((el) => {
          if (el.tagName === 'IMG') collectFromImgEl(el, add);
          else {
            const bg = getComputedStyle(el).backgroundImage;
            if (bg && bg.includes('url(')) {
              const m = bg.match(/url\(["']?(.*?)["']?\)/);
              if (m && m[1]) add(m[1]);
            }
          }
        });
      });
    }
  }

  function createCollector() {
    const set = new Set();
    const list = [];
    function add(raw, w, h, source) {
      const url = upgradeImageUrl(raw);
      if (!url || isJunkUrl(url) || !looksLikeImage(url)) return;
      const key = canonicalKey(url);
      if (set.has(key)) return;
      set.add(key);
      list.push({ url, w: w || 0, h: h || 0, source: source || 'other' });
    }
    return { add, list };
  }

  function urlsFromHtml(html, add, source) {
    if (!html) return;
    const re = /(?:src|data-src|data-original|data-lazyload)\s*=\s*["']([^"']+)["']/gi;
    let m;
    while ((m = re.exec(html))) add(m[1], 0, 0, source || 'detail');
    const cssRe = /url\(["']?([^"')]+)["']?\)/gi;
    while ((m = cssRe.exec(html))) add(m[1], 0, 0, source || 'detail');
  }

  function urlsFromJsonText(text, add, source) {
    if (!text) return;
    const re = /https?:\\?\/\\?\/[^\s"'\\]+/gi;
    let m;
    while ((m = re.exec(text))) {
      const u = m[0].replace(/\\+\//g, '/').replace(/\\u002F/gi, '/');
      if (looksLikeImage(u)) add(u, 0, 0, source);
    }
  }

  function isDescFrame() {
    const h = typeof location !== 'undefined' ? location.hostname : '';
    return window !== window.top && /alicdn\.com|taobaocdn\.com/.test(h);
  }

  function detectPlatform() {
    const h = typeof location !== 'undefined' ? location.hostname : '';
    if (/taobao|tmall|alicdn|taobaocdn/.test(h)) return 'taobao';
    if (/jd\.com|360buyimg/.test(h)) return 'jd';
    if (/pinduoduo|yangkeduo|pddpic/.test(h)) return 'pdd';
    return 'other';
  }

  root.ImageGrab = Object.assign(root.ImageGrab || {}, {
    upgradeImageUrl,
    canonicalKey,
    isJunkUrl,
    looksLikeImage,
    collectFromImgEl,
    scanDom,
    createCollector,
    urlsFromHtml,
    urlsFromJsonText,
    isDescFrame,
    detectPlatform
  });
})(typeof window !== 'undefined' ? window : self);
