// ============================================================
// js/dashboard.js — Logica dashboard utilizator
// ============================================================
import { supabase, requireAuth, logoutUser } from './supabase.js';

export async function initDashboard() {
  // Protejează pagina — trebuie logat și premium
  const profile = await requireAuth(true, false);
  if (!profile) return;

  // Populează UI cu datele utilizatorului
  renderUserInfo(profile);

  // Încarcă conținut
  await Promise.all([
    loadPrograms(),
    loadArticles()
  ]);

  // Init căutare + filtre
  initSearch();
  initFilters();
  initLogout();
}

// ─────────────────────────────────────────────
// USER INFO
// ─────────────────────────────────────────────
function renderUserInfo(profile) {
  const nameEl = document.getElementById('user-name');
  const emailEl = document.getElementById('user-email');
  const badgeEl = document.getElementById('user-badge');

  if (nameEl) nameEl.textContent = profile.full_name || profile.email.split('@')[0];
  if (emailEl) emailEl.textContent = profile.email;
  if (badgeEl) {
    if (profile.role === 'admin') {
      badgeEl.textContent = 'Admin';
      badgeEl.className = 'role-badge admin';
    } else {
      badgeEl.textContent = 'Premium';
      badgeEl.className = 'role-badge premium';
    }
  }

  // Link admin panel dacă e admin
  if (profile.role === 'admin') {
    document.getElementById('admin-link')?.classList.remove('hidden');
  }
}

// ─────────────────────────────────────────────
// ÎNCARCĂ PROGRAME
// ─────────────────────────────────────────────
let allPrograms = [];

async function loadPrograms(category = null) {
  const grid = document.getElementById('programs-grid');
  if (!grid) return;

  grid.innerHTML = '<div class="loading-spinner"></div>';

  let query = supabase.from('programs').select('*').order('sort_order');
  if (category && category !== 'all') {
    query = query.eq('category', category);
  }

  const { data, error } = await query;
  if (error) { grid.innerHTML = '<p class="error-msg">Eroare la încărcare.</p>'; return; }

  allPrograms = data || [];
  renderPrograms(allPrograms);
}

function renderPrograms(programs) {
  const grid = document.getElementById('programs-grid');
  if (!grid) return;

  if (!programs.length) {
    grid.innerHTML = '<p class="empty-msg">Niciun program găsit.</p>';
    return;
  }

  grid.innerHTML = programs.map(p => `
    <div class="content-card" onclick="openProgram('${p.id}')">
      <div class="card-accent ${getCategoryColor(p.category)}"></div>
      <div class="card-body">
        <div class="card-tag">${getCategoryLabel(p.category)}</div>
        <h3 class="card-title">${p.title}</h3>
        <p class="card-desc">${p.description || ''}</p>
        <div class="card-footer">
          <span class="card-cta">Deschide →</span>
        </div>
      </div>
    </div>
  `).join('');
}

// ─────────────────────────────────────────────
// ÎNCARCĂ ARTICOLE
// ─────────────────────────────────────────────
let allArticles = [];

async function loadArticles(category = null) {
  const grid = document.getElementById('articles-grid');
  if (!grid) return;

  grid.innerHTML = '<div class="loading-spinner"></div>';

  let query = supabase.from('articles')
    .select('id, title, category, excerpt, read_time, created_at')
    .eq('is_published', true)
    .order('created_at', { ascending: false });

  if (category && category !== 'all') {
    query = query.eq('category', category);
  }

  const { data, error } = await query;
  if (error) { grid.innerHTML = '<p class="error-msg">Eroare la încărcare.</p>'; return; }

  allArticles = data || [];
  renderArticles(allArticles);
}

function renderArticles(articles) {
  const grid = document.getElementById('articles-grid');
  if (!grid) return;

  if (!articles.length) {
    grid.innerHTML = '<p class="empty-msg">Niciun articol găsit.</p>';
    return;
  }

  grid.innerHTML = articles.map(a => `
    <div class="article-card" onclick="openArticle('${a.id}')">
      <div class="article-cat-badge ${a.category}">${getCategoryLabel(a.category)}</div>
      <h3 class="article-title">${a.title}</h3>
      <p class="article-excerpt">${a.excerpt || ''}</p>
      <div class="article-meta">
        <span>📖 ${a.read_time} min</span>
        <span class="article-cta">Citește →</span>
      </div>
    </div>
  `).join('');
}

// ─────────────────────────────────────────────
// CĂUTARE
// ─────────────────────────────────────────────
function initSearch() {
  const input = document.getElementById('search-input');
  if (!input) return;

  input.addEventListener('input', () => {
    const q = input.value.toLowerCase().trim();
    if (!q) {
      renderPrograms(allPrograms);
      renderArticles(allArticles);
      return;
    }
    renderPrograms(allPrograms.filter(p =>
      p.title.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q)
    ));
    renderArticles(allArticles.filter(a =>
      a.title.toLowerCase().includes(q) || (a.excerpt || '').toLowerCase().includes(q)
    ));
  });
}

// ─────────────────────────────────────────────
// FILTRE CATEGORII
// ─────────────────────────────────────────────
function initFilters() {
  document.querySelectorAll('[data-filter-programs]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-filter-programs]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      loadPrograms(btn.dataset.filterPrograms);
    });
  });

  document.querySelectorAll('[data-filter-articles]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-filter-articles]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      loadArticles(btn.dataset.filterArticles);
    });
  });
}

// ─────────────────────────────────────────────
// DESCHIDE PROGRAM / ARTICOL
// ─────────────────────────────────────────────
window.openProgram = (id) => {
  window.location.href = `/program.html?id=${id}`;
};

window.openArticle = (id) => {
  window.location.href = `/article.html?id=${id}`;
};

// ─────────────────────────────────────────────
// LOGOUT
// ─────────────────────────────────────────────
function initLogout() {
  document.getElementById('logout-btn')?.addEventListener('click', async () => {
    await logoutUser();
  });
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function getCategoryLabel(cat) {
  const labels = {
    men_beginner: '🏋️ Băieți Începători',
    men_advanced: '💪 Băieți Avansați',
    women_beginner: '🌸 Fete Începătoare',
    women_advanced: '⚡ Fete Avansate',
    fat_loss: '🔥 Slăbit',
    muscle_gain: '💪 Masă Musculară',
    maintenance: '⚖️ Menținere',
    training: '🏋️ Antrenament',
    nutrition: '🥗 Nutriție',
    mindset: '🧠 Mindset',
    recovery: '😴 Recuperare',
    supplements: '💊 Suplimente'
  };
  return labels[cat] || cat;
}

function getCategoryColor(cat) {
  const colors = {
    men_beginner: 'volt', men_advanced: 'mint',
    women_beginner: 'coral', women_advanced: 'violet',
    fat_loss: 'coral', muscle_gain: 'volt', maintenance: 'mint'
  };
  return colors[cat] || 'mint';
}
