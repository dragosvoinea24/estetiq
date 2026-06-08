// ============================================================
// js/admin.js — Panou Admin complet
// ============================================================
import { supabase, requireAuth } from './supabase.js';

export async function initAdmin() {
  // Protejează: doar admin
  const profile = await requireAuth(false, true);
  if (!profile) return;

  // Tabs
  initTabs();

  // Încarcă toate datele
  await Promise.all([
    loadUsers(),
    loadPrograms(),
    loadArticles()
  ]);

  // Formulare
  initProgramForm();
  initArticleForm();
  initLogout();
}

// ─────────────────────────────────────────────
// TABS
// ─────────────────────────────────────────────
function initTabs() {
  document.querySelectorAll('.admin-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.admin-panel').forEach(p => p.classList.add('hidden'));
      tab.classList.add('active');
      document.getElementById(`panel-${target}`)?.classList.remove('hidden');
    });
  });
}

// ─────────────────────────────────────────────
// UTILIZATORI
// ─────────────────────────────────────────────
async function loadUsers() {
  const tbody = document.getElementById('users-tbody');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="5" class="loading-cell">Se încarcă...</td></tr>';

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) { tbody.innerHTML = '<tr><td colspan="5" class="error-msg">Eroare.</td></tr>'; return; }

  tbody.innerHTML = (data || []).map(u => `
    <tr>
      <td>${u.email}</td>
      <td>${u.full_name || '—'}</td>
      <td><span class="role-pill ${u.role}">${u.role}</span></td>
      <td>${formatDate(u.created_at)}</td>
      <td class="actions-cell">
        ${u.role !== 'premium' && u.role !== 'admin' ? 
          `<button class="btn-admin-sm btn-upgrade" onclick="upgradeUser('${u.id}')">↑ Premium</button>` : ''}
        ${u.role === 'premium' ? 
          `<button class="btn-admin-sm btn-downgrade" onclick="downgradeUser('${u.id}')">↓ Guest</button>` : ''}
        ${u.role !== 'admin' ? 
          `<button class="btn-admin-sm btn-admin-role" onclick="makeAdmin('${u.id}')">★ Admin</button>` : ''}
      </td>
    </tr>
  `).join('');

  // Stats
  const premiumCount = (data || []).filter(u => u.role === 'premium').length;
  const totalCount = (data || []).length;
  document.getElementById('stat-users')?.setAttribute('data-val', totalCount);
  document.getElementById('stat-premium')?.setAttribute('data-val', premiumCount);
}

window.upgradeUser = async (id) => {
  const { error } = await supabase.from('profiles').update({
    role: 'premium',
    subscription_type: 'manual',
    subscription_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
  }).eq('id', id);
  if (!error) { showToast('✅ Utilizator upgraduit la Premium!'); loadUsers(); }
};

window.downgradeUser = async (id) => {
  if (!confirm('Ești sigur că vrei să dai jos accesul premium?')) return;
  const { error } = await supabase.from('profiles').update({
    role: 'guest', subscription_type: null, subscription_end: null
  }).eq('id', id);
  if (!error) { showToast('↓ Utilizator degradat la Guest.'); loadUsers(); }
};

window.makeAdmin = async (id) => {
  if (!confirm('Faci acest utilizator admin? Are acces total la panou.')) return;
  const { error } = await supabase.from('profiles').update({ role: 'admin' }).eq('id', id);
  if (!error) { showToast('★ Utilizator promovat la Admin!'); loadUsers(); }
};

// ─────────────────────────────────────────────
// PROGRAME
// ─────────────────────────────────────────────
async function loadPrograms() {
  const list = document.getElementById('programs-admin-list');
  if (!list) return;

  list.innerHTML = '<p class="loading-msg">Se încarcă...</p>';
  const { data } = await supabase.from('programs').select('*').order('sort_order');

  list.innerHTML = (data || []).map(p => `
    <div class="admin-item">
      <div class="admin-item-info">
        <strong>${p.title}</strong>
        <span class="cat-tag">${p.category}</span>
      </div>
      <div class="admin-item-actions">
        <button class="btn-admin-sm btn-edit" onclick="editProgram('${p.id}')">✏️ Editează</button>
        <button class="btn-admin-sm btn-delete" onclick="deleteProgram('${p.id}')">🗑️ Șterge</button>
      </div>
    </div>
  `).join('') || '<p class="empty-msg">Niciun program.</p>';
}

window.editProgram = async (id) => {
  const { data } = await supabase.from('programs').select('*').eq('id', id).single();
  if (!data) return;
  fillProgramForm(data);
  document.getElementById('program-form-title').textContent = 'Editează Programul';
  document.getElementById('program-form-scroll')?.scrollIntoView({ behavior: 'smooth' });
};

window.deleteProgram = async (id) => {
  if (!confirm('Ștergi definitiv acest program?')) return;
  const { error } = await supabase.from('programs').delete().eq('id', id);
  if (!error) { showToast('🗑️ Program șters.'); loadPrograms(); }
};

function initProgramForm() {
  const form = document.getElementById('program-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = form.dataset.editId;
    const payload = {
      title: form.querySelector('#prog-title').value,
      category: form.querySelector('#prog-category').value,
      description: form.querySelector('#prog-desc').value,
      content: form.querySelector('#prog-content').value,
      is_premium: form.querySelector('#prog-premium').checked,
      updated_at: new Date().toISOString()
    };

    let error;
    if (id) {
      ({ error } = await supabase.from('programs').update(payload).eq('id', id));
    } else {
      ({ error } = await supabase.from('programs').insert(payload));
    }

    if (!error) {
      showToast(id ? '✅ Program actualizat!' : '✅ Program adăugat!');
      form.reset();
      delete form.dataset.editId;
      document.getElementById('program-form-title').textContent = 'Adaugă Program';
      loadPrograms();
    } else {
      showToast('❌ Eroare: ' + error.message, true);
    }
  });
}

function fillProgramForm(data) {
  const form = document.getElementById('program-form');
  form.dataset.editId = data.id;
  form.querySelector('#prog-title').value = data.title || '';
  form.querySelector('#prog-category').value = data.category || '';
  form.querySelector('#prog-desc').value = data.description || '';
  form.querySelector('#prog-content').value = data.content || '';
  form.querySelector('#prog-premium').checked = data.is_premium !== false;
}

// ─────────────────────────────────────────────
// ARTICOLE
// ─────────────────────────────────────────────
async function loadArticles() {
  const list = document.getElementById('articles-admin-list');
  if (!list) return;

  list.innerHTML = '<p class="loading-msg">Se încarcă...</p>';
  const { data } = await supabase.from('articles').select('*').order('created_at', { ascending: false });

  list.innerHTML = (data || []).map(a => `
    <div class="admin-item">
      <div class="admin-item-info">
        <strong>${a.title}</strong>
        <span class="cat-tag">${a.category}</span>
        <span class="status-tag ${a.is_published ? 'published' : 'draft'}">${a.is_published ? 'Publicat' : 'Draft'}</span>
      </div>
      <div class="admin-item-actions">
        <button class="btn-admin-sm btn-edit" onclick="editArticle('${a.id}')">✏️ Editează</button>
        <button class="btn-admin-sm btn-delete" onclick="deleteArticle('${a.id}')">🗑️ Șterge</button>
      </div>
    </div>
  `).join('') || '<p class="empty-msg">Niciun articol.</p>';
}

window.editArticle = async (id) => {
  const { data } = await supabase.from('articles').select('*').eq('id', id).single();
  if (!data) return;
  fillArticleForm(data);
  document.getElementById('article-form-title').textContent = 'Editează Articolul';
  document.getElementById('article-form-scroll')?.scrollIntoView({ behavior: 'smooth' });
};

window.deleteArticle = async (id) => {
  if (!confirm('Ștergi definitiv acest articol?')) return;
  const { error } = await supabase.from('articles').delete().eq('id', id);
  if (!error) { showToast('🗑️ Articol șters.'); loadArticles(); }
};

function initArticleForm() {
  const form = document.getElementById('article-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = form.dataset.editId;
    const payload = {
      title: form.querySelector('#art-title').value,
      category: form.querySelector('#art-category').value,
      excerpt: form.querySelector('#art-excerpt').value,
      content: form.querySelector('#art-content').value,
      read_time: parseInt(form.querySelector('#art-read-time').value) || 5,
      is_premium: form.querySelector('#art-premium').checked,
      is_published: form.querySelector('#art-published').checked,
      updated_at: new Date().toISOString()
    };

    let error;
    if (id) {
      ({ error } = await supabase.from('articles').update(payload).eq('id', id));
    } else {
      ({ error } = await supabase.from('articles').insert(payload));
    }

    if (!error) {
      showToast(id ? '✅ Articol actualizat!' : '✅ Articol adăugat!');
      form.reset();
      delete form.dataset.editId;
      document.getElementById('article-form-title').textContent = 'Adaugă Articol';
      loadArticles();
    } else {
      showToast('❌ Eroare: ' + error.message, true);
    }
  });
}

function fillArticleForm(data) {
  const form = document.getElementById('article-form');
  form.dataset.editId = data.id;
  form.querySelector('#art-title').value = data.title || '';
  form.querySelector('#art-category').value = data.category || '';
  form.querySelector('#art-excerpt').value = data.excerpt || '';
  form.querySelector('#art-content').value = data.content || '';
  form.querySelector('#art-read-time').value = data.read_time || 5;
  form.querySelector('#art-premium').checked = data.is_premium !== false;
  form.querySelector('#art-published').checked = data.is_published === true;
}

// ─────────────────────────────────────────────
// LOGOUT
// ─────────────────────────────────────────────
function initLogout() {
  document.getElementById('logout-btn')?.addEventListener('click', async () => {
    const { logoutUser } = await import('./supabase.js');
    await logoutUser();
  });
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function showToast(msg, isError = false) {
  const toast = document.getElementById('admin-toast') || createToast();
  toast.textContent = msg;
  toast.className = `admin-toast ${isError ? 'toast-error' : 'toast-ok'} show`;
  setTimeout(() => toast.classList.remove('show'), 3000);
}

function createToast() {
  const el = document.createElement('div');
  el.id = 'admin-toast';
  el.className = 'admin-toast';
  document.body.appendChild(el);
  return el;
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
