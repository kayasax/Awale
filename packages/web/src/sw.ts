// Basic PWA service worker for Awale
// Caches core shell assets and updates on version change.

const VERSION = (self as any).APP_VERSION || 'dev';
const CACHE_NAME = `awale-static-${VERSION}`;
const CORE_ASSETS = [
  './',
  './index.html',
  './assets/app.js',
  './assets/style.css',
  './african-bg.jpg',
  './favicon.svg',
  './manifest.webmanifest'
];

self.addEventListener('install', (event: any) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS)).then(() => (self as any).skipWaiting())
  );
});

self.addEventListener('activate', (event: any) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => !k.startsWith(`awale-static-`)).map(k => caches.delete(k)))).then(() => (self as any).clients.claim())
  );
});

// Listen for manual skipWaiting trigger (future use)
self.addEventListener('message', (event: any) => {
  if (event.data === 'SKIP_WAITING') {
    (self as any).skipWaiting();
  }
});

self.addEventListener('fetch', (event: any) => {
  const req = event.request;
  const url = new URL(req.url);
  // Network-first for root HTML to pick updates.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then(resp => {
        const copy = resp.clone();
        caches.open(CACHE_NAME).then(cache => cache.put('./index.html', copy));
        return resp;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }
  // Cache-first for static assets we manage.
  if (CORE_ASSETS.some(p => url.pathname.endsWith(p.replace('./','/')))) {
    event.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(resp => {
        const copy = resp.clone();
        caches.open(CACHE_NAME).then(c => c.put(req, copy));
        return resp;
      }))
    );
  }
});
