const CACHE_NAME = "toolmap-v1";
const PRECACHE_URLS = [
  "/",
  "/index.html",
  "/assets/app.css",
  "/assets/logo.svg",
  "/src/app.js",
  "/src/app-shell.js",
  "/src/bg-art.js",
  "/src/debug.js",
  "/src/tool-registry.js",
  "/src/config/app-meta.js",
  "/src/shared/toast.js",
  "/src/shared/history-db.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Only cache same-origin GET requests
  if (url.origin !== self.location.origin || event.request.method !== "GET") return;

  // For HTML: network-first strategy
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => caches.match("/index.html"))
    );
    return;
  }

  // For static assets: stale-while-revalidate
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
