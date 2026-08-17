/**
 * Offline support for the tracker.
 *
 * This is written by hand rather than generated. The generated worker this
 * replaced carried a precache manifest listing exact build hashes, which meant
 * it went stale the moment anything was rebuilt — and every URL in it 404'd,
 * which fails the install outright.
 *
 * Nothing here names a build artefact, so it stays correct across deploys:
 *
 *  - `/_next/static/*` is content-hashed and therefore immutable: serve from
 *    cache, fall back to the network, and keep whatever comes back.
 *  - Navigations go to the network first so a fresh deploy is picked up
 *    immediately, falling back to the cached page (and finally the cached
 *    start page) when offline.
 *  - Everything else same-origin is stale-while-revalidate.
 *
 * Bump CACHE_VERSION to evict every cache on the next activation.
 */

const CACHE_VERSION = 'v1';
const ASSET_CACHE = `buteyko-assets-${CACHE_VERSION}`;
const PAGE_CACHE = `buteyko-pages-${CACHE_VERSION}`;
const CURRENT_CACHES = [ASSET_CACHE, PAGE_CACHE];

// The app shell. These are stable paths, not build artefacts, so precaching
// them cannot rot; a failure here must not block installation either.
const START_URL = '/';
const PRECACHE_URLS = [START_URL, '/manifest.webmanifest', '/icon-192x192.png'];

self.addEventListener('install', event => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(PAGE_CACHE);
      await Promise.allSettled(PRECACHE_URLS.map(url => cache.add(url)));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names.filter(name => !CURRENT_CACHES.includes(name)).map(name => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

/** Cache-first: for immutable, content-hashed assets. */
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

/** Network-first: for pages, so a new deploy shows up straight away. */
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (e) {
    const cached = await cache.match(request);
    if (cached) return cached;
    if (request.mode === 'navigate') {
      const start = await cache.match(START_URL);
      if (start) return start;
    }
    throw e;
  }
}

/** Stale-while-revalidate: for everything else same-origin. */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then(response => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);
  return cached ?? network;
}

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // let cross-origin requests alone

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, PAGE_CACHE));
    return;
  }

  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request, ASSET_CACHE));
    return;
  }

  event.respondWith(staleWhileRevalidate(request, ASSET_CACHE));
});
