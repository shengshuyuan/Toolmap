import assert from "node:assert/strict";
import { TOOL_REGISTRY } from "../src/tool-registry.js";
import { renderToolMountMarkup, renderToolSwitchMarkup } from "../src/app-shell.js";
import { getTextDiffTemplate } from "../src/tools/text-diff/index.js";
import { getImageCompressTemplate } from "../src/tools/image-compress/index.js";
import { getCharCountTemplate } from "../src/tools/char-count/index.js";
import { getQrcodeTemplate } from "../src/tools/qrcode/index.js";
import { getMarkdownEditorTemplate } from "../src/tools/markdown-editor/index.js";
import { getPdfToolsTemplate } from "../src/tools/pdf-tools/index.js";

const templateMap = {
  "text-diff": getTextDiffTemplate(),
  "image-compress": getImageCompressTemplate(),
  "char-count": getCharCountTemplate(),
  "qrcode": getQrcodeTemplate(),
  "markdown-editor": getMarkdownEditorTemplate(),
  "pdf-tools": getPdfToolsTemplate(),
};

assert.equal(TOOL_REGISTRY.length, 6);

const switchMarkup = renderToolSwitchMarkup(TOOL_REGISTRY);
const mountMarkup = renderToolMountMarkup(TOOL_REGISTRY);

assert.ok(switchMarkup.includes('data-tool-target="text-diff"'));
assert.ok(switchMarkup.includes('data-tool-target="image-compress"'));
assert.ok(switchMarkup.includes('data-tool-target="char-count"'));
assert.ok(switchMarkup.includes('data-tool-target="qrcode"'));
assert.ok(switchMarkup.includes('data-tool-target="markdown-editor"'));
assert.ok(switchMarkup.includes('data-tool-target="pdf-tools"'));
assert.ok(mountMarkup.includes('id="textDiffTool"'));
assert.ok(mountMarkup.includes('id="imageCompressTool"'));
assert.ok(mountMarkup.includes('id="charCountTool"'));
assert.ok(mountMarkup.includes('id="qrcodeTool"'));
assert.ok(mountMarkup.includes('id="markdownEditorTool"'));
assert.ok(mountMarkup.includes('id="pdfToolsTool"'));

assert.ok(templateMap["text-diff"].includes("btnCompare"));
assert.ok(templateMap["text-diff"].includes("btnCopy"));
assert.ok(templateMap["text-diff"].includes("btnExportTextHistory"));

assert.ok(templateMap["image-compress"].includes("icFileInput"));
assert.ok(templateMap["image-compress"].includes("选择图片"));
assert.ok(templateMap["image-compress"].includes("icExportHistory"));

assert.ok(templateMap["char-count"].includes("ccText"));
assert.ok(templateMap["char-count"].includes("ccCopyText"));
assert.ok(templateMap["char-count"].includes("ccClearText"));

assert.ok(templateMap["qrcode"].includes("qrText"));
assert.ok(templateMap["qrcode"].includes("qrCanvas"));
assert.ok(templateMap["qrcode"].includes("qrDownloadPng"));
assert.ok(templateMap["qrcode"].includes("qrUploadZone"));
assert.ok(templateMap["qrcode"].includes("qrFrameEnabled"));
assert.ok(templateMap["qrcode"].includes("qrLogoInput"));
assert.ok(templateMap["qrcode"].includes("qrScanCheck"));

assert.ok(templateMap["markdown-editor"].includes("mdEditor"));
assert.ok(templateMap["markdown-editor"].includes("mdPreview"));
assert.ok(templateMap["markdown-editor"].includes("mdExportMd"));

assert.ok(templateMap["pdf-tools"].includes("pdfMergeUpload"));
assert.ok(templateMap["pdf-tools"].includes("pdfSplitInput"));
assert.ok(templateMap["pdf-tools"].includes("pdfWmText"));

for (const tool of TOOL_REGISTRY) {
  assert.ok(templateMap[tool.id], `缺少 ${tool.id} 的模板`);
}

console.log("app smoke tests passed");
