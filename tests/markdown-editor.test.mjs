import assert from "node:assert/strict";
import { renderMarkdown, sanitizeUrl, inline, escapeHtml } from "../src/tools/markdown-editor/renderer.js";
import { sanitizeHtml, htmlToMarkdown } from "../src/tools/markdown-editor/html-import.js";
import { buildOutline } from "../src/tools/markdown-editor/outline.js";
import { safeFilename, buildSafeHtmlDocument } from "../src/tools/markdown-editor/export.js";
import { serializeDocument, deserializeDocument, extractTitle } from "../src/tools/markdown-editor/document-store.js";
import { getMarkdownEditorTemplate } from "../src/tools/markdown-editor/index.js";

// 模板关键元素
{
  const t = getMarkdownEditorTemplate();
  assert.ok(t.includes("mdEditor"));
  assert.ok(t.includes("mdPreview"));
  assert.ok(t.includes("mdTitle"));
  assert.ok(t.includes("mdExportMd"));
  assert.ok(t.includes("mdExportHtml"));
  assert.ok(t.includes("mdOutline"));
  assert.ok(t.includes("mdFileInput"));
}

// Markdown 基础渲染
{
  const html = renderMarkdown("# 标题\n\n**粗体** 和 *斜体*\n\n- a\n- b\n\n`code`\n");
  assert.ok(html.includes("<h1"));
  assert.ok(html.includes("<strong>粗体</strong>"));
  assert.ok(html.includes("<em>斜体</em>"));
  assert.ok(html.includes("<ul>"));
  assert.ok(html.includes("<code>code</code>"));
}

// 代码块
{
  const html = renderMarkdown("```js\nconst a = 1;\n```\n");
  assert.ok(html.includes("<pre"));
  assert.ok(html.includes("const a = 1;"));
  assert.ok(!html.includes("<script"));
}

// 表格
{
  const html = renderMarkdown("| A | B |\n| --- | --- |\n| 1 | 2 |\n");
  assert.ok(html.includes("<table"));
  assert.ok(html.includes("<th>"));
}

// 危险链接拦截
{
  assert.equal(sanitizeUrl("javascript:alert(1)"), null);
  assert.equal(sanitizeUrl("https://example.com"), "https://example.com");
  assert.equal(sanitizeUrl("./rel.md"), "./rel.md");
  const bad = inline('[x](javascript:alert(1))');
  assert.ok(!bad.includes('href="javascript:'));
}

// 危险 HTML 清理
{
  const { cleanedHtml, warning } = sanitizeHtml('<p>hi</p><script>alert(1)</script><img src=x onerror=alert(1)>');
  assert.ok(!/script/i.test(cleanedHtml) || !cleanedHtml.includes("alert"));
  assert.ok(warning);
  assert.ok(!/onerror/i.test(cleanedHtml));
}

// HTML → Markdown
{
  const { markdown } = htmlToMarkdown("<h1>Hello</h1><p>World <strong>bold</strong></p><ul><li>a</li></ul>");
  assert.ok(markdown.includes("# Hello"));
  assert.ok(markdown.includes("World"));
  assert.ok(markdown.includes("**bold**") || markdown.includes("bold"));
  assert.ok(markdown.includes("- a"));
}

// HTML 样式里的标题、加粗、斜体、下划线和首行缩进
{
  const styled = htmlToMarkdown(`
    <p class="MsoHeading1"><span style="font-size:22pt;font-weight:bold">项目背景</span></p>
    <p style="text-indent:2em">这是<span style="font-weight:700">加粗</span>和<span style="font-style:italic">斜体</span>以及<span style="text-decoration:underline">下划线</span>。</p>
    <p style="text-indent:21.0pt;mso-char-indent-count:2.0">Word 段落</p>
    <p style="font-weight:bold">整段加粗的长正文不应该变成标题，因为它没有更大的字号，只是用来强调这段说明。</p>
  `).markdown;
  assert.ok(styled.startsWith("# 项目背景"), styled);
  assert.ok(styled.includes("\u3000\u3000这是**加粗**和*斜体*以及++下划线++。"), styled);
  assert.ok(styled.includes("\u3000\u3000Word 段落"), styled);
  assert.ok(styled.includes("**整段加粗的长正文"), styled);
  assert.ok(!/^#{1,6}\s+整段加粗/m.test(styled));
}

{
  const preview = renderMarkdown("\u3000\u3000正文 **加粗** 和 *斜体* 以及 ++下划线++");
  assert.ok(preview.includes('style="text-indent:2em"'));
  assert.ok(preview.includes("正文"));
  assert.ok(!preview.includes("\u3000"));
  assert.ok(preview.includes("<strong>加粗</strong>"));
  assert.ok(preview.includes("<em>斜体</em>"));
  assert.ok(preview.includes("<u>下划线</u>"));
}

// HTML 导入后再转回 HTML，标题、加粗、首行缩进都还在
{
  const source = `<h1>总标题</h1><h2>小节</h2><p style="text-indent:2em">正文<strong>重点</strong><em>强调</em><u>下划线</u></p>`;
  const { markdown } = htmlToMarkdown(source);
  const html = renderMarkdown(markdown);
  const exported = buildSafeHtmlDocument(markdown, "排版");
  assert.ok(html.includes("<h1"));
  assert.ok(html.includes("总标题"));
  assert.ok(html.includes("<h2"));
  assert.ok(html.includes("小节"));
  assert.ok(html.includes('style="text-indent:2em"'));
  assert.ok(html.includes("<strong>重点</strong>"));
  assert.ok(html.includes("<em>强调</em>"));
  assert.ok(html.includes("<u>下划线</u>"));
  assert.ok(exported.includes('style="text-indent:2em"'));
  assert.ok(exported.includes("font-weight:700"));
  assert.ok(exported.includes("font-style:italic"));
  assert.ok(exported.includes("text-decoration:underline"));
  assert.ok(exported.includes("<strong>重点</strong>"));
}

{
  const linked = inline("[文档](https://example.com/a/*b*)");
  assert.ok(linked.includes("https://example.com/a/*b*"));
  assert.ok(!linked.includes("<em>"));
  const markedLink = inline("[**加粗**](https://example.com)");
  assert.ok(markedLink.includes("<strong>加粗</strong>"));
  assert.ok(markedLink.includes('href="https://example.com"'));
}

// 大纲
{
  const outline = buildOutline("# 一\n\n## 二\n\n### 三\n\n```\n# not\n```\n");
  assert.equal(outline.length, 3);
  assert.equal(outline[0].level, 1);
  assert.equal(outline[1].text, "二");
  assert.equal(outline[2].level, 3);
}

// 文件名
{
  const cleaned = safeFilename("a/b:c*?");
  assert.ok(!cleaned.includes("/"));
  assert.ok(!cleaned.includes(":"));
  assert.ok(!cleaned.includes("*"));
  assert.ok(!cleaned.includes("?"));
  assert.equal(safeFilename("  "), "document");
  assert.equal(safeFilename("hello world"), "hello world");
}

// 导出 HTML 安全
{
  const html = buildSafeHtmlDocument("# Hi\n\n<script>alert(1)</script>\n", "t");
  assert.ok(html.includes("<!doctype html>") || html.includes("<!DOCTYPE html>") || html.includes("<!doctype html>".toLowerCase()));
  // render escapes script tags as text, and export strips script elements
  assert.ok(!/<script[\s>]/i.test(html));
}

// 草稿序列化
{
  const doc = {
    id: "1",
    title: "测试",
    content: "# hi",
    createdAt: 1,
    updatedAt: 2,
  };
  const json = serializeDocument(doc);
  const back = deserializeDocument(json);
  assert.equal(back.title, "测试");
  assert.equal(back.content, "# hi");
  assert.equal(extractTitle("# 我的文档\n\n正文"), "我的文档");
}

// XSS 文本 escape
{
  assert.equal(escapeHtml("<img onerror=1>"), "&lt;img onerror=1&gt;");
}

console.log("markdown editor tests passed");
