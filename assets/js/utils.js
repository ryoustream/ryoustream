/**
 * Ryounime — Utility Library
 * RS1 Core
 */

// ===== STORAGE =====
const Storage = {
  get(key, fallback = null) {
    try {
      const v = localStorage.getItem(key);
      return v !== null ? JSON.parse(v) : fallback;
    } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch { return false; }
  },
  remove(key) { try { localStorage.removeItem(key); } catch {} },
};

// ===== HISTORY =====
const History = {
  _key: 'ryo_history',
  getAll() { return Storage.get(this._key, []); },
  add(item) {
    let h = this.getAll().filter(x => !(x.animeId === item.animeId && x.ep === item.ep));
    h.unshift({ ...item, ts: Date.now() });
    if (h.length > 200) h = h.slice(0, 200);
    Storage.set(this._key, h);
  },
  remove(animeId) {
    const h = this.getAll().filter(x => x.animeId !== animeId);
    Storage.set(this._key, h);
  },
  clear() { Storage.remove(this._key); },
};

// ===== CONTINUE WATCHING =====
const ContinueWatching = {
  _key: 'ryo_continue',
  getAll() { return Storage.get(this._key, []); },
  save({ animeId, animeTitle, poster, ep, epTitle, time, duration }) {
    let list = this.getAll().filter(x => x.animeId !== animeId);
    list.unshift({ animeId, animeTitle, poster, ep, epTitle, time, duration, ts: Date.now() });
    if (list.length > 50) list = list.slice(0, 50);
    Storage.set(this._key, list);
  },
  get(animeId) { return this.getAll().find(x => x.animeId === animeId) || null; },
  remove(animeId) {
    const list = this.getAll().filter(x => x.animeId !== animeId);
    Storage.set(this._key, list);
  },
  getProgress(animeId) {
    const item = this.get(animeId);
    if (!item || !item.duration) return 0;
    return Math.min(item.time / item.duration, 1);
  },
};

// ===== FAVORITES =====
const Favorites = {
  _key: 'ryo_favorites',
  getAll() { return Storage.get(this._key, []); },
  toggle(item) {
    let list = this.getAll();
    const idx = list.findIndex(x => x.id === item.id);
    if (idx >= 0) { list.splice(idx, 1); }
    else { list.unshift({ ...item, ts: Date.now() }); }
    Storage.set(this._key, list);
    return idx < 0;
  },
  has(id) { return this.getAll().some(x => x.id === id); },
  remove(id) {
    const list = this.getAll().filter(x => x.id !== id);
    Storage.set(this._key, list);
  },
};

// ===== WATCHLIST =====
const Watchlist = {
  _key: 'ryo_watchlist',
  getAll() { return Storage.get(this._key, []); },
  toggle(item) {
    let list = this.getAll();
    const idx = list.findIndex(x => x.id === item.id);
    if (idx >= 0) { list.splice(idx, 1); }
    else { list.unshift({ ...item, ts: Date.now() }); }
    Storage.set(this._key, list);
    return idx < 0;
  },
  has(id) { return this.getAll().some(x => x.id === id); },
};

// ===== SETTINGS =====
const Settings = {
  _key: 'ryo_settings',
  defaults: {
    theme: 'dark',
    autoNext: true,
    autoPlay: true,
    subtitleLang: 'id',
    subtitleSize: 'medium',
    quality: 'auto',
  },
  get(k) {
    const s = Storage.get(this._key, {});
    return k ? (s[k] !== undefined ? s[k] : this.defaults[k]) : { ...this.defaults, ...s };
  },
  set(k, v) {
    const s = Storage.get(this._key, {});
    s[k] = v;
    Storage.set(this._key, s);
  },
  applyTheme() {
    const theme = this.get('theme');
    document.documentElement.setAttribute('data-theme', theme === 'dark' ? '' : theme);
  },
};

// ===== LAZY IMAGE =====
function initLazyImages(root = document) {
  const imgs = root.querySelectorAll('img[data-src]');
  if (!imgs.length) return;
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const img = e.target;
      img.src = img.dataset.src;
      img.onload = () => img.classList.add('loaded');
      img.onerror = () => { img.src = '/assets/images/placeholder.svg'; img.classList.add('loaded'); };
      obs.unobserve(img);
    });
  }, { rootMargin: '200px' });
  imgs.forEach(img => { img.classList.add('lazy'); obs.observe(img); });
}

// ===== JSON FETCH =====
async function fetchJSON(url) {
  const res = await fetch(url + '?v=' + Date.now());
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.json();
}

// ===== SKELETON =====
function renderSkeletons(container, count = 6, type = 'poster') {
  const w = type === 'wide' ? '220px' : '130px';
  const ar = type === 'wide' ? '16/9' : '2/3';
  container.innerHTML = Array.from({ length: count }, () => `
    <div style="width:${w};flex-shrink:0">
      <div class="skeleton" style="width:100%;aspect-ratio:${ar};border-radius:var(--radius-md)"></div>
      <div class="skeleton" style="height:12px;width:80%;margin-top:8px;border-radius:4px"></div>
      <div class="skeleton" style="height:10px;width:50%;margin-top:5px;border-radius:4px"></div>
    </div>
  `).join('');
}

// ===== DEBOUNCE =====
function debounce(fn, ms = 300) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

// ===== URL PARAMS =====
function getParam(key) {
  return new URLSearchParams(location.search).get(key);
}
function buildUrl(path, params = {}) {
  const u = new URLSearchParams(params);
  return `${path}?${u.toString()}`;
}

// ===== FORMAT =====
function formatTime(s) {
  s = Math.floor(s);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2,'0')}`;
}
function formatDate(ts) {
  return new Date(ts).toLocaleDateString('id-ID', { day:'numeric', month:'short', year:'numeric' });
}
function timeAgo(ts) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m yang lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}j yang lalu`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}h yang lalu`;
  return formatDate(ts);
}

// ===== SEARCH ENGINE =====
function searchAnime(list, query) {
  const q = query.toLowerCase().trim();
  if (!q) return list;
  return list.filter(a =>
    a.title?.toLowerCase().includes(q) ||
    a.title_alt?.toLowerCase().includes(q) ||
    a.genres?.some(g => g.toLowerCase().includes(q)) ||
    a.studio?.toLowerCase().includes(q)
  );
}
function filterAnime(list, { genre, status, type, year } = {}) {
  return list.filter(a => {
    if (genre && !a.genres?.includes(genre)) return false;
    if (status && a.status !== status) return false;
    if (type && a.type !== type) return false;
    if (year && a.year !== Number(year)) return false;
    return true;
  });
}

// ===== RECOMMENDATION =====
function getRecommendations(anime, allAnime, limit = 10) {
  const genres = new Set(anime.genres || []);
  const scored = allAnime
    .filter(a => a.id !== anime.id)
    .map(a => {
      let score = 0;
      (a.genres || []).forEach(g => { if (genres.has(g)) score += 2; });
      if (a.studio === anime.studio) score += 1;
      if (a.year === anime.year) score += 0.5;
      score += (a.rating || 0) * 0.1;
      return { ...a, _score: score };
    })
    .filter(a => a._score > 0)
    .sort((a, b) => b._score - a._score);
  return scored.slice(0, limit);
}

// Init
Settings.applyTheme();
document.addEventListener('DOMContentLoaded', () => initLazyImages());
