import assert from "node:assert/strict";
import { parsePageRanges } from "../src/tools/pdf-tools/pdf-split.js";
import { calcPosition as wmCalcPosition } from "../src/tools/pdf-tools/pdf-watermark.js";

// ── parsePageRanges 测试 ──

// 基本范围解析
{
  const pages = parsePageRanges("1-3", 10);
  assert.deepEqual(pages, [0, 1, 2]);
}

// 单页
{
  const pages = parsePageRanges("5", 10);
  assert.deepEqual(pages, [4]);
}

// 多段
{
  const pages = parsePageRanges("1-3, 5, 7-9", 10);
  assert.deepEqual(pages, [0, 1, 2, 4, 6, 7, 8]);
}

// 反转范围（5-3 应自动修正）
{
  const pages = parsePageRanges("5-3", 10);
  assert.deepEqual(pages, [2, 3, 4]);
}

// 超出最大页码
{
  const pages = parsePageRanges("1-100", 5);
  assert.deepEqual(pages, [0, 1, 2, 3, 4]);
}

// 空字符串
{
  const pages = parsePageRanges("", 10);
  assert.deepEqual(pages, []);
}

// 带空格
{
  const pages = parsePageRanges(" 1 - 3 , 5 ", 10);
  assert.deepEqual(pages, [0, 1, 2, 4]);
}

// 无效输入
{
  const pages = parsePageRanges("abc", 10);
  assert.deepEqual(pages, []);
}

// ── calcPosition (split) 测试 ──

{
  const pages = parsePageRanges("1", 5);
  assert.deepEqual(pages, [0]);
}

// ── wmCalcPosition 测试 ──

// 居中
{
  const pos = wmCalcPosition(612, 792, 100, 20, "mc");
  assert.ok(Math.abs(pos.x - (612 - 100) / 2) < 1, "mc x 居中");
  assert.ok(Math.abs(pos.y - (792 - 20) / 2) < 1, "mc y 居中");
}

// 左上
{
  const pos = wmCalcPosition(612, 792, 100, 20, "tl");
  assert.equal(pos.x, 40, "tl x 在左边距");
  assert.ok(pos.y > 700, "tl y 在顶部");
}

// 右下
{
  const pos = wmCalcPosition(612, 792, 100, 20, "br");
  assert.ok(pos.x > 400, "br x 在右侧");
  assert.equal(pos.y, 40, "br y 在底部边距");
}

// 无效位置回退到 mc
{
  const pos = wmCalcPosition(612, 792, 100, 20, "invalid");
  const mc = wmCalcPosition(612, 792, 100, 20, "mc");
  assert.deepEqual(pos, mc, "无效位置应 fallback 到 mc");
}

// 所有 9 个位置都有有效坐标
{
  const positions = ["tl","tc","tr","ml","mc","mr","bl","bc","br"];
  for (const p of positions) {
    const pos = wmCalcPosition(612, 792, 100, 20, p);
    assert.ok(typeof pos.x === "number" && !isNaN(pos.x), `${p} x 应为数字`);
    assert.ok(typeof pos.y === "number" && !isNaN(pos.y), `${p} y 应为数字`);
  }
}

console.log("PDF tools tests passed");
