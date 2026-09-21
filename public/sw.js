/**
 * Caderninho de Motorista - Service Worker
 * Estrategia: network-first para HTML, cache-first para assets, network-only para API
 */
const CACHE_NAME = 'caderninho-v1.0.2'; // BUMP de versao (era v1.0.1)
const OFFLINE_URL = '/offline.html';

// Assets para cache inicial (app shell)
const ASSETS_PRECACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.svg',
  '/icon-512.svg',
  '/offline.html'
];

// INSTALL
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching app shell');
      return cache.addAll(ASSETS_PRECACHE);
    }).then(() => self.skipWaiting())
  );
});

// ACTIVATE
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME)
            .map(key => {
              console.log('[SW] Removendo cache antigo: ' + key);
              return caches.delete(key);
            })
      );
    }).then(() => self.clients.claim())
  );
});

// FETCH
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1) Nao intercepta requisicoes nao-GET
  if (request.method !== 'GET') return;

  // 2) CDNs externos: sempre network (o navegador cuida)
  if (url.origin !== self.location.origin) return;

  // 3) API: sempre network (nao cacheia)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(JSON.stringify({ erro: 'Offline' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // 4) Health check: nao intercepta
  if (url.pathname === '/health') return;

  // 5) HTML (navegacao): NETWORK-FIRST (sempre busca do servidor, fallback pro cache)
  if (request.mode === 'navigate' || url.pathname === '/' || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(request, { cache: 'no-store' }).then((response) => { // FASE_14_SW_NO_STORE
        // Atualiza o cache com a versao nova
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        }
        return response;
      }).catch(() => {
        // Offline: usa o cache ou a pagina offline
        return caches.match(request).then((cached) => {
          return cached || caches.match(OFFLINE_URL);
        });
      })
    );
    return;
  }

  // 6) Assets locais (CSS, JS, imagens): CACHE-FIRST
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        }
        return response;
      }).catch(() => {
        return new Response('Offline', { status: 503 });
      });
    })
  );
});

// MESSAGE (SKIP WAITING)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
