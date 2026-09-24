import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url)).replace(/\/$/, "");
const SOURCE_PATHS = [
  "src",
  "assets",
  "vendor",
  "scripts",
  "tests",
  "index.html",
  "sw.js",
  "manifest.json",
  "favicon.svg",
  "package.json",
  "package-lock.json",
  "jsconfig.json",
  "vercel.json",
];

async function hashSources() {
  const hash = createHash("sha256");

  async function addPath(path) {
    const info = await stat(path);
    if (info.isDirectory()) {
      const entries = await readdir(path);
      entries.sort();
      for (const entry of entries) await addPath(join(path, entry));
      return;
    }
    hash.update(relative(ROOT, path));
    hash.update("\0");
    hash.update(await readFile(path));
    hash.update("\0");
  }

  for (const sourcePath of SOURCE_PATHS) await addPath(join(ROOT, sourcePath));
  return hash.digest("hex");
}

function runBuild() {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["scripts/build.mjs"], {
      cwd: ROOT,
      stdio: "inherit",
    });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`production build failed (${signal || code})`));
    });
  });
}

const before = await hashSources();
await runBuild();
const after = await hashSources();

if (before !== after) {
  throw new Error("production build modified source-controlled project files");
}

console.log("[verify-build] Production build left source files unchanged");
