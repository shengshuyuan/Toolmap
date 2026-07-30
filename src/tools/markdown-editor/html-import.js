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
 * HTML → Markdown（基础结构）
 * @param {string} html
 * @returns {{ markdown: string, warning: boolean, message?: string }}
 */
export function htmlToMarkdown(html) {
  const { cleanedHtml, warning } = sanitizeHtml(html);
  let md = "";

  if (typeof DOMParser === "undefined") {
    md = htmlToMarkdownRegex(cleanedHtml);
  } else {
    const doc = new DOMParser().parseFromString(cleanedHtml, "text/html");
    md = nodeToMarkdown(doc.body).trim() + "\n";
  }

  return {
    markdown: md,
    warning,
    message: warning
      ? "已保留主要正文结构，复杂样式、脚本和交互内容可能被忽略。"
      : undefined,
  };
}

/**
 * @param {Node} node
 * @returns {string}
 */
function nodeToMarkdown(node) {
  if (!node) return "";
  if (node.nodeType === 3) return collapseWs(node.textContent || "");
  if (node.nodeType !== 1) return "";

  const el = /** @type {Element} */ (node);
  const tag = el.tagName.toLowerCase();
  const children = () => [...el.childNodes].map(nodeToMarkdown).join("");

  switch (tag) {
    case "h1": return `\n# ${inlineChildren(el)}\n\n`;
    case "h2": return `\n## ${inlineChildren(el)}\n\n`;
    case "h3": return `\n### ${inlineChildren(el)}\n\n`;
    case "h4": return `\n#### ${inlineChildren(el)}\n\n`;
    case "h5": return `\n##### ${inlineChildren(el)}\n\n`;
    case "h6": return `\n###### ${inlineChildren(el)}\n\n`;
    case "p": return `\n${inlineChildren(el)}\n\n`;
    case "br": return "\n";
    case "hr": return "\n---\n\n";
    case "strong":
    case "b": return `**${inlineChildren(el)}**`;
    case "em":
    case "i": return `*${inlineChildren(el)}*`;
    case "del":
    case "s":
    case "strike": return `~~${inlineChildren(el)}~~`;
    case "code":
      if (el.parentElement?.tagName.toLowerCase() === "pre") return el.textContent || "";
      return `\`${el.textContent || ""}\``;
    case "pre": {
      const code = el.querySelector("code");
      const lang = (code?.className || "").replace(/^language-/, "") || "";
      const body = (code || el).textContent || "";
      return `\n\`\`\`${lang}\n${body.replace(/\n$/, "")}\n\`\`\`\n\n`;
    }
    case "a": {
      const href = sanitizeUrl(el.getAttribute("href") || "") || "";
      return href ? `[${inlineChildren(el)}](${href})` : inlineChildren(el);
    }
    case "img": {
      const src = sanitizeUrl(el.getAttribute("src") || "") || "";
      const alt = el.getAttribute("alt") || "";
      return src ? `![${alt}](${src})` : "";
    }
    case "blockquote":
      return `\n${children().trim().split("\n").map((l) => `> ${l}`).join("\n")}\n\n`;
    case "ul":
      return `\n${[...el.children].map((li) => listItem(li, "-")).join("")}\n`;
    case "ol":
      return `\n${[...el.children].map((li, i) => listItem(li, `${i + 1}.`)).join("")}\n`;
    case "li":
      return inlineChildren(el);
    case "table":
      return tableToMarkdown(el);
    case "thead":
    case "tbody":
    case "tr":
    case "th":
    case "td":
      return children();
    case "div":
    case "section":
    case "article":
    case "main":
    case "span":
      return children();
    default:
      return children();
  }
}

function inlineChildren(el) {
  return [...el.childNodes].map(nodeToMarkdown).join("").replace(/\s+/g, " ").trim();
}

function listItem(li, bullet) {
  const text = nodeToMarkdown(li).trim();
  return `${bullet} ${text}\n`;
}

function tableToMarkdown(table) {
  const rows = [...table.querySelectorAll("tr")].map((tr) =>
    [...tr.querySelectorAll("th,td")].map((c) => inlineChildren(c).replace(/\|/g, "\\|"))
  );
  if (!rows.length) return "";
  const header = rows[0];
  const sep = header.map(() => "---");
  const body = rows.slice(1);
  const lines = [
    `| ${header.join(" | ")} |`,
    `| ${sep.join(" | ")} |`,
    ...body.map((r) => `| ${r.join(" | ")} |`),
  ];
  return `\n${lines.join("\n")}\n\n`;
}

function collapseWs(s) {
  return s.replace(/\s+/g, " ");
}

function htmlToMarkdownRegex(html) {
  return html
    .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, "\n# $1\n\n")
    .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, "\n## $1\n\n")
    .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, "\n### $1\n\n")
    .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, "\n$1\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, "**$1**")
    .replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, "**$1**")
    .replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, "*$1*")
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, "- $1\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .trim() + "\n";
}
