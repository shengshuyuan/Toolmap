/**
 * 安全 Markdown → HTML（纯前端、无 CDN）
 * 覆盖 MVP 所需语法；输出经 escape，链接经白名单校验。
 */

/**
 * @param {string} md
 * @returns {string} safe HTML
 */
export function renderMarkdown(md) {
  const text = String(md ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (!text.trim()) {
    return '<p class="md-empty">开始输入 Markdown，右侧将实时预览。</p>';
  }

  try {
    const lines = text.split("\n");
    const html = [];
    let i = 0;
    let inCode = false;
    let codeLang = "";
    let codeBuf = [];
    let inUl = false;
    let inOl = false;
    let inTask = false;
    let inQuote = false;
    let inTable = false;
    let tableRows = [];

    const closeLists = () => {
      if (inUl) { html.push("</ul>"); inUl = false; }
      if (inOl) { html.push("</ol>"); inOl = false; }
      if (inTask) { html.push("</ul>"); inTask = false; }
    };
    const closeQuote = () => {
      if (inQuote) { html.push("</blockquote>"); inQuote = false; }
    };
    const flushTable = () => {
      if (!inTable) return;
      html.push(renderTable(tableRows));
      tableRows = [];
      inTable = false;
    };

    while (i < lines.length) {
      const line = lines[i];

      // fenced code
      const fence = line.match(/^```([\w-]*)\s*$/);
      if (fence) {
        closeLists(); closeQuote(); flushTable();
        if (!inCode) {
          inCode = true;
          codeLang = fence[1] || "";
          codeBuf = [];
        } else {
          html.push(
            `<pre class="md-code"><code class="language-${escapeAttr(codeLang)}">${escapeHtml(codeBuf.join("\n"))}</code></pre>`
          );
          inCode = false;
          codeLang = "";
          codeBuf = [];
        }
        i++;
        continue;
      }
      if (inCode) {
        codeBuf.push(line);
        i++;
        continue;
      }

      // table
      if (/^[ \t]*\|.+\|[ \t]*$/.test(line)) {
        closeLists(); closeQuote();
        inTable = true;
        tableRows.push(line);
        i++;
        continue;
      } else {
        flushTable();
      }

      // hr。只认普通空格，避免段首全角空格被当成分隔线。
      if (/^[ \t]*(-{3,}|\*{3,}|_{3,})[ \t]*$/.test(line)) {
        closeLists(); closeQuote();
        html.push("<hr />");
        i++;
        continue;
      }

      // headings
      const h = line.match(/^(#{1,6})[ \t]+(.+)$/);
      if (h) {
        closeLists(); closeQuote();
        const level = h[1].length;
        const id = slugify(h[2]);
        html.push(`<h${level} id="${escapeAttr(id)}">${inline(h[2])}</h${level}>`);
        i++;
        continue;
      }

      // blockquote
      const q = line.match(/^>[ \t]?(.*)$/);
      if (q) {
        closeLists();
        if (!inQuote) { html.push("<blockquote>"); inQuote = true; }
        const quoted = paragraphHtml(q[1]);
        if (quoted) html.push(quoted);
        i++;
        continue;
      } else {
        closeQuote();
      }

      // task list
      const task = line.match(/^[ \t]*[-*+]\s+\[([ xX])\]\s+(.+)$/);
      if (task) {
        if (inOl) { html.push("</ol>"); inOl = false; }
        if (inUl) { html.push("</ul>"); inUl = false; }
        if (!inTask) { html.push('<ul class="md-task-list">'); inTask = true; }
        const checked = task[1].toLowerCase() === "x";
        html.push(
          `<li class="md-task-item"><input type="checkbox" disabled ${checked ? "checked" : ""} /> <span>${inline(task[2])}</span></li>`
        );
        i++;
        continue;
      }

      // ul
      const ul = line.match(/^[ \t]*[-*+]\s+(.+)$/);
      if (ul) {
        if (inOl) { html.push("</ol>"); inOl = false; }
        if (inTask) { html.push("</ul>"); inTask = false; }
        if (!inUl) { html.push("<ul>"); inUl = true; }
        html.push(`<li>${inline(ul[1])}</li>`);
        i++;
        continue;
      }

      // ol
      const ol = line.match(/^[ \t]*\d+\.\s+(.+)$/);
      if (ol) {
        if (inUl) { html.push("</ul>"); inUl = false; }
        if (inTask) { html.push("</ul>"); inTask = false; }
        if (!inOl) { html.push("<ol>"); inOl = true; }
        html.push(`<li>${inline(ol[1])}</li>`);
        i++;
        continue;
      }

      closeLists();

      if (line.trim() === "") {
        i++;
        continue;
      }

      const paragraph = paragraphHtml(line);
      if (paragraph) html.push(paragraph);
      i++;
    }

    closeLists();
    closeQuote();
    flushTable();
    if (inCode) {
      html.push(`<pre class="md-code"><code>${escapeHtml(codeBuf.join("\n"))}</code></pre>`);
    }

    return html.join("\n");
  } catch {
    return '<p class="md-error">预览渲染失败，请检查 Markdown 语法。</p>';
  }
}

function renderTable(rows) {
  if (!rows.length) return "";
  const parseRow = (row) =>
    row
      .trim()
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((c) => c.trim());

  const header = parseRow(rows[0]);
  let bodyStart = 1;
  if (rows[1] && /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?\s*$/.test(rows[1])) {
    bodyStart = 2;
  }
  const thead = `<thead><tr>${header.map((c) => `<th>${inline(c)}</th>`).join("")}</tr></thead>`;
  const bodyRows = rows.slice(bodyStart).map((r) => {
    const cells = parseRow(r);
    return `<tr>${cells.map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`;
  });
  return `<div class="md-table-wrap"><table class="md-table">${thead}<tbody>${bodyRows.join("")}</tbody></table></div>`;
}

/**
 * 段落。段首全角空格或 em 空格转成 text-indent，避免字体里这个字符宽度不对。
 * @param {string} line
 * @returns {string}
 */
function paragraphHtml(line) {
  const match = String(line ?? "").match(/^((?:\u3000|\u2003){1,8})([\s\S]*)$/);
  const indent = match ? [...match[1]].length : 0;
  const content = indent ? match[2] : line;
  if (String(content ?? "").trim() === "") return "";
  const style = indent ? ` style="text-indent:${indent}em"` : "";
  return `<p${style}>${inline(content)}</p>`;
}

/**
 * 行内语法
 * @param {string} text
 */
export function inline(text) {
  let s = escapeHtml(String(text ?? ""));
  const holders = [];
  const hold = (html) => {
    const token = `\uE000${holders.length}\uE001`;
    holders.push(html);
    return token;
  };

  // 图片、链接、代码先拿走，避免加粗/斜体改写标签属性
  s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (full, alt, url) => {
    const safe = sanitizeUrl(unescapeHtml(url));
    if (!safe) return full;
    return hold(`<img src="${escapeAttr(safe)}" alt="${alt}" loading="lazy" />`);
  });

  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (full, label, url) => {
    const safe = sanitizeUrl(unescapeHtml(url));
    if (!safe) return full;
    return hold(`<a href="${escapeAttr(safe)}" target="_blank" rel="noopener noreferrer">${applyMarks(label)}</a>`);
  });

  s = s.replace(/`([^`]+)`/g, (_, code) => hold(`<code>${code}</code>`));
  s = applyMarks(s);
  return s.replace(/\uE000(\d+)\uE001/g, (_, index) => holders[Number(index)] ?? "");
}

function applyMarks(text) {
  let s = text;
  s = s.replace(/\+\+([^+]+)\+\+/g, "<u>$1</u>");
  s = s.replace(/\*\*\*([^*]+)\*\*\*/g, "<strong><em>$1</em></strong>");
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/__([^_]+)__/g, "<strong>$1</strong>");
  s = s.replace(/(^|[^A-Za-z0-9*])\*([^*\n]+)\*(?=$|[^A-Za-z0-9*])/g, "$1<em>$2</em>");
  s = s.replace(/(^|[^A-Za-z0-9_])_([^_\n]+)_(?=$|[^A-Za-z0-9_])/g, "$1<em>$2</em>");
  s = s.replace(/~~([^~]+)~~/g, "<del>$1</del>");
  return s;
}

function unescapeHtml(text) {
  return String(text ?? "")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

/**
 * @param {string} url
 * @returns {string|null}
 */
export function sanitizeUrl(url) {
  const u = String(url || "").trim();
  if (!u) return null;
  if (/^\s*javascript:/i.test(u)) return null;
  if (/^\s*data:/i.test(u) && !/^data:image\/(png|jpeg|jpg|gif|webp)/i.test(u)) return null;
  if (/^\s*vbscript:/i.test(u)) return null;
  // allow relative, http(s), mailto
  if (/^(https?:|mailto:|\/|\.\/|#)/i.test(u) || !/^[a-z][a-z0-9+.-]*:/i.test(u)) {
    return u;
  }
  return null;
}

export function escapeHtml(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function escapeAttr(text) {
  return escapeHtml(text).replace(/`/g, "&#96;");
}

export function slugify(text) {
  return String(text || "")
    .trim()
    .toLowerCase()
    .replace(/<[^>]+>/g, "")
    .replace(/[^\p{L}\p{N}\s_-]+/gu, "")
    .replace(/\s+/g, "-")
    .slice(0, 80) || "heading";
}
