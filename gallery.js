let images = [];
let checkedSet = new Set();
let platform = 'other';
let pageTitle = '商品图片';
let pageUrl = '';

const SOURCE_LABEL = { main: '主图', sku: 'SKU', detail: '详情', other: '其他' };

function getStore() {
  return (chrome.storage && chrome.storage.session) ? chrome.storage.session : chrome.storage.local;
}

function platformLabel(p) {
  if (p === 'taobao') return '淘宝';
  if (p === 'jd') return '京东';
  if (p === 'pdd') return '拼多多';
  return '商品';
}

function sanitizeTitle(title) {
  return (title || '商品图')
    .replace(/[\\/:*?"<>|]+/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 40) || '商品图';
}

getStore().get(['__grabImages', '__grabTitle', '__grabPlatform', '__grabPageUrl'], (data) => {
  images = data.__grabImages || [];
  pageTitle = data.__grabTitle || '商品图片';
  platform = data.__grabPlatform || 'other';
  pageUrl = data.__grabPageUrl || '';
  document.getElementById('pageTitle').textContent = pageTitle;
  document.getElementById('totalCount').textContent = String(images.length);
  renderGrid();
});

function renderGrid() {
  const grid = document.getElementById('galleryGrid');
  grid.innerHTML = '';
  if (!images.length) {
    const empty = document.createElement('div');
    empty.className = 'g-empty';
    empty.textContent = '没有可展示的图片';
    grid.appendChild(empty);
    return;
  }

  images.forEach((img, idx) => {
    const card = document.createElement('div');
    card.className = 'g-card';
    card.dataset.idx = String(idx);

    const check = document.createElement('div');
    check.className = 'g-check';

    const picture = document.createElement('img');
    picture.loading = 'lazy';
    picture.referrerPolicy = 'no-referrer';
    picture.alt = SOURCE_LABEL[img.source] || '商品图';
    picture.src = img.url;
    picture.addEventListener('error', () => {
      picture.classList.add('is-broken');
      picture.removeAttribute('src');
    });

    const info = document.createElement('div');
    info.className = 'g-info';
    const left = document.createElement('span');
    left.textContent = `#${String(idx + 1).padStart(3, '0')} ${SOURCE_LABEL[img.source] || ''}`;
    const right = document.createElement('span');
    right.textContent = img.w ? `${img.w}×${img.h || '?'}` : '未知尺寸';
    info.appendChild(left);
    info.appendChild(right);

    card.appendChild(check);
    card.appendChild(picture);
    card.appendChild(info);
    card.addEventListener('click', () => toggleCheck(idx, card));
    grid.appendChild(card);
  });
}

function toggleCheck(idx, card) {
  if (checkedSet.has(idx)) {
    checkedSet.delete(idx);
    card.classList.remove('checked');
  } else {
    checkedSet.add(idx);
    card.classList.add('checked');
  }
  document.getElementById('selectedCount').textContent = String(checkedSet.size);
}

document.getElementById('btnSelectAll').onclick = () => {
  checkedSet = new Set(images.map((_, i) => i));
  document.querySelectorAll('.g-card').forEach((c) => c.classList.add('checked'));
  document.getElementById('selectedCount').textContent = String(checkedSet.size);
};

document.getElementById('btnInvert').onclick = () => {
  const newSet = new Set();
  document.querySelectorAll('.g-card').forEach((c, i) => {
    if (!checkedSet.has(i)) {
      newSet.add(i);
      c.classList.add('checked');
    } else {
      c.classList.remove('checked');
    }
  });
  checkedSet = newSet;
  document.getElementById('selectedCount').textContent = String(checkedSet.size);
};

function downloadOne(payload) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'DOWNLOAD_PNG', ...payload }, (res) => {
      resolve(res || { ok: false });
    });
  });
}

document.getElementById('btnDownload').onclick = async () => {
  if (checkedSet.size === 0) {
    alert('请先勾选要下载的图片');
    return;
  }
  const btn = document.getElementById('btnDownload');
  btn.disabled = true;
  const total = checkedSet.size;
  btn.textContent = `下载中... 0/${total}`;
  document.getElementById('statusBar').textContent = '开始下载。若浏览器询问「是否允许下载多个文件」，请选择允许。';

  const sorted = [...checkedSet].sort((a, b) => a - b);
  const prefix = `${platformLabel(platform)}_${sanitizeTitle(pageTitle)}`;
  let done = 0;
  let converted = 0;
  let failed = 0;

  for (let i = 0; i < sorted.length; i++) {
    const idx = sorted[i];
    const url = images[idx].url;
    const filename = `${prefix}_${String(i + 1).padStart(3, '0')}.png`;
    const res = await downloadOne({ url, filename, pageUrl });
    if (res && res.ok) {
      if (res.converted) converted += 1;
    } else {
      failed += 1;
    }
    done += 1;
    btn.textContent = `下载中... ${done}/${total}`;
    document.getElementById('statusBar').textContent = `正在下载第 ${done}/${total} 张...`;
  }

  btn.disabled = false;
  btn.textContent = '下载选中';
  const extra = failed ? `，失败 ${failed} 张` : '';
  document.getElementById('statusBar').textContent =
    `全部完成，共 ${total} 张（其中 ${converted} 张已转 PNG${extra}）`;
};

window.addEventListener('beforeunload', () => {
  chrome.runtime.sendMessage({ type: 'CLEAR_GRAB' });
});
