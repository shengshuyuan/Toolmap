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
      if (/^\s*\|.+\|\s*$/.test(line)) {
        closeLists(); closeQuote();
        inTable = true;
        tableRows.push(line);
        i++;
        continue;
      } else {
        flushTable();
      }

      // hr
      if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
        closeLists(); closeQuote();
        html.push("<hr />");
        i++;
        continue;
      }

      // headings
      const h = line.match(/^(#{1,6})\s+(.+)$/);
      if (h) {
        closeLists(); closeQuote();
        const level = h[1].length;
        const id = slugify(h[2]);
        html.push(`<h${level} id="${escapeAttr(id)}">${inline(h[2])}</h${level}>`);
        i++;
        continue;
      }

      // blockquote
      const q = line.match(/^>\s?(.*)$/);
      if (q) {
        closeLists();
        if (!inQuote) { html.push("<blockquote>"); inQuote = true; }
        html.push(`<p>${inline(q[1])}</p>`);
        i++;
        continue;
      } else {
        closeQuote();
      }

      // task list
      const task = line.match(/^\s*[-*+]\s+\[([ xX])\]\s+(.+)$/);
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
      const ul = line.match(/^\s*[-*+]\s+(.+)$/);
      if (ul) {
        if (inOl) { html.push("</ol>"); inOl = false; }
        if (inTask) { html.push("</ul>"); inTask = false; }
        if (!inUl) { html.push("<ul>"); inUl = true; }
        html.push(`<li>${inline(ul[1])}</li>`);
        i++;
        continue;
      }

      // ol
      const ol = line.match(/^\s*\d+\.\s+(.+)$/);
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

      html.push(`<p>${inline(line)}</p>`);
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
 * 行内语法
 * @param {string} text
 */
export function inline(text) {
  let s = escapeHtml(String(text ?? ""));

  // images ![alt](url)
  s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (_, alt, url) => {
    const safe = sanitizeUrl(url);
    if (!safe) return escapeHtml(`![${alt}](${url})`);
    return `<img src="${escapeAttr(safe)}" alt="${escapeAttr(alt)}" loading="lazy" />`;
  });

  // links [text](url) — label 已在 escapeHtml 之后，禁止再插入未转义 HTML
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (_, label, url) => {
    const safe = sanitizeUrl(url);
    if (!safe) return `[${label}](${escapeHtml(url)})`;
    return `<a href="${escapeAttr(safe)}" target="_blank" rel="noopener noreferrer">${label}</a>`;
  });

  // inline code
  s = s.replace(/`([^`]+)`/g, (_, code) => `<code>${code}</code>`);

  // bold ** **
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/__([^_]+)__/g, "<strong>$1</strong>");

  // italic * *
  s = s.replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,!?:;]|$)/g, "$1<em>$2</em>");
  s = s.replace(/(^|[\s(])_([^_\n]+)_(?=[\s).,!?:;]|$)/g, "$1<em>$2</em>");

  // strike ~~
  s = s.replace(/~~([^~]+)~~/g, "<del>$1</del>");

  return s;
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
