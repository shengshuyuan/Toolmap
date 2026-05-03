export const TOOL_REGISTRY = [
  {
    id: "text-diff",
    mountId: "textDiffTool",
    buttonLabel: "文本比对",
    title: "在线文本差异比对",
    subtitle: '支持中文、英文、代码和大文本粘贴。<span class="badge">隐私优先</span> 全程在浏览器本地完成。',
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
    subtitle: '批量压缩 JPG、PNG、WebP 图片。<span class="badge">本地处理</span> 不上传原图，尽量保持高清画质。',
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
    subtitle: '支持字符、UTF-8 字节、字符长度实时统计。<span class="badge">本地处理</span> 输入即更新。',
    name: "在线字符统计",
    hint: "字符 / 字节 / 长度 · 实时统计 · 本地处理",
    importPath: "./tools/char-count/index.js",
    exportName: "mountCharCountTool",
  },
];

export function getToolIds() {
  return TOOL_REGISTRY.map((tool) => tool.id);
}

export function getToolById(id) {
  return TOOL_REGISTRY.find((tool) => tool.id === id) ?? null;
}
