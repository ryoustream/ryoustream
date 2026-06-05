const CACHE = 'ryounime-v1';
const STATIC = [
  '/',
  '/index.html',
  '/search.html',
  '/details.html',
  '/watch.html',
  '/favorites.html',
  '/live.html',
  '/settings.html',
  '/assets/css/base.css',
  '/assets/css/vars.css',
  '/assets/css/nav.css',
  '/assets/css/hero.css',
  '/assets/css/card.css',
  '/assets/css/player.css',
  '/assets/css/details.css',
  '/assets/js/utils.js',
  '/assets/js/app.js',
  '/assets/js/player.js',
  '/assets/images/placeholder.svg',
  '/manifest.json',
];

// Install — cache static shell
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(STATIC)).then(() => self.skipWaiting())
  );
});

// Activate — delete old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch strategy:
// - HTML: Network first, fallback cache
// - Data JSON: Network first, fallback cache, stale-while-revalidate
// - Assets: Cache first
// - External CDN: Network only
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // External (CDN, fonts, APIs) — network only
  if (url.origin !== self.location.origin) {
    return;
  }

  // Data JSON — network first with cache fallback
  if (url.pathname.startsWith('/data/')) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // HTML pages — network first
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .catch(() => caches.match(e.request) || caches.match('/index.html'))
    );
    return;
  }

  // Assets — cache first
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      });
    })
  );
});
