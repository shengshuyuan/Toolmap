/**
 * HTML 安全清理 + 转 Markdown
 */

import { sanitizeUrl } from "./renderer.js";

/**
 * 删除危险节点与属性
 * @param {string} html
 * @returns {{ cleanedHtml: string, warning: boolean }}
 */
export function sanitizeHtml(html) {
  const raw = String(html ?? "");
  if (typeof DOMParser === "undefined") {
    // Node 测试环境：做正则级清理
    return sanitizeHtmlRegex(raw);
  }
  const doc = new DOMParser().parseFromString(raw, "text/html");
  const blocked = new Set(["SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED", "LINK", "META", "BASE", "FORM"]);
  let warning = /<(script|iframe|object|embed|style)\b/i.test(raw);

  const walk = (node) => {
    const children = [...node.childNodes];
    for (const child of children) {
      if (child.nodeType === 1) {
        const el = /** @type {Element} */ (child);
        if (blocked.has(el.tagName)) {
          warning = true;
          el.remove();
          continue;
        }
        // strip event handlers and dangerous attrs
        for (const attr of [...el.attributes]) {
          const name = attr.name.toLowerCase();
          const val = attr.value || "";
          if (name.startsWith("on") || name === "srcdoc") {
            el.removeAttribute(attr.name);
            warning = true;
            continue;
          }
          if ((name === "href" || name === "src" || name === "xlink:href") && !sanitizeUrl(val)) {
            el.removeAttribute(attr.name);
            warning = true;
          }
        }
        walk(el);
      }
    }
  };
  walk(doc.body);

  return { cleanedHtml: doc.body.innerHTML, warning };
}

function sanitizeHtmlRegex(raw) {
  let s = raw
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/javascript:/gi, "");
  const warning = s.length !== raw.length;
  return { cleanedHtml: s, warning };
}

/**
 * HTML → Markdown。
 * 语义标签和常见内联样式都会保留：标题、加粗、斜体、下划线、删除线、首行缩进。
 * 首行缩进写成段首全角空格，预览和导出都能直接看到。
 * @param {string} html
 * @returns {{ markdown: string, warning: boolean, message?: string }}
 */
export function htmlToMarkdown(html) {
  const { cleanedHtml, warning } = sanitizeHtml(html);
  const root = parseHtml(cleanedHtml);
  const body = findFirst(root, "body") || root;
  const markdown = tidyMarkdown(renderBlocks(body, 0));

  return {
    markdown,
    warning,
    message: warning
      ? "已保留标题、加粗、首行缩进等排版，脚本和危险内容已去掉。"
      : undefined,
  };
}

const VOID_TAGS = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);
const SKIP_TAGS = new Set(["script", "style", "iframe", "object", "embed", "link", "meta", "base", "form", "head", "title", "noscript"]);
const BLOCK_TAGS = new Set([
  "address", "article", "aside", "blockquote", "div", "dl", "fieldset", "figcaption", "figure",
  "footer", "form", "h1", "h2", "h3", "h4", "h5", "h6", "header", "hr", "li", "main", "nav",
  "ol", "p", "pre", "section", "table", "ul", "tr",
]);
const FONT_SIZE_PX = { 1: 10, 2: 13, 3: 16, 4: 18, 5: 24, 6: 32, 7: 48 };

/**
 * @param {string} html
 * @returns {{ type: "el", tag: string, attrs: Record<string, string>, children: any[] }}
 */
function parseHtml(html) {
  const root = { type: "el", tag: "body", attrs: {}, children: [] };
  const stack = [root];
  const s = String(html ?? "");
  let i = 0;

  while (i < s.length) {
    if (s.startsWith("<!--", i)) {
      const end = s.indexOf("-->", i + 4);
      i = end < 0 ? s.length : end + 3;
      continue;
    }
    if (s.startsWith("<!", i) || s.startsWith("<?", i)) {
      const end = s.indexOf(">", i);
      i = end < 0 ? s.length : end + 1;
      continue;
    }
    if (s[i] === "<") {
      const close = s.slice(i).match(/^<\/([a-zA-Z][\w:-]*)\s*>/);
      if (close) {
        const tag = close[1].toLowerCase();
        i += close[0].length;
        for (let k = stack.length - 1; k > 0; k--) {
          const popped = stack.pop();
          if (popped.tag === tag) break;
        }
        continue;
      }
      const open = s.slice(i).match(/^<([a-zA-Z][\w:-]*)([^<>]*?)?\s*(\/?)>/);
      if (!open) {
        const next = s.indexOf("<", i + 1);
        pushText(stack, s.slice(i, next < 0 ? s.length : next));
        i = next < 0 ? s.length : next;
        continue;
      }
      const tag = open[1].toLowerCase();
      const el = { type: "el", tag, attrs: parseAttrs(open[2] || ""), children: [] };
      stack[stack.length - 1].children.push(el);
      i += open[0].length;
      if (!open[3] && !VOID_TAGS.has(tag)) stack.push(el);
      continue;
    }
    const next = s.indexOf("<", i);
    pushText(stack, s.slice(i, next < 0 ? s.length : next));
    i = next < 0 ? s.length : next;
  }
  return root;
}

function pushText(stack, text) {
  if (!text) return;
  stack[stack.length - 1].children.push({ type: "text", text });
}

function parseAttrs(raw) {
  /** @type {Record<string, string>} */
  const attrs = {};
  const re = /([^\s=\/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let match;
  while ((match = re.exec(raw))) {
    const key = match[1].toLowerCase();
    attrs[key] = match[2] ?? match[3] ?? match[4] ?? "";
  }
  return attrs;
}

function findFirst(node, tag) {
  if (!node || node.type !== "el") return null;
  if (node.tag === tag) return node;
  for (const child of node.children) {
    const found = findFirst(child, tag);
    if (found) return found;
  }
  return null;
}

function renderBlocks(el, inheritedIndent) {
  if (!el || el.type !== "el") return "";
  if (SKIP_TAGS.has(el.tag)) return "";
  if (isParagraphLike(el)) return renderParagraph(el, inheritedIndent);

  const ownIndent = indentChars(parseStyle(el.attrs.style || ""));
  const nextIndent = ownIndent == null ? inheritedIndent : ownIndent;
  let out = "";
  for (const child of el.children) {
    if (child.type === "text") {
      const text = normalizeText(child.text).trim();
      if (text) out += renderParagraphText(text, nextIndent);
      continue;
    }
    out += renderBlockNode(child, nextIndent);
  }
  return out;
}

function renderBlockNode(el, inheritedIndent) {
  if (!el || el.type !== "el" || SKIP_TAGS.has(el.tag)) return "";
  const tag = el.tag;

  if (tag === "hr") return "\n---\n\n";
  if (tag === "br") return "\n";
  if (tag === "pre") return renderCodeBlock(el);
  if (tag === "blockquote") return renderQuote(el, inheritedIndent);
  if (tag === "ul") return renderList(el, "-");
  if (tag === "ol") return renderList(el, "ol");
  if (tag === "table") return renderTable(el);
  if (isParagraphLike(el)) return renderParagraph(el, inheritedIndent);
  return renderBlocks(el, inheritedIndent);
}

function isParagraphLike(el) {
  if (!el || el.type !== "el") return false;
  if (/^h[1-6]$/.test(el.tag) || el.tag === "p") return true;
  if (!BLOCK_TAGS.has(el.tag)) return false;
  if (el.tag === "li" || el.tag === "pre" || el.tag === "blockquote" || el.tag === "table" || el.tag === "ul" || el.tag === "ol" || el.tag === "hr" || el.tag === "tr") {
    return false;
  }
  return !el.children.some((child) => child.type === "el" && BLOCK_TAGS.has(child.tag));
}

function renderParagraph(el, inheritedIndent) {
  const plain = plainText(el).replace(/\s+/g, " ").trim();
  if (!plain && !el.children.some((child) => child.type === "el" && (child.tag === "img" || child.tag === "br"))) {
    return "";
  }
  const level = inferHeadingLevel(el, plain);
  const inline = renderInlineContainer(el);
  if (!inline) return "";
  if (level) {
    return `\n${"#".repeat(level)} ${stripWrappingMarks(inline)}\n\n`;
  }
  const chars = resolveIndent(el, inheritedIndent);
  return renderParagraphText(inline, chars);
}

function renderInlineContainer(el) {
  const own = styleContext(el);
  let inline = renderInlineNodes(el.children, own).replace(/[ \t\u00A0]+\n/g, "\n");
  inline = trimEdges(inline);
  if (own.bold) inline = wrapMark(inline, "**");
  if (own.italic) inline = wrapMark(inline, "*");
  return inline;
}

function renderParagraphText(text, indentCharsValue) {
  const raw = String(text ?? "");
  const prefix = indentPrefix(indentCharsValue, raw);
  const core = trimEdges(stripIndentFrom(raw));
  if (!core) return "";
  return `\n${prefix}${core}\n\n`;
}

function renderQuote(el, inheritedIndent) {
  const inner = renderBlocks(el, inheritedIndent).trim();
  if (!inner) return "";
  return `\n${inner.split("\n").map((line) => `> ${line}`).join("\n")}\n\n`;
}

function renderList(el, marker) {
  const items = el.children.filter((child) => child.type === "el" && child.tag === "li");
  if (!items.length) return "";
  const lines = items.map((li, index) => {
    const bullet = marker === "ol" ? `${index + 1}.` : "-";
    const text = renderInlineNodes(listItemNodes(li), { bold: false, italic: false, underline: false, strike: false })
      .replace(/\s*\n\s*/g, " ")
      .trim();
    return `${bullet} ${text}`;
  });
  return `\n${lines.join("\n")}\n\n`;
}

function listItemNodes(li) {
  const nodes = [];
  for (const child of li.children) {
    if (child.type === "el" && child.tag === "p") nodes.push(...child.children);
    else nodes.push(child);
  }
  return nodes;
}

function renderCodeBlock(el) {
  const code = findFirst(el, "code") || el;
  const lang = String(code.attrs?.class || "").match(/language-([\w-]+)/)?.[1] || "";
  const body = rawText(code).replace(/\n$/, "");
  return `\n\`\`\`${lang}\n${body}\n\`\`\`\n\n`;
}

function renderTable(table) {
  const rows = [];
  const walk = (node) => {
    if (!node || node.type !== "el") return;
    if (node.tag === "tr") {
      rows.push(node.children.filter((child) => child.type === "el" && (child.tag === "th" || child.tag === "td")));
      return;
    }
    node.children.forEach(walk);
  };
  walk(table);
  if (!rows.length) return "";
  const cells = (row) => row.map((cell) => renderInlineContainer(cell).replace(/\|/g, "\\|").replace(/\s+/g, " ").trim());
  const header = cells(rows[0]);
  const lines = [
    `| ${header.join(" | ")} |`,
    `| ${header.map(() => "---").join(" | ")} |`,
    ...rows.slice(1).map((row) => `| ${cells(row).join(" | ")} |`),
  ];
  return `\n${lines.join("\n")}\n\n`;
}

function renderInlineNodes(nodes, ctx) {
  let out = "";
  for (const node of nodes || []) {
    if (node.type === "text") {
      out += normalizeText(node.text);
      continue;
    }
    if (node.type !== "el" || SKIP_TAGS.has(node.tag)) continue;
    out += renderInlineElement(node, ctx);
  }
  return out;
}

function renderInlineElement(el, ctx) {
  const tag = el.tag;
  if (tag === "br") return "\n";
  if (tag === "hr") return "\n---\n";
  if (tag === "img") {
    const src = sanitizeUrl(el.attrs.src || "") || "";
    const alt = el.attrs.alt || "";
    return src ? `![${alt}](${src})` : "";
  }
  if (tag === "pre") return renderCodeBlock(el).trim();
  if (tag === "code" && !el.children.some((child) => child.type === "el" && child.tag !== "br")) {
    return `\`${rawText(el).replace(/`/g, "")}\``;
  }

  const next = { ...ctx };
  const style = parseStyle(el.attrs.style || "");
  const deco = style["text-decoration"] || "";
  if (isBoldElement(el, style)) next.bold = true;
  if (isItalicElement(el, style)) next.italic = true;
  if (tag === "u" || (/underline/.test(deco) && !/line-through/.test(deco))) next.underline = true;
  if (tag === "del" || tag === "s" || tag === "strike" || /line-through/.test(deco)) next.strike = true;

  let inner = tag === "a"
    ? renderInlineNodes(el.children, next)
    : renderInlineNodes(el.children, next);

  if (next.bold && !ctx.bold) inner = wrapMark(inner, "**");
  if (next.italic && !ctx.italic) inner = wrapMark(inner, "*");
  if (next.underline && !ctx.underline) inner = wrapMark(inner, "++");
  if (next.strike && !ctx.strike) inner = wrapMark(inner, "~~");

  if (tag === "a") {
    const href = sanitizeUrl(el.attrs.href || "") || "";
    const label = inner.trim() || href;
    return href ? `[${label}](${href})` : inner;
  }
  return inner;
}

function styleContext(el) {
  const style = parseStyle(el?.attrs?.style || "");
  return {
    bold: isBoldElement(el, style),
    italic: isItalicElement(el, style),
    underline: false,
    strike: false,
  };
}

function wrapMark(text, mark) {
  const lead = text.match(/^[ \t\u00A0]*/)?.[0] ?? "";
  const trail = text.match(/[ \t\u00A0]*$/)?.[0] ?? "";
  const core = text.slice(lead.length, text.length - trail.length);
  if (!core.trim()) return text;
  const inner = core.slice(mark.length, -mark.length);
  const already = core.startsWith(mark) && core.endsWith(mark) && inner.length > 0 && !inner.includes(mark);
  if (already) return text;
  return `${lead}${mark}${core}${mark}${trail}`;
}

function trimEdges(text) {
  return String(text ?? "").replace(/^[ \t\r\n\u00A0]+/, "").replace(/[ \t\r\n\u00A0]+$/, "");
}

function stripWrappingMarks(text) {
  let value = text.trim();
  const marks = ["**", "++", "~~", "*"];
  let changed = true;
  while (changed) {
    changed = false;
    for (const mark of marks) {
      if (value.startsWith(mark) && value.endsWith(mark) && value.length > mark.length * 2) {
        const inner = value.slice(mark.length, -mark.length).trim();
        if (inner && !inner.includes(mark)) {
          value = inner;
          changed = true;
        }
      }
    }
  }
  return value;
}

function inferHeadingLevel(el, plain) {
  const tagLevel = el.tag.match(/^h([1-6])$/);
  if (tagLevel) return Number(tagLevel[1]);

  const classLevel = headingLevelFromClass(`${el.attrs.class || ""} ${el.attrs.id || ""}`);
  if (classLevel) return classLevel;

  if ((el.attrs.role || "").toLowerCase() === "heading") {
    const aria = Number(el.attrs["aria-level"] || 2);
    if (aria >= 1 && aria <= 6) return aria;
  }

  const look = presentation(el);
  const fromSize = levelFromSize(look.px, look.bold, plain.length);
  if (fromSize) return fromSize;

  if (look.align === "center" && look.bold && plain.length > 0 && plain.length <= 24 && !/[。！？.!?]$/.test(plain)) {
    return 2;
  }
  return 0;
}

function headingLevelFromClass(token) {
  const named = token.match(/(?:^|[\s_-])(?:mso[-_\s]*)?heading[\s_-]*([1-6])\b/i);
  if (named) return Number(named[1]);
  const short = token.match(/(?:^|[\s_-])h([1-6])\b/i);
  if (short) return Number(short[1]);
  if (/(?:^|[\s_-])(?:mso[-_\s]*)?(?:article[-_\s]*)?title\b/i.test(token)) return 1;
  if (/(?:^|[\s_-])subtitle\b/i.test(token)) return 2;
  return 0;
}

function presentation(el) {
  const own = readMetrics(el);
  const elements = el.children.filter((child) => child.type === "el");
  const looseText = el.children.some((child) => child.type === "text" && normalizeText(child.text).trim());
  if (own.px == null && !looseText && elements.length === 1) {
    const inner = presentation(elements[0]);
    return {
      px: inner.px,
      bold: own.bold || inner.bold,
      align: own.align || inner.align,
    };
  }
  return {
    px: own.px,
    bold: own.bold || subtreeAllBold(el),
    align: own.align,
  };
}

function readMetrics(el) {
  const style = parseStyle(el.attrs.style || "");
  let px = fontSizePx(style);
  if (px == null && el.tag === "font" && el.attrs.size && FONT_SIZE_PX[el.attrs.size]) {
    px = FONT_SIZE_PX[el.attrs.size];
  }
  return {
    px,
    bold: isBoldElement(el, style),
    align: (style["text-align"] || el.attrs.align || "").toLowerCase(),
  };
}

function levelFromSize(px, bold, length) {
  if (px == null) return 0;
  if (px >= 32) return 1;
  if (px >= 26) return bold || length <= 40 ? 1 : 2;
  if (px >= 22 && (bold || length <= 30)) return 2;
  if (px >= 18 && bold && length <= 40) return 3;
  if (px >= 16 && bold && length <= 24) return 4;
  return 0;
}

function subtreeAllBold(el) {
  let saw = false;
  let all = true;
  const walk = (node, bold) => {
    if (node.type === "text") {
      if (!normalizeText(node.text).trim()) return;
      saw = true;
      if (!bold) all = false;
      return;
    }
    if (node.type !== "el") return;
    const style = parseStyle(node.attrs.style || "");
    const next = bold || isBoldElement(node, style);
    node.children.forEach((child) => walk(child, next));
  };
  el.children.forEach((child) => walk(child, false));
  return saw && all;
}

function isBoldElement(el, style = parseStyle(el.attrs?.style || "")) {
  return el?.tag === "b" || el?.tag === "strong" || fontWeightBold(style);
}

function isItalicElement(el, style = parseStyle(el.attrs?.style || "")) {
  const fontStyle = style["font-style"] || "";
  return el?.tag === "em" || el?.tag === "i" || fontStyle === "italic" || fontStyle === "oblique";
}

function fontWeightBold(style) {
  const weight = style["font-weight"];
  if (!weight) return false;
  if (weight === "bold" || weight === "bolder") return true;
  const numeric = Number.parseInt(weight, 10);
  return Number.isFinite(numeric) && numeric >= 600;
}

function fontSizePx(style) {
  const raw = style["font-size"];
  if (!raw) return null;
  const match = raw.match(/^([\d.]+)\s*(px|pt|em|rem)?$/i);
  if (!match) return null;
  const value = Number.parseFloat(match[1]);
  if (!Number.isFinite(value)) return null;
  const unit = (match[2] || "px").toLowerCase();
  if (unit === "pt") return value * 4 / 3;
  if (unit === "em" || unit === "rem") return value * 16;
  return value;
}

function resolveIndent(el, inheritedIndent) {
  const own = indentChars(parseStyle(el.attrs.style || ""));
  if (own != null) return own;
  return inheritedIndent || 0;
}

/** @returns {number|null} null 表示元素自己没写缩进，沿用父级 */
function indentChars(style) {
  const hasIndent = Object.prototype.hasOwnProperty.call(style, "text-indent")
    || Object.prototype.hasOwnProperty.call(style, "mso-char-indent-count");
  if (!hasIndent) return null;
  const mso = Number.parseFloat(style["mso-char-indent-count"]);
  if (mso > 0) return mso;
  return textIndentToChars(style["text-indent"] || "0");
}

function textIndentToChars(raw) {
  const match = String(raw).trim().match(/^(-?[\d.]+)\s*(px|pt|em|rem|cm|mm|ch|ex)?$/i);
  if (!match) return 0;
  const value = Number.parseFloat(match[1]);
  if (!(value > 0)) return 0;
  const unit = (match[2] || "px").toLowerCase();
  if (unit === "em" || unit === "rem" || unit === "ch") return value;
  if (unit === "pt") return value / 12;
  if (unit === "px") return value / 16;
  if (unit === "cm") return (value * 96 / 2.54) / 16;
  if (unit === "mm") return (value * 96 / 25.4) / 16;
  if (unit === "ex") return value / 2;
  return 0;
}

function indentPrefix(chars, original) {
  if (chars >= 1.5) return "\u3000\u3000";
  if (chars >= 0.75) return "\u3000";
  return (String(original || "").match(/^(?:\u3000|\u2003)+/) || [""])[0];
}

function stripIndentFrom(text) {
  return text.replace(/^(?:[\u3000\u2002\u2003]|\s)+/, "");
}

function parseStyle(style) {
  /** @type {Record<string, string>} */
  const map = {};
  for (const part of String(style || "").split(";")) {
    const index = part.indexOf(":");
    if (index < 0) continue;
    const key = part.slice(0, index).trim().toLowerCase();
    const value = part.slice(index + 1).trim().toLowerCase().replace(/\s*!important\s*$/i, "").trim();
    if (key) map[key] = value;
  }
  return map;
}

function plainText(node) {
  if (!node) return "";
  if (node.type === "text") return decodeEntities(node.text);
  if (node.type !== "el" || SKIP_TAGS.has(node.tag)) return "";
  return node.children.map(plainText).join("");
}

function rawText(node) {
  if (!node) return "";
  if (node.type === "text") return decodeEntities(node.text);
  if (node.type !== "el") return "";
  return node.children.map(rawText).join("");
}

function normalizeText(text) {
  return decodeEntities(text).replace(/[ \t\f\v\r\n\u00A0]+/g, " ");
}

function decodeEntities(text) {
  return String(text ?? "")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => fromCodePoint(Number.parseInt(dec, 10)))
    .replace(/&nbsp;/gi, "\u00A0")
    .replace(/&emsp;/gi, "\u2003")
    .replace(/&ensp;/gi, "\u2002")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, "\"")
    .replace(/&apos;/gi, "'")
    .replace(/&amp;/gi, "&");
}

function fromCodePoint(value) {
  if (!Number.isFinite(value) || value < 0 || value > 0x10ffff) return "";
  if (value >= 0xd800 && value <= 0xdfff) return "";
  return String.fromCodePoint(value);
}

function tidyMarkdown(markdown) {
  return String(markdown || "")
    .replace(/[ \t\u00A0]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^\n+/, "")
    .replace(/\n*$/, "\n");
}
