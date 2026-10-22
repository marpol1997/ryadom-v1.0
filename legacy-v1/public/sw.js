/* Рядом · Севастополь — service worker
   Стратегия:
   - навигация: сеть → кэш → /app (офлайн-оболочка)
   - API: только сеть (данные не кэшируем, чтобы не показывать устаревшее)
   - статика своего домена и Leaflet с CDN: cache-first с обновлением в фоне
*/
const VERSION = 'ryadom-v1.1.0';
const SHELL = VERSION + '-shell';
const RUNTIME = VERSION + '-runtime';

const PRECACHE = [
  '/app',
  '/assets/app.css',
  '/assets/app.js',
  '/assets/landing.css',
  '/manifest.webmanifest',
  '/icons/favicon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches
      .open(SHELL)
      .then((c) => c.addAll(PRECACHE))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== SHELL && k !== RUNTIME).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // API и всё динамическое — не кэшируем
  if (url.origin === self.location.origin && url.pathname.startsWith('/api/')) return;

  // навигация по приложению
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches
            .open(SHELL)
            .then((c) => c.put('/app', copy))
            .catch(() => {});
          return res;
        })
        .catch(() => caches.match('/app').then((r) => r || caches.match(req)))
    );
    return;
  }

  // статика: сначала кэш, потом сеть (и кладём в runtime)
  e.respondWith(
    caches.match(req).then((cached) => {
      if (cached) {
        // фоновое обновление
        fetch(req)
          .then((res) => {
            if (res && res.ok)
              caches
                .open(RUNTIME)
                .then((c) => c.put(req, res.clone()))
                .catch(() => {});
          })
          .catch(() => {});
        return cached;
      }
      return fetch(req)
        .then((res) => {
          if (res && res.ok && (url.origin === self.location.origin || /(^|\.)unpkg\.com$/.test(url.host))) {
            const copy = res.clone();
            caches
              .open(RUNTIME)
              .then((c) => c.put(req, copy))
              .catch(() => {});
          }
          return res;
        })
        .catch(() => new Response('', { status: 504, statusText: 'Offline' }));
    })
  );
});

self.addEventListener('message', (e) => {
  if (e.data === 'skip-waiting') self.skipWaiting();
});
