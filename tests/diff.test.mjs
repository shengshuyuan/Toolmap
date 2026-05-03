import assert from "node:assert/strict";
import { diffLines, toLines } from "../src/tools/text-diff/diff.js";

function compactOps(result) {
  return result.lines.map((line) => line.op);
}

assert.deepEqual(toLines(""), [], "empty text should not be treated as a real blank line");

{
  const result = diffLines("", "新增一行");
  assert.deepEqual(compactOps(result), ["insert"]);
  assert.equal(result.diffCount, 1);
  assert.equal(result.lines[0].right, "新增一行");
}

{
  const result = diffLines("删除一行", "");
  assert.deepEqual(compactOps(result), ["delete"]);
  assert.equal(result.diffCount, 1);
  assert.equal(result.lines[0].left, "删除一行");
}

{
  const result = diffLines("第一行\n第二行", "第一行\n第二行");
  assert.deepEqual(compactOps(result), ["equal", "equal"]);
  assert.equal(result.diffCount, 0);
}

{
  const result = diffLines("const a = 1;\n\n标题", "const  a = 1;\n标题");
  assert.equal(result.diffCount, 2);
  assert.equal(result.formatDiffCount, 2);
  assert.equal(result.contentDiffCount, 0);
  assert.deepEqual(
    result.lines.filter((line) => line.op !== "equal").map((line) => line.diffType),
    ["format", "format"]
  );
}

{
  const result = diffLines("标题一", "标题二");
  assert.equal(result.diffCount, 1);
  assert.equal(result.contentDiffCount, 1);
  assert.equal(result.formatDiffCount, 0);
  assert.equal(result.lines.find((line) => line.op !== "equal")?.diffType, "content");
}

{
  const left = Array.from({ length: 180 }, (_, i) => `第 ${i + 1} 行：稳定内容`);
  const right = [...left];

  right[19] = "第 20 行：这里被修改了";
  right.splice(74, 0, "第 75.5 行：这里是新增内容");
  right.splice(129, 1);
  right[159] = "第 160 行：后段也被修改了";

  const result = diffLines(left.join("\n"), right.join("\n"));

  assert.equal(result.diffCount, 4);
  assert.equal(result.lines.filter((line) => line.op === "replace").length, 2);
  assert.equal(result.lines.filter((line) => line.op === "insert").length, 1);
  assert.equal(result.lines.filter((line) => line.op === "delete").length, 1);
}

console.log("diff tests passed");
