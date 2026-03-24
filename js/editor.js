// ============================================================
// editor.js — Visual Site Editor Core
// ============================================================

const STORAGE_KEY = 'se_projects';

const state = {
  mode: 'select',
  selectedEl: null,
  history: [],
  historyIndex: -1,
  mobileMode: false,
  project: null,
  isDirty: false,
};

let iframe, canvasWrapper, rightPanel, blockList;
let moveData = { dragging: false, el: null, placeholder: null };

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', init);

function init() {
  iframe = document.getElementById('canvas-iframe');
  canvasWrapper = document.getElementById('canvas-wrapper');
  rightPanel = document.getElementById('right-panel');
  blockList = document.getElementById('block-list');

  const id = new URLSearchParams(location.search).get('id');
  const projects = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  state.project = projects.find(p => p.id === id) || null;

  if (!state.project) {
    document.querySelector('.project-name-label').textContent = 'Нет проекта';
    showToast('Проект не найден');
    return;
  }

  document.querySelector('.project-name-label').textContent = state.project.name;
  bindToolbar();
  bindKeyboard();
  bindAddBlockModal();

  if (state.project.template === 'upload') {
    window.dbCache.get(id).then(data => {
      if (data) {
        if (data.html) state.project.html = data.html;
        if (data.files) state.project.files = data.files;
      }
      loadHTML(state.project.html || '<html><body><h2>Помилка завантаження кешу з браузера</h2></body></html>');
    }).catch(e => {
      console.error(e);
      loadHTML('<html><body><h2>Помилка завантаження кешу з браузера</h2></body></html>');
    });
  } else {
    loadHTML(state.project.html || '<html><body><h2>Пустий проект</h2></body></html>');
  }
}


// ============================================================
// HTML LOADING
// ============================================================
function loadHTML(html) {
  iframe.addEventListener('load', onIframeLoad, { once: true });
  iframe.srcdoc = html;
}

function onIframeLoad() {
  injectEditorStyles();
  injectEditorListeners();
  renderBlockList();
  saveSnapshot();
  setMode('select');
  showToast('Редактор загружен ✓', 'success');
}

function getIDoc() { return iframe.contentDocument; }
function getIWin() { return iframe.contentWindow; }

// ============================================================
// INJECT INTO IFRAME
// ============================================================
function injectEditorStyles() {
  const iDoc = getIDoc();
  let style = iDoc.getElementById('__editor-style__');
  if (style) style.remove();
  style = iDoc.createElement('style');
  style.id = '__editor-style__';
  style.textContent = `
    .__sel { outline: 2px solid #4F9BFF !important; outline-offset: 2px; }
    .__hov { outline: 1px dashed rgba(79,155,255,0.5) !important; outline-offset: 1px; }
    .__drag-over { border-top: 3px solid #4F9BFF; }
    iframe { pointer-events: none !important; }
    * { cursor: default; }
  `;
  iDoc.head.appendChild(style);
}

function injectEditorListeners() {
  const iDoc = getIDoc();

  // Prevent link/form navigation
  iDoc.addEventListener('click', e => {
    if (e.target.tagName === 'A' || e.target.closest('a')) e.preventDefault();
    if (e.target.tagName === 'BUTTON' || e.target.type === 'submit') e.preventDefault();
  }, true);

  // Hover
  iDoc.addEventListener('mouseover', e => {
    if (state.mode === 'text' && state.selectedEl) return;
    iDoc.querySelectorAll('.__hov').forEach(el => el.classList.remove('__hov'));
    const t = resolveTarget(e.target);
    if (t && t !== state.selectedEl) t.classList.add('__hov');
  });
  iDoc.addEventListener('mouseout', () => {
    iDoc.querySelectorAll('.__hov').forEach(el => el.classList.remove('__hov'));
  });

  // Click handler
  iDoc.addEventListener('click', e => {
    e.preventDefault();
    const t = resolveTarget(e.target);
    if (!t) { deselectAll(); return; }

    if (state.mode === 'image' && t.tagName === 'IMG') {
      selectEl(t); triggerImageReplace(t);
    } else if (state.mode === 'text') {
      selectEl(t); enableTextEdit(t);
    } else {
      selectEl(t);
    }
  });
}

function resolveTarget(el) {
  if (!el || el === getIDoc().body || el === getIDoc().documentElement) return null;
  const VALID = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'P', 'SPAN', 'A', 'BUTTON', 'IMG', 'LI', 'DIV', 'SECTION', 'HEADER', 'FOOTER', 'ARTICLE', 'FORM', 'INPUT', 'TEXTAREA', 'LABEL', 'NAV', 'ASIDE', 'MAIN', 'FIGURE', 'IFRAME'];
  if (VALID.includes(el.tagName)) return el;
  return el.parentElement ? resolveTarget(el.parentElement) : null;
}

// ============================================================
// SELECTION
// ============================================================
function selectEl(el) {
  const iDoc = getIDoc();
  iDoc.querySelectorAll('.__sel').forEach(e => e.classList.remove('__sel'));
  state.selectedEl = el;
  el.classList.add('__sel');
  renderRightPanel(el);
  // Highlight in block list
  highlightBlockItem(el);
}

function deselectAll() {
  const iDoc = getIDoc();
  if (!iDoc) return;
  if (state.selectedEl?.contentEditable === 'true') {
    state.selectedEl.contentEditable = 'false';
    saveSnapshot();
  }
  iDoc.querySelectorAll('.__sel').forEach(e => e.classList.remove('__sel'));
  state.selectedEl = null;
  rightPanel.innerHTML = `<div class="panel-empty"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.3;margin-bottom:12px;"><path d="m4 4 7.07 17 2.51-7.39L21 11.07z"/></svg><p>Нажмите на элемент<br>чтобы редактировать</p></div>`;
}

function highlightBlockItem(el) {
  const blocks = getBlocks();
  const blockEl = blocks.find(b => b === el || b.contains(el));
  document.querySelectorAll('.block-item').forEach((item, i) => {
    item.classList.toggle('active', blocks[i] === blockEl);
  });
}

// ============================================================
// MODES
// ============================================================
function setMode(mode) {
  if (state.mode === 'move') disableMoveMode();
  if (state.selectedEl?.contentEditable === 'true') {
    state.selectedEl.contentEditable = 'false';
  }
  state.mode = mode;
  document.querySelectorAll('[data-mode]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });
  const iDoc = getIDoc();
  if (!iDoc) return;
  const cursors = { select: 'default', text: 'text', image: 'crosshair', move: 'grab' };
  iDoc.body.style.cursor = cursors[mode] || 'default';
  if (mode === 'move') enableMoveMode();
  deselectAll();
}

function toggleMobile() {
  state.mobileMode = !state.mobileMode;
  const btn = document.getElementById('btn-mobile');
  if (btn) btn.classList.toggle('active', state.mobileMode);
  const wrapper = document.getElementById('canvas-wrapper');
  if (wrapper) {
    if (state.mobileMode) {
      wrapper.style.width = '375px';
      wrapper.style.margin = '0 auto';
      wrapper.style.transition = 'width 0.3s ease';
    } else {
      wrapper.style.width = '100%';
      wrapper.style.margin = '0';
    }
  }
}

// ============================================================
// TEXT EDITING
// ============================================================
function enableTextEdit(el) {
  const TEXT_TAGS = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'P', 'SPAN', 'A', 'BUTTON', 'LI', 'LABEL', 'TD', 'TH'];
  if (!TEXT_TAGS.includes(el.tagName)) return;

  el.contentEditable = 'true';
  el.focus();

  const range = getIDoc().createRange();
  range.selectNodeContents(el);
  range.collapse(false);
  const sel = getIWin().getSelection();
  sel.removeAllRanges();
  sel.addRange(range);

  el.addEventListener('blur', () => {
    el.contentEditable = 'false';
    saveSnapshot();
    autoSaveProject();
  }, { once: true });

  el.addEventListener('keydown', e => {
    if (e.key === 'Escape') { el.contentEditable = 'false'; el.blur(); }
    if (e.key === 'Enter' && !['P', 'DIV', 'LI'].includes(el.tagName)) e.preventDefault();
  });
}

// ============================================================
// MOVE MODE (block reorder)
// ============================================================
function enableMoveMode() {
  const iDoc = getIDoc();
  if (!iDoc) return;
  getBlocks().forEach(block => {
    block.__onMousedown = e => {
      e.preventDefault();
      moveData.dragging = true;
      moveData.el = block;
      block.style.opacity = '0.5';
      moveData.placeholder = iDoc.createElement('div');
      moveData.placeholder.style.cssText = `height:${block.offsetHeight}px;background:rgba(79,155,255,0.1);border:2px dashed #4F9BFF;border-radius:8px;margin:4px 0;`;
      block.after(moveData.placeholder);
    };
    block.addEventListener('mousedown', block.__onMousedown);
  });
  iDoc.addEventListener('mousemove', onMoveMM);
  iDoc.addEventListener('mouseup', onMoveMU);
}

function onMoveMM(e) {
  if (!moveData.dragging || !moveData.el) return;
  const blocks = getBlocks().filter(b => b !== moveData.el);
  for (let i = 0; i < blocks.length; i++) {
    const rect = blocks[i].getBoundingClientRect();
    if (e.clientY < rect.top + rect.height / 2) {
      blocks[i].before(moveData.placeholder);
      return;
    }
  }
  if (blocks.length) blocks[blocks.length - 1].after(moveData.placeholder);
}

function onMoveMU() {
  if (!moveData.dragging || !moveData.el) return;
  moveData.el.style.opacity = '';
  if (moveData.placeholder?.parentNode) {
    moveData.placeholder.before(moveData.el);
    moveData.placeholder.remove();
  }
  moveData.dragging = false;
  moveData.el = null;
  moveData.placeholder = null;
  saveSnapshot();
  renderBlockList();
}

function disableMoveMode() {
  const iDoc = getIDoc();
  if (!iDoc) return;
  getBlocks().forEach(block => {
    if (block.__onMousedown) { block.removeEventListener('mousedown', block.__onMousedown); delete block.__onMousedown; }
  });
  iDoc.removeEventListener('mousemove', onMoveMM);
  iDoc.removeEventListener('mouseup', onMoveMU);
}

// ============================================================
// IMAGE REPLACE
// ============================================================
function triggerImageReplace() {
  const img = state.selectedEl;
  if (!img || img.tagName !== 'IMG') return;
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = () => {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      img.src = e.target.result;
      state.isDirty = true;
      saveSnapshot();
      renderRightPanel(img);
      showToast('Зображення замінено');
    };
    reader.readAsDataURL(file);
  };
  input.click();
}

// ============================================================
// BLOCKS
// ============================================================
function getBlocks() {
  const iDoc = getIDoc();
  if (!iDoc) return [];

  // Carousel/slider cloned elements to ignore
  const isCarouselClone = (el) =>
    el.classList.contains('cloned') ||
    el.classList.contains('slick-cloned') ||
    // Owl Carousel wraps items; ignore the entire stage-outer wrapper
    el.classList.contains('owl-stage-outer') ||
    el.classList.contains('owl-stage') ||
    el.classList.contains('owl-nav') ||
    el.classList.contains('owl-dots');

  const getVisualChildren = (parent) =>
    [...parent.children].filter(el =>
      !['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'LINK', 'META', 'TITLE'].includes(el.tagName) &&
      el.id !== '__editor-style__' &&
      !isCarouselClone(el)
    );

  let candidates = getVisualChildren(iDoc.body);

  // Dive into a single wrapper DIV/MAIN/ARTICLE that is not a carousel
  while (candidates.length > 0) {
    let wrappers = candidates.filter(c => 
       (c.tagName === 'DIV' || c.tagName === 'MAIN' || c.tagName === 'ARTICLE') &&
       !c.classList.contains('owl-carousel') &&
       !c.classList.contains('slick-slider')
    );
    if (wrappers.length === 0) break;
    
    wrappers.sort((a,b) => getVisualChildren(b).length - getVisualChildren(a).length);
    const topWrapper = wrappers[0];
    const inner = getVisualChildren(topWrapper);
    
    if (candidates.length === 1 && inner.length > 0) {
        candidates = inner;
    } else if (inner.length > candidates.length * 2 && inner.length > 2) {
        // e.g. Body has 2 children (Wrapper, Modal), Wrapper has 6 children. 6 > 4 -> Dive!
        candidates = inner;
    } else {
        break;
    }
  }

  return candidates;
}

function renderBlockList() {
  if (!blockList) return;
  const blocks = getBlocks();
  blockList.innerHTML = '';
  const svgBox = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>`;
  const svgHome = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>`;
  const svgFile = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg>`;
  const svgForm = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/></svg>`;
  const svgMsg = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;
  const icons = { SECTION: svgBox, HEADER: svgHome, FOOTER: svgFile, FORM: svgForm, NAV: svgMsg, ARTICLE: svgFile, ASIDE: svgMsg, MAIN: svgBox };
  const defaultIcon = svgBox;
  let draggedBlockIndex = null;
  blocks.forEach((block, i) => {
    const label = block.dataset.block || block.querySelector('h1,h2,h3')?.textContent?.slice(0, 22) || `Блок ${i + 1}`;
    const icon = icons[block.tagName] || defaultIcon;
    const item = document.createElement('div');
    item.className = 'block-item';
    item.draggable = true;
    item.ondragstart = (e) => {
      draggedBlockIndex = i;
      e.dataTransfer.effectAllowed = 'move';
      item.style.opacity = '0.5';
    };
    item.ondragover = (e) => {
      e.preventDefault();
      item.style.borderTop = '2px solid #4F9BFF';
    };
    item.ondragleave = (e) => {
      item.style.borderTop = '';
    };
    item.ondrop = (e) => {
      e.preventDefault();
      item.style.borderTop = '';
      if (draggedBlockIndex !== null && draggedBlockIndex !== i) {
        window.blockMove(draggedBlockIndex, i);
      }
    };
    item.ondragend = () => {
      item.style.opacity = '1';
      draggedBlockIndex = null;
    };
    item.innerHTML = `
      <div style="cursor:grab; opacity:0.5; margin-right:8px; display:flex; align-items:center;" title="Перетягнути"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/></svg></div>
      <span class="block-item-icon">${icon}</span>
      <span class="block-item-name" title="${label}">${label}</span>
      <div class="block-item-actions">
        <button title="Дублювати" onclick="blockDuplicate(${i})"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="13" height="13" x="9" y="9" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></button>
        <button title="Удалити" class="danger" onclick="blockDelete(${i})"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg></button>
      </div>`;
    item.addEventListener('click', e => {
      if (e.target.tagName === 'BUTTON') return;
      document.querySelectorAll('.block-item').forEach(it => it.classList.remove('active'));
      item.classList.add('active');
      block.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      selectEl(block);
    });
    blockList.appendChild(item);
  });
}

function blockUp(i) {
  const blocks = getBlocks(); if (i <= 0) return;
  blocks[i - 1].before(blocks[i]);
  saveSnapshot(); renderBlockList();
}
function blockDown(i) {
  const blocks = getBlocks(); if (i >= blocks.length - 1) return;
  blocks[i + 1].after(blocks[i]);
  saveSnapshot(); renderBlockList();
}
function blockDuplicate(i) {
  const blocks = getBlocks();
  const clone = blocks[i].cloneNode(true);
  clone.querySelectorAll('.__sel,.__hov').forEach(el => el.classList.remove('__sel', '__hov'));
  clone.querySelectorAll('[contenteditable]').forEach(el => el.removeAttribute('contenteditable'));
  blocks[i].after(clone);
  saveSnapshot(); renderBlockList();
  showToast('Блок дублирован');
}
function blockDelete(i) {
  const blocks = getBlocks();
  if (blocks.length <= 1) { showToast('Нельзя удалить последний блок'); return; }
  if (!confirm('Удалить блок?')) return;
  blocks[i].remove();
  deselectAll(); saveSnapshot(); renderBlockList();
}

// ============================================================
// ADD BLOCKS LIBRARY
// ============================================================
function addNewBlock(type) {
  const iDoc = getIDoc();
  const sec = iDoc.createElement('section');
  const templates = {
    text: { block: 'text', style: 'padding:80px 40px;text-align:center;background:#f8f9ff;', html: `<h2 style="font-size:2rem;font-weight:800;margin-bottom:16px;color:#1a1a2e;">Новый заголовок</h2><p style="color:#666;max-width:600px;margin:0 auto;">Текст нового раздела. Нажмите чтобы редактировать.</p>` },
    image: { block: 'image', style: 'padding:80px 40px;text-align:center;background:#fff;', html: `<img src="https://placehold.co/900x400/667eea/ffffff?text=Ваше+фото" alt="Зображення" style="max-width:100%;border-radius:16px;box-shadow:0 8px 40px rgba(0,0,0,0.12);">` },
    form: { block: 'form', style: 'padding:80px 40px;text-align:center;background:#1a1a2e;color:white;', html: `<h2 style="font-size:2rem;font-weight:800;margin-bottom:40px;">Оставить заявку</h2><form action="order.php" method="post" style="max-width:400px;margin:0 auto;display:flex;flex-direction:column;gap:16px;"><input type="text" name="name" placeholder="Ваше имя" style="padding:14px 20px;border-radius:10px;border:2px solid rgba(255,255,255,0.2);background:rgba(255,255,255,0.1);color:white;font-size:1rem;outline:none;font-family:inherit;"><input type="tel" name="phone" placeholder="Телефон" style="padding:14px 20px;border-radius:10px;border:2px solid rgba(255,255,255,0.2);background:rgba(255,255,255,0.1);color:white;font-size:1rem;outline:none;font-family:inherit;"><button type="submit" style="padding:16px;background:linear-gradient(135deg,#f093fb,#f5576c);color:white;border:none;border-radius:10px;font-size:1.05rem;font-weight:700;cursor:pointer;font-family:inherit;">Отправить</button></form>` },
    cta: { block: 'cta', style: 'padding:80px 40px;text-align:center;background:linear-gradient(135deg,#667eea,#764ba2);color:white;', html: `<h2 style="font-size:2.5rem;font-weight:800;margin-bottom:20px;">Призыв к действию</h2><p style="opacity:0.85;margin-bottom:40px;font-size:1.1rem;">Опишите здесь выгоду для клиента</p><a href="#" style="background:white;color:#667eea;padding:16px 48px;border-radius:50px;text-decoration:none;font-weight:700;font-size:1.1rem;">Кнопка →</a>` },
    features: { block: 'features', style: 'padding:80px 40px;background:#f8f9ff;', html: `<h2 style="text-align:center;font-size:2rem;font-weight:800;margin-bottom:48px;color:#1a1a2e;">Преимущества</h2><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:24px;max-width:1000px;margin:0 auto;"><div style="background:white;border-radius:16px;padding:32px;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,0.06);"><div style="font-size:2.5rem;margin-bottom:16px;">⭐</div><h3 style="font-weight:700;margin-bottom:12px;color:#1a1a2e;">Преимущество 1</h3><p style="color:#666;">Описание</p></div><div style="background:linear-gradient(135deg,#667eea,#764ba2);border-radius:16px;padding:32px;text-align:center;color:white;"><div style="font-size:2.5rem;margin-bottom:16px;">🎯</div><h3 style="font-weight:700;margin-bottom:12px;">Преимущество 2</h3><p style="opacity:0.9;">Описание</p></div><div style="background:white;border-radius:16px;padding:32px;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,0.06);"><div style="font-size:2.5rem;margin-bottom:16px;">💪</div><h3 style="font-weight:700;margin-bottom:12px;color:#1a1a2e;">Преимущество 3</h3><p style="color:#666;">Описание</p></div></div>` },
    testimonials: { block: 'testimonials', style: 'padding:80px 40px;background:white;', html: `<h2 style="text-align:center;font-size:2rem;font-weight:800;margin-bottom:48px;color:#1a1a2e;">Отзывы</h2><div style="display:grid;grid-template-columns:repeat(2,1fr);gap:24px;max-width:900px;margin:0 auto;"><div style="background:#f8f9ff;border-radius:16px;padding:28px;"><div style="color:#f5a623;margin-bottom:12px;font-size:1.1rem;">★★★★★</div><p style="color:#444;line-height:1.7;margin-bottom:20px;">"Отличный продукт! Рекомендую всем!"</p><strong style="color:#1a1a2e;">Иван И.</strong></div><div style="background:#f8f9ff;border-radius:16px;padding:28px;"><div style="color:#f5a623;margin-bottom:12px;font-size:1.1rem;">★★★★★</div><p style="color:#444;line-height:1.7;margin-bottom:20px;">"Всё понравилось! Быстрая доставка."</p><strong style="color:#1a1a2e;">Мария С.</strong></div></div>` },
    video: { block: 'video', style: 'padding:80px 40px;text-align:center;background:#0a0a1a;color:white;', html: `<h2 style="font-size:2rem;font-weight:800;margin-bottom:32px;">Смотрите видео</h2><div style="max-width:700px;margin:0 auto;border-radius:16px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.4);aspect-ratio:16/9;background:#1a1a2e;display:flex;align-items:center;justify-content:center;font-size:4rem;">▶</div>` },
  };

  const t = templates[type] || templates.text;
  sec.dataset.block = t.block;
  sec.style.cssText = t.style;
  sec.innerHTML = t.html;
  getIDoc().body.appendChild(sec);
  sec.scrollIntoView({ behavior: 'smooth' });
  saveSnapshot(); renderBlockList(); selectEl(sec);

  // Close modal
  document.getElementById('add-block-modal').classList.remove('open');
  showToast('Блок добавлен');
}

// ============================================================
// RIGHT PANEL
// ============================================================
function renderRightPanel(el) {
  if (!el) { deselectAll(); return; }
  const tag = el.tagName;
  if (tag === 'IMG') renderImagePanel(el);
  else if (tag === 'IFRAME') renderIframePanel(el);
  else if (tag === 'BUTTON' || (tag === 'INPUT' && ['submit', 'button'].includes(el.type))) renderButtonPanel(el);
  else if (tag === 'A') renderLinkPanel(el);
  else if (tag === 'FORM') renderFormPanel(el);
  else if (tag === 'INPUT' || tag === 'TEXTAREA') renderInputPanel(el);
  else if (['SECTION', 'HEADER', 'FOOTER', 'ARTICLE', 'ASIDE', 'NAV', 'MAIN'].includes(tag)) renderBlockPanel(el);
  else renderGenericPanel(el);
}

function setPanel(html) {
  const deleteBtnHtml = `
    <div class="panel-section" style="margin-top: 20px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 20px;">
      <button class="btn-panel danger" onclick="deleteSelectedElement()" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; background: rgba(255, 71, 87, 0.1); color: #ff4757; border: 1px solid rgba(255, 71, 87, 0.2);">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
        Видалити елемент
      </button>
    </div>
  `;
  rightPanel.innerHTML = `<div class="panel-content">${html}${deleteBtnHtml}</div>`;
}

function renderAdvancedHtmlSection(el) {
  return `
    <div class="panel-section" style="margin-top:20px; border-top:1px solid #333; padding-top:20px;">
      <label class="panel-label">Расширенное редактирование (Raw HTML)</label>
      <textarea id="raw-html-textarea" style="width:100%; height:120px; background:#0b0c10; color:#fff; border:1px solid rgba(255,255,255,0.1); padding:10px; border-radius:8px; font-family:monospace; font-size:12px; resize:vertical; line-height:1.4;">${esc(el.outerHTML)}</textarea>
      <button class="btn-panel" style="width:100%; margin-top:10px; background:linear-gradient(135deg, #667eea, #764ba2); color:white; border:none;" onclick="applyOuterHTML()">Применить HTML</button>
    </div>
  `;
}

window.applyOuterHTML = function() {
  if (!state.selectedEl) return;
  const val = document.getElementById('raw-html-textarea').value;
  if (!val.trim()) return;
  const temp = getIDoc().createElement('div');
  temp.innerHTML = val.trim();
  const newEl = temp.firstElementChild;
  if (!newEl) return;
  state.selectedEl.replaceWith(newEl);
  saveSnapshot();
  selectEl(newEl);
  renderBlockList();
  showToast('HTML обновлен');
};

window.deleteSelectedElement = function() {
  if (!state.selectedEl) return;
  state.selectedEl.remove();
  state.isDirty = true;
  scheduleAutoSave();
  saveSnapshot();
  deselectAll();
  renderBlockList();
  showToast('Елемент видалено');
};

function renderIframePanel(iframe) {
  setPanel(`
    <div class="panel-section"><div class="panel-title">Видео (IFrame)</div></div>
    <div class="panel-section">
      <label class="panel-label">Ссылка на видео (src)</label>
      <input class="panel-input" type="text" value="${esc(iframe.src || iframe.getAttribute('src') || '')}" oninput="applyAttr('src',this.value)" placeholder="https://www.youtube.com/embed/...">
    </div>
    <div class="panel-section">
      <label class="panel-label">Ширина</label>
      <input class="panel-input" type="text" value="${esc(iframe.style.width || iframe.getAttribute('width') || '')}" oninput="applyAttr('width',this.value); applyStyle('width',this.value)" placeholder="100% или 500">
    </div>
    <div class="panel-section">
      <label class="panel-label">Высота</label>
      <input class="panel-input" type="text" value="${esc(iframe.style.height || iframe.getAttribute('height') || '')}" oninput="applyAttr('height',this.value); applyStyle('height',this.value)" placeholder="315">
    </div>
    ${renderAdvancedHtmlSection(iframe)}
  `);
}

function renderImagePanel(img) {
  setPanel(`
    <div class="panel-section"><div class="panel-title"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg> Зображення</div>
      <button class="btn-panel btn-primary" onclick="triggerImageReplace()"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg> Замінити фото</button>
    </div>
    <div class="panel-section">
      <label class="panel-label">Alt текст</label>
      <input class="panel-input" type="text" value="${esc(img.alt)}" oninput="applyAttr('alt',this.value)">
    </div>
    <div class="panel-section">
      <label class="panel-label">Ширина</label>
      <input class="panel-input" type="text" value="${esc(img.style.width || '100%')}" oninput="applyStyle('width',this.value)" placeholder="100% или 300px">
    </div>
    <div class="panel-section">
      <label class="panel-label">Вирівнювання</label>
      <div class="btn-group">
        <button class="tbtn" onclick="applyStyle('display','block');applyStyle('marginLeft','0');applyStyle('marginRight','auto')" title="Ліворуч">⬅</button>
        <button class="tbtn" onclick="applyStyle('display','block');applyStyle('marginLeft','auto');applyStyle('marginRight','auto')" title="По центру">↔</button>
        <button class="tbtn" onclick="applyStyle('display','block');applyStyle('marginLeft','auto');applyStyle('marginRight','0')" title="Праворуч">➡</button>
      </div>
    </div>
    <div class="panel-section">
      <label class="panel-label">Скруглення кутів</label>
      <input class="panel-input" type="text" value="${esc(img.style.borderRadius || '0')}" oninput="applyStyle('borderRadius',this.value)" placeholder="0 или 16px или 50%">
    </div>
    <div class="panel-section">
      <label class="panel-label">Object Fit</label>
      <select class="panel-select" onchange="applyStyle('objectFit',this.value)">
        <option value="contain" ${img.style.objectFit === 'contain' ? 'selected' : ''}>contain</option>
        <option value="cover" ${img.style.objectFit === 'cover' ? 'selected' : ''}>cover</option>
        <option value="fill" ${img.style.objectFit === 'fill' ? 'selected' : ''}>fill</option>
      </select>
    </div>
  `);
}

function renderButtonPanel(btn) {
  const isSubmit = btn.type === 'submit';
  const formEl = btn.closest('form');
  setPanel(`
    <div class="panel-section"><div class="panel-title"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="12" x="2" y="6" rx="6" ry="6"/></svg> Кнопка</div></div>
    <div class="panel-section">
      <label class="panel-label">Текст кнопки</label>
      <input class="panel-input" type="text" value="${esc(btn.textContent.trim())}" oninput="applyText(this.value)">
    </div>
    ${formEl ? `
    <div class="panel-section">
      <label class="panel-label" style="display:flex;align-items:center;">
        Действие формы (action)
        <span title="Тут вказується файл-обробник заявки (напр. order.php або zakaz.php для CRM)" style="margin-left:6px; cursor:help; opacity:0.6;">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
        </span>
      </label>
      <input class="panel-input" type="text" value="${esc(formEl.action?.replace(location.href, '') || formEl.getAttribute('action') || '')}" oninput="applyFormAttr('action',this.value)" placeholder="order.php">
    </div>
    <div class="panel-section">
      <label class="panel-label">Метод (method)</label>
      <select class="panel-select" onchange="applyFormAttr('method',this.value)">
        <option value="post" ${formEl.method === 'post' ? 'selected' : ''}>POST</option>
        <option value="get" ${formEl.method === 'get' ? 'selected' : ''}>GET</option>
      </select>
    </div>` : ''}
    <div class="panel-section">
      <label class="panel-label">Фон кнопки</label>
      <div class="color-row">
        <input type="color" value="${rgbToHex(btn.style.backgroundColor) || '#667eea'}" oninput="applyStyle('backgroundColor',this.value)">
        <input class="panel-input" type="text" value="${esc(btn.style.background || btn.style.backgroundColor || '')}" oninput="applyStyle('background',this.value)" placeholder="linear-gradient(...)">
      </div>
    </div>
    <div class="panel-section">
      <label class="panel-label">Цвет текста</label>
      <div class="color-row">
        <input type="color" value="${rgbToHex(btn.style.color) || '#ffffff'}" oninput="applyStyle('color',this.value)">
      </div>
    </div>
    <div class="panel-section">
      <label class="panel-label">Скругление</label>
      <input class="panel-input" type="text" value="${esc(btn.style.borderRadius || '')}" oninput="applyStyle('borderRadius',this.value)" placeholder="50px">
    </div>
    <div class="panel-section">
      <label class="panel-label">ID</label>
      <input class="panel-input" type="text" value="${esc(btn.id)}" oninput="applyAttr('id',this.value)" placeholder="btn-submit">
    </div>
    ${renderAdvancedHtmlSection(btn)}
  `);
}

function renderLinkPanel(a) {
  setPanel(`
    <div class="panel-section"><div class="panel-title"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg> Ссылка</div></div>
    <div class="panel-section">
      <label class="panel-label">Текст</label>
      <input class="panel-input" type="text" value="${esc(a.textContent.trim())}" oninput="applyText(this.value)">
    </div>
    <div class="panel-section">
      <label class="panel-label">Ссылка (href)</label>
      <input class="panel-input" type="text" value="${esc(a.getAttribute('href') || '')}" oninput="applyAttr('href',this.value)" placeholder="#section или https://...">
    </div>
    <div class="panel-section">
      <label class="panel-label">Открывать в</label>
      <select class="panel-select" onchange="applyAttr('target',this.value)">
        <option value="" ${!a.target ? 'selected' : ''}>Текущей вкладке</option>
        <option value="_blank" ${a.target === '_blank' ? 'selected' : ''}>Новой вкладке</option>
      </select>
    </div>
    <div class="panel-section">
      <label class="panel-label">Фон (для кнопок)</label>
      <div class="color-row">
        <input type="color" value="${rgbToHex(a.style.backgroundColor) || '#667eea'}" oninput="applyStyle('backgroundColor',this.value)">
        <input class="panel-input" type="text" value="${esc(a.style.background || '')}" oninput="applyStyle('background',this.value)" placeholder="linear-gradient(...)">
      </div>
    </div>
    <div class="panel-section">
      <label class="panel-label">Цвет текста</label>
      <div class="color-row">
        <input type="color" value="${rgbToHex(a.style.color) || '#333333'}" oninput="applyStyle('color',this.value)">
      </div>
    </div>
  `);
}

function renderFormPanel(form) {
  setPanel(`
    <div class="panel-section"><div class="panel-title"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/></svg> Форма</div></div>
    <div class="panel-section">
      <label class="panel-label">Действие (action)</label>
      <input class="panel-input" type="text" value="${esc(form.getAttribute('action') || '')}" oninput="applyAttr('action',this.value)" placeholder="order.php">
    </div>
    <div class="panel-section">
      <label class="panel-label">Метод (method)</label>
      <select class="panel-select" onchange="applyAttr('method',this.value)">
        <option value="post" ${form.method === 'post' ? 'selected' : ''}>POST</option>
        <option value="get" ${form.method === 'get' ? 'selected' : ''}>GET</option>
      </select>
    </div>
    <div class="panel-section">
      <label class="panel-label">ID формы</label>
      <input class="panel-input" type="text" value="${esc(form.id)}" oninput="applyAttr('id',this.value)">
    </div>
    <div class="panel-section">
      <label class="panel-label">Name (для интеграций)</label>
      <input class="panel-input" type="text" value="${esc(form.getAttribute('name') || '')}" oninput="applyAttr('name',this.value)" placeholder="order-form">
    </div>
    ${renderAdvancedHtmlSection(form)}
  `);
}

function renderInputPanel(inp) {
  setPanel(`
    <div class="panel-section"><div class="panel-title"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Поле ввода</div></div>
    <div class="panel-section">
      <label class="panel-label">Тип</label>
      <select class="panel-select" onchange="applyAttr('type',this.value)">
        ${['text', 'email', 'tel', 'number', 'password', 'textarea'].map(t => `<option value="${t}" ${inp.type === t ? 'selected' : ''}>${t}</option>`).join('')}
      </select>
    </div>
    <div class="panel-section">
      <label class="panel-label">Placeholder</label>
      <input class="panel-input" type="text" value="${esc(inp.placeholder || '')}" oninput="applyAttr('placeholder',this.value)">
    </div>
    <div class="panel-section">
      <label class="panel-label">Name</label>
      <input class="panel-input" type="text" value="${esc(inp.name || '')}" oninput="applyAttr('name',this.value)" placeholder="field-name">
    </div>
    <div class="panel-section">
      <label class="panel-label">ID</label>
      <input class="panel-input" type="text" value="${esc(inp.id || '')}" oninput="applyAttr('id',this.value)">
    </div>
  `);
}

function renderBlockPanel(block) {
  const bg = block.style.background || block.style.backgroundColor || '';
  const i = getBlocks().indexOf(block);
  setPanel(`
    <div class="panel-section"><div class="panel-title"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg> Блок</div></div>
    <div class="panel-section">
      <label class="panel-label">Название блока (data-block)</label>
      <input class="panel-input" type="text" value="${esc(block.dataset.block || '')}" oninput="applyDataBlock(this.value)" placeholder="hero, features, ...">
    </div>
    <div class="panel-section">
      <label class="panel-label">Фон</label>
      <div class="color-row">
        <input type="color" value="${rgbToHex(block.style.backgroundColor) || '#ffffff'}" oninput="applyStyle('backgroundColor',this.value)">
        <input class="panel-input" type="text" value="${esc(bg)}" oninput="applyStyle('background',this.value)" placeholder="linear-gradient(...)">
      </div>
    </div>
    <div class="panel-section">
      <label class="panel-label">Отступы (padding)</label>
      <input class="panel-input" type="text" value="${esc(block.style.padding || '')}" oninput="applyStyle('padding',this.value)" placeholder="80px 40px">
    </div>
    <div class="panel-section">
      <label class="panel-label">Действия</label>
      ${i >= 0 ? `
      <button class="btn-panel" onclick="blockUp(${i})"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg> Переместить вверх</button>
      <button class="btn-panel" onclick="blockDown(${i})"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg> Переместить вниз</button>
      <button class="btn-panel" onclick="blockDuplicate(${i})"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="13" height="13" x="9" y="9" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Дублировать</button>
      <button class="btn-panel btn-danger" onclick="blockDelete(${i})"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg> Удалить блок</button>
      ` : ''}
    </div>
  `);
}

function renderGenericPanel(el) {
  const tag = el.tagName.toLowerCase();
  const isTitleTag = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag);
  setPanel(`
    <div class="panel-section"><div class="panel-title">&lt;${tag}&gt;</div></div>
    <div class="panel-section">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 6px;">
        <label class="panel-label" style="margin-bottom:0;">Содержимое</label>
        <label style="font-size:11px;color:#aaa;cursor:pointer; display:flex; align-items:center; gap:4px;">
          <input type="checkbox" onchange="toggleRawHTML(this.checked)"> Каша (Raw)
        </label>
      </div>
      <div id="html-filtered-mode">
        <textarea class="panel-input" rows="3" oninput="applyFilteredHTML(this.value)">${esc(filterHtmlMess(el.innerHTML))}</textarea>
      </div>
      <div id="html-raw-mode" style="display:none;">
        <textarea class="panel-input" rows="3" oninput="applyHTML(this.value)">${esc(el.innerHTML)}</textarea>
      </div>
    </div>
    ${isTitleTag ? `
    <div class="panel-section">
      <label class="panel-label">Размер шрифта</label>
      <input class="panel-input" type="text" value="${esc(el.style.fontSize || '')}" oninput="applyStyle('fontSize',this.value)" placeholder="2rem или 32px">
    </div>` : ''}
    <div class="panel-section">
      <label class="panel-label">Цвет текста</label>
      <div class="color-row">
        <input type="color" value="${rgbToHex(el.style.color) || '#333333'}" oninput="applyStyle('color',this.value)">
        <input class="panel-input" type="text" value="${esc(el.style.color || '')}" oninput="applyStyle('color',this.value)">
      </div>
    </div>
    <div class="panel-section">
      <label class="panel-label">Фон</label>
      <div class="color-row">
        <input type="color" value="${rgbToHex(el.style.backgroundColor) || '#ffffff'}" oninput="applyStyle('backgroundColor',this.value)">
      </div>
    </div>
    <div class="panel-section">
      <label class="panel-label">Вирівнювання текста</label>
      <div class="btn-group">
        <button class="tbtn" onclick="applyStyle('textAlign','left')">≡ L</button>
        <button class="tbtn" onclick="applyStyle('textAlign','center')">≡ C</button>
        <button class="tbtn" onclick="applyStyle('textAlign','right')">≡ R</button>
      </div>
    </div>
    <div class="panel-section">
      <label class="panel-label">Размер шрифта</label>
      <input class="panel-input" type="text" value="${esc(el.style.fontSize || '')}" oninput="applyStyle('fontSize',this.value)" placeholder="1rem или 16px">
    </div>
    <div class="panel-section">
      <label class="panel-label">Отступы (padding)</label>
      <input class="panel-input" type="text" value="${esc(el.style.padding || '')}" oninput="applyStyle('padding',this.value)" placeholder="16px 24px">
    </div>
    <div class="panel-section">
      <label class="panel-label">Пользовательский CSS</label>
      <input class="panel-input" type="text" value="${esc(el.getAttribute('style') || '')}" oninput="applyRawStyle(this.value)" placeholder="color:red;font-size:20px">
    </div>
  `);
}

// ============================================================
// APPLY HELPERS (called from panel inline handlers)
// ============================================================
function applyStyle(prop, val) {
  if (!state.selectedEl) return;
  state.selectedEl.style[prop] = val;
  state.isDirty = true;
  scheduleAutoSave();
}
function applyAttr(attr, val) {
  if (!state.selectedEl) return;
  state.selectedEl.setAttribute(attr, val);
  state.isDirty = true;
  scheduleAutoSave();
}
function applyText(val) {
  if (!state.selectedEl) return;
  state.selectedEl.textContent = val;
  state.isDirty = true;
  scheduleAutoSave();
}
function applyFormAttr(attr, val) {
  if (!state.selectedEl) return;
  const form = state.selectedEl.closest('form');
  if (form) { form.setAttribute(attr, val); }
  state.isDirty = true;
}
function applyDataBlock(val) {
  if (!state.selectedEl) return;
  state.selectedEl.dataset.block = val;
  renderBlockList();
}
function applyRawStyle(val) {
  if (!state.selectedEl) return;
  state.selectedEl.setAttribute('style', val);
}

window.blockMove = function(fromIdx, toIdx) {
  const blocks = getBlocks();
  if (fromIdx < 0 || fromIdx >= blocks.length || toIdx < 0 || toIdx >= blocks.length) return;
  const curr = blocks[fromIdx];
  const target = blocks[toIdx];
  if (fromIdx < toIdx) {
    target.after(curr);
  } else {
    target.before(curr);
  }
  state.isDirty = true;
  scheduleAutoSave();
  saveSnapshot();
  renderBlockList();
};

function blockUp(idx) {
  const blocks = getBlocks();
  if (idx <= 0 || idx >= blocks.length) return;
  const curr = blocks[idx];
  const prev = blocks[idx - 1];
  curr.parentNode.insertBefore(curr, prev);
  state.isDirty = true;
  scheduleAutoSave();
  saveSnapshot();
  renderBlockList();
}
function blockDown(idx) {
  const blocks = getBlocks();
  if (idx < 0 || idx >= blocks.length - 1) return;
  const curr = blocks[idx];
  const next = blocks[idx + 1];
  curr.parentNode.insertBefore(next, curr);
  state.isDirty = true;
  scheduleAutoSave();
  saveSnapshot();
  renderBlockList();
}
function blockDuplicate(idx) {
  const blocks = getBlocks();
  if (idx < 0 || idx >= blocks.length) return;
  const curr = blocks[idx];
  const clone = curr.cloneNode(true);
  curr.parentNode.insertBefore(clone, curr.nextSibling);
  state.isDirty = true;
  scheduleAutoSave();
  saveSnapshot();
  renderBlockList();
  showToast('Блок продублирован');
}
let pendingDeleteIdx = -1;

function blockDelete(idx) {
  const blocks = getBlocks();
  if (idx < 0 || idx >= blocks.length) return;
  pendingDeleteIdx = idx;
  document.getElementById('confirm-modal').classList.add('open');
}

function closeConfirmModal() {
  document.getElementById('confirm-modal').classList.remove('open');
  pendingDeleteIdx = -1;
}

function confirmDeleteBlock() {
  if (pendingDeleteIdx === -1) return;
  const blocks = getBlocks();
  if (pendingDeleteIdx < 0 || pendingDeleteIdx >= blocks.length) {
    closeConfirmModal();
    return;
  }
  const curr = blocks[pendingDeleteIdx];
  if (state.selectedEl && curr.contains(state.selectedEl)) deselectAll();
  curr.remove();
  state.isDirty = true;
  scheduleAutoSave();
  saveSnapshot();
  renderBlockList();
  showToast('Блок удален');
  closeConfirmModal();
}

window.closeConfirmModal = closeConfirmModal;
window.confirmDeleteBlock = confirmDeleteBlock;

// keep a ref for inline onclick
window.triggerImageReplace = triggerImageReplace;
window.blockUp = blockUp;
window.blockDown = blockDown;
window.blockDuplicate = blockDuplicate;
window.blockDelete = blockDelete;
window.addNewBlock = addNewBlock;
window.applyStyle = applyStyle;
window.applyAttr = applyAttr;
window.applyText = applyText;
window.applyFormAttr = applyFormAttr;
window.applyDataBlock = applyDataBlock;
window.applyRawStyle = applyRawStyle;
window.applyHTML = applyHTML;

window.toggleRawHTML = function(showRaw) {
  const filtered = document.getElementById('html-filtered-mode');
  const raw = document.getElementById('html-raw-mode');
  if (filtered && raw) {
    filtered.style.display = showRaw ? 'none' : 'block';
    raw.style.display = showRaw ? 'block' : 'none';
  }
};

window.filterHtmlMess = function(html) {
  if (!html) return '';
  return html.replace(/\s*bis_[a-z_]+=(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, '')
             .replace(/\s*data-bis_[a-z_]+=(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, '');
};

window.applyFilteredHTML = function(val) {
  if (!state.selectedEl) return;
  state.selectedEl.innerHTML = val;
  state.isDirty = true;
  scheduleAutoSave();
  saveSnapshot();
  const rawTa = document.querySelector('#html-raw-mode textarea');
  if (rawTa) rawTa.value = state.selectedEl.innerHTML;
};

let currentHeadScripts = [];

function renderInstalledScripts() {
  const container = document.getElementById('pixel-installed-list');
  if (!container) return;
  container.innerHTML = '';
  currentHeadScripts = [];

  const iDoc = getIDoc();
  if (!iDoc) return;

  const nodes = iDoc.head.querySelectorAll('script, noscript');
  nodes.forEach((node, idx) => {
    currentHeadScripts.push(node);
    let previewCode = node.outerHTML; // Show full outer HTML for preview
    if (!previewCode) previewCode = 'Порожній тег';
    
    let shortPreview = node.src ? node.src : node.innerHTML.trim().substring(0, 60);
    if (!shortPreview) shortPreview = 'Порожній тег';
    else if (!node.src) shortPreview += '...';
    
    const esc = s => (s||'').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
    
    const div = document.createElement('div');
    div.style.cssText = 'display:flex; flex-direction:column; background:rgba(255,255,255,0.05); padding:8px 12px; border-radius:6px; border:1px solid rgba(255,255,255,0.1); margin-bottom:4px;';
    div.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <div style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-family:monospace; font-size:12px; color:#aaa; max-width: 290px;" title="${esc(shortPreview)}">
          <strong style="color:#667eea;">&lt;${node.tagName.toLowerCase()}&gt;</strong> ${esc(shortPreview)}
        </div>
        <div style="display:flex; gap:4px;">
          <button onclick="toggleScriptPreview(${idx})" title="Переглянути код" style="background:none; border:none; color:#a090ff; cursor:pointer; padding:4px; border-radius:4px; display:flex; align-items:center; justify-content:center; transition:0.2s;" onmouseover="this.style.background='rgba(102,126,234,0.15)'" onmouseout="this.style.background='none'">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
          <button onclick="deleteInstalledScript(${idx})" title="Видалити" style="background:none; border:none; color:var(--danger); cursor:pointer; padding:4px; border-radius:4px; display:flex; align-items:center; justify-content:center; transition:0.2s;" onmouseover="this.style.background='rgba(245,87,108,0.1)'" onmouseout="this.style.background='none'">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
          </button>
        </div>
      </div>
      <div id="script-preview-${idx}" style="display:none; margin-top:8px; padding-top:8px; border-top:1px solid rgba(255,255,255,0.05); font-family:monospace; font-size:11px; color:#888; white-space:pre-wrap; word-break:break-all; max-height:150px; overflow-y:auto; background:#111; padding:8px; border-radius:4px;">${esc(previewCode)}</div>
    `;
    container.appendChild(div);
  });

  if (currentHeadScripts.length === 0) {
    container.innerHTML = '<div style="color:#666; font-size:13px; font-style:italic;">Немає встановлених скриптів</div>';
  }
}

window.toggleScriptPreview = function(idx) {
  const el = document.getElementById('script-preview-' + idx);
  if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
};

window.deleteInstalledScript = function(idx) {
  const node = currentHeadScripts[idx];
  if (node && node.parentNode) {
    node.parentNode.removeChild(node);
    state.isDirty = true;
    scheduleAutoSave();
    saveSnapshot();
    renderInstalledScripts();
    showToast('Скрипт видалено', 'success');
  }
};

function openPixelModal() {
  document.getElementById('pixel-code-input').value = '';
  renderInstalledScripts();
  document.getElementById('pixel-modal').classList.add('open');
}

function applyPixel() {
  const code = document.getElementById('pixel-code-input').value.trim();
  if (!code) {
    document.getElementById('pixel-modal').classList.remove('open');
    return;
  }
  const iDoc = getIDoc();
  if (iDoc) {
    // Safe injection into head
    const tpl = iDoc.createElement('div');
    tpl.innerHTML = code;
    Array.from(tpl.childNodes).forEach(node => {
      iDoc.head.appendChild(node.cloneNode(true));
    });
    state.isDirty = true;
    scheduleAutoSave();
    saveSnapshot();
    showToast('Піксель успішно додано!', 'success');
  }
  document.getElementById('pixel-modal').classList.remove('open');
}
window.openPixelModal = openPixelModal;
window.applyPixel = applyPixel;

window.openSeoModal = function() {
  const iDoc = getIDoc();
  if (!iDoc) return;
  
  const titleTag = iDoc.querySelector('title');
  const descTag = iDoc.querySelector('meta[name="description"]');
  const favTag = iDoc.querySelector('link[rel="icon"]') || iDoc.querySelector('link[rel="shortcut icon"]');
  const ogImgTag = iDoc.querySelector('meta[property="og:image"]');

  document.getElementById('seo-title-input').value = titleTag ? titleTag.textContent : '';
  document.getElementById('seo-desc-input').value = descTag ? (descTag.getAttribute('content') || '') : '';
  document.getElementById('seo-favicon-input').value = favTag ? (favTag.getAttribute('href') || '') : '';
  document.getElementById('seo-ogimage-input').value = ogImgTag ? (ogImgTag.getAttribute('content') || '') : '';
  
  document.getElementById('seo-modal').classList.add('open');
};

window.applySeo = function() {
  const iDoc = getIDoc();
  if (!iDoc) return;
  
  const title = document.getElementById('seo-title-input').value.trim();
  const desc = document.getElementById('seo-desc-input').value.trim();
  const favicon = document.getElementById('seo-favicon-input').value.trim();
  const ogImage = document.getElementById('seo-ogimage-input').value.trim();
  
  let titleTag = iDoc.querySelector('title');
  if (!titleTag) {
      titleTag = iDoc.createElement('title');
      iDoc.head.appendChild(titleTag);
  }
  titleTag.textContent = title || 'Лендінг';

  let descTag = iDoc.querySelector('meta[name="description"]');
  if (desc) {
      if (!descTag) {
          descTag = iDoc.createElement('meta');
          descTag.setAttribute('name', 'description');
          iDoc.head.appendChild(descTag);
      }
      descTag.setAttribute('content', desc);
  } else if (descTag) {
      descTag.remove();
  }

  let favTag = iDoc.querySelector('link[rel="icon"]') || iDoc.querySelector('link[rel="shortcut icon"]');
  if (favicon) {
      if (!favTag) {
          favTag = iDoc.createElement('link');
          favTag.setAttribute('rel', 'icon');
          iDoc.head.appendChild(favTag);
      }
      favTag.setAttribute('href', favicon);
  } else if (favTag) {
      favTag.remove();
  }

  let ogImgTag = iDoc.querySelector('meta[property="og:image"]');
  if (ogImage) {
      if (!ogImgTag) {
          ogImgTag = iDoc.createElement('meta');
          ogImgTag.setAttribute('property', 'og:image');
          iDoc.head.appendChild(ogImgTag);
      }
      ogImgTag.setAttribute('content', ogImage);
  } else if (ogImgTag) {
      ogImgTag.remove();
  }

  state.isDirty = true;
  scheduleAutoSave();
  saveSnapshot();
  showToast('SEO налаштування збережено!', 'success');
  
  document.getElementById('seo-modal').classList.remove('open');
};

function applyHTML(val) {
  if (!state.selectedEl) return;
  state.selectedEl.innerHTML = val;
  state.isDirty = true;
  scheduleAutoSave();
  saveSnapshot();
}

// ============================================================
// HISTORY (Undo / Redo)
// ============================================================
function saveSnapshot() {
  const iDoc = getIDoc();
  if (!iDoc) return;
  const html = iDoc.documentElement.outerHTML;
  // Trim future history
  state.history = state.history.slice(0, state.historyIndex + 1);
  state.history.push(html);
  if (state.history.length > 50) state.history.shift();
  state.historyIndex = state.history.length - 1;
  updateUndoRedoBtns();
}

function undo() {
  if (state.historyIndex <= 0) return;
  state.historyIndex--;
  restoreSnapshot(state.history[state.historyIndex]);
  showToast('Скасовано');
}

function redo() {
  if (state.historyIndex >= state.history.length - 1) return;
  state.historyIndex++;
  restoreSnapshot(state.history[state.historyIndex]);
  showToast('Повернено');
}

function restoreSnapshot(html) {
  iframe.addEventListener('load', () => {
    injectEditorStyles();
    injectEditorListeners();
    renderBlockList();
    deselectAll();
    updateUndoRedoBtns();
  }, { once: true });
  iframe.srcdoc = html;
}

function updateUndoRedoBtns() {
  const btnUndo = document.getElementById('btn-undo');
  const btnRedo = document.getElementById('btn-redo');
  if (btnUndo) btnUndo.style.opacity = state.historyIndex <= 0 ? '0.4' : '1';
  if (btnRedo) btnRedo.style.opacity = state.historyIndex >= state.history.length - 1 ? '0.4' : '1';
}

// ============================================================
// EXPORT
// ============================================================
async function exportHTML() {
  let currentUser = {};
  try { currentUser = JSON.parse(localStorage.getItem('ve_user') || '{}'); } catch (e) { }

  if (!currentUser.plan || currentUser.plan.toUpperCase() !== 'PRO') {
    if (typeof openPaywallModal === 'function') {
      openPaywallModal();
    } else {
      showToast('Експорт доступний тільки на PRO тарифі (250 грн/міс)', 'error');
    }
    return;
  }

  const iDoc = getIDoc();
  if (!iDoc) return;
  if (!window.JSZip) { showToast('JSZip недоступний!', 'error'); return; }

  showToast('Підготовка архіву...', 'success');

  // Clean editor artifacts
  const clone = iDoc.documentElement.cloneNode(true);
  clone.querySelector('#__editor-style__')?.remove();
  clone.querySelectorAll('.__sel,.__hov').forEach(el => el.classList.remove('__sel', '__hov'));
  clone.querySelectorAll('[contenteditable]').forEach(el => el.removeAttribute('contenteditable'));

  // Clean up Owl Carousel mutations before export
  clone.querySelectorAll('.owl-carousel').forEach(owl => {
    owl.classList.remove('owl-loaded', 'owl-drag', 'owl-hidden', 'owl-grab');
    const stageOuter = owl.querySelector('.owl-stage-outer');
    if (stageOuter) {
      const stage = stageOuter.querySelector('.owl-stage');
      if (stage) {
        const items = stage.querySelectorAll('.owl-item:not(.cloned) > *');
        owl.innerHTML = '';
        items.forEach(item => owl.appendChild(item));
      }
    }
    owl.removeAttribute('style');
  });

  // Clean up Slick mutations
  clone.querySelectorAll('.slick-slider').forEach(slick => {
    slick.classList.remove('slick-initialized', 'slick-slider', 'slick-dotted');
    const track = slick.querySelector('.slick-track');
    if (track) {
      const items = track.querySelectorAll('.slick-slide:not(.slick-cloned) > *');
      slick.innerHTML = '';
      items.forEach(item => slick.appendChild(item));
    }
    slick.removeAttribute('style');
  });

  // Restore inlined <style data-original-href> back to <link rel="stylesheet">
  clone.querySelectorAll('style[data-original-href]').forEach(s => {
    const href = s.getAttribute('data-original-href');
    const newLink = clone.ownerDocument ? clone.ownerDocument.createElement('link') : document.createElement('link');
    newLink.setAttribute('rel', 'stylesheet');
    newLink.setAttribute('href', href);
    s.replaceWith(newLink);
  });

  // Restore inlined <script data-original-src> back to <script src="...">
  clone.querySelectorAll('script[data-original-src]').forEach(s => {
    const src = s.getAttribute('data-original-src');
    const newScript = clone.ownerDocument ? clone.ownerDocument.createElement('script') : document.createElement('script');
    newScript.setAttribute('src', src);
    s.replaceWith(newScript);
  });

  let html = '<!DOCTYPE html>\n' + clone.outerHTML;
  const projectName = (state.project?.name || 'landing').replace(/[^a-z0-9а-яё\\-_ \\.]/gi, '').trim() || 'landing';
  const name = projectName + '.zip';

  try {
    const zip = new JSZip();

    if (state.project.files) {
      for (const [fname, content] of Object.entries(state.project.files)) {
        if (fname === 'index.html' || fname === 'index.php') continue; // Do not overwrite exported HTML
        const isText = /\.(html|css|js|txt|php|json|md|xml)$/i.test(fname);
        zip.file(fname, content, { base64: !isText });
      }
    }

    // CRM Auto-Integration Logic
    // CRM Auto-Integration Logic (GLOBAL)
    let integrations = { enabled: false };
    try {
      integrations = JSON.parse(localStorage.getItem('se_global_integrations') || '{"enabled":false}');
    } catch (e) { console.error('Error parsing integrations', e); }

    if (integrations.enabled && integrations.type) {
      if (integrations.type === 'salesdrive') {
        const sItemId = (integrations.salesdrive_prod_id || '').replace(/'/g, "\\'");
        const sPrice = (integrations.salesdrive_prod_price || '0').replace(/'/g, "\\'");
        const sFbpx = (state.project?.pixelId || '').replace(/'/g, "\\'");
        const sForm = (integrations.salesdrive_form || '').replace(/'/g, "\\'");
        const sKey = (integrations.salesdrive_key || '').replace(/'/g, "\\'");
        const sUrl = (integrations.salesdrive_url || '').replace(/'/g, "\\'");
        
        // 1. my_conf.php
        const myConf = `<?php
$salesdrive_item_id = '${sItemId}';
$item_name = 'Landing Order';
$price = '${sPrice}';
$fbpxid = '${sFbpx}';
$salesdrive_form = '${sForm}';
$salesdrive_key = '${sKey}';
$salesdrive_url = '${sUrl}';
?>`;
        zip.file('my_conf.php', myConf);

        // 2. order.php (Clean version for SalesDrive)
        const orderPhp = `<?php
session_start();
require_once 'my_conf.php';

$products = [];
if (!empty($salesdrive_item_id)) {
    $products[0]["id"] = $salesdrive_item_id;
    $products[0]["name"] = $item_name;
    $products[0]["costPerItem"] = $price;
    $products[0]["amount"] = 1;
}

$_salesdrive_values = [
    "form" => $salesdrive_form,
    "getResultData" => "1",
    "fName" => $_POST['name'] ?? $_POST['fName'] ?? 'Клієнт',
    "phone" => $_POST['phone'] ?? '',
    "comment" => $_POST['comment'] ?? '',
    "prodex24source" => $_POST['utm_source'] ?? '',
];
if (!empty($products)) {
    $_salesdrive_values["products"] = $products;
}

$_salesdrive_ch = curl_init();
curl_setopt($_salesdrive_ch, CURLOPT_URL, ltrim($salesdrive_url));
curl_setopt($_salesdrive_ch, CURLOPT_RETURNTRANSFER, 1);
curl_setopt($_salesdrive_ch, CURLOPT_HTTPHEADER, array('Content-Type:application/json', 'X-Api-Key: ' . $salesdrive_key));
curl_setopt($_salesdrive_ch, CURLOPT_POST, 1);
curl_setopt($_salesdrive_ch, CURLOPT_POSTFIELDS, json_encode($_salesdrive_values));
curl_setopt($_salesdrive_ch, CURLOPT_TIMEOUT, 10);

$_salesdrive_res = curl_exec($_salesdrive_ch);
curl_close($_salesdrive_ch);

$successUrl = 'success.php?' . http_build_query([
    'phone' => $_POST['phone'] ?? '',
    'name' => $_POST['name'] ?? $_POST['fName'] ?? '',
    'price' => $price
]);
header('Location: ' . $successUrl);
exit;
?>`;
        zip.file('order.php', orderPhp);

        // 3. success.php
        const successPhp = `<?php include_once 'my_conf.php'; ?>
<!DOCTYPE html>
<html>
<head>
    <title>Дякуємо за замовлення!</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap">
    <style>
        body { font-family: 'Roboto', sans-serif; background: #f4f7f6; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; }
        .card { background: white; padding: 40px; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); max-width: 400px; width: 90%; }
        h1 { color: #2ecc71; margin-bottom: 10px; font-size: 28px; }
        p { color: #666; font-size: 16px; line-height: 1.6; }
        .btn { display: inline-block; margin-top: 24px; padding: 14px 28px; background: #2ecc71; color: white; text-decoration: none; border-radius: 12px; font-weight: bold; transition: opacity 0.2s; }
        .btn:hover { opacity: 0.9; }
    </style>
</head>
<body>
    <div class="card">
        <h1>Дякуємо!</h1>
        <p>Ваше замовлення успішно прийнято.<br>Наш менеджер зв'яжеться з вами найближчим часом за номером:<br><strong style="font-size:18px; color:#333; display:block; margin-top:8px;"><?php echo htmlspecialchars($_GET['phone'] ?? ''); ?></strong></p>
        <a href="index.html" class="btn">Повернутись на сайт</a>
    </div>
</body>
</html>`;
        zip.file('success.php', successPhp);

      } else {
        // Universal order.php for LP CRM / 7Leads
        const crmType = (integrations.type || '').replace(/'/g, "\\'");
        const apiKey = (integrations.lpcrm_key || integrations.sevenleads_key || '').replace(/'/g, "\\'");
        const apiUrl = (integrations.lpcrm_domain || '').replace(/'/g, "\\'");
        const sevenOffer = (integrations.sevenleads_offer_id || '').replace(/'/g, "\\'");
        const sevenProducts = (integrations.sevenleads_products || '').replace(/'/g, "\\'");
        const sevenPrice = (integrations.sevenleads_price || '').replace(/'/g, "\\'");
        
        const orderPhp = `<?php
header('Content-Type: text/html; charset=utf-8');
$crmType = '${crmType}';
$apiKey = '${apiKey}';
$apiUrl = '${apiUrl}'; 

$name = $_POST['name'] ?? $_POST['fName'] ?? $_POST['bayer_name'] ?? 'Клієнт';
$phone = $_POST['phone'] ?? '+380000000000';
$email = $_POST['email'] ?? '';
$comment = $_POST['comment'] ?? $_POST['product_name'] ?? '';
$ip = $_SERVER['REMOTE_ADDR'];
$success = false;

if ($crmType === 'lpcrm') {
    $apiUrl = rtrim($apiUrl, '/') . '/api/addNewOrder.html';
    if (!str_starts_with($apiUrl, 'http')) $apiUrl = 'https://' . $apiUrl;
    
    $products_list = array(
        0 => array(
            'product_id' => $_POST['product_id'] ?? '1',
            'price'      => $_POST['product_price'] ?? '0',
            'count'      => '1'
        )
    );
    
    $order_id = number_format(round(microtime(true)*10),0,'.','') . rand(10000, 99999);
    $products = urlencode(serialize($products_list));
    $sender = urlencode(serialize($_SERVER));

    $data = array(
        'key'             => $apiKey,
        'order_id'        => $order_id,
        'country'         => 'UA',
        'office'          => '1',
        'products'        => $products,
        'bayer_name'      => $name,
        'phone'           => $phone,
        'email'           => $email,
        'comment'         => $comment,
        'payment'         => '',
        'delivery'        => '',
        'delivery_adress' => '',
        'sender'          => $sender,
        'utm_source'      => $_POST['utm_source'] ?? '',
        'utm_medium'      => $_POST['utm_medium'] ?? '',
        'utm_term'        => $_POST['utm_term'] ?? '',
        'utm_content'     => $_POST['utm_content'] ?? '',
        'utm_campaign'    => $_POST['utm_campaign'] ?? ''
    );
    
    $ch = curl_init(); 
    curl_setopt($ch, CURLOPT_URL, $apiUrl); 
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
    $result = curl_exec($ch); 
    curl_close($ch); 
    $success = true;
} elseif ($crmType === '7leads') {
    $apiUrl = 'https://crm.7leads.xyz/api/order'; 
    $data = [
        'key' => $apiKey, 
        'name' => $name, 
        'phone' => $phone, 
        'email' => $email,
        'country' => 'UA',
        'offer_id' => '${sevenOffer}',
        'products' => '${sevenProducts}',
        'price' => '${sevenPrice}',
        'sale' => '0',
        'domain' => $_SERVER['HTTP_HOST'],
        'uniqid' => uniqid(),
        'ip' => $ip,
        'sub1' => $_POST['utm_source'] ?? '',
        'sub2' => $_POST['utm_medium'] ?? '',
        'sub3' => $_POST['utm_campaign'] ?? '',
        'sub4' => $_POST['utm_term'] ?? '',
        'sub5' => $_POST['utm_content'] ?? ''
    ];
    $ch = curl_init(); 
    curl_setopt($ch, CURLOPT_URL, $apiUrl); 
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($data));
    $result = curl_exec($ch); 
    curl_close($ch); 
    
    // Backup sending
    $ch2 = curl_init();
    curl_setopt($ch2, CURLOPT_URL, 'https://connect.wowsale.info/backup.php');
    curl_setopt($ch2, CURLOPT_POST, true);
    curl_setopt($ch2, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch2, CURLOPT_POSTFIELDS, http_build_query($data));
    curl_exec($ch2);
    curl_close($ch2);

    $success = true;
}

if ($success) { 
    echo '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Дякуємо!</title><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap" rel="stylesheet"><style>body{font-family:"Inter",sans-serif;background:#f8f9ff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center}.card{background:#fff;padding:48px;border-radius:24px;box-shadow:0 10px 40px rgba(0,0,0,.08);max-width:400px;width:90%}h1{color:#2ecc71;margin-bottom:16px;font-size:28px;}p{color:#666;font-size:16px;line-height:1.6}.btn{display:inline-block;margin-top:24px;padding:14px 28px;background:#667eea;color:#fff;text-decoration:none;border-radius:12px;font-weight:700;}.btn:hover{background:#5a6ecc}</style></head><body><div class="card"><h1>Дякуємо!</h1><p>Ваше замовлення успішно прийнято.<br>Ми зв\'яжемося з вами найближчим часом за номером:<br><strong style="font-size:18px; color:#1a1a2e; display:block; margin-top:8px;">' . htmlspecialchars($phone) . '</strong></p><a href="index.html" class="btn">Повернутись на сайт</a></div></body></html>';
} else { 
    echo "<div style='font-family:sans-serif; text-align:center; padding:50px;'>Помилка відправки. Спробуйте пізніше. <a href='index.html'>Повернутися</a></div>"; 
}
?>`;
        zip.file('order.php', orderPhp);
      }
      
      // Update ALL forms to point to order.php
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const forms = doc.querySelectorAll('form');
      if (forms.length > 0) {
        forms.forEach(f => {
          f.setAttribute('action', 'order.php');
          f.setAttribute('method', 'POST');
          // Add essential hidden inputs if they don't exist
          if (!f.querySelector('input[name="utm_source"]')) {
            const utm = doc.createElement('input');
            utm.type = 'hidden'; utm.name = 'utm_source'; utm.value = '';
            f.appendChild(utm);
          }
        });
        html = '<!DOCTYPE html>\n' + doc.documentElement.outerHTML;
      }
    }

    // Add the final edited HTML
    zip.file('index.html', html);

    const base64 = await zip.generateAsync({ type: "base64" });
    const url = "data:application/zip;base64," + base64;

    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => document.body.removeChild(a), 100);
    showToast('Архів ' + name + ' успішно завантажено ✓', 'success');
  } catch (e) {
    console.error(e);
    showToast('Помилка при експорті', 'error');
  }
}

// ============================================================
// MOBILE PREVIEW
// ============================================================
function toggleMobile() {
  state.mobileMode = !state.mobileMode;
  canvasWrapper.classList.toggle('mobile-mode', state.mobileMode);
  const btn = document.getElementById('btn-mobile');
  if (btn) btn.classList.toggle('active', state.mobileMode);

  const iDoc = getIDoc();
  if (iDoc) {
    let zoomVal = 1;
    if (state.mobileMode) {
      let width = 375;
      const meta = iDoc.querySelector('meta[name="viewport"]');
      if (meta) {
        let content = meta.getAttribute('content') || '';
        let m = content.match(/width=(\d+)/);
        if (m && m[1]) width = parseInt(m[1], 10);
      }
      zoomVal = 375 / width;
    }
    iDoc.documentElement.style.zoom = zoomVal;
  }
  showToast(state.mobileMode ? 'Мобільний вигляд' : 'Десктоп вигляд');
}

// ============================================================
// SAVE
// ============================================================
let saveTimer;
function scheduleAutoSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => autoSaveProject(), 1500);
}

function autoSaveProject(quiet = false) {
  if (!state.project) return;
  const iDoc = getIDoc();
  if (!iDoc) return;
  const clone = iDoc.documentElement.cloneNode(true);
  clone.querySelector('#__editor-style__')?.remove();
  clone.querySelectorAll('.__sel,.__hov').forEach(el => el.classList.remove('__sel', '__hov'));
  clone.querySelectorAll('[contenteditable]').forEach(el => el.removeAttribute('contenteditable'));
  const html = '<!DOCTYPE html>\n' + clone.outerHTML;
  const projects = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  const idx = projects.findIndex(p => p.id === state.project.id);
  
  if (state.project.template === 'upload' && window.dbCache) {
    window.dbCache.get(state.project.id).then(data => {
      const cacheData = data || { files: null };
      cacheData.html = html;
      window.dbCache.set(state.project.id, cacheData);
    });
  }

  state.project.html = html;
  state.isDirty = false;

  if (idx >= 0) {
    projects[idx].html = html;
    projects[idx].updatedAt = Date.now();
  } else {
    // If not in array, push it now!
    state.project.updatedAt = Date.now();
    projects.push(state.project);
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  } catch(e) {
    console.error("LocalStorage full:", e);
    if (!quiet) showToast("Локальний кеш переповнений. Видаліть старі проєкти!", "warning");
  }

  let currentUser = null;
  try { currentUser = JSON.parse(localStorage.getItem('ve_user')); } catch (e) { }

  if (currentUser && currentUser.token && state.project.id.length > 15 /* server id heuristic */) {
    fetch('/api/projects/' + state.project.id, {
      method: 'PUT',
      headers: { 'Authorization': 'Bearer ' + currentUser.token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: (idx >= 0 ? projects[idx].name : state.project.name), html: html })
    })
    .then(res => {
        if (!res.ok) throw new Error('API error');
        if (!quiet) showToast('Збережено ✓', 'success');
    })
    .catch(e => {
        console.error(e);
        if (!quiet) showToast('Помилка сервера. Збережено локально', 'error');
    });
  } else {
    if (!quiet) showToast('Збережено локально ✓', 'success');
  }
}

// ============================================================
// FILE MANAGER & GLOBAL CODE
// ============================================================
let currentEditingFile = null;

window.switchSidebarTab = function(tab) {
  document.getElementById('tab-blocks').classList.toggle('active', tab === 'blocks');
  document.getElementById('tab-files').classList.toggle('active', tab === 'files');
  document.getElementById('block-list').style.display = tab === 'blocks' ? 'block' : 'none';
  document.getElementById('file-list').style.display = tab === 'files' ? 'block' : 'none';
  document.getElementById('sidebar-header-blocks').style.display = tab === 'blocks' ? 'flex' : 'none';
  document.getElementById('sidebar-header-files').style.display = tab === 'files' ? 'flex' : 'none';

  if (tab === 'files') {
    renderFileList();
  }
};

window.renderFileList = function() {
  const container = document.getElementById('file-list');
  container.innerHTML = '';
  if (!state.project || !state.project.files) {
    container.innerHTML = '<div style="padding:20px; text-align:center; color:#888;">Нет файлов проекта</div>';
    return;
  }

  const filesObj = state.project.files;
  const paths = Object.keys(filesObj).sort();
  
  const tree = {};
  paths.forEach(p => {
    const parts = p.split('/');
    if (parts.length === 1) {
      if (!tree['/']) tree['/'] = [];
      tree['/'].push(p);
    } else {
      const folder = parts[0];
      if (!tree[folder]) tree[folder] = [];
      tree[folder].push(p);
    }
  });

  if (tree['/']) {
    tree['/'].forEach(p => {
      container.appendChild(createFileItem(p));
    });
  }
  
  Object.keys(tree).forEach(folder => {
    if (folder === '/') return;
    
    const wrapper = document.createElement('div');
    wrapper.style.marginBottom = '2px';
    
    const fDiv = document.createElement('div');
    fDiv.className = 'file-folder';
    fDiv.style.cursor = 'pointer';
    fDiv.style.display = 'flex';
    fDiv.style.alignItems = 'center';
    fDiv.style.userSelect = 'none';
    
    const chevron = document.createElement('span');
    chevron.innerHTML = '▶';
    chevron.style.fontSize = '9px';
    chevron.style.marginRight = '8px';
    chevron.style.transition = 'transform 0.2s';
    chevron.style.opacity = '0.6';
    
    const label = document.createElement('span');
    label.textContent = '📁 ' + folder;
    
    fDiv.appendChild(chevron);
    fDiv.appendChild(label);
    
    const childrenContainer = document.createElement('div');
    childrenContainer.style.display = 'none';
    childrenContainer.style.flexDirection = 'column';
    childrenContainer.style.paddingLeft = '4px';
    
    tree[folder].forEach(p => {
      const item = createFileItem(p);
      item.style.paddingLeft = '24px';
      childrenContainer.appendChild(item);
    });
    
    fDiv.onclick = () => {
      const isExpanded = childrenContainer.style.display !== 'none';
      childrenContainer.style.display = isExpanded ? 'none' : 'flex';
      chevron.style.transform = isExpanded ? 'rotate(0deg)' : 'rotate(90deg)';
      fDiv.style.opacity = isExpanded ? '1' : '0.8';
    };
    
    wrapper.appendChild(fDiv);
    wrapper.appendChild(childrenContainer);
    container.appendChild(wrapper);
  });
};

function createFileItem(path) {
  const isImage = /\.(png|jpe?g|gif|webp|svg|ico)$/i.test(path);
  const isCode = /\.(js|css|php|json|md|xml|txt|html?)$/i.test(path);
  const div = document.createElement('div');
  div.className = 'file-item';
  let icon = '📄';
  if (isImage) icon = '🖼️';
  else if (path.endsWith('.js')) icon = '📜';
  else if (path.endsWith('.css')) icon = '🎨';
  else if (path.endsWith('.php')) icon = '🐘';
  
  const filename = path.split('/').pop();
  div.innerHTML = `<span class="file-item-icon">${icon}</span> <span title="${path}">${filename}</span>`;
  
  div.onclick = () => {
    if (isImage) {
      showToast('Предпросмотр картинок доступен только в экспорте', 'info');
      return;
    }
    if (isCode) openFileEditor(path);
    else showToast('Файл нельзя открыть');
  };
  return div;
}

window.openGlobalCodeEditor = function() {
  saveSnapshot();
  const iDoc = getIDoc();
  if (!iDoc) return;
  const clone = iDoc.documentElement.cloneNode(true);
  clone.querySelector('#__editor-style__')?.remove();
  clone.querySelectorAll('.__sel,.__hov').forEach(el => el.classList.remove('__sel', '__hov'));
  clone.querySelectorAll('[contenteditable]').forEach(el => el.removeAttribute('contenteditable'));
  
  clone.querySelectorAll('.owl-carousel').forEach(owl => {
    owl.classList.remove('owl-loaded', 'owl-drag', 'owl-hidden', 'owl-grab');
    const stageOuter = owl.querySelector('.owl-stage-outer');
    if (stageOuter) {
      const stage = stageOuter.querySelector('.owl-stage');
      if (stage) {
        const items = stage.querySelectorAll('.owl-item:not(.cloned) > *');
        owl.innerHTML = '';
        items.forEach(item => owl.appendChild(item));
      }
    }
    owl.removeAttribute('style');
  });
  
  clone.querySelectorAll('.slick-slider').forEach(slick => {
    slick.classList.remove('slick-initialized', 'slick-slider', 'slick-dotted');
    const track = slick.querySelector('.slick-track');
    if (track) {
      const items = track.querySelectorAll('.slick-slide:not(.slick-cloned) > *');
      slick.innerHTML = '';
      items.forEach(item => slick.appendChild(item));
    }
    slick.removeAttribute('style');
  });

  const html = '<!DOCTYPE html>\n' + clone.outerHTML;
  document.getElementById('code-editor-title').innerHTML = 'Код сторінки (index.html)';
  currentEditingFile = 'index.html';
  document.getElementById('code-editor-modal').classList.add('open');
  initCodeEditor(html, "htmlmixed");
};

let cmEditor = null;

function initCodeEditor(val, mode) {
  const ta = document.getElementById('code-editor-textarea');
  if (!cmEditor) {
    cmEditor = CodeMirror.fromTextArea(ta, {
      lineNumbers: true,
      mode: mode || "htmlmixed",
      theme: "dracula",
      lineWrapping: true,
      extraKeys: {
        "F11": function(cm) { cm.setOption("fullScreen", !cm.getOption("fullScreen")); },
        "Esc": function(cm) { if (cm.getOption("fullScreen")) cm.setOption("fullScreen", false); }
      }
    });
    const titleObj = document.getElementById('code-editor-title');
    titleObj.innerHTML += ' <span style="font-size:12px; font-weight:normal; color:#aaa; margin-left:10px;">(F11 - На весь екран, Ctrl+F - Пошук)</span>';
  }
  cmEditor.setOption("mode", mode || "htmlmixed");
  cmEditor.setValue(val);
  setTimeout(() => cmEditor.refresh(), 100);
}

window.openFileEditor = function(path) {
  const content = state.project.files[path] || '';
  document.getElementById('code-editor-title').innerHTML = path;
  currentEditingFile = path;
  document.getElementById('code-editor-modal').classList.add('open');
  
  let mode = "htmlmixed";
  if (path.endsWith('.css')) mode = "css";
  if (path.endsWith('.js')) mode = "javascript";
  if (path.endsWith('.php')) mode = "application/x-httpd-php";
  initCodeEditor(content, mode);
};

window.closeCodeEditorModal = function() {
  document.getElementById('code-editor-modal').classList.remove('open');
  if (cmEditor && cmEditor.getOption("fullScreen")) {
    cmEditor.setOption("fullScreen", false);
  }
  currentEditingFile = null;
};

window.saveCodeEditor = function() {
  const val = cmEditor ? cmEditor.getValue() : document.getElementById('code-editor-textarea').value;
  if (!currentEditingFile) return;

  if (currentEditingFile === 'index.html') {
    iframe.srcdoc = val;
    iframe.addEventListener('load', () => {
      injectEditorStyles();
      injectEditorListeners();
      renderBlockList();
    }, { once: true });
    showToast('index.html обновлен', 'success');
  } else {
    state.project.files[currentEditingFile] = val;
    autoSaveProject(false);
    showToast('Файл ' + currentEditingFile + ' сохранен', 'success');
  }
  closeCodeEditorModal();
};

// ============================================================
// TOOLBAR / KEYBOARD
// ============================================================
function bindToolbar() {
  document.querySelectorAll('[data-mode]').forEach(btn => {
    btn.addEventListener('click', () => setMode(btn.dataset.mode));
  });
  document.getElementById('btn-undo')?.addEventListener('click', undo);
  document.getElementById('btn-redo')?.addEventListener('click', redo);
  document.getElementById('btn-mobile')?.addEventListener('click', toggleMobile);
  document.getElementById('btn-export')?.addEventListener('click', exportHTML);
  document.getElementById('btn-save')?.addEventListener('click', () => {
    saveSnapshot();
    autoSaveProject(false);
  });
  document.getElementById('btn-back')?.addEventListener('click', () => {
    if (state.isDirty) autoSaveProject(true);
    location.href = 'index.html';
  });
  document.getElementById('btn-add-block')?.addEventListener('click', () => {
    document.getElementById('add-block-modal').classList.add('open');
  });
}

function bindKeyboard() {
  document.addEventListener('keydown', e => {
    if (e.ctrlKey && e.key === 'z') { e.preventDefault(); undo(); }
    if (e.ctrlKey && e.key === 'y') { e.preventDefault(); redo(); }
    if (e.ctrlKey && e.key === 's') { e.preventDefault(); autoSaveProject(false); }
    if (e.key === 'Escape') deselectAll();
  });
}

function bindAddBlockModal() {
  const modal = document.getElementById('add-block-modal');
  modal?.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('open'); });
}

// ============================================================
// UTILITIES
// ============================================================
function esc(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function rgbToHex(rgb) {
  if (!rgb) return '';
  if (rgb.startsWith('#')) return rgb;
  const m = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/i);
  if (!m) return '';
  return '#' + [m[1], m[2], m[3]].map(n => parseInt(n).toString(16).padStart(2, '0')).join('');
}

function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.className = 'toast' + (type ? ' ' + type : '');
  t.classList.add('show');
  clearTimeout(t.__timer);
  t.__timer = setTimeout(() => t.classList.remove('show'), 2500);
}

function previewProject() {

  saveSnapshot();

  autoSaveProject(false);



  const iDoc = getIDoc();

  if (!iDoc) return;

  const clone = iDoc.documentElement.cloneNode(true);

  clone.querySelector('#__editor-style__')?.remove();

  clone.querySelectorAll('.__sel,.__hov').forEach(el => el.classList.remove('__sel', '__hov'));

  clone.querySelectorAll('[contenteditable]').forEach(el => el.removeAttribute('contenteditable'));



  const html = '<!DOCTYPE html>\n' + clone.outerHTML;



  const newWin = window.open('', '_blank');

  if (newWin) {

    newWin.document.open();

    newWin.document.write(html);

    newWin.document.close();

  } else {

    showToast('Разрешите всплывающие окна для предпросмотра', 'error');

  }

}



function previewMobileProject() {

  saveSnapshot();

  autoSaveProject(false);



  const iDoc = getIDoc();

  if (!iDoc) return;

  const clone = iDoc.documentElement.cloneNode(true);

  clone.querySelector('#__editor-style__')?.remove();

  clone.querySelectorAll('.__sel,.__hov').forEach(el => el.classList.remove('__sel', '__hov'));

  clone.querySelectorAll('[contenteditable]').forEach(el => el.removeAttribute('contenteditable'));



  const html = '<!DOCTYPE html>\n' + clone.outerHTML;



  const newWin = window.open('', '_blank', 'width=375,height=812,resizable=no,scrollbars=yes,status=no,toolbar=no,menubar=no,location=no');

  if (newWin) {

    newWin.document.open();

    newWin.document.write(html);

    newWin.document.close();

  } else {

    showToast('Разрешите всплывающие окна для предпросмотра', 'error');

  }

}

function initEditor() {
  bindToolbar();
  bindKeyboard();
  bindAddBlockModal();
}

initEditor();
