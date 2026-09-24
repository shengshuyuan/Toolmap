import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { transform } from "esbuild";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const DIST = join(ROOT, "dist");

const distAppJs = await readFile(join(DIST, "src/app.js"), "utf8");
const srcAppJs = await readFile(join(ROOT, "src/app.js"), "utf8");
const expectedAppJs = await transform(srcAppJs, {
  loader: "js",
  minify: true,
  target: "es2020",
});
assert.equal(distAppJs, expectedAppJs.code, "dist/src/app.js should match the current source build");

const distCSS = await readFile(join(DIST, "assets/app.css"), "utf8");
const srcCSS = await readFile(join(ROOT, "assets/app.css"), "utf8");
const expectedCSS = await transform(srcCSS, { loader: "css", minify: true });
assert.equal(distCSS, expectedCSS.code, "dist/assets/app.css should match the current source build");

const html = await readFile(join(DIST, "index.html"), "utf8");
assert.ok(html.includes('type="module"'), "index.html should have module script");

const sw = await readFile(join(DIST, "sw.js"), "utf8");
assert.ok(sw.includes("PRECACHE_URLS"), "sw.js should contain precache list");

const buildScript = await readFile(join(ROOT, "scripts/build.mjs"), "utf8");
assert.doesNotMatch(
  buildScript,
  /writeFile\(swPath\s*,/,
  "production build must not rewrite the tracked sw.js template"
);

console.log("build-output tests passed");
