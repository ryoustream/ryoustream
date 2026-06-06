/**
 * Ryounime — App Core
 * RS1 Core Streaming
 */

const App = (() => {
  // ===== DATA CACHE =====
  const _cache = {};

  async function loadJSON(path) {
    if (_cache[path]) return _cache[path];
    const data = await fetchJSON(path);
    _cache[path] = data;
    return data;
  }

  // ===== INDEX =====
  async function getAnimeIndex() {
    return loadJSON('data/anime/index.json');
  }

  async function getAnimeById(id) {
    try {
      return await loadJSON(`data/anime/${id}.json`);
    } catch {
      // Fallback: search index
      const index = await getAnimeIndex();
      return index.find(a => a.id === id) || null;
    }
  }

  async function getEpisodes(animeId) {
    return loadJSON(`data/episodes/${animeId}.json`);
  }

  async function getEpisode(animeId, ep) {
    const eps = await getEpisodes(animeId);
    return eps.find(e => e.ep === Number(ep)) || null;
  }

  // ===== SECTIONS =====
  async function getTrending(limit = 12) {
    const index = await getAnimeIndex();
    return index
      .filter(a => a.trending)
      .sort((a, b) => (b.trending_score || 0) - (a.trending_score || 0))
      .slice(0, limit);
  }

  async function getLatestUpdate(limit = 12) {
    const index = await getAnimeIndex();
    return index
      .filter(a => a.last_updated)
      .sort((a, b) => new Date(b.last_updated) - new Date(a.last_updated))
      .slice(0, limit);
  }

  async function getPopular(limit = 12) {
    const index = await getAnimeIndex();
    return index
      .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
      .slice(0, limit);
  }

  async function getNewRelease(limit = 12) {
    const index = await getAnimeIndex();
    return index
      .filter(a => a.status === 'upcoming' || a.year === new Date().getFullYear())
      .sort((a, b) => new Date(b.air_date || 0) - new Date(a.air_date || 0))
      .slice(0, limit);
  }

  async function getHeroBanners(limit = 5) {
    const index = await getAnimeIndex();
    return index
      .filter(a => a.featured && a.banner)
      .sort((a, b) => (b.featured_order || 0) - (a.featured_order || 0))
      .slice(0, limit);
  }

  async function getSchedule() {
    return loadJSON('data/schedule/weekly.json');
  }

  // ===== SEARCH =====
  async function search(query, filters = {}) {
    const index = await getAnimeIndex();
    let result = searchAnime(index, query);
    if (Object.keys(filters).length) result = filterAnime(result, filters);
    return result;
  }

  // ===== SOURCE MANAGEMENT =====
  function createSourceManager(episode) {
    const sources = episode.sources || [];
    let current = 0;

    return {
      get sources() { return sources; },
      get current() { return sources[current]; },
      get index() { return current; },
      select(i) { current = Math.min(i, sources.length - 1); },
      next() {
        if (current < sources.length - 1) { current++; return true; }
        return false;
      },
      getHlsSources() { return sources.filter(s => s.type === 'hls'); },
      getMp4Sources() { return sources.filter(s => s.type === 'mp4'); },
    };
  }

  return {
    loadJSON,
    getAnimeIndex,
    getAnimeById,
    getEpisodes,
    getEpisode,
    getTrending,
    getLatestUpdate,
    getPopular,
    getNewRelease,
    getHeroBanners,
    getSchedule,
    search,
    createSourceManager,
  };
})();
