// Service Worker - Caderninho de Frota
// [FIX] Limpa cache antigo e forca atualizacao
const CACHE_NAME = 'v20261010220344';

// Instalar: limpar caches antigos
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  self.skipWaiting();
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Removendo cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Ativar: assumir controle imediatamente
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(self.clients.claim());
});

// Fetch: sempre buscar da rede (nao usar cache)
self.addEventListener('fetch', (event) => {
  // Ignorar requisicoes de API (sempre da rede)
  if (event.request.url.includes('/api/')) {
    return;
  }
  
  // Para outros recursos, buscar da rede primeiro
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Se a resposta for OK, retornar (sem cachear)
        return response;
      })
      .catch(() => {
        // Se falhar, tentar do cache (offline)
        return caches.match(event.request);
      })
  );
});