// content.js - 详情页悬浮按钮 + 取图 + iframe 协作
(function () {
  'use strict';

  if (window.__imageGrabInject) return;
  window.__imageGrabInject = true;

  const MSG = '__imageGrab';

  function isTop() {
    return window === window.top;
  }

  function isDetailPage() {
    if (!isTop()) return false;
    const h = location.hostname;
    const p = location.pathname;
    const q = location.search;
    if (h.includes('item.taobao.com') && /item\.htm/i.test(p)) return true;
    if (h.includes('detail.tmall.com')) return true;
    if (/(^|\.)tmall\.com$/.test(h) && /item\.htm/i.test(p)) return true;
    if (h.includes('item.jd.com') || h.includes('item.m.jd.com')) return true;
    if (/pinduoduo\.com|yangkeduo\.com/.test(h) && (/goods/i.test(p) || /goods_id=/i.test(q))) return true;
    return false;
  }

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  function extractLocal() {
    const G = window.ImageGrab;
    if (!G) return [];
    const { add, list } = G.createCollector();
    const platform = G.detectPlatform();
    let specialized = [];
    if (platform === 'taobao' && G.extractTaobao) specialized = G.extractTaobao();
    else if (platform === 'jd' && G.extractJd) specialized = G.extractJd();
    else if (platform === 'pdd' && G.extractPdd) specialized = G.extractPdd();

    specialized.forEach((img) => add(img.url, img.w, img.h, img.source));

    const fallbackSource = G.isDescFrame() ? 'detail' : 'other';
    G.scanDom(document, (u, w, h) => add(u, w, h, fallbackSource));
    return list;
  }

  function mergeImages(groups) {
    const G = window.ImageGrab;
    const { add, list } = G.createCollector();
    groups.flat().forEach((img) => add(img.url, img.w, img.h, img.source));
    const order = { main: 0, sku: 1, detail: 2, other: 3 };
    list.sort((a, b) => (order[a.source] ?? 9) - (order[b.source] ?? 9));
    return list;
  }

  async function triggerLazyLoad() {
    const step = Math.max(400, Math.floor(window.innerHeight * 0.8));
    const max = Math.min(document.documentElement.scrollHeight || 0, 12000);
    for (let y = 0; y <= max; y += step) {
      window.scrollTo(0, y);
      await sleep(70);
    }
    const desc = document.querySelector(
      '#description, #J_DivItemDesc, #J-detail-content, #detail-content, [class*="detailDesc"], [class*="goods-detail"]'
    );
    if (desc) {
      desc.scrollIntoView({ block: 'start' });
      try { desc.scrollTop = desc.scrollHeight; } catch (e) { /* ignore */ }
      await sleep(200);
    }
    window.scrollTo(0, 0);
  }

  function collectSameOriginIframes() {
    const G = window.ImageGrab;
    const { add, list } = G.createCollector();
    document.querySelectorAll('iframe').forEach((frame) => {
      try {
        const doc = frame.contentDocument;
        if (doc) G.scanDom(doc, (u, w, h) => add(u, w, h, 'detail'));
      } catch (e) { /* cross-origin */ }
    });
    return list;
  }

  function sendFetchText(url) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'FETCH_TEXT', url }, (res) => resolve(res || { ok: false }));
    });
  }

  async function collectDescHtml() {
    const G = window.ImageGrab;
    const { add, list } = G.createCollector();
    const urls = new Set();
    const blob = [...document.querySelectorAll('script')].map((s) => s.textContent || '').join('\n');
    const re = /descUrl["']?\s*[:=]\s*["'](https?:[^"']+)/gi;
    let m;
    while ((m = re.exec(blob))) {
      urls.add(m[1].replace(/\\u002F/gi, '/').replace(/\\\//g, '/'));
    }
    document.querySelectorAll('iframe').forEach((frame) => {
      const src = frame.src || '';
      if (/desc|alicdn|taobaocdn/i.test(src)) urls.add(src);
    });
    for (const url of urls) {
      const res = await sendFetchText(url);
      if (res.ok && res.text) G.urlsFromHtml(res.text, (u, w, h) => add(u, w, h, 'detail'), 'detail');
    }
    return list;
  }

  function collectCrossOriginIframes() {
    return new Promise((resolve) => {
      const collected = [];
      const frames = Array.from(document.querySelectorAll('iframe'));
      if (!frames.length) {
        resolve(collected);
        return;
      }

      function onMsg(e) {
        if (!e.data || e.data[MSG] !== 'RESULT') return;
        collected.push(...(e.data.images || []));
      }
      window.addEventListener('message', onMsg);

      frames.forEach((frame) => {
        try {
          frame.contentWindow.postMessage({ [MSG]: 'EXTRACT' }, '*');
        } catch (e) { /* ignore */ }
      });

      setTimeout(() => {
        window.removeEventListener('message', onMsg);
        resolve(collected);
      }, 900);
    });
  }

  // 子 frame：响应取图请求，不显示按钮
  if (!isTop()) {
    window.addEventListener('message', (e) => {
      if (!e.data || e.data[MSG] !== 'EXTRACT') return;
      const images = extractLocal();
      try {
        window.top.postMessage({ [MSG]: 'RESULT', images }, '*');
      } catch (err) {
        window.parent.postMessage({ [MSG]: 'RESULT', images }, '*');
      }
    });
    return;
  }

  if (!isDetailPage()) return;

  const btn = document.createElement('button');
  btn.id = '__imageGrabBtn';
  btn.type = 'button';
  btn.textContent = '获取图片';
  document.body.appendChild(btn);

  btn.addEventListener('click', async () => {
    btn.textContent = '提取中...';
    btn.disabled = true;

    try {
      await triggerLazyLoad();
      const local = extractLocal();
      const same = collectSameOriginIframes();
      const cross = await collectCrossOriginIframes();
      const desc = await collectDescHtml();
      const images = mergeImages([local, same, cross, desc]);

      if (!images.length) {
        btn.textContent = '未找到图片';
        setTimeout(() => {
          btn.textContent = '获取图片';
          btn.disabled = false;
        }, 1500);
        return;
      }

      chrome.runtime.sendMessage({
        type: 'OPEN_GALLERY',
        images,
        pageTitle: document.title,
        platform: window.ImageGrab.detectPlatform(),
        pageUrl: location.href
      }, () => {
        btn.textContent = `已提取 ${images.length} 张`;
        setTimeout(() => {
          btn.textContent = '获取图片';
          btn.disabled = false;
        }, 2000);
      });
    } catch (e) {
      btn.textContent = '提取失败';
      setTimeout(() => {
        btn.textContent = '获取图片';
        btn.disabled = false;
      }, 1500);
    }
  });
})();
