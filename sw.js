const CACHE_NAME = 'manakuru-yellow-v98-soft-particles';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './shared-sets.json',
  './shared-library.js',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon-180.png',
  './favicon-32.png',
  './favicon-48.png',
  './favicon.ico'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_SHELL);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith('manakuru-yellow-') && name !== CACHE_NAME).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response && response.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, response.clone());
        }
        return response;
      } catch (_error) {
        return (await caches.match(request)) || (await caches.match('./')) || (await caches.match('./index.html')) || new Response('オフラインです。インターネット接続後にもう一度開いてください。', { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
      }
    })());
    return;
  }

  if (APP_SHELL.some(path => new URL(path, self.registration.scope).href === url.href)) {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response && response.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, response.clone());
        }
        return response;
      } catch (_error) {
        return (await caches.match(request)) || new Response('', { status: 504 });
      }
    })());
  }
});
