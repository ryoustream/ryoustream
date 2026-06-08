/**
 * Ryounime — App Core v2
 * Connect ke ryoustream.vercel.app API + AniList fallback
 */

const App = (() => {
  const API = 'https://ryounime.vercel.app';
  const _cache = new Map();

  // ===== API FETCH dengan cache =====
  async function apiFetch(path, ttl = 300000) {
    const key = path;
    const hit = _cache.get(key);
    if (hit && Date.now() - hit.ts < ttl) return hit.data;

    const res = await fetch(`${API}${path}`);
    if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
    const data = await res.json();
    _cache.set(key, { data, ts: Date.now() });
    return data;
  }

  // ===== ANIME DATA =====
  async function getTrending(limit = 20) {
    const d = await apiFetch(`/anime/trending?limit=${limit}`, 180000);
    return d.results || [];
  }

  async function getPopular(limit = 20) {
    const d = await apiFetch(`/anime/popular?limit=${limit}`, 600000);
    return d.results || [];
  }

  async function getLatestUpdate(limit = 20) {
    const d = await apiFetch(`/anime/recent?limit=${limit}`, 120000);
    return d.results || [];
  }

  async function getNewRelease(limit = 20) {
    const d = await apiFetch(`/anime/recent?limit=${limit}`, 120000);
    return (d.results || []).filter(a => a.year >= new Date().getFullYear() - 1);
  }

  async function getHeroBanners(limit = 5) {
    const d = await apiFetch(`/anime/featured`, 180000);
    return (d.results || []).slice(0, limit);
  }

  async function getAnimeById(id) {
    const d = await apiFetch(`/anime/info/${id}`, 600000);
    return d;
  }

  async function search(query) {
    if (!query?.trim()) return [];
    const d = await apiFetch(`/anime/search?q=${encodeURIComponent(query)}`, 120000);
    return d.results || [];
  }

  // ===== EPISODE =====
  async function getEpisodeList(animeId) {
    const d = await apiFetch(`/episode/list/${animeId}`, 300000);
    return d;
  }

  async function getEpisodeSources(animeId, ep) {
    // TTL pendek — sumber video sering expire
    const d = await apiFetch(`/episode/sources/${animeId}?ep=${ep}`, 60000);
    return d;
  }

  // ===== SOURCE MANAGER =====
  function createSourceManager(sources = []) {
    let current = 0;
    return {
      get sources() { return sources; },
      get current() { return sources[current] || null; },
      get index() { return current; },
      get isEmpty() { return !sources.length; },
      select(i) { current = Math.max(0, Math.min(i, sources.length - 1)); },
      next() {
        if (current < sources.length - 1) { current++; return true; }
        return false;
      },
    };
  }

  // ===== SUBTITLE TRANSLATE =====
  // Lingva Translate (EN → ID), tidak perlu API key
  const LINGVA_INSTANCES = [
    'https://lingva.ml',
    'https://lingva.thedaviddelta.com',
  ];

  async function translateText(text, from = 'en', to = 'id') {
    if (!text?.trim()) return text;
    const encoded = encodeURIComponent(text);
    for (const base of LINGVA_INSTANCES) {
      try {
        const res = await fetch(`${base}/api/v1/${from}/${to}/${encoded}`);
        if (!res.ok) continue;
        const d = await res.json();
        if (d.translation) return d.translation;
      } catch { continue; }
    }
    // Fallback: MyMemory
    try {
      const res = await fetch(`https://api.mymemory.translated.net/get?q=${encoded}&langpair=${from}|${to}`);
      const d = await res.json();
      return d.responseData?.translatedText || text;
    } catch { return text; }
  }

  // Parse VTT subtitle teks
  function parseVTT(vttText) {
    const cues = [];
    const lines = vttText.split('\n');
    let i = 0;
    while (i < lines.length) {
      if (lines[i]?.includes('-->')) {
        const [start, end] = lines[i].split('-->').map(s => parseTimestamp(s.trim()));
        let text = '';
        i++;
        while (i < lines.length && lines[i].trim() !== '') {
          text += (text ? '\n' : '') + lines[i].trim();
          i++;
        }
        if (text) cues.push({ start, end, text: text.replace(/<[^>]+>/g, '') });
      }
      i++;
    }
    return cues;
  }

  function parseTimestamp(ts) {
    const parts = ts.split(':').map(Number);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return parts[0] * 60 + parts[1];
  }

  async function translateSubtitles(cues) {
    // Translate in batches of 10
    const BATCH = 10;
    const result = [...cues];
    for (let i = 0; i < cues.length; i += BATCH) {
      const batch = cues.slice(i, i + BATCH);
      const combined = batch.map(c => c.text).join('\n|||\n');
      const translated = await translateText(combined);
      const parts = translated.split('\n|||\n');
      parts.forEach((t, j) => {
        if (result[i + j]) result[i + j] = { ...result[i + j], text: t.trim() };
      });
    }
    return result;
  }

  return {
    getTrending,
    getPopular,
    getLatestUpdate,
    getNewRelease,
    getHeroBanners,
    getAnimeById,
    search,
    getEpisodeList,
    getEpisodeSources,
    createSourceManager,
    translateText,
    translateSubtitles,
    parseVTT,
  };
})();
