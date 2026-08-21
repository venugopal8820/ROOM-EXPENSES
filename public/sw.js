// Service Worker - caches app shell for full offline support.
// Data (expenses) is in IndexedDB. This caches HTML/JS/CSS/fonts.

const CACHE_NAME = 'room-expenses-v1';
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
];

// Install: precache the app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  );
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: network-first for API calls, cache-first for static assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests and Supabase API calls (let them go to network only)
  if (event.request.method !== 'GET') return;
  if (url.hostname.includes('supabase')) return;
  if (url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com')) {
    // Cache fonts aggressively (they don't change)
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(event.request);
        if (cached) return cached;
        const response = await fetch(event.request);
        if (response.ok) cache.put(event.request, response.clone());
        return response;
      })
    );
    return;
  }

  // For same-origin requests: stale-while-revalidate (fast load, then update)
  if (url.origin === location.origin) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(event.request);
        const fetchPromise = fetch(event.request).then((response) => {
          if (response.ok) cache.put(event.request, response.clone());
          return response;
        }).catch(() => cached); // offline fallback
        return cached || fetchPromise;
      })
    );
    return;
  }

  // Everything else: network first, fall back to cache
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
