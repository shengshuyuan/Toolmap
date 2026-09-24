import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const indexHtml = await readFile(new URL("index.html", root), "utf8");
const serviceWorker = await readFile(new URL("sw.js", root), "utf8");

assert.match(serviceWorker, /const CACHE_NAME = "toolmap-v8";/, "本次缓存策略修复必须切换到新缓存命名空间");

assert.doesNotMatch(
  indexHtml,
  /getRegistrations\(|\.unregister\(|caches\.keys\(|caches\.delete\(|location\.reload\(/,
  "版本更新不能在新 Service Worker 安装成功前破坏旧离线缓存"
);
assert.match(
  indexHtml,
  /\.register\(["']\.\/sw\.js["']\)/,
  "Service Worker 应使用稳定 URL 注册"
);
assert.doesNotMatch(
  indexHtml,
  /sw\.js\?v=\$\{Date\.now\(\)\}/,
  "Service Worker URL 不应在每次启动时随机变化"
);

for (const asset of [
  "/assets/og-image.svg",
  "/vendor/jsqr.min.js",
  "/vendor/pdf-lib.min.js",
]) {
  assert.ok(serviceWorker.includes(`"${asset}"`), `${asset} 应进入离线预缓存`);
}

assert.ok(
  (serviceWorker.match(/caches\.match\(event\.request,\s*\{\s*ignoreSearch:\s*true\s*\}\)/g) || []).length >= 2,
  "带版本 query 的 JS/CSS 必须能回退到无 query 的预缓存资源"
);

console.log("PWA lifecycle tests passed");
