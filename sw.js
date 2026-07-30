const CACHE_NAME = "toolmap-v4";
const PRECACHE_URLS = [
  "/",
  "/assets/app.css",
  "/favicon.svg",
  "/index.html",
  "/manifest.json",
  "/src/app-shell.js",
  "/src/app.js",
  "/src/bg-art.js",
  "/src/config/app-meta.js",
  "/src/debug.js",
  "/src/shared/clipboard.js",
  "/src/shared/escape.js",
  "/src/shared/format.js",
  "/src/shared/history-db.js",
  "/src/shared/history-export.js",
  "/src/shared/idb-store.js",
  "/src/shared/toast.js",
  "/src/tool-registry.js",
  "/src/tools/char-count/char-count.css",
  "/src/tools/char-count/index.js",
  "/src/tools/char-count/stats.js",
  "/src/tools/image-compress/compressor.js",
  "/src/tools/image-compress/download.js",
  "/src/tools/image-compress/history-store.js",
  "/src/tools/image-compress/image-compress.css",
  "/src/tools/image-compress/image-meta.js",
  "/src/tools/image-compress/index.js",
  "/src/tools/image-compress/utils.js",
  "/src/tools/markdown-editor/document-store.js",
  "/src/tools/markdown-editor/export.js",
  "/src/tools/markdown-editor/html-import.js",
  "/src/tools/markdown-editor/index.js",
  "/src/tools/markdown-editor/markdown-editor.css",
  "/src/tools/markdown-editor/outline.js",
  "/src/tools/markdown-editor/renderer.js",
  "/src/tools/pdf-tools/index.js",
  "/src/tools/pdf-tools/pdf-lib-loader.js",
  "/src/tools/pdf-tools/pdf-merge.js",
  "/src/tools/pdf-tools/pdf-split.js",
  "/src/tools/pdf-tools/pdf-tools.css",
  "/src/tools/pdf-tools/pdf-watermark.js",
  "/src/tools/qrcode/index.js",
  "/src/tools/qrcode/qr-decode.js",
  "/src/tools/qrcode/qr-encode.js",
  "/src/tools/qrcode/qr-render.js",
  "/src/tools/qrcode/qr-scan-check.js",
  "/src/tools/qrcode/qr-style.js",
  "/src/tools/qrcode/qrcode.css",
  "/src/tools/text-diff/char-diff.js",
  "/src/tools/text-diff/clipboard.js",
  "/src/tools/text-diff/diagnostics.js",
  "/src/tools/text-diff/diff.js",
  "/src/tools/text-diff/editor.js",
  "/src/tools/text-diff/history-store.js",
  "/src/tools/text-diff/index.js",
  "/src/tools/text-diff/render.js",
  "/src/tools/text-diff/sanitize.js",
  "/src/tools/text-diff/state.js",
  "/src/tools/text-diff/summary.js",
  "/src/tools/text-diff/text-diff.css",
  "/sw.js"
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

/**
 * JS/CSS：网络优先，避免发版后仍命中旧 tool-registry 导致导航缺工具
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
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
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
