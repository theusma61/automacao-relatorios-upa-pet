// Service Worker enxuto do Vetaro PWA
// Cacheia apenas assets estáticos imutáveis (/assets/* e ícones).
// Nunca intercepta /api, /downloads, /uploads ou /l/ para garantir dados clínicos sempre frescos.

const CACHE_NAME = 'vetaro-static-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== CACHE_NAME)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Dados dinâmicos e documentos nunca vão para cache do SW
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/downloads/') ||
    url.pathname.startsWith('/uploads/') ||
    url.pathname.startsWith('/l/') ||
    url.pathname.startsWith('/health')
  ) {
    return;
  }

  // Assets imutáveis do Vite (/assets/*) e ícones: cache-first com fallback de rede
  const isStaticAsset =
    url.pathname.startsWith('/assets/') ||
    url.pathname === '/favicon.png' ||
    url.pathname === '/favicon.svg' ||
    url.pathname === '/favicon.ico' ||
    url.pathname === '/manifest.webmanifest';

  if (isStaticAsset) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          if (res && res.status === 200 && res.type === 'basic') {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone)).catch(() => {});
          }
          return res;
        });
      })
    );
  }
});
