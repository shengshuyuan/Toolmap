import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const config = JSON.parse(
  await readFile(new URL("../jsconfig.json", import.meta.url), "utf8")
);

assert.ok(config.include.includes("src/**/*.js"), "类型检查必须覆盖全部 src JavaScript");
assert.ok(config.include.includes("src/**/*.d.ts"), "类型检查必须加载项目 DOM 扩展声明");

console.log("typecheck config tests passed");
