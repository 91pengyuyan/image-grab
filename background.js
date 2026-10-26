// background.js - 打开预览页、跨域拉图并转 PNG 下载
const STORE_KEYS = ['__grabImages', '__grabTitle', '__grabPlatform', '__grabPageUrl'];

function getStore() {
  return (chrome.storage && chrome.storage.session) ? chrome.storage.session : chrome.storage.local;
}

function extFromMime(mime, url) {
  if (mime && mime.includes('jpeg')) return 'jpg';
  if (mime && mime.includes('png')) return 'png';
  if (mime && mime.includes('webp')) return 'webp';
  if (mime && mime.includes('gif')) return 'gif';
  const m = (url || '').match(/\.(jpe?g|png|webp|gif)(?:\?|$)/i);
  if (m) return m[1].toLowerCase().replace('jpeg', 'jpg');
  return 'jpg';
}

async function fetchImageBlob(url, pageUrl) {
  const opts = { redirect: 'follow' };
  if (pageUrl) {
    try {
      opts.referrer = pageUrl;
      opts.referrerPolicy = 'origin';
    } catch (e) { /* ignore */ }
  }
  const resp = await fetch(url, opts);
  if (!resp.ok) throw new Error('HTTP ' + resp.status);
  return await resp.blob();
}

async function blobToPngBlob(blob) {
  const bmp = await createImageBitmap(blob);
  const canvas = new OffscreenCanvas(bmp.width, bmp.height);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, bmp.width, bmp.height);
  ctx.drawImage(bmp, 0, 0);
  bmp.close && bmp.close();
  return await canvas.convertToBlob({ type: 'image/png' });
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function downloadBlob(blob, filename) {
  let objectUrl;
  try {
    objectUrl = URL.createObjectURL(blob);
    await startDownload(objectUrl, filename);
  } catch (e) {
    const dataUrl = await blobToDataUrl(blob);
    await startDownload(dataUrl, filename);
  } finally {
    if (objectUrl) setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
  }
}

function startDownload(url, filename) {
  return new Promise((resolve, reject) => {
    chrome.downloads.download({
      url,
      filename,
      conflictAction: 'uniquify',
      saveAs: false
    }, (id) => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
      else resolve(id);
    });
  });
}

async function downloadAsPng({ url, filename, pageUrl }) {
  let blob;
  try {
    blob = await fetchImageBlob(url, pageUrl);
  } catch (e) {
    await startDownload(url, filename.replace(/\.png$/i, '.' + extFromMime('', url)));
    return { ok: true, converted: false };
  }

  try {
    const pngBlob = await blobToPngBlob(blob);
    await downloadBlob(pngBlob, filename);
    return { ok: true, converted: true };
  } catch (e) {
    const ext = extFromMime(blob.type, url);
    const fallbackName = filename.replace(/\.png$/i, '.' + ext);
    try {
      await downloadBlob(blob, fallbackName);
    } catch (e2) {
      await startDownload(url, fallbackName);
    }
    return { ok: true, converted: false };
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'OPEN_GALLERY') {
    const store = getStore();
    store.set({
      __grabImages: msg.images || [],
      __grabTitle: msg.pageTitle || '商品图片',
      __grabPlatform: msg.platform || 'other',
      __grabPageUrl: msg.pageUrl || (sender.tab && sender.tab.url) || ''
    }, () => {
      chrome.tabs.create({ url: chrome.runtime.getURL('gallery.html') });
      sendResponse({ ok: true });
    });
    return true;
  }

  if (msg.type === 'DOWNLOAD_PNG') {
    downloadAsPng(msg)
      .then((r) => sendResponse(r))
      .catch((err) => sendResponse({ ok: false, error: String(err && err.message || err) }));
    return true;
  }

  if (msg.type === 'CLEAR_GRAB') {
    getStore().remove(STORE_KEYS, () => sendResponse({ ok: true }));
    return true;
  }

  if (msg.type === 'FETCH_TEXT') {
    fetch(msg.url, { redirect: 'follow' })
      .then((r) => {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.text();
      })
      .then((text) => sendResponse({ ok: true, text }))
      .catch((err) => sendResponse({ ok: false, error: String(err && err.message || err) }));
    return true;
  }
});
