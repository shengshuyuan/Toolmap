import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { diffLines } from "../src/tools/text-diff/diff.js";
import {
  TEXT_HISTORY_LIMIT,
  createTextHistoryRecord,
  getTextHistoryUsage,
  isTextHistoryAvailable,
} from "../src/tools/text-diff/history-store.js";

const result = diffLines("第一行\n第二行", "第一行\n第二行改了");
const record = createTextHistoryRecord({
  leftText: "第一行\n第二行",
  rightText: "第一行\n第二行改了",
  result,
});

assert.equal(TEXT_HISTORY_LIMIT, 30);
assert.equal(isTextHistoryAvailable(), false);
assert.equal(record.diffCount, 1);
assert.equal(record.contentDiffCount, 1);
assert.equal(record.formatDiffCount, 0);
assert.equal(record.leftChars, 7);
assert.equal(record.rightChars, 9);
assert.match(record.summary, /2行存在不一致/);
assert.equal(getTextHistoryUsage([record]), new TextEncoder().encode(record.leftText + record.rightText).length);

const css = await readFile(new URL("../assets/app.css", import.meta.url), "utf8");
const textTool = await readFile(new URL("../src/tools/text-diff/index.js", import.meta.url), "utf8");
assert.match(css, /\.text-diff-tool \.text-history/);
assert.match(textTool, /历史记录/);
assert.match(textTool, /saveComparisonHistory/);
assert.match(textTool, /data-text-history-restore/);
assert.match(textTool, /window\.confirm\("确定删除这条文本比对历史吗/);
assert.match(textTool, /window\.confirm\("确定清空文本比对历史吗/);

console.log("text history tests passed");
