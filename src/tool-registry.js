/**
 * @typedef {Object} ToolConfig
 * @property {string} id
 * @property {string} mountId
 * @property {string} buttonLabel
 * @property {string} title
 * @property {string} [subtitlePrefix]
 * @property {string} [subtitleBadge]
 * @property {string} [subtitleSuffix]
 * @property {string} subtitle
 * @property {string} name
 * @property {string} hint
 * @property {string} importPath
 * @property {string} exportName
 */

/** @type {ToolConfig[]} */
export const TOOL_REGISTRY = [
  {
    id: "text-diff",
    mountId: "textDiffTool",
    buttonLabel: "文本比对",
    title: "在线文本差异比对",
    subtitlePrefix: "支持中文、英文、代码和大文本粘贴。",
    subtitleBadge: "隐私优先",
    subtitleSuffix: " 全程在浏览器本地完成。",
    subtitle: "支持中文、英文、代码和大文本粘贴。 隐私优先 全程在浏览器本地完成。",
    name: "在线文本差异比对",
    hint: "中文/英文/代码 · 大文本 · 本地比对",
    importPath: "./tools/text-diff/index.js",
    exportName: "mountTextDiffTool",
  },
  {
    id: "image-compress",
    mountId: "imageCompressTool",
    buttonLabel: "图片压缩",
    title: "在线图片压缩",
    subtitlePrefix: "批量压缩 JPG、PNG、WebP 图片。",
    subtitleBadge: "本地处理",
    subtitleSuffix: " 不上传原图，尽量保持高清画质。",
    subtitle: "批量压缩 JPG、PNG、WebP 图片。 本地处理 不上传原图，尽量保持高清画质。",
    name: "在线图片压缩",
    hint: "批量压缩 · 转 WebP · 本地处理",
    importPath: "./tools/image-compress/index.js",
    exportName: "mountImageCompressTool",
  },
  {
    id: "char-count",
    mountId: "charCountTool",
    buttonLabel: "字符统计",
    title: "在线字符统计",
    subtitlePrefix: "支持字符、UTF-8 字节、字符长度实时统计。",
    subtitleBadge: "本地处理",
    subtitleSuffix: " 输入即更新。",
    subtitle: "支持字符、UTF-8 字节、字符长度实时统计。 本地处理 输入即更新。",
    name: "在线字符统计",
    hint: "字符 / 字节 / 长度 · 实时统计 · 本地处理",
    importPath: "./tools/char-count/index.js",
    exportName: "mountCharCountTool",
  },
  {
    id: "qrcode",
    mountId: "qrcodeTool",
    buttonLabel: "二维码",
    title: "在线二维码设计与识别",
    subtitlePrefix: "支持文本、WiFi、vCard、外框与 Logo。",
    subtitleBadge: "本地处理",
    subtitleSuffix: " 全程在浏览器完成。",
    subtitle: "支持文本、WiFi、vCard、外框与 Logo。 本地处理 全程在浏览器完成。",
    name: "在线二维码设计与识别",
    hint: "设计/Logo/自检 · 实时预览 · 本地生成",
    importPath: "./tools/qrcode/index.js",
    exportName: "mountQrcodeTool",
  },
  {
    id: "markdown-editor",
    mountId: "markdownEditorTool",
    buttonLabel: "Markdown",
    title: "在线 Markdown 创作台",
    subtitlePrefix: "Markdown / HTML 导入 · 实时预览 · 本地保存。",
    subtitleBadge: "本地处理",
    subtitleSuffix: " 文档不离开你的设备。",
    subtitle: "Markdown / HTML 导入 · 实时预览 · 本地保存。 本地处理 文档不离开你的设备。",
    name: "在线 Markdown 创作台",
    hint: "导入/预览/大纲 · 本地草稿 · 安全导出",
    importPath: "./tools/markdown-editor/index.js",
    exportName: "mountMarkdownEditorTool",
  },
  {
    id: "pdf-tools",
    mountId: "pdfToolsTool",
    buttonLabel: "PDF 工具",
    title: "在线 PDF 工具",
    subtitlePrefix: "支持 PDF 合并、拆分、加水印。",
    subtitleBadge: "本地处理",
    subtitleSuffix: " 文件不离开你的设备。",
    subtitle: "支持 PDF 合并、拆分、加水印。 本地处理 文件不离开你的设备。",
    name: "在线 PDF 合并拆分加水印",
    hint: "合并/拆分/水印 · 本地处理 · 隐私安全",
    importPath: "./tools/pdf-tools/index.js",
    exportName: "mountPdfToolsTool",
  },
];

/** @returns {string[]} */
export function getToolIds() {
  return TOOL_REGISTRY.map((tool) => tool.id);
}

/** @param {string} id @returns {ToolConfig|null} */
export function getToolById(id) {
  return TOOL_REGISTRY.find((tool) => tool.id === id) ?? null;
}
