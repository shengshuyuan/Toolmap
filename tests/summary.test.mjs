import assert from "node:assert/strict";
import { diffLines } from "../src/tools/text-diff/diff.js";
import { summarizeDiffLines, generateDiffReport } from "../src/tools/text-diff/summary.js";

{
  const result = diffLines("第一行\n第二行\n第三行", "第一行\n第二行改了\n第三行\n第四行新增");
  assert.equal(
    summarizeDiffLines(result.lines),
    "本次比对共4行，2行、4行存在不一致，其中内容差异2处，排版差异0处，请留意及处理。"
  );

  const reportMd = generateDiffReport(result.lines, { format: "markdown" });
  assert.ok(reportMd.includes("# 文本比对差异报告"));
  assert.ok(reportMd.includes("| 原行号 | 对比行号 | 类型 | 原文本 | 对比文本 |"));
  assert.ok(reportMd.includes("第二行改了"));

  const reportTxt = generateDiffReport(result.lines, { format: "txt" });
  assert.ok(reportTxt.includes("文本比对差异报告"));
  assert.ok(reportTxt.includes("+ 对比: 第四行新增"));
}

{
  const result = diffLines("第一行\n第二行", "第一行\n第二行");
  assert.equal(summarizeDiffLines(result.lines), "本次比对共2行，未发现不一致。");

  const reportMd = generateDiffReport(result.lines, { format: "markdown" });
  assert.ok(reportMd.includes("两侧文本内容完全一致"));
}

console.log("summary tests passed");
