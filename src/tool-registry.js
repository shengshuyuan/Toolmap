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
 * @property {string} description
 * @property {string} category
 * @property {string} categoryKey
 * @property {string} breadcrumb
 * @property {string[]} keywords
 * @property {string} iconSvg
 * @property {string} importPath
 * @property {string} exportName
 */

/** @type {ToolConfig[]} */
export const TOOL_REGISTRY = [
  {
    id: "text-diff",
    mountId: "textDiffTool",
    buttonLabel: "文本比对",
    title: "文本比对",
    subtitlePrefix: "比较两段文本，定位每一处变更。",
    subtitleBadge: "本地处理",
    subtitleSuffix: " 全程在浏览器本地完成。",
    subtitle: "比较两段文本，定位每一处变更。 本地处理 全程在浏览器本地完成。",
    name: "在线文本差异比对",
    hint: "看清每一处修改 · 中英代码 · 逐行对比",
    description: "比较两段文本，定位每一处变更。",
    category: "文档与评审",
    categoryKey: "doc-review",
    breadcrumb: "文档与评审 / 文本比对",
    keywords: ["文本比对", "比较", "差异", "diff", "需求对比", "需求变更", "代码比对", "原文", "改动"],
    iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="15" x2="15" y2="15"/><line x1="12" y1="12" x2="12" y2="18"/></svg>`,
    importPath: "./tools/text-diff/index.js",
    exportName: "mountTextDiffTool",
  },
  {
    id: "image-compress",
    mountId: "imageCompressTool",
    buttonLabel: "图片压缩",
    title: "图片压缩",
    subtitlePrefix: "压缩图片体积，支持多种格式输出。",
    subtitleBadge: "本地处理",
    subtitleSuffix: " 不上传原图，尽量保持高清画质。",
    subtitle: "压缩图片体积，支持多种格式输出。 本地处理 不上传原图，尽量保持高清画质。",
    name: "在线图片压缩",
    hint: "批量压缩 · 转 WebP · 本地处理",
    description: "压缩图片体积，支持多种格式输出。",
    category: "素材与交付",
    categoryKey: "asset-delivery",
    breadcrumb: "素材与交付 / 图片压缩",
    keywords: ["图片压缩", "压缩", "图片变小", "webp", "jpg", "png", "体积", "瘦身", "批量"],
    iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`,
    importPath: "./tools/image-compress/index.js",
    exportName: "mountImageCompressTool",
  },
  {
    id: "char-count",
    mountId: "charCountTool",
    buttonLabel: "字符统计",
    title: "字符统计",
    subtitlePrefix: "统计字符、行数、段落等文本信息。",
    subtitleBadge: "本地处理",
    subtitleSuffix: " 输入即更新。",
    subtitle: "统计字符、行数、段落等文本信息。 本地处理 输入即更新。",
    name: "在线字符统计",
    hint: "字符 / 字节 / 长度 · 实时统计 · 本地处理",
    description: "统计字符、行数、段落等文本信息。",
    category: "文档与评审",
    categoryKey: "doc-review",
    breadcrumb: "文档与评审 / 字符统计",
    keywords: ["字符统计", "字数", "count", "统计", "字节", "长度", "行数", "段落", "utf-8"],
    iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
    importPath: "./tools/char-count/index.js",
    exportName: "mountCharCountTool",
  },
  {
    id: "qrcode",
    mountId: "qrcodeTool",
    buttonLabel: "二维码",
    title: "二维码设计与识别",
    subtitlePrefix: "生成二维码，支持文本与链接等内容。",
    subtitleBadge: "本地处理",
    subtitleSuffix: " 全程在浏览器完成。",
    subtitle: "生成二维码，支持文本与链接等内容。 本地处理 全程在浏览器完成。",
    name: "在线二维码设计与识别",
    hint: "设计/Logo/自检 · 实时预览 · 本地生成",
    description: "生成二维码，支持文本与链接等内容。",
    category: "素材与交付",
    categoryKey: "asset-delivery",
    breadcrumb: "素材与交付 / 二维码",
    keywords: ["二维码", "qrcode", "qr", "扫码", "识别", "名片", "wifi", "logo", "生成"],
    iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`,
    importPath: "./tools/qrcode/index.js",
    exportName: "mountQrcodeTool",
  },
  {
    id: "markdown-editor",
    mountId: "markdownEditorTool",
    buttonLabel: "Markdown",
    title: "Markdown 创作台",
    subtitlePrefix: "编辑与预览 Markdown 文档，源码编辑、实时预览。",
    subtitleBadge: "本地处理",
    subtitleSuffix: " 文档不离开你的设备。",
    subtitle: "编辑与预览 Markdown 文档，源码编辑、实时预览。 本地处理 文档不离开你的设备。",
    name: "在线 Markdown 创作台",
    hint: "源码编辑、实时预览 · 本地草稿 · 安全导出",
    description: "编辑与预览 Markdown 文档，源码编辑、实时预览。",
    category: "文档与评审",
    categoryKey: "doc-review",
    breadcrumb: "文档与评审 / Markdown",
    keywords: ["markdown", "md", "文档", "写作", "预览", "大纲", "导出", "编辑"],
    iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><polyline points="7 15 7 9 10 12 13 9 13 15"/><polyline points="17 9 17 15 15 13"/></svg>`,
    importPath: "./tools/markdown-editor/index.js",
    exportName: "mountMarkdownEditorTool",
  },
  {
    id: "pdf-tools",
    mountId: "pdfToolsTool",
    buttonLabel: "PDF 工具",
    title: "PDF 工具",
    subtitlePrefix: "合并、拆分与加水印。",
    subtitleBadge: "本地处理",
    subtitleSuffix: " 文件不离开你的设备。",
    subtitle: "合并、拆分与加水印。 本地处理 文件不离开你的设备。",
    name: "在线 PDF 合并拆分加水印",
    hint: "合并/拆分/水印 · 本地处理 · 隐私安全",
    description: "合并、拆分与加水印。",
    category: "素材与交付",
    categoryKey: "asset-delivery",
    breadcrumb: "素材与交付 / PDF 工具",
    keywords: ["pdf", "pdf合并", "pdf拆分", "加水印", "合并pdf", "拆分pdf", "水印"],
    iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M9 13v-1h2a1 1 0 0 1 1 1v0a1 1 0 0 1-1 1H9"/></svg>`,
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

