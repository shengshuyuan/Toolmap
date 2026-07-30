import assert from "node:assert/strict";
import { APP_VERSION, BUILD_LABEL, APP_TITLE } from "../src/config/app-meta.js";
import { TOOL_REGISTRY, getToolById, getToolIds } from "../src/tool-registry.js";

assert.equal(typeof APP_VERSION, "string");
assert.equal(typeof BUILD_LABEL, "string");
assert.equal(typeof APP_TITLE, "string");

assert.equal(TOOL_REGISTRY.length, 6, "应注册 6 个工具");
assert.deepEqual(getToolIds(), [
  "text-diff",
  "image-compress",
  "char-count",
  "qrcode",
  "markdown-editor",
  "pdf-tools",
]);

for (const tool of TOOL_REGISTRY) {
  assert.ok(tool.id);
  assert.ok(tool.mountId);
  assert.ok(tool.title);
  assert.ok(tool.subtitle);
  assert.ok(tool.name);
  assert.ok(tool.hint);
  assert.ok(tool.buttonLabel);
  assert.ok(tool.importPath);
  assert.ok(tool.exportName);
}

assert.equal(getToolById("text-diff")?.buttonLabel, "文本比对");
assert.equal(getToolById("image-compress")?.buttonLabel, "图片压缩");
assert.equal(getToolById("char-count")?.buttonLabel, "字符统计");
assert.equal(getToolById("qrcode")?.buttonLabel, "二维码");
assert.equal(getToolById("markdown-editor")?.buttonLabel, "Markdown");
assert.equal(getToolById("pdf-tools")?.buttonLabel, "PDF 工具");

console.log("tool registry tests passed");
