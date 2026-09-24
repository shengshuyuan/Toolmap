import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const pkg = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
assert.equal(pkg.scripts.pretest, "npm run verify:build", "npm test 必须先验证当前生产构建且不改源码");
assert.equal(pkg.scripts["verify:build"], "node scripts/verify-build.mjs");

console.log("test script contract tests passed");
