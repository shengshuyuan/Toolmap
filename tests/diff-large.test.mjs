import assert from "node:assert/strict";
import { diffLines } from "../src/tools/text-diff/diff.js";

{
  const left = Array.from({ length: 6000 }, (_, i) => `第 ${i + 1} 行：中文、English、const value = ${i};`);
  const right = [...left];
  right[4321] = "第 4322 行：中文、English、const value = changed;";

  const result = diffLines(left.join("\n"), right.join("\n"));
  assert.equal(result.diffCount, 1);
  assert.equal(result.lines.filter((line) => line.op === "replace").length, 1);
}

console.log("large diff tests passed");
