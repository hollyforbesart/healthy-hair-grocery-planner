/*
 * Offline support for the Healthy Hair Grocery Planner.
 *
 * - On install, caches the page and every asset it references, so the
 *   planner opens with no connection after the first visit.
 * - Pages: network first (always fresh when online), cached copy offline.
 * - Hashed /assets/ files and /meal-photos/: cache first, saved as they're
 *   first seen (photos load lazily, so only meals someone has scrolled to
 *   are kept offline).
 * - Only same-origin GET requests are handled; feedback POSTs to Web3Forms
 *   go straight to the network.
 */
const CACHE = 'hhgp-v3';
const SHELL = ['/', '/manifest.webmanifest', '/favicon.svg', '/icons/icon-192.png', '/icons/icon-512.png'];

async function cacheShell() {
  const cache = await caches.open(CACHE);
  const response = await fetch('/', { cache: 'no-cache' });
  const html = await response.clone().text();
  await cache.put('/', response);
  const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((m) => m[1]);
  await cache.addAll([...SHELL.slice(1), ...assets]);
}

self.addEventListener('install', (event) => {
  event.waitUntil(cacheShell().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    // Every page is the same single-page app, so the cached "/" serves any path offline.
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) caches.open(CACHE).then((cache) => cache.put('/', response.clone()));
          return response;
        })
        .catch(() => caches.match('/')),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((response) => {
          if (response.ok && ['/assets/', '/meal-photos/', '/nutrients/'].some((dir) => url.pathname.startsWith(dir))) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        }),
    ),
  );
});
