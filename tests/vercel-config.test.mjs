import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const config = JSON.parse(await readFile(new URL("../vercel.json", import.meta.url), "utf8"));

function findHeaderValue(source, key) {
  const rule = config.headers.find((item) => item.source === source);
  const header = rule?.headers.find((item) => item.key.toLowerCase() === key.toLowerCase());
  return header?.value ?? "";
}

assert.equal(findHeaderValue("/", "Cache-Control"), "public, max-age=0, must-revalidate");
assert.equal(findHeaderValue("/assets/(.*)", "Cache-Control"), "public, max-age=31536000, immutable");
assert.equal(findHeaderValue("/src/(.*)", "Cache-Control"), "public, max-age=0, must-revalidate");
assert.ok(!findHeaderValue("/src/(.*)", "Cache-Control").includes("immutable"));

console.log("vercel config tests passed");
