import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const indexHtml = await readFile(new URL("index.html", root), "utf8");
const serviceWorker = await readFile(new URL("sw.js", root), "utf8");
const registerSw = await readFile(new URL("src/boot/register-sw.js", root), "utf8");
const buildScript = await readFile(new URL("scripts/build.mjs", root), "utf8");

assert.match(serviceWorker, /const CACHE_NAME = "[^"]+";/, "sw.js 模板必须包含可被构建替换的 CACHE_NAME");
assert.match(buildScript, /toolmap-v\$\{version\}-/, "构建必须由版本号与内容哈希生成缓存名");
assert.match(serviceWorker, /const VENDOR_CACHE = /, "vendor 大文件应使用独立缓存并跨版本保留");
assert.ok(
  serviceWorker.includes("n !== VENDOR_CACHE"),
  "activate 清理旧缓存时不能删除 vendor 缓存"
);

const bootCode = indexHtml + registerSw;
assert.doesNotMatch(
  bootCode,
  /getRegistrations\(|\.unregister\(|caches\.keys\(|caches\.delete\(|location\.reload\(/,
  "版本更新不能在新 Service Worker 安装成功前破坏旧离线缓存"
);
assert.match(
  registerSw,
  /\.register\(["']\.\/sw\.js["']\)/,
  "Service Worker 应使用稳定 URL 注册"
);
assert.doesNotMatch(
  bootCode,
  /sw\.js\?v=\$\{Date\.now\(\)\}/,
  "Service Worker URL 不应在每次启动时随机变化"
);
assert.ok(
  indexHtml.includes('src="./src/boot/register-sw.js"'),
  "index.html 必须通过外部脚本注册 Service Worker（CSP 禁止内联脚本）"
);

// 安装期预缓存只含壳层：vendor 大文件改为首次使用时运行时缓存
assert.ok(!/^\s*"\/vendor\//m.test(serviceWorker), "vendor 大文件不应进入安装期预缓存");
assert.ok(
  serviceWorker.includes('url.pathname.startsWith("/vendor/")'),
  "sw.js 必须为 /vendor/ 提供运行时缓存分支"
);

assert.ok(
  (serviceWorker.match(/caches\.match\(event\.request,\s*\{\s*ignoreSearch:\s*true\s*\}\)/g) || []).length >= 2,
  "带版本 query 的 JS/CSS 必须能回退到无 query 的预缓存资源"
);

console.log("PWA lifecycle tests passed");
