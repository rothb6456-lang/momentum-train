const CACHE = 'momentum-v4';
const ASSETS = ['/', '/index.html', '/manifest.webmanifest', '/icon.svg', '/data.js', '/workout-cards.js', '/app.js', '/data/01_Training_Core.md', '/data/02_Training_Reference.md', '/data/03_Training_Analysis.md', '/data/04_Training_Schema.md'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
    const copy = response.clone();
    caches.open(CACHE).then(cache => cache.put(event.request, copy));
    return response;
  }).catch(() => caches.match('/index.html'))));
});
