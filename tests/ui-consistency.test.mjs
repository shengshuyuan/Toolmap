import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { getTextDiffTemplate } from "../src/tools/text-diff/index.js";
import { getImageCompressTemplate } from "../src/tools/image-compress/index.js";
import { getCharCountTemplate } from "../src/tools/char-count/index.js";
import { getQrcodeTemplate } from "../src/tools/qrcode/index.js";
import { getMarkdownEditorTemplate } from "../src/tools/markdown-editor/index.js";
import { getPdfToolsTemplate } from "../src/tools/pdf-tools/index.js";

const root = new URL("../", import.meta.url);
const appCss = await readFile(new URL("assets/app.css", root), "utf8");
const indexHtml = await readFile(new URL("index.html", root), "utf8");
const manifest = JSON.parse(await readFile(new URL("manifest.json", root), "utf8"));

// 1. 全局 CSS 变量存在性校验
assert.ok(appCss.includes("--pad-lg:"), "app.css 必须包含 --pad-lg 变量");
assert.ok(appCss.includes("--r2:"), "app.css 必须包含 --r2 变量");
assert.ok(appCss.includes("--pad:"), "app.css 必须包含 --pad 变量");

// 2. 危险淡色按钮与通用组件类校验
assert.ok(appCss.includes(".btn--subtle-danger"), "app.css 必须包含 .btn--subtle-danger 样式");
assert.ok(appCss.includes(".btn--danger-subtle"), "app.css 必须包含 .btn--danger-subtle 样式");
assert.ok(appCss.includes(".privacy-badge"), "app.css 必须包含 .privacy-badge 样式");
assert.ok(appCss.includes(".capability-strip"), "app.css 必须包含 .capability-strip 样式");
assert.ok(appCss.includes(".data-card"), "app.css 必须包含 .data-card 样式");

// 3. 字体规范：不得在 CSS 中硬编码未引入的 Poppins
const cssFiles = [
  "src/tools/char-count/char-count.css",
  "src/tools/image-compress/image-compress.css",
  "src/tools/qrcode/qrcode.css",
  "src/tools/markdown-editor/markdown-editor.css",
  "src/tools/pdf-tools/pdf-tools.css",
];
for (const file of cssFiles) {
  const content = await readFile(new URL(file, root), "utf8");
  assert.ok(!content.includes("Poppins"), `${file} 不应残留硬编码 Poppins 字体`);
}

// 4. 工具面包屑与标题统一性检验
const templates = [
  { id: "text-diff", t: getTextDiffTemplate(), breadcrumb: "文档与评审 / 文本比对", title: "文本比对" },
  { id: "char-count", t: getCharCountTemplate(), breadcrumb: "文档与评审 / 字符统计", title: "字符统计" },
  { id: "markdown-editor", t: getMarkdownEditorTemplate(), breadcrumb: "文档与评审 / Markdown", title: "Markdown 创作台" },
  { id: "image-compress", t: getImageCompressTemplate(), breadcrumb: "素材与交付 / 图片压缩", title: "图片压缩" },
  { id: "qrcode", t: getQrcodeTemplate(), breadcrumb: "素材与交付 / 二维码", title: "二维码设计与识别" },
  { id: "pdf-tools", t: getPdfToolsTemplate(), breadcrumb: "素材与交付 / PDF 工具", title: "PDF 工具" },
];

for (const { id, t, breadcrumb, title } of templates) {
  assert.ok(t.includes(breadcrumb), `${id} 必须包含面包屑: ${breadcrumb}`);
  assert.ok(t.includes(title), `${id} 必须包含标题: ${title}`);
  assert.ok(!t.includes(`在线${title}`), `${id} 标题不应包含冗余'在线'前缀`);
}

// 5. 文案与 SEO 一致性校验
assert.ok(indexHtml.includes("字符统计"), "index.html 描述必须包含字符统计");
assert.equal(manifest.name, "Toolmap - 产品经理的本地工作台");
assert.equal(manifest.background_color, "#faf9f5");
assert.ok(manifest.icons.length > 0 && manifest.icons[0].src.endsWith(".svg"), "manifest 应引用有效 svg 图标");

console.log("UI consistency and copywriting tests passed");
