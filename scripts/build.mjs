import { transform } from "esbuild";
import { cp, mkdir, readFile, writeFile, readdir } from "node:fs/promises";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url)).replace(/\/$/, "");
const DIST = join(ROOT, "dist");
const JS_TARGET = "es2020";

const JS_DIRS = ["src"];
const CSS_FILES = ["assets/app.css"];
const STATIC_FILES = ["index.html", "sw.js", "manifest.json"];
const STATIC_DIRS = ["assets"];

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

  for (const file of CSS_FILES) await minifyCSS(join(ROOT, file));
  console.log(`[build] Minified ${CSS_FILES.length} CSS files`);

  const elapsed = Date.now() - start;
  console.log(`[build] Done in ${elapsed}ms -> dist/`);
}

main().catch((err) => { console.error("[build] Failed:", err); process.exit(1); });
