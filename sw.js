// CACHE_NAME 与 PRECACHE_URLS 由 scripts/build.mjs 在构建时生成到 dist/sw.js，
// 这里只保留可运行的最小模板，请勿手动维护完整列表。
const CACHE_NAME = "toolmap-dev";
// vendor 大文件（pdf-lib / jsqr）不进入安装期预缓存，首次使用时单独缓存，并跨版本保留
const VENDOR_CACHE = "toolmap-vendor-v1";
const PRECACHE_URLS = [
  "/",
  "/index.html",
  "/favicon.svg",
  "/assets/app.css",
  "/sw.js",
  "/manifest.json"
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
      Promise.all(
        names
          .filter((n) => n !== CACHE_NAME && n !== VENDOR_CACHE)
          .map((n) => caches.delete(n))
      )
    )
  );
  self.clients.claim();
});

/**
 * JS/CSS：网络优先，避免发版后仍命中旧 tool-registry 导致导航缺工具
 * vendor 第三方库：缓存优先（独立缓存，跨版本保留），未命中时网络获取并回写
 * 其它静态资源：缓存优先，网络回写
 */
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (url.origin !== self.location.origin || event.request.method !== "GET") return;

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => caches.match("/index.html"))
    );
    return;
  }

  if (url.pathname.startsWith("/vendor/")) {
    event.respondWith(
      caches.open(VENDOR_CACHE).then((cache) =>
        cache.match(event.request, { ignoreSearch: true }).then(
          (cached) =>
            cached ||
            fetch(event.request).then((response) => {
              if (response.ok) cache.put(event.request, response.clone());
              return response;
            })
        )
      )
    );
    return;
  }

  const isCodeAsset =
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith("/sw.js") ||
    url.pathname.endsWith("manifest.json");

  if (isCodeAsset) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request, { ignoreSearch: true }))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((cached) => {
      const fetchPromise = fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
