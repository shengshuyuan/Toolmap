import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const DIST = join(ROOT, "dist");

try {
  await access(DIST);
} catch {
  console.log("build-output tests skipped (dist/ not found)");
  process.exit(0);
}

const distAppJs = await readFile(join(DIST, "src/app.js"), "utf8");
const srcAppJs = await readFile(join(ROOT, "src/app.js"), "utf8");
assert.ok(distAppJs.length < srcAppJs.length, "dist/src/app.js should be minified");

const distCSS = await readFile(join(DIST, "assets/app.css"), "utf8");
const srcCSS = await readFile(join(ROOT, "assets/app.css"), "utf8");
assert.ok(distCSS.length < srcCSS.length, "dist/assets/app.css should be minified");

const html = await readFile(join(DIST, "index.html"), "utf8");
assert.ok(html.includes('type="module"'), "index.html should have module script");

const sw = await readFile(join(DIST, "sw.js"), "utf8");
assert.ok(sw.includes("PRECACHE_URLS"), "sw.js should contain precache list");

console.log("build-output tests passed");
