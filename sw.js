const CACHE = 'momentum-v1.1.6';
const NETWORK_FIRST = new Set(['/', '/index.html', '/planner.js', '/app.js', '/sw.js']);
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icon.svg',
  '/bulldogstats-logo-dog_head.png',
  '/data.js',
  '/workout-cards.js',
  '/planner.js',
  '/sync.js',
  '/app.js',
  '/data/01_Training_Core.md',
  '/data/02_Training_Reference.md',
  '/data/03_Training_Analysis.md',
  '/data/04_Training_Schema.md'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const requestPath = new URL(event.request.url).pathname;
  const fetchAndCache = () => fetch(event.request).then(response => {
    const copy = response.clone();
    caches.open(CACHE).then(cache => cache.put(event.request, copy));
    return response;
  });

  event.respondWith(
    NETWORK_FIRST.has(requestPath)
      ? fetchAndCache().catch(() => caches.match(event.request).then(cached => cached || caches.match('/index.html')))
      : caches.match(event.request).then(cached => cached || fetchAndCache().catch(() => caches.match('/index.html')))
  );
});
