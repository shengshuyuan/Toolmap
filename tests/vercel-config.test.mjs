import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const config = JSON.parse(await readFile(new URL("../vercel.json", import.meta.url), "utf8"));

function findHeaderValue(source, key) {
  const rule = config.headers.find((item) => item.source === source);
  const header = rule?.headers.find((item) => item.key.toLowerCase() === key.toLowerCase());
  return header?.value ?? "";
}

assert.equal(findHeaderValue("/", "Cache-Control"), "public, max-age=0, must-revalidate");
// 源码 JS/CSS 不可用 immutable 长缓存，否则发版后浏览器会一直用旧 tool-registry
assert.equal(findHeaderValue("/assets/(.*)", "Cache-Control"), "public, max-age=0, must-revalidate");
assert.equal(findHeaderValue("/src/(.*)", "Cache-Control"), "public, max-age=0, must-revalidate");
assert.equal(findHeaderValue("/sw.js", "Cache-Control"), "public, max-age=0, must-revalidate");
assert.ok(!findHeaderValue("/src/(.*)", "Cache-Control").includes("immutable"));
// vendor 文件名不带哈希，使用短期缓存 + stale-while-revalidate，而不是 immutable
const vendorCache = findHeaderValue("/vendor/(.*)", "Cache-Control");
assert.match(vendorCache, /max-age=\d+/);
assert.match(vendorCache, /stale-while-revalidate=\d+/);
assert.ok(!vendorCache.includes("immutable"));

// 页面不再依赖内联脚本，CSP 不得放开 script 的 unsafe-inline
const csp = findHeaderValue("/(.*)", "Content-Security-Policy");
const scriptSrc = csp.split(";").map((part) => part.trim()).find((part) => part.startsWith("script-src")) ?? "";
assert.ok(scriptSrc.length > 0, "CSP 必须声明 script-src");
assert.ok(!scriptSrc.includes("unsafe-inline"), "script-src 不应包含 unsafe-inline");

console.log("vercel config tests passed");
