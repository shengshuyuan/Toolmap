/**
 * 统一工具与任务搜索弹窗 (⌘K Search Modal)
 * 对应交接文档 Section 3
 */

import { TOOL_REGISTRY } from "./tool-registry.js";
import { escapeHtml } from "./shared/escape.js";
import { listAllRecentRecords } from "./shared/recent-index.js";

export const TASK_SHORTCUTS = [
  { title: "比较两版需求或 PRD 变更", toolId: "text-diff", desc: "定位增删改内容，支持导出差异摘要", keywords: ["需求", "prd", "变更", "对比", "版本", "diff"] },
  { title: "批量压缩交付图片为 WebP", toolId: "image-compress", desc: "智能压缩，减少素材体积，不上传服务器", keywords: ["图片", "压缩", "webp", "变小", "素材"] },
  { title: "编辑需求文档与实时预览", toolId: "markdown-editor", desc: "本地保存 Markdown 草稿，大纲导航与导出", keywords: ["markdown", "md", "文档", "需求", "写作", "草稿"] },
  { title: "统计文本字数、字符与 UTF-8 字节", toolId: "char-count", desc: "精确度量中英文字符、行数与字节数", keywords: ["字数", "字符", "统计", "字节", "长度"] },
  { title: "生成带 Logo 与容错自检的二维码", toolId: "qrcode", desc: "支持链接、WiFi 与名片，本地安全生成", keywords: ["二维码", "qr", "扫码", "名片", "wifi"] },
  { title: "合并多个 PDF 交付物或加盖水印", toolId: "pdf-tools", desc: "本地合并、拆分或给敏感材料加水印", keywords: ["pdf", "合并", "拆分", "水印", "交付"] },
];

/**
 * 根据查询词匹配工具、任务推荐和最近记录
 * @param {string} query
 * @param {{ tools?: any[], tasks?: any[], recents?: any[] }} [options]
 */
export function filterSearchCandidates(query, { tools = TOOL_REGISTRY, tasks = TASK_SHORTCUTS, recents = [] } = {}) {
  const q = (query || "").trim().toLowerCase();
  const matches = [];

  if (!q) {
    // 默认推荐：工具 + 任务快捷
    tools.forEach((t) => {
      matches.push({
        type: "tool",
        title: t.buttonLabel,
        desc: t.description || t.hint,
        toolId: t.id,
        iconSvg: t.iconSvg,
        badge: t.category,
      });
    });
    tasks.slice(0, 3).forEach((task) => {
      matches.push({
        type: "task",
        title: task.title,
        desc: task.desc,
        toolId: task.toolId,
        badge: "任务推荐",
      });
    });
    return matches;
  }

  // 匹配工具
  for (const t of tools) {
    const inLabel = (t.buttonLabel || "").toLowerCase().includes(q);
    const inTitle = (t.title || "").toLowerCase().includes(q);
    const inHint = (t.hint || "").toLowerCase().includes(q);
    const inKeywords = (t.keywords || []).some((kw) => (kw || "").toLowerCase().includes(q));
    if (inLabel || inTitle || inHint || inKeywords) {
      matches.push({
        type: "tool",
        title: t.buttonLabel,
        desc: t.description || t.hint,
        toolId: t.id,
        iconSvg: t.iconSvg,
        badge: t.category,
      });
    }
  }

  // 匹配任务
  for (const task of tasks) {
    const inTitle = (task.title || "").toLowerCase().includes(q);
    const inDesc = (task.desc || "").toLowerCase().includes(q);
    const inKeywords = (task.keywords || []).some((kw) => (kw || "").toLowerCase().includes(q));
    if (inTitle || inDesc || inKeywords) {
      matches.push({
        type: "task",
        title: task.title,
        desc: task.desc,
        toolId: task.toolId,
        badge: "任务推荐",
      });
    }
  }

  // 匹配最近记录
  for (const r of recents) {
    const inTitle = (r.title || "").toLowerCase().includes(q);
    const inSummary = (r.summary || "").toLowerCase().includes(q);
    if (inTitle || inSummary) {
      matches.push({
        type: "recent",
        title: r.title,
        desc: `${r.toolLabel || ""} · ${r.summary || ""}`,
        toolId: r.toolId,
        recordId: r.recordId,
        badge: "最近记录",
      });
    }
  }

  return matches;
}

export function createSearchModal({ onNavigate }) {
  let modalEl = document.getElementById("searchModal");
  if (!modalEl) {
    modalEl = document.createElement("div");
    modalEl.id = "searchModal";
    modalEl.className = "search-modal-backdrop";
    modalEl.setAttribute("aria-hidden", "true");
    modalEl.innerHTML = `
      <div class="search-modal" role="dialog" aria-modal="true" aria-label="搜索工具与任务">
        <div class="search-modal__head">
          <svg class="search-modal__icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="search" class="search-modal__input" id="searchModalInput" placeholder="搜索工具、任务（如：比较需求、图片变小、合并 PDF）..." autocomplete="off" spellcheck="false" />
          <button type="button" class="search-modal__close" id="searchModalClose" aria-label="关闭">Esc</button>
        </div>
        <div class="search-modal__body" id="searchModalResults">
          <div class="search-modal__hint">输入关键词开始检索工具、常见任务与最近记录</div>
        </div>
        <div class="search-modal__footer">
          <span><kbd>↑</kbd> <kbd>↓</kbd> 选择</span>
          <span><kbd>Enter</kbd> 打开</span>
          <span><kbd>Esc</kbd> 退出</span>
        </div>
      </div>
    `;
    document.body.appendChild(modalEl);
  }

  const input = /** @type {HTMLInputElement} */ (modalEl.querySelector("#searchModalInput"));
  const resultsEl = modalEl.querySelector("#searchModalResults");
  const closeBtn = modalEl.querySelector("#searchModalClose");

  let activeIndex = 0;
  let currentItems = [];
  let recentRecordsCache = [];

  function open() {
    modalEl.classList.add("search-modal-backdrop--open");
    modalEl.setAttribute("aria-hidden", "false");
    input.value = "";
    activeIndex = 0;
    input.focus();
    renderResults("");
    // 异步拉取最近记录作为搜索候选
    listAllRecentRecords().then((list) => {
      recentRecordsCache = list;
    }).catch(() => {});
  }

  function close() {
    modalEl.classList.remove("search-modal-backdrop--open");
    modalEl.setAttribute("aria-hidden", "true");
  }

  function renderResults(query) {
    const matches = filterSearchCandidates(query, {
      tools: TOOL_REGISTRY,
      tasks: TASK_SHORTCUTS,
      recents: recentRecordsCache,
    });

    currentItems = matches;
    activeIndex = 0;

    if (!matches.length) {
      resultsEl.innerHTML = `<div class="search-modal__empty">未找到与“${escapeHtml(query)}”匹配的工具或任务</div>`;
      return;
    }

    resultsEl.innerHTML = matches
      .map((item, idx) => `
        <div class="search-item ${idx === activeIndex ? "search-item--active" : ""}" data-index="${idx}">
          <div class="search-item__content">
            <div class="search-item__title">
              <span>${escapeHtml(item.title)}</span>
              <span class="search-item__badge">${escapeHtml(item.badge || "")}</span>
            </div>
            <div class="search-item__desc">${escapeHtml(item.desc)}</div>
          </div>
          <svg class="search-item__enter" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 10 4 15 9 20"/><path d="M20 4v7a4 4 0 0 1-4 4H4"/></svg>
        </div>
      `)
      .join("");

    resultsEl.querySelectorAll(".search-item").forEach((el) => {
      el.addEventListener("click", () => {
        const idx = Number(el.getAttribute("data-index"));
        executeItem(matches[idx]);
      });
    });
  }

  function updateActive() {
    resultsEl.querySelectorAll(".search-item").forEach((el, idx) => {
      el.classList.toggle("search-item--active", idx === activeIndex);
    });
    const activeEl = resultsEl.querySelector(".search-item--active");
    if (activeEl) {
      activeEl.scrollIntoView({ block: "nearest" });
    }
  }

  function executeItem(item) {
    if (!item) return;
    close();
    if (item.recordId) {
      onNavigate(item.toolId, { restoreId: item.recordId });
    } else {
      onNavigate(item.toolId);
    }
  }

  input.addEventListener("input", () => renderResults(input.value));

  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (currentItems.length) {
        activeIndex = (activeIndex + 1) % currentItems.length;
        updateActive();
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (currentItems.length) {
        activeIndex = (activeIndex - 1 + currentItems.length) % currentItems.length;
        updateActive();
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      executeItem(currentItems[activeIndex]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
  });

  closeBtn?.addEventListener("click", close);
  modalEl.addEventListener("click", (e) => {
    if (e.target === modalEl) close();
  });

  return { open, close };
}
