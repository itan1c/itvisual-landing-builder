// ============================================================
// dashboard.js — Project Manager for Visual Site Editor
// ============================================================

const STORAGE_KEY = 'se_projects';

let currentUser = null;
try { currentUser = JSON.parse(localStorage.getItem('ve_user')); } catch (e) { }

if ((!currentUser || !currentUser.token) && window.location.href.includes('dashboard')) {
    localStorage.removeItem('ve_user');
    window.location.href = 'login.html';
}

document.addEventListener('DOMContentLoaded', () => {
    if (currentUser) {
        const emailEl = document.getElementById('user-email');
        const badgeEl = document.getElementById('user-plan-badge');
        if (emailEl) emailEl.textContent = currentUser.email;
        if (badgeEl) {
            if (currentUser.plan && currentUser.plan.toUpperCase() === 'PRO') {
                badgeEl.textContent = 'PRO';
                badgeEl.style.background = 'rgba(102,126,234,0.2)';
                badgeEl.style.color = '#667eea';
            } else {
                badgeEl.textContent = 'Free (Оновити)';
                badgeEl.style.background = 'rgba(255,255,255,0.1)';
                badgeEl.style.color = '#aaa';
            }
        }
        if (currentUser.email.includes('admin@') || currentUser.email.includes('visual') || currentUser.email === 'ivashuta19811@gmail.com') {
            const adminLink = document.getElementById('admin-link');
            if (adminLink) adminLink.style.display = 'inline';
        }
        syncProjects();
        initPaymentListeners();
    }
});

function checkPaywall() {
    if (!currentUser || !currentUser.plan || currentUser.plan.toUpperCase() !== 'PRO') {
        if (getProjects().length >= 1) {
            if (typeof openPaywallModal === 'function') openPaywallModal();
            return false;
        }
    }
    return true;
}

function saveProfile() {
    const lang = document.getElementById('lang-select').value;
    localStorage.setItem('ve_lang', lang);
    showToast('Налаштування збережено');
    setTimeout(() => location.reload(), 1000);
}

window.openPaywallModal = function (e) {
    if (e) e.preventDefault();
    if (!currentUser || !currentUser.token) return;

    const emailCodeEl = document.getElementById('payment-comment-code');
    if (emailCodeEl) emailCodeEl.textContent = currentUser.email;

    const payUrl = `https://send.monobank.ua/jar/8ZBBSrSxoq?a=250&text=${encodeURIComponent(currentUser.email)}`;
    const payBtn = document.getElementById('btn-pay-mono');
    if (payBtn) payBtn.href = payUrl;

    document.getElementById('payment-modal')?.classList.add('open');
};

// openProfileModal is defined in dashboard.html inline script

// Add verification listener in a separate block or in DOMContentLoaded 
function initPaymentListeners() {
    const verifyBtn = document.getElementById('btn-verify-payment');
    if (verifyBtn) {
        verifyBtn.onclick = async () => {
            const err = document.getElementById('payment-error-msg');
            verifyBtn.textContent = 'Перевіряємо...';
            verifyBtn.disabled = true;
            if (err) err.style.display = 'none';

            try {
                const res = await fetch('/api/payment/verify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token: currentUser.token })
                });
                const data = await res.json();
                if (data.success) {
                    currentUser.plan = 'PRO';
                    localStorage.setItem('ve_user', JSON.stringify(currentUser));
                    document.getElementById('payment-modal')?.classList.remove('open');
                    showToast('🎉 PRO активовано!', 'success');
                    setTimeout(() => location.reload(), 2000);
                } else {
                    if (err) {
                        err.textContent = data.error || 'Оплата ще не надійшла. Спробуйте через 1 хвилину.';
                        err.style.display = 'block';
                    }
                }
            } catch (e) {
                if (err) {
                    err.textContent = "Помилка з'єднання. Спробуйте пізніше.";
                    err.style.display = 'block';
                }
            } finally {
                verifyBtn.textContent = 'Я оплатив — Перевірити';
                verifyBtn.disabled = false;
            }
        };
    }

    document.getElementById('payment-modal')?.addEventListener('click', e => {
        if (e.target.id === 'payment-modal') e.target.classList.remove('open');
    });
}

function logout() {
    localStorage.removeItem('ve_user');
    window.location.href = 'login.html';
}


// ---- UTILITIES ----
function genId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
function fmtDate(ts) {
    if (!ts) return '';
    const date = new Date(ts);
    const now = new Date();
    
    // Normalize to start of day for accurate day differences
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfTarget = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    const diffInDays = Math.round((startOfToday - startOfTarget) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'Сьогодні';
    if (diffInDays === 1) return 'Вчора';
    if (diffInDays > 1 && diffInDays < 7) return `${diffInDays} дн. тому`;
    
    return date.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' });
}
function showToast(msg, type = '') {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.className = 'toast' + (type ? ' ' + type : '');
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2800);
}

// ---- PROJECT STORAGE ----
async function syncProjects() {
    if (!currentUser || !currentUser.token) return;
    try {
        const res = await fetch('/api/projects', { headers: { 'Authorization': 'Bearer ' + currentUser.token } });
        if (res.ok) {
            const serverProjects = await res.json();
            localStorage.setItem(STORAGE_KEY, JSON.stringify(serverProjects));
            renderProjects();
        }
    } catch (e) { }
}

function apiProjectOp(method, project, id = '') {
    if (!currentUser || !currentUser.token) return;
    const url = id ? '/api/projects/' + id : '/api/projects';
    fetch(url, {
        method,
        headers: { 'Authorization': 'Bearer ' + currentUser.token, 'Content-Type': 'application/json' },
        body: method !== 'DELETE' ? JSON.stringify(project) : null
    }).catch(e => console.error(e));
}

function getProjects() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
    catch { return []; }
}
function saveProjects(projects) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}
function getProject(id) {
    return getProjects().find(p => p.id === id) || null;
}
function deleteProject(id) {
    saveProjects(getProjects().filter(p => p.id !== id));
    apiProjectOp('DELETE', null, id);
}

// ---- TEMPLATE LOADER ----
async function loadTemplate(name) {
    const path = `templates/${name}.html`;
    try {
        const res = await fetch(path);
        if (!res.ok) throw new Error('Not found');
        return await res.text();
    } catch {
        // Fallback if fetch fails (file:// protocol)
        return FALLBACK_TEMPLATES[name] || FALLBACK_TEMPLATES.blank;
    }
}

const FALLBACK_TEMPLATES = {
    blank: `<!DOCTYPE html><html lang="uk"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Лендинг</title><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;800;900&display=swap" rel="stylesheet"><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Inter',sans-serif;color:#1a1a2e;line-height:1.6}</style></head><body><section data-block="hero" style="background:linear-gradient(135deg,#667eea,#764ba2);color:white;text-align:center;padding:120px 40px"><h1 style="font-size:3rem;font-weight:900;margin-bottom:20px;">Заголовок вашого лендінгу</h1><p style="font-size:1.2rem;margin-bottom:48px;opacity:0.9;max-width:560px;margin-left:auto;margin-right:auto;">Опишіть ваш товар або послугу тут</p><a href="#contact" style="background:white;color:#667eea;padding:18px 52px;border-radius:50px;text-decoration:none;font-weight:700;font-size:1.1rem;display:inline-block;">Замовити →</a></section><section data-block="contact" id="contact" style="background:#f8f9ff;padding:100px 40px;text-align:center"><h2 style="font-size:2rem;font-weight:800;margin-bottom:48px;color:#1a1a2e;">Залишіть заявку</h2><form action="order.php" method="post" style="max-width:420px;margin:0 auto;display:flex;flex-direction:column;gap:16px"><input type="text" name="name" placeholder="Ваше ім'я" style="padding:16px 22px;border:2px solid #e8e8f0;border-radius:12px;font-size:1rem;font-family:inherit;outline:none"><input type="tel" name="phone" placeholder="Телефон" style="padding:16px 22px;border:2px solid #e8e8f0;border-radius:12px;font-size:1rem;font-family:inherit;outline:none"><button type="submit" style="padding:18px;background:linear-gradient(135deg,#667eea,#764ba2);color:white;border:none;border-radius:12px;font-size:1.1rem;font-weight:700;font-family:inherit;cursor:pointer;">Відправити заявку</button></form></section></body></html>`,
};

// ---- RENDER PROJECTS ----
function renderProjects() {
    const projects = getProjects();
    const grid = document.getElementById('projects-grid');
    if (!grid) return;

    grid.innerHTML = '';

    // "Create new" card
    const createCard = document.createElement('div');
    createCard.className = 'create-card';
    createCard.innerHTML = `
    <div class="create-card-icon">+</div>
    <div class="create-card-label">Створити лендінг</div>
    <div style="font-size:0.8rem;color:var(--text-muted)">З шаблону або свого файлу</div>
  `;
    createCard.addEventListener('click', openCreateModal);
    grid.appendChild(createCard);

    if (projects.length === 0) {
        const empty = document.createElement('div');
        empty.style.cssText = 'grid-column:1/-1;text-align:center;padding:48px;color:var(--text-muted);font-size:0.9rem;';
        empty.textContent = 'Поки немає проєктів. Створіть перший!';
        grid.appendChild(empty);
        return;
    }

    // Sort by updated_at descending (double check client-side)
    projects.sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0));

    projects.forEach(project => {
        const card = document.createElement('div');
        card.className = 'project-card';
        card.innerHTML = `
      <div class="project-preview">
        <iframe id="preview-${project.id}" srcdoc="${project.html ? escapeHtml(project.html) : ''}" scrolling="no" tabindex="-1"></iframe>
      </div>
      <div class="project-info">
        <div class="project-name">${escapeHtml(project.name)}</div>
        <div class="project-meta">Змінено ${fmtDate(project.updated_at || project.updatedAt || project.created_at || project.createdAt)}</div>
        <div class="project-actions">
          <button class="btn btn-primary btn-sm" onclick="openProject('${project.id}')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Редагувати</button>
          <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();openShareModal('${project.id}')" title="Поділитися проєктом"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg></button>
          <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();duplicateProjectById('${project.id}')" title="Клонувати"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="13" height="13" x="9" y="9" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></button>
          <button class="btn btn-danger btn-sm" onclick="event.stopPropagation();confirmDeleteProject('${project.id}')" title="Видалити"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg></button>
        </div>
      </div>
    `;
        card.querySelector('.project-preview').addEventListener('click', () => openProject(project.id));
        grid.appendChild(card);

        // Hydrate from DB Cache if necessary
        if (!project.html && project.template === 'upload') {
            window.dbCache.get(project.id).then(data => {
                if (data && data.html) {
                    const ifr = document.getElementById(`preview-${project.id}`);
                    if (ifr) ifr.srcdoc = data.html;
                }
            });
        }
    });
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function openProject(id) {
    window.location.href = `editor.html?id=${id}`;
}

let projectToShare = null;
window.openShareModal = function(id) {
    projectToShare = id;
    const modal = document.getElementById('share-modal');
    const input = document.getElementById('share-target-email');
    if (modal) modal.classList.add('open');
    if (input) { input.value = ''; input.focus(); }
};

window.openStorageInfoModal = function() {
    document.getElementById('storage-info-modal')?.classList.add('open');
};

async function confirmShare() {
    const email = document.getElementById('share-target-email').value.trim();
    if (!email || !email.includes('@')) { showToast('Введіть коректний email'); return; }
    
    const project = getProjects().find(p => p.id === projectToShare);
    if (!project) { showToast('Проєкт не знайдено'); return; }

    const btn = document.getElementById('btn-confirm-share');
    btn.disabled = true;
    btn.textContent = 'Передача...';

    // Hydrate HTML from IDB if it's an uploaded project with large content
    let htmlContent = project.html;
    if (!htmlContent && project.template === 'upload' && window.dbCache) {
        const cached = await window.dbCache.get(projectToShare);
        if (cached && cached.html) htmlContent = cached.html;
    }

    try {
        const res = await fetch('/api/projects/share', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + currentUser.token, 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId: projectToShare, targetEmail: email, project: { ...project, html: htmlContent } })
        });
        const data = await res.json();
        if (data.success) {
            showToast(`Проєкт успішно передано користувачу ${email}!`, 'success');
            document.getElementById('share-modal').classList.remove('open');
        } else {
            showToast(data.error || 'Помилка при передачі');
        }
    } catch (e) {
        showToast('Помилка з\'єднання');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Передати проєкт';
    }
}
window.openConfirmModal = function(options) {
    const modal = document.getElementById('confirm-modal');
    if (!modal) return;
    
    document.getElementById('confirm-modal-title').textContent = options.title || 'Підтвердіть дію';
    document.getElementById('confirm-modal-msg').textContent = options.message || '';
    
    const icon = document.getElementById('confirm-modal-icon');
    icon.className = 'share-modal-icon ' + (options.type || 'danger');
    if (options.icon) icon.innerHTML = options.icon;
    
    const confirmBtn = document.getElementById('btn-modal-confirm');
    confirmBtn.style.background = options.type === 'success' ? '#4ade80' : (options.type === 'primary' ? 'var(--accent)' : 'var(--danger)');
    confirmBtn.style.borderColor = confirmBtn.style.background;
    confirmBtn.onclick = () => {
        modal.classList.remove('open');
        if (options.onConfirm) options.onConfirm();
    };
    
    modal.classList.add('open');
};

function duplicateProjectById(id) {
    const project = getProject(id);
    if (!project) return;
    
    openConfirmModal({
        title: 'Клонувати проєкт?',
        message: `Створити повну копію проєкту "${project.name}"?`,
        type: 'primary',
        icon: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="13" height="13" x="9" y="9" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
        onConfirm: async () => {
            const copyId = crypto.randomUUID();
            // Hydrate HTML if it's an upload template
            let htmlContent = project.html;
            if (!htmlContent && project.template === 'upload' && window.dbCache) {
                const cached = await window.dbCache.get(id);
                if (cached) htmlContent = cached.html;
            }
            
            const copy = { 
                ...project, 
                id: copyId, 
                name: project.name + ' (копія)', 
                updated_at: new Date().toISOString()
            };
            
            const projects = getProjects();
            projects.unshift(copy); // Put at start for immediate feedback
            saveProjects(projects);
            renderProjects();
            
            try {
                // Post to server (including html if hydrated)
                const res = await fetch('/api/projects', {
                    method: 'POST',
                    headers: { 'Authorization': 'Bearer ' + currentUser.token, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...copy, html: htmlContent })
                });
                if (res.ok) showToast('Проєкт клоновано', 'success');
                else showToast('Помилка синхронізації копії');
            } catch (e) {
                showToast('Помилка з\'єднання');
            }
        }
    });
}

function confirmDeleteProject(id) {
    const project = getProject(id);
    if (!project) return;
    
    openConfirmModal({
        title: 'Видалити проєкт?',
        message: `Ви дійсно хочете видалити "${project.name}"? Цю дію неможливо скасувати.`,
        type: 'danger',
        onConfirm: async () => {
            const projects = getProjects().filter(p => p.id !== id);
            saveProjects(projects);
            renderProjects();
            
            try {
                const res = await fetch(`/api/projects/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': 'Bearer ' + currentUser.token }
                });
                if (res.ok) showToast('Проєкт видалено');
                else showToast('Помилка видалення на сервері');
            } catch (e) {
                showToast('Помилка з\'єднання');
            }
        }
    });
}

// ---- CREATE MODAL ----
function openCreateModal() {
    document.getElementById('modal-overlay').classList.add('open');
    document.getElementById('project-name').focus();
}
function closeCreateModal() {
    document.getElementById('modal-overlay').classList.remove('open');
    document.getElementById('project-name').value = '';
    selectedTemplate = 'blank';
    document.querySelectorAll('.template-option').forEach(el => el.classList.remove('selected'));
    document.querySelector('[data-template="blank"]')?.classList.add('selected');
}

let selectedTemplate = 'blank';

async function createProject() {
    if (!checkPaywall()) return;
    const nameEl = document.getElementById('project-name');
    const name = (nameEl.value || '').trim();
    if (!name) { nameEl.focus(); showToast('Введите название проекта'); return; }

    const activeTabObj = document.querySelector('#create-tabs .tab.active');
    const activeTab = activeTabObj ? activeTabObj.dataset.target : 'tab-templates';

    if (activeTab === 'tab-clone') {
        const urlInput = document.getElementById('clone-url-input');
        let url = (urlInput.value || '').trim();
        if (!url) { urlInput.focus(); showToast('Введіть URL'); return; }
        if (!url.startsWith('http')) url = 'https://' + url;
        
        const overlay = document.getElementById('upload-overlay');
        if (overlay) overlay.style.display = 'flex';
        setProgress(10, 'Парсинг сторінки...');
        
        try {
            const res = await fetch('/api/scrape', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url })
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'Помилка завантаження');
            
            setProgress(30, 'Парсинг DOM та підготовка ресурсів...');
            const base = new URL(data.finalUrl);
            const doc = new DOMParser().parseFromString(data.html, 'text/html');
            let filesObj = {};
            
            const arrayBufferToBase64 = (buffer) => {
                let binary = '';
                const bytes = new Uint8Array(buffer);
                for (let i = 0; i < bytes.byteLength; i++) {
                    binary += String.fromCharCode(bytes[i]);
                }
                return btoa(binary);
            };

            const fetchAsset = async (assetUrl, asData = false) => {
               try {
                   const r = await fetch('/api/proxy?url=' + encodeURIComponent(assetUrl));
                   if (!r.ok) return null;
                   if (asData) {
                       const buf = await r.arrayBuffer();
                       const mime = r.headers.get('content-type') || 'application/octet-stream';
                       return { data: arrayBufferToBase64(buf), mime };
                   }
                   return await r.text();
               } catch(e) { return null; }
            };

            const getFilename = (assetUrl, prefix, ext) => {
                try {
                    let pathname = new URL(assetUrl).pathname;
                    let name = pathname.split('/').pop() || 'file';
                    name = name.split('?')[0].split('#')[0];
                    if (!name.includes('.')) name += ext;
                    return prefix + '/' + name.replace(/[^a-zA-Z0-9.-]/g, '_');
                } catch(e) { return prefix + '/file_' + Math.floor(Math.random()*1000) + ext; }
            };

            // 1. CSS
            const links = Array.from(doc.querySelectorAll('link[rel="stylesheet"]'));
            for (let i=0; i<links.length; i++) {
                setProgress(30 + Math.floor((i/links.length)*20), `Завантаження CSS ${i+1}/${links.length}...`);
                const href = links[i].getAttribute('href');
                if (!href) continue;
                const fullUrl = new URL(href, base).href;
                let cssText = await fetchAsset(fullUrl, false);
                if (cssText) {
                    const fname = getFilename(fullUrl, 'css', '.css');
                    // replace url() with absolute links inside css to prevent broken images
                    cssText = cssText.replace(/url\((["']?)([^"')]+)\1\)/g, (m, p1, p2) => {
                        if (p2.startsWith('data:')) return m;
                        try { return `url("${new URL(p2, fullUrl).href}")`; } catch(e) { return m; }
                    });
                    filesObj[fname] = cssText;
                    const styleNode = doc.createElement('style');
                    styleNode.setAttribute('data-original-href', fname);
                    styleNode.textContent = cssText;
                    links[i].replaceWith(styleNode);
                }
            }

            // 2. Images
            const imgs = Array.from(doc.querySelectorAll('img'));
            for (let i=0; i<imgs.length; i++) {
                setProgress(50 + Math.floor((i/imgs.length)*25), `Завантаження картинок ${i+1}/${imgs.length}...`);
                const src = imgs[i].getAttribute('src');
                if (!src || src.startsWith('data:')) continue;
                const fullUrl = new URL(src, base).href;
                const asset = await fetchAsset(fullUrl, true);
                if (asset) {
                    const extFromMime = asset.mime.split('/')[1] || 'jpg';
                    const fname = getFilename(fullUrl, 'img', '.' + extFromMime);
                    filesObj[fname] = asset.data;
                    imgs[i].setAttribute('src', `data:${asset.mime};base64,${asset.data}`);
                } else {
                    imgs[i].setAttribute('src', fullUrl); // fallback
                }
            }

            // 3. JS
            const scripts = Array.from(doc.querySelectorAll('script[src]'));
            const collectedScripts = [];
            for (let i=0; i<scripts.length; i++) {
                setProgress(75 + Math.floor((i/scripts.length)*20), `Завантаження скриптів ${i+1}/${scripts.length}...`);
                const src = scripts[i].getAttribute('src');
                if (!src) continue;
                const fullUrl = new URL(src, base).href;
                const jsText = await fetchAsset(fullUrl, false);
                if (jsText) {
                    const fname = getFilename(fullUrl, 'js', '.js');
                    filesObj[fname] = jsText;
                    collectedScripts.push(`<script data-original-src="${fname}">\n${jsText.replace(/<\/script>/gi, '<\\/script>')}\n</script>`);
                    scripts[i].replaceWith(doc.createComment(`inlined-js:${fname}`));
                }
            }

            setProgress(98, 'Створення проєкту...');
            
            if (collectedScripts.length > 0) {
                const body = doc.body || doc.documentElement;
                const scriptsNode = doc.createElement('div');
                scriptsNode.innerHTML = collectedScripts.join('\n');
                while(scriptsNode.firstChild) {
                    body.appendChild(scriptsNode.firstChild);
                }
            }
            
            let finalHtml = doc.documentElement.outerHTML;
            // Rewrite remaining absolute links
            finalHtml = finalHtml.replace(/(src|href)=["'](?!http|data|ftp|mailto|#|\/\/)([^"']+)["']/gi, (match, attr, path) => {
                try { return `${attr}="${new URL(path, base).href}"`; } catch(e) { return match; }
            });
            finalHtml = finalHtml.replace(/(src|href)=["']\/\/([^"']+)["']/gi, (match, attr, path) => {
                return `${attr}="https://${path}"`;
            });

            const completeHtml = '<!DOCTYPE html>\n' + finalHtml;
            filesObj['index.html'] = completeHtml;

            await saveUploadedProject(name, completeHtml, filesObj);
            if (overlay) overlay.style.display = 'none';
            return;
        } catch(e) {
            if (overlay) overlay.style.display = 'none';
            showToast('Помилка: ' + e.message, 'error');
            return;
        }
    }

    const html = await loadTemplate(selectedTemplate);
    const now = Date.now();
    const project = { id: genId(), name, template: selectedTemplate, html, createdAt: now, updatedAt: now };

    const projects = getProjects();
    projects.push(project);
    saveProjects(projects);
    apiProjectOp('POST', project);

    closeCreateModal();
    renderProjects();
    showToast('Проект создан!', 'success');

    // Open in editor immediately
    setTimeout(() => openProject(project.id), 400);
}

// ---- UPLOAD HTML FILE ----
const setProgress = (pct, text) => {
    const el = document.getElementById('upload-progress-bar');
    if (el) el.style.width = pct + '%';
    const txt = document.getElementById('upload-status-text');
    if (txt) txt.textContent = text;
};

async function handleFileUpload(file) {
    if (!file) return;
    if (!checkPaywall()) return;

    if (file.name.endsWith('.html')) {
        const reader = new FileReader();
        reader.onload = (e) => saveUploadedProject(file.name.replace('.html', ''), e.target.result);
        reader.readAsText(file);
    } else if (file.name.endsWith('.zip')) {
        if (!window.JSZip || !window.dbCache) { showToast('Завантаження залежностей...', 'error'); return; }

        const overlay = document.getElementById('upload-overlay');
        if (overlay) overlay.style.display = 'flex';
        setProgress(5, 'Читання архіву...');

        try {
            const zip = await JSZip.loadAsync(file);
            const files = Object.keys(zip.files);

            setProgress(15, 'Пошук головного файлу...');
            const htmlFiles = files.filter(f => f.endsWith('.html') && !f.includes('__MACOSX'));
            let htmlFilepath = htmlFiles.find(f => f.endsWith('index.html')) || htmlFiles[0];
            if (!htmlFilepath) throw new Error('HTML-файл не знайдено');
            const htmlNode = zip.files[htmlFilepath];
            if (!htmlNode) throw new Error('Помилка читання HTML');
            let htmlContent = await htmlNode.async('text');

            const rootDir = htmlFilepath.includes('/') ? htmlFilepath.substring(0, htmlFilepath.lastIndexOf('/') + 1) : '';
            const getRelName = (fname) => fname.startsWith(rootDir) ? fname.substring(rootDir.length) : fname;

            setProgress(30, 'Обробка таблиць стилів...');
            const cssFiles = files.filter(f => f.endsWith('.css') && f.startsWith(rootDir) && !f.includes('__MACOSX'));
            for (let cssPath of cssFiles) {
                const zf = zip.files[cssPath];
                if (!zf || zf.dir) continue;
                const cssText = await zf.async('text');

                const filename = cssPath.split('/').pop();
                const safeCssPath = getRelName(cssPath).replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
                const safeFilename = filename.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');

                const linkRegex = new RegExp(`<link[^>]*href=["']/?([\\w\\-/:\\.]*?)(${safeCssPath}|${safeFilename})["'][^>]*>`, 'gi');
                htmlContent = htmlContent.replace(linkRegex, (match) => {
                    const hrefMatch = match.match(/href=["']([^"']+)["']/i);
                    const origHref = hrefMatch ? hrefMatch[1] : getRelName(cssPath);
                    return `<style data-original-href="${origHref}">\n${cssText}\n</style>`;
                });
            }

            setProgress(45, 'Підготовка зображень...');
            const imgFiles = files.filter(f => /\.(png|jpe?g|svg|gif|webp)$/i.test(f) && f.startsWith(rootDir) && !f.includes('__MACOSX'));
            for (let i = 0; i < imgFiles.length; i++) {
                if (i % 5 === 0) setProgress(45 + Math.floor((i / imgFiles.length) * 35), `Дістаю зображення ${i + 1}/${imgFiles.length}`);
                let imgPath = imgFiles[i];
                const zf = zip.files[imgPath];
                if (!zf || zf.dir) continue;
                const ext = imgPath.split('.').pop().toLowerCase();
                const mimeTypes = { 'png': 'image/png', 'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'svg': 'image/svg+xml', 'gif': 'image/gif', 'webp': 'image/webp' };
                const mime = mimeTypes[ext] || 'image/png';
                const base64 = await zf.async('base64');
                const dataURI = `data:${mime};base64,${base64}`;

                const filename = imgPath.split('/').pop();
                const safeImgPath = getRelName(imgPath).replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
                const safeFilename = filename.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
                const pathRegex = new RegExp(`['"\\(]/?([\\w\\-/:\\.]*?)(${safeImgPath}|${safeFilename})['"\\)]`, 'gi');

                htmlContent = htmlContent.replace(pathRegex, (match) => {
                    const quote = match[0];
                    const endQuote = match[match.length - 1];
                    return `${quote}${dataURI}${endQuote}`;
                });
            }

            setProgress(60, 'Обробка скриптів...');
            const jsFiles = files.filter(f => f.endsWith('.js') && f.startsWith(rootDir) && !f.includes('__MACOSX'));
            const collectedScriptTags = [];
            for (let jsPath of jsFiles) {
                const zf = zip.files[jsPath];
                if (!zf || zf.dir) continue;
                let jsText = await zf.async('text');

                const filename = jsPath.split('/').pop();
                const safeJsPath = getRelName(jsPath).replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
                const safeFilename = filename.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');

                const jsRegex = new RegExp(`<script[^>]*src=["']/?([\\w\\-/:\\.]*?)(${safeJsPath}|${safeFilename})["'][^>]*>\\s*<\\/script>`, 'gi');
                htmlContent = htmlContent.replace(jsRegex, (match) => {
                    const srcMatch = match.match(/src=["']([^"']+)["']/i);
                    const origSrc = srcMatch ? srcMatch[1] : getRelName(jsPath);
                    const safeJsText = jsText.replace(/<\/script>/gi, '<\\/script>');
                    collectedScriptTags.push(`<script data-original-src="${origSrc}">\n${safeJsText}\n<\/script>`);
                    return `<!-- inlined-js:${origSrc} -->`;
                });
            }
            // Move all local JS scripts to end of body so CDN libs (jQuery etc.) load first
            if (collectedScriptTags.length > 0) {
                const allScripts = '\n' + collectedScriptTags.join('\n');
                htmlContent = htmlContent.replace(/<\/body>/i, allScripts + '\n</body>');
            }

            setProgress(85, 'Кешування структури файлів...');
            const filesObj = {};
            for (let fname of files) {
                const zf = zip.files[fname];
                if (!zf || zf.dir || fname.includes('__MACOSX') || !fname.startsWith(rootDir)) continue;
                const isText = /\.(html|css|js|txt|php|json|md|xml)$/i.test(fname);
                const relName = getRelName(fname);
                filesObj[relName] = await zf.async(isText ? 'text' : 'base64');
            }

            setProgress(95, 'Створення проекту...');
            await saveUploadedProject(file.name.replace('.zip', ''), htmlContent, filesObj);

            if (overlay) overlay.style.display = 'none';
        } catch (e) {
            console.error(e);
            if (document.getElementById('upload-overlay')) document.getElementById('upload-overlay').style.display = 'none';
            showToast('Помилка: ' + (e.message || 'формат архіву'), 'error');
        }
    } else {
        showToast('Только HTML или ZIP файлы');
    }
}

async function saveUploadedProject(name, htmlContent, filesObj = null) {
    const now = Date.now();
    const id = genId();

    // Cache massively sized objects in DB so localStorage doesn't hit 5MB limit
    if (filesObj || htmlContent.length > 300000) {
        await window.dbCache.set(id, { html: htmlContent, files: filesObj });

        const project = { id, name, template: 'upload', html: '', createdAt: now, updatedAt: now };
        const projects = getProjects();
        projects.push(project);
        saveProjects(projects);
        apiProjectOp('POST', project);
    } else {
        const project = { id, name, template: 'upload', html: htmlContent, createdAt: now, updatedAt: now };
        const projects = getProjects();
        projects.push(project);
        saveProjects(projects);
        apiProjectOp('POST', project);
    }

    closeCreateModal();
    renderProjects();
    showToast('Проект завантажено!', 'success');
    setTimeout(() => openProject(id), 400);
}

// ---- CRM INTEGRATIONS ----
window.openIntegrationsModal = function() {
    document.getElementById('integrations-modal').classList.add('open');
    loadIntegrations();
};

window.closeIntegrationsModal = function() {
    document.getElementById('integrations-modal').classList.remove('open');
};

function loadIntegrations() {
    const data = JSON.parse(localStorage.getItem('se_global_integrations') || '{}');
    document.getElementById('crm-enabled').value = data.enabled ? 'true' : 'false';
    document.getElementById('lpcrm-domain').value = data.lpcrm_domain || '';
    document.getElementById('lpcrm-key').value = data.lpcrm_key || '';
    document.getElementById('7leads-key').value = data.sevenleads_key || '';
    if (document.getElementById('7leads-offer-id')) document.getElementById('7leads-offer-id').value = data.sevenleads_offer_id || '';
    if (document.getElementById('7leads-products')) document.getElementById('7leads-products').value = data.sevenleads_products || '';
    if (document.getElementById('7leads-price')) document.getElementById('7leads-price').value = data.sevenleads_price || '';
    document.getElementById('salesdrive-url').value = data.salesdrive_url || '';
    document.getElementById('salesdrive-key').value = data.salesdrive_key || '';
    document.getElementById('salesdrive-form').value = data.salesdrive_form || '';
    document.getElementById('salesdrive-prod-id').value = data.salesdrive_prod_id || '';
    document.getElementById('salesdrive-prod-price').value = data.salesdrive_prod_price || '';
    
    if (data.type) selectCRM(data.type);
    toggleCRMFields();
}

window.saveIntegrations = function() {
    const data = {
        enabled: document.getElementById('crm-enabled').value === 'true',
        type: window.currentCRMTab || 'lpcrm',
        lpcrm_domain: document.getElementById('lpcrm-domain').value,
        lpcrm_key: document.getElementById('lpcrm-key').value,
        sevenleads_key: document.getElementById('7leads-key').value,
        sevenleads_offer_id: document.getElementById('7leads-offer-id') ? document.getElementById('7leads-offer-id').value : '',
        sevenleads_products: document.getElementById('7leads-products') ? document.getElementById('7leads-products').value : '',
        sevenleads_price: document.getElementById('7leads-price') ? document.getElementById('7leads-price').value : '',
        salesdrive_url: document.getElementById('salesdrive-url').value,
        salesdrive_key: document.getElementById('salesdrive-key').value,
        salesdrive_form: document.getElementById('salesdrive-form').value,
        salesdrive_prod_id: document.getElementById('salesdrive-prod-id').value,
        salesdrive_prod_price: document.getElementById('salesdrive-prod-price').value
    };
    localStorage.setItem('se_global_integrations', JSON.stringify(data));
    showToast('Налаштування збережено!', 'success');
    closeIntegrationsModal();
};

window.toggleCRMFields = function() {
    const enabled = document.getElementById('crm-enabled').value === 'true';
    document.getElementById('crm-settings').style.display = enabled ? 'block' : 'none';
};

window.selectCRM = function(crm) {
    window.currentCRMTab = crm;
    document.querySelectorAll('.tab-crm').forEach(t => {
        const isActive = t.dataset.crm === crm;
        t.classList.toggle('active', isActive);
        t.style.background = isActive ? 'rgba(102,126,234,0.2)' : 'transparent';
        t.style.color = isActive ? '#fff' : '#888';
    });
    document.querySelectorAll('.crm-panel').forEach(p => p.style.display = 'none');
    document.getElementById('crm-' + crm).style.display = 'block';
};

// ---- TAB SWITCH ----
function switchTab(targetId) {
    if (!targetId) return; // ignore tabs without target to avoid conflict with crm tabs
    document.querySelectorAll('.tab').forEach(t => {
        if (t.dataset.target) {
            t.classList.toggle('active', t.dataset.target === targetId);
        }
    });
    const templates = document.getElementById('tab-templates');
    const upload = document.getElementById('tab-upload');
    const cloneTab = document.getElementById('tab-clone');
    if (templates) templates.style.display = targetId === 'tab-templates' ? '' : 'none';
    if (upload) upload.style.display = targetId === 'tab-upload' ? '' : 'none';
    if (cloneTab) cloneTab.style.display = targetId === 'tab-clone' ? '' : 'none';
}

// ---- INIT ----
document.addEventListener('DOMContentLoaded', () => {
    renderProjects();

    // Template selection
    document.querySelectorAll('.template-option').forEach(opt => {
        opt.addEventListener('click', () => {
            selectedTemplate = opt.dataset.template;
            document.querySelectorAll('.template-option').forEach(o => o.classList.remove('selected'));
            opt.classList.add('selected');
        });
    });

    // Create button
    document.getElementById('btn-create-project')?.addEventListener('click', createProject);

    // Close modal on overlay click
    document.getElementById('modal-overlay')?.addEventListener('click', (e) => {
        if (e.target === e.currentTarget) closeCreateModal();
    });

    // Enter to create
    document.getElementById('project-name')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') createProject();
        if (e.key === 'Escape') closeCreateModal();
    });

    // Tab switching
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.target));
    });

    // Share confirmation
    document.getElementById('btn-confirm-share')?.addEventListener('click', confirmShare);
    document.getElementById('share-modal')?.addEventListener('click', (e) => {
        if (e.target.id === 'share-modal') e.target.classList.remove('open');
    });

    // Storage info modal closure
    document.getElementById('storage-info-modal')?.addEventListener('click', (e) => {
        if (e.target.id === 'storage-info-modal') e.target.classList.remove('open');
    });

    // File upload zone
    const uploadZone = document.getElementById('upload-zone');
    const fileInput = document.getElementById('file-input');
    uploadZone?.addEventListener('click', () => fileInput?.click());
    uploadZone?.addEventListener('dragover', (e) => { e.preventDefault(); uploadZone.classList.add('drag-over'); });
    uploadZone?.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
    uploadZone?.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('drag-over');
        handleFileUpload(e.dataTransfer.files[0]);
    });
    fileInput?.addEventListener('change', () => handleFileUpload(fileInput.files[0]));
});

// ==========================================
// STORAGE INFO MODAL
// ==========================================
window.openStorageInfoModal = function() {
  const modal = document.getElementById('storage-info-modal');
  if (!modal) return;
  
  let totalBytes = 0;
  for (let key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      totalBytes += ((localStorage[key].length + key.length) * 2);
    }
  }
  const maxBytes = 5 * 1024 * 1024;
  let megaBytes = (totalBytes / (1024 * 1024)).toFixed(2);
  let percentage = Math.min(100, (totalBytes / maxBytes) * 100);

  document.getElementById('storage-usage-text').innerText = `${megaBytes} MB / ~5.00 MB`;
  document.getElementById('storage-usage-bar').style.width = `${percentage}%`;
  document.getElementById('storage-usage-bar').style.background = percentage > 90 ? 'var(--danger)' : 'linear-gradient(90deg, #667eea, #764ba2)';

  modal.classList.add('open');
};

window.closeStorageInfoModal = function() {
  document.getElementById('storage-info-modal').classList.remove('open');
};

window.clearLocalCache = function() {
  if (confirm('Увага! Всі ЛОКАЛЬНІ незбережені дані та бекапи будуть видалені з цього пристрою. Ви впевнені?')) {
    const backupDb = window.dbCache;
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('integrationsSettings');
    if (backupDb && backupDb.store) {
      backupDb.store.clear();
    }
    showToast('Локальний кеш очищено', 'success');
    closeStorageInfoModal();
    renderProjects();
  }
};

function showToast(msg, type = '') {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.className = 'toast' + (type ? ' ' + type : '');
    t.classList.add('show');
    clearTimeout(t.__timer);
    t.__timer = setTimeout(() => t.classList.remove('show'), 2500);
}

window.openChangelogModal = function() {
    document.getElementById('changelog-modal')?.classList.add('open');
};

// Close changelog modal on overlay click
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('changelog-modal')?.addEventListener('click', (e) => {
        if (e.target.id === 'changelog-modal') e.target.classList.remove('open');
    });
});
