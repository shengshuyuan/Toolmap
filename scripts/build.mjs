import { transform } from "esbuild";
import { cp, mkdir, readFile, writeFile, readdir } from "node:fs/promises";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url)).replace(/\/$/, "");
const DIST = join(ROOT, "dist");
const JS_TARGET = "es2020";

const JS_DIRS = ["src"];
const STATIC_FILES = ["index.html", "manifest.json", "favicon.svg"];
const STATIC_DIRS = ["assets", "vendor"];

async function ensureDir(dir) {
  await mkdir(dir, { recursive: true });
}

async function collectFiles(dir, ext) {
  const results = [];
  async function walk(current) {
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = join(current, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (extname(entry.name) === ext) results.push(full);
    }
  }
  await walk(dir);
  return results;
}

async function minifyJS(srcFile) {
  const rel = srcFile.slice(ROOT.length + 1);
  const destFile = join(DIST, rel);
  await ensureDir(join(destFile, ".."));
  const code = await readFile(srcFile, "utf8");
  const result = await transform(code, { loader: "js", minify: true, target: JS_TARGET });
  await writeFile(destFile, result.code);
  return rel;
}

async function minifyCSS(srcFile) {
  const rel = srcFile.slice(ROOT.length + 1);
  const destFile = join(DIST, rel);
  await ensureDir(join(destFile, ".."));
  const code = await readFile(srcFile, "utf8");
  const result = await transform(code, { loader: "css", minify: true });
  await writeFile(destFile, result.code);
  return rel;
}

async function copyFile(srcFile) {
  const rel = srcFile.slice(ROOT.length + 1);
  const destFile = join(DIST, rel);
  await ensureDir(join(destFile, ".."));
  await cp(srcFile, destFile);
  return rel;
}

async function updateServiceWorkerPrecache() {
  const jsFiles = await collectFiles(join(ROOT, "src"), ".js");
  const cssFiles = await collectFiles(join(ROOT, "src"), ".css");
  const vendorFiles = await collectFiles(join(ROOT, "vendor"), ".js");
  const assetFiles = await collectFiles(join(ROOT, "assets"), ".svg");
  const relJS = jsFiles.map((f) => "/" + f.slice(ROOT.length + 1).replace(/\\/g, "/"));
  const relCSS = cssFiles.map((f) => "/" + f.slice(ROOT.length + 1).replace(/\\/g, "/"));
  const relVendor = vendorFiles.map((f) => "/" + f.slice(ROOT.length + 1).replace(/\\/g, "/"));
  const relAssets = assetFiles.map((f) => "/" + f.slice(ROOT.length + 1).replace(/\\/g, "/"));
  const staticUrls = [
    "/",
    "/index.html",
    "/favicon.svg",
    "/assets/app.css",
    "/sw.js",
    "/manifest.json",
  ];
  const allUrls = Array.from(
    new Set([...staticUrls, ...relJS, ...relCSS, ...relVendor, ...relAssets])
  ).sort();

  const swPath = join(ROOT, "sw.js");
  const swCode = await readFile(swPath, "utf8");
  const precacheArrayString = JSON.stringify(allUrls, null, 2);
  const precachePattern = /const PRECACHE_URLS = \[\s*[\s\S]*?\n\];/m;
  if (!precachePattern.test(swCode)) {
    throw new Error("Service Worker template is missing PRECACHE_URLS");
  }
  const generatedSwCode = swCode.replace(
    precachePattern,
    `const PRECACHE_URLS = ${precacheArrayString};`
  );

  const distSwPath = join(DIST, "sw.js");
  const distSwCode = await transform(generatedSwCode, { loader: "js", minify: true, target: JS_TARGET });
  await writeFile(distSwPath, distSwCode.code);
}

async function main() {
  const start = Date.now();
  console.log("[build] Starting production build...");
  await ensureDir(DIST);

  for (const file of STATIC_FILES) await copyFile(join(ROOT, file));
  for (const dir of STATIC_DIRS) await cp(join(ROOT, dir), join(DIST, dir), { recursive: true });

  let jsCount = 0;
  for (const dir of JS_DIRS) {
    const files = await collectFiles(join(ROOT, dir), ".js");
    for (const file of files) { await minifyJS(file); jsCount++; }
  }
  console.log(`[build] Minified ${jsCount} JS files`);

  const srcCss = await collectFiles(join(ROOT, "src"), ".css");
  const cssFiles = [join(ROOT, "assets/app.css"), ...srcCss];
  for (const file of cssFiles) await minifyCSS(file);
  console.log(`[build] Minified ${cssFiles.length} CSS files`);

  await updateServiceWorkerPrecache();
  console.log("[build] Auto-updated Service Worker precache manifest");

  const elapsed = Date.now() - start;
  console.log(`[build] Done in ${elapsed}ms -> dist/`);
}

main().catch((err) => { console.error("[build] Failed:", err); process.exit(1); });
