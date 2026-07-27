import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { crc32, buildZip } from "../src/tools/image-compress/download.js";
import {
  buildOutputName,
  formatBytes,
  getModeSettings,
  getOutputMime,
} from "../src/tools/image-compress/utils.js";
import { buildCompressionCandidates, calculateTargetSize } from "../src/tools/image-compress/compressor.js";
import { HISTORY_LIMIT, createHistoryRecord, getHistoryUsage, isHistoryAvailable } from "../src/tools/image-compress/history-store.js";

assert.equal(formatBytes(512), "512 B");
assert.equal(formatBytes(1536), "1.50 KB");
assert.equal(buildOutputName("我的 图片.png", "image/webp"), "我的-图片-compressed.webp");
assert.equal(getModeSettings("smart").quality, 0.72);
assert.equal(getModeSettings("smart").outputFormat, "webp");
assert.equal(getModeSettings("smart").maxEdge, 1920);
assert.equal(getModeSettings("high").quality, 0.88);
assert.equal(getModeSettings("high").maxEdge, 3840);
assert.equal(getModeSettings("small").quality, 0.56);
assert.equal(getModeSettings("small").maxEdge, 1600);
assert.equal(getModeSettings("lossless").outputFormat, "original");
assert.equal(getModeSettings("lossless").maxEdge, 0);
assert.equal(getOutputMime("image/png", "webp", "smart"), "image/webp");
assert.equal(getOutputMime("image/png", "webp", "lossless"), "image/png");

assert.deepEqual(calculateTargetSize(4000, 2000, 2000), { width: 2000, height: 1000, resized: true });
assert.deepEqual(calculateTargetSize(1200, 800, 2000), { width: 1200, height: 800, resized: false });
assert.deepEqual(buildCompressionCandidates({
  mode: "smart",
  outputMime: "image/webp",
  maxEdge: 1920,
  quality: 0.72,
  width: 4000,
  height: 2000,
}), [
  { quality: 0.72, maxEdge: 1920, adaptive: false },
  { quality: 0.68, maxEdge: 1920, adaptive: true },
  { quality: 0.68, maxEdge: 1600, adaptive: true },
]);
assert.deepEqual(buildCompressionCandidates({
  mode: "high",
  outputMime: "image/webp",
  maxEdge: 3840,
  quality: 0.88,
  width: 4000,
  height: 2000,
}), [{ quality: 0.88, maxEdge: 3840, adaptive: false }]);

const bytes = new TextEncoder().encode("123456789");
assert.equal(crc32(bytes).toString(16), "cbf43926");

const zip = await buildZip([{ name: "hello.txt", blob: new Blob(["hello"]) }]);
const signature = new DataView(await zip.arrayBuffer()).getUint32(0, true);
assert.equal(signature, 0x04034b50);

assert.equal(HISTORY_LIMIT, 30);
assert.equal(isHistoryAvailable(), false);
const historyBlob = new Blob(["compressed"]);
const historyRecord = createHistoryRecord({
  file: { name: "原图.jpg", size: 2000, type: "image/jpeg" },
  meta: { width: 4000, height: 2000 },
  result: {
    blob: historyBlob,
    fileName: "原图-compressed.webp",
    outputSize: historyBlob.size,
    savedRatio: 50,
    type: "image/webp",
    width: 2560,
    height: 1280,
  },
});
assert.equal(historyRecord.originalName, "原图.jpg");
assert.equal(historyRecord.outputName, "原图-compressed.webp");
assert.equal(historyRecord.outputWidth, 2560);
assert.equal(getHistoryUsage([historyRecord]), historyBlob.size);

const appCss = await readFile(new URL("../assets/app.css", import.meta.url), "utf8");
const toolCss = await readFile(new URL("../src/tools/image-compress/image-compress.css", import.meta.url), "utf8");
const imageTool = await readFile(new URL("../src/tools/image-compress/index.js", import.meta.url), "utf8");
assert.match(appCss, /\.tool-mount\[hidden\]\{display:none !important\}/);
assert.match(toolCss, /\.image-compress-tool \.image-history/);
assert.match(imageTool, /<label class="image-btn image-btn--primary image-pick-label" for="icFileInput">选择图片<\/label>/);
assert.match(imageTool, /<option value="webp" selected>转为 WebP（推荐）<\/option>/);
assert.match(imageTool, /<option value="1920" selected>最长边 1920px<\/option>/);
assert.match(imageTool, /自动增强/);
assert.match(imageTool, /applyModePreset/);
assert.match(imageTool, /历史记录/);
assert.match(imageTool, /saveCompressedHistory/);
assert.match(imageTool, /window\.confirm\("确定删除这条图片压缩历史吗/);
assert.match(imageTool, /window\.confirm\("确定清空图片压缩历史吗/);
assert.doesNotMatch(imageTool, /icPickFiles/);
assert.match(imageTool, /const find = \(id\) => \$\(mount, id\)/);
assert.doesNotMatch(imageTool, /drop: \$\("icDropZone"\)/);

console.log("image compress tests passed");
