import { transform } from "esbuild";
import { createHash } from "node:crypto";
import { cp, mkdir, readFile, writeFile, readdir, rm } from "node:fs/promises";
import { join, extname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url)).replace(/\/$/, "");
const DIST = join(ROOT, "dist");
const JS_TARGET = "es2020";

const JS_DIRS = ["src"];
const STATIC_FILES = ["index.html", "manifest.json", "favicon.svg"];
const STATIC_DIRS = ["assets", "vendor"];
const META_FILE = "src/config/app-meta.js";

/** 首屏必经的模块，构建时注入 modulepreload 以消除动态 import 瀑布 */
const PRELOAD_MODULES = [
  "src/app.js",
  "src/app-shell.js",
  "src/tool-registry.js",
  "src/search-modal.js",
  "src/workbench.js",
];

function buildDate() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 校验 package.json 与 app-meta.js 的版本号一致，返回版本号 */
async function readAndCheckVersion() {
  const pkg = JSON.parse(await readFile(join(ROOT, "package.json"), "utf8"));
  const meta = await import(pathToFileURL(join(ROOT, META_FILE)).href);
  if (pkg.version !== meta.APP_VERSION) {
    throw new Error(
      `版本号不一致：package.json=${pkg.version}，${META_FILE}=${meta.APP_VERSION}，请先同步`
    );
  }
  const changelog = await readFile(join(ROOT, "CHANGELOG.md"), "utf8").catch(() => "");
  if (changelog && !changelog.includes(`## [${pkg.version}]`)) {
    console.warn(`[build] 提示：CHANGELOG.md 中还没有 ${pkg.version} 的记录`);
  }
  return pkg.version;
}

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
  let code = await readFile(srcFile, "utf8");
  if (rel === META_FILE) {
    // 构建日期在产物中自动生成，源码里的 BUILD_LABEL 仅作开发期占位
    code = code.replace(/BUILD_LABEL = "[^"]*"/, `BUILD_LABEL = "build ${buildDate()}"`);
  }
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

/**
 * 生成 dist/sw.js：
 * - 预缓存仅包含应用壳层（HTML、入口 CSS、全部 src JS/CSS，压缩后体积很小）
 * - vendor 大文件（pdf-lib / jsqr）与其它静态资源在首次使用时由 SW 运行时缓存
 * - 缓存名由版本号 + 预缓存内容哈希生成，任何产物变化都会触发旧缓存清理
 */
async function updateServiceWorkerPrecache(version) {
  const toUrl = (f) => "/" + f.slice(ROOT.length + 1).replace(/\\/g, "/");
  const jsFiles = await collectFiles(join(ROOT, "src"), ".js");
  const cssFiles = await collectFiles(join(ROOT, "src"), ".css");
  const staticUrls = [
    "/",
    "/index.html",
    "/favicon.svg",
    "/assets/app.css",
    "/sw.js",
    "/manifest.json",
  ];
  const allUrls = Array.from(
    new Set([...staticUrls, ...jsFiles.map(toUrl), ...cssFiles.map(toUrl)])
  ).sort();

  // 对实际产物（minify 之后）计算哈希
  const hash = createHash("sha256");
  for (const url of allUrls) {
    if (url === "/" || url === "/sw.js") continue;
    hash.update(url + "\0");
    hash.update(await readFile(join(DIST, url)));
  }
  const cacheName = `toolmap-v${version}-${hash.digest("hex").slice(0, 8)}`;

  const swPath = join(ROOT, "sw.js");
  const swCode = await readFile(swPath, "utf8");
  const precachePattern = /const PRECACHE_URLS = \[\s*[\s\S]*?\n\];/m;
  const cacheNamePattern = /const CACHE_NAME = "[^"]*";/;
  if (!precachePattern.test(swCode)) {
    throw new Error("Service Worker template is missing PRECACHE_URLS");
  }
  if (!cacheNamePattern.test(swCode)) {
    throw new Error("Service Worker template is missing CACHE_NAME");
  }
  const generatedSwCode = swCode
    .replace(cacheNamePattern, `const CACHE_NAME = "${cacheName}";`)
    .replace(precachePattern, `const PRECACHE_URLS = ${JSON.stringify(allUrls, null, 2)};`);

  const distSwCode = await transform(generatedSwCode, { loader: "js", minify: true, target: JS_TARGET });
  await writeFile(join(DIST, "sw.js"), distSwCode.code);
  return cacheName;
}

/** 向 dist/index.html 注入 modulepreload（带 ?v= 与运行时 import 的 URL 保持一致） */
async function injectModulePreload(version) {
  const htmlPath = join(DIST, "index.html");
  const html = await readFile(htmlPath, "utf8");
  const tags = PRELOAD_MODULES.map(
    (m) => `    <link rel="modulepreload" href="./${m}?v=${version}" />`
  ).join("\n");
  const marker = '    <script type="module" src="./src/boot/main.js"></script>';
  if (!html.includes(marker)) throw new Error("index.html is missing the boot module script");
  await writeFile(htmlPath, html.replace(marker, `${tags}\n${marker}`));
}

async function main() {
  const start = Date.now();
  console.log("[build] Starting production build...");
  const version = await readAndCheckVersion();
  // 先清空产物目录，避免已删除的源文件残留在 dist 里并被部署
  await rm(DIST, { recursive: true, force: true });
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

  await injectModulePreload(version);
  const cacheName = await updateServiceWorkerPrecache(version);
  console.log(`[build] Service Worker precache manifest updated (${cacheName})`);

  const elapsed = Date.now() - start;
  console.log(`[build] Done in ${elapsed}ms -> dist/`);
}

main().catch((err) => { console.error("[build] Failed:", err); process.exit(1); });
