import assert from "node:assert/strict";
import { getCharCountTemplate } from "../src/tools/char-count/index.js";

const template = getCharCountTemplate();

assert.ok(!template.includes("填入示例"), "字符统计不应再包含填入示例按钮");
assert.ok(!template.includes("ccFillExample"), "字符统计不应再引用示例按钮节点");
assert.ok(template.includes("复制文本"), "复制文本按钮应保留");
assert.ok(template.includes("清空文本"), "清空文本按钮应保留");

console.log("char count template tests passed");
