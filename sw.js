const CACHE = 'ryounime-v1';
const BASE = '/ryoustream';
const STATIC = [
  BASE + '/',
  BASE + '/index.html',
  BASE + '/search.html',
  BASE + '/details.html',
  BASE + '/watch.html',
  BASE + '/favorites.html',
  BASE + '/live.html',
  BASE + '/settings.html',
  BASE + '/assets/css/base.css',
  BASE + '/assets/css/vars.css',
  BASE + '/assets/css/nav.css',
  BASE + '/assets/css/hero.css',
  BASE + '/assets/css/card.css',
  BASE + '/assets/css/player.css',
  BASE + '/assets/css/details.css',
  BASE + '/assets/js/utils.js',
  BASE + '/assets/js/app.js',
  BASE + '/assets/js/player.js',
  BASE + '/assets/images/placeholder.svg',
  BASE + '/manifest.json',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(STATIC)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith(BASE + '/data/')) {
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

  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .catch(() => caches.match(e.request) || caches.match(BASE + '/index.html'))
    );
    return;
  }

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
