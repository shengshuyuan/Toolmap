import assert from "node:assert/strict";
import { diffLines } from "../src/tools/text-diff/diff.js";
import { summarizeDiffLines } from "../src/tools/text-diff/summary.js";

{
  const result = diffLines("第一行\n第二行\n第三行", "第一行\n第二行改了\n第三行\n第四行新增");
  assert.equal(
    summarizeDiffLines(result.lines),
    "本次比对共4行，2行、4行存在不一致，其中内容差异2处，排版差异0处，请留意及处理。"
  );
}

{
  const result = diffLines("第一行\n第二行", "第一行\n第二行");
  assert.equal(summarizeDiffLines(result.lines), "本次比对共2行，未发现不一致。");
}

console.log("summary tests passed");
