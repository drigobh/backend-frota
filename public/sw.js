/**
 * Caderninho de Motorista - Service Worker
 * Estrategia: cache-first para assets locais, network-first para API
 * NOTA: Nao cacheia CDNs externos (o navegador ja cacheia)
 */
const CACHE_NAME = "caderninho-v1.0.1";
const OFFLINE_URL = "/offline.html";

const ASSETS_PRECACHE = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icon-192.svg",
  "/icon-512.svg",
  "/offline.html"
];

// INSTALL
self.addEventListener("install", (event) => {
  console.log("[SW] Installing...");
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[SW] Pre-caching app shell");
      return cache.addAll(ASSETS_PRECACHE);
    }).then(() => self.skipWaiting())
  );
});

// ACTIVATE
self.addEventListener("activate", (event) => {
  console.log("[SW] Activating...");
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// FETCH
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET") return;

  // 1) Nao intercepta CDNs externos (o navegador cuida)
  if (url.origin !== self.location.origin) {
    return;
  }

  // 2) API sempre network-first
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(JSON.stringify({ erro: "Offline" }), {
          status: 503,
          headers: { "Content-Type": "application/json" }
        });
      })
    );
    return;
  }

  // 3) Health check nao intercepta
  if (url.pathname === "/health") return;

  // 4) Assets locais: cache-first
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response && response.status === 200 && response.type === "basic") {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        }
        return response;
      }).catch(() => {
        if (request.mode === "navigate") {
          return caches.match(OFFLINE_URL);
        }
        return new Response("Offline", { status: 503 });
      });
    })
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
