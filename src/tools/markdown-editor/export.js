/**
 * Markdown 导出工具
 */

import { renderMarkdown, escapeHtml } from "./renderer.js";

/**
 * 清理非法文件名字符
 * @param {string} name
 * @param {string} [fallback="document"]
 */
export function safeFilename(name, fallback = "document") {
  const base = String(name || "")
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, " ")
    .replace(/^\.+/, "")
    .slice(0, 80);
  return base || fallback;
}

/**
 * @param {string} content
 * @param {string} filename
 * @param {string} mime
 */
export function downloadText(content, filename, mime = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * @param {string} markdown
 * @param {string} title
 */
export function exportMarkdownFile(markdown, title) {
  const name = `${safeFilename(title)}.md`;
  downloadText(markdown, name, "text/markdown;charset=utf-8");
  return name;
}

/**
 * 安全 HTML 导出（无脚本）
 * @param {string} markdown
 * @param {string} title
 */
export function buildSafeHtmlDocument(markdown, title) {
  const body = renderMarkdown(markdown);
  // 二次保险：去掉可能残留的脚本模式
  const safeBody = body
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title || "document")}</title>
  <style>
    body{font-family:Georgia,"Noto Serif SC",serif;line-height:1.7;color:#1a1a1a;max-width:760px;margin:40px auto;padding:0 20px}
    h1,h2,h3,h4{line-height:1.25}
    code{background:#f4f4f0;padding:1px 6px;border-radius:6px;font-size:.92em}
    pre{background:#1e1e1e;color:#f5f5f5;padding:14px;border-radius:10px;overflow:auto}
    pre code{background:transparent;padding:0;color:inherit}
    blockquote{border-left:4px solid #FF642B;margin:1em 0;padding:.2em 1em;color:#555}
    table{border-collapse:collapse;width:100%;margin:1em 0}
    th,td{border:1px solid #ddd;padding:8px 10px;text-align:left}
    img{max-width:100%;height:auto}
    a{color:#FF642B}
  </style>
</head>
<body>
${safeBody}
</body>
</html>
`;
}

/**
 * @param {string} markdown
 * @param {string} title
 */
export function exportHtmlFile(markdown, title) {
  const html = buildSafeHtmlDocument(markdown, title);
  if (/<script/i.test(html)) throw new Error("导出内容不安全");
  const name = `${safeFilename(title)}.html`;
  downloadText(html, name, "text/html;charset=utf-8");
  return name;
}
