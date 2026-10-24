import { renderMarkdown, cleanMarkdownEscapes } from "./renderer.js";
import { htmlToMarkdown } from "./html-import.js";
import { buildOutline } from "./outline.js";
import { createDocumentStore, extractTitle, MAX_DOC_CHARS } from "./document-store.js";
import { exportMarkdownFile, exportHtmlFile, buildSafeHtmlDocument, safeFilename } from "./export.js";
import { analyzeTextStats } from "../char-count/stats.js";
import { createToast } from "../../shared/toast.js";
import { escapeHtml, escapeAttr } from "../../shared/escape.js";
import { writeClipboard } from "../../shared/clipboard.js";
import { getMarkdownEditorTemplate } from "./template.js";

export { getMarkdownEditorTemplate };

const SPLIT_KEY = "toolmap-md-split-ratio";
const MODE_KEY = "toolmap-md-view-mode";


/**
 * @param {HTMLElement & { _cleanup?: () => void }} mount
 */
export function mountMarkdownEditorTool(mount) {
  if (!(mount instanceof HTMLElement)) return;
  mount.innerHTML = getMarkdownEditorTemplate();

  // 元素 id 由模板固定，各节点类型不同，这里按动态结构返回 any
  /**
   * @param {string} sel
   * @returns {any}
   */
  const $ = (sel) => mount.querySelector(sel);
  const root = $("#mdRoot");
  const editor = $("#mdEditor");
  const preview = $("#mdPreview");
  const previewPane = $("#mdPreviewPane");
  const editorPane = $("#mdEditorPane");
  const titleInput = $("#mdTitle");
  const saveStatus = $("#mdSaveStatus");
  const statsEl = $("#mdStats");
  const outlineEl = $("#mdOutline");
  const docList = $("#mdDocList");
  const findBar = $("#mdFindBar");
  const toastEl = $("#mdToast");
  const workspace = $("#mdWorkspace");
  const splitter = $("#mdSplitter");
  const outlinePane = $("#mdOutlinePane");
  const outlineToggle = $("#mdOutlineToggle");
  const exitFullscreenBtn = $("#mdExitFullscreen");
  const syncScrollEl = $("#mdSyncScroll");
  const showToast = createToast(toastEl, { showClass: "md-toast--show", duration: 2400 });

  const store = createDocumentStore();
  /** @type {string|null} */
  let currentId = null;
  let dirty = false;
  let viewMode = localStorage.getItem(MODE_KEY) || "split";
  /** @type {ReturnType<typeof setTimeout>|null} */
  let renderTimer = null;
  /** @type {ReturnType<typeof setTimeout>|null} */
  let saveTimer = null;
  let lastFindIndex = 0;

  // mobile default: 在移动端视口（<= 768px）优先默认使用纯编辑视图
  if (window.matchMedia("(max-width: 768px)").matches) {
    viewMode = "edit";
  }

  /**
   * @param {string} text
   * @param {string} [cls]
   */
  function setSaveStatus(text, cls = "") {
    saveStatus.textContent = text;
    saveStatus.className = `md-save-status ${cls}`.trim();
  }

  function getContent() {
    return editor.value;
  }

  /**
   * @param {string} text
   * @param {{ markDirty?: boolean }} [opts]
   */
  function setContent(text, { markDirty = false } = {}) {
    editor.value = String(text ?? "").slice(0, MAX_DOC_CHARS);
    dirty = markDirty;
    scheduleRender();
    updateStats();
    if (!markDirty) setSaveStatus("已加载");
  }

  function scheduleRender() {
    clearTimeout(/** @type {ReturnType<typeof setTimeout>} */ (renderTimer));
    renderTimer = setTimeout(renderAll, 120);
  }

  function renderAll() {
    const md = getContent();
    preview.innerHTML = renderMarkdown(md);
    attachCodeCopyButtons();
    renderOutline(md);
    updateStats();
  }

  function attachCodeCopyButtons() {
    preview.querySelectorAll("pre.md-code").forEach((/** @type {Element} */ pre) => {
      if (pre.querySelector(".md-copy-code")) return;
      const btn = document.createElement("button");
      btn.className = "md-copy-code";
      btn.type = "button";
      btn.textContent = "复制";
      btn.addEventListener("click", async () => {
        const code = pre.querySelector("code")?.textContent || "";
        const ok = await writeClipboard(code);
        showToast(ok ? "代码已复制" : "复制失败");
      });
      pre.appendChild(btn);
    });
  }

  /** @param {string} md */
  function renderOutline(md) {
    const items = buildOutline(md);
    if (!items.length) {
      outlineEl.innerHTML = '<p class="md-outline-empty">暂无标题</p>';
      return;
    }
    outlineEl.innerHTML = items
      .map(
        (it) =>
          `<button type="button" class="md-outline-item md-outline-item--h${it.level}" data-id="${escapeAttr(it.id)}">${escapeHtml(it.text)}</button>`
      )
      .join("");
  }

  function updateStats() {
    const text = getContent();
    const s = analyzeTextStats(text);
    const noSpace = Array.from(text.replace(/\s/g, "")).length;
    // 中文按字，英文按词近似
    const words = (text.match(/[A-Za-z0-9]+|[\p{Unified_Ideograph}]/gu) || []).length;
    const minutes = Math.max(1, Math.ceil(words / 300));
    statsEl.textContent = `字符 ${s.characters} · 无空格 ${noSpace} · 词/字 ${words} · 行 ${s.lines} · 约 ${minutes} 分钟阅读`;
  }

  /** @param {string} mode */
  function setMode(mode) {
    viewMode = mode;
    localStorage.setItem(MODE_KEY, mode);
    // fullscreen 仍展示双栏，dataset 用 split 以免误触仅编辑/仅预览样式
    root.dataset.mode = mode === "fullscreen" ? "split" : mode;
    const activeMode = mode === "fullscreen" ? "split" : mode;
    /** @type {NodeListOf<HTMLElement>} */ (mount.querySelectorAll(".md-mode")).forEach((btn) => {
      btn.classList.toggle("md-mode--active", btn.dataset.mode === activeMode);
    });
    const isFullscreen = mode === "fullscreen";
    root.classList.toggle("md-is-fullscreen", isFullscreen);
    document.documentElement.classList.toggle("toolmap-md-immersive", isFullscreen);
    if (exitFullscreenBtn) exitFullscreenBtn.hidden = !isFullscreen;
    if (isFullscreen && outlinePane) outlinePane.classList.add("is-collapsed");
  }

  /** @param {number} ratio */
  function applySplitRatio(ratio) {
    const r = Math.min(0.75, Math.max(0.25, ratio));
    workspace.style.setProperty("--md-split", `${(r * 100).toFixed(1)}%`);
    localStorage.setItem(SPLIT_KEY, String(r));
  }

  // init split
  applySplitRatio(Number(localStorage.getItem(SPLIT_KEY)) || 0.5);
  setMode(viewMode === "fullscreen" ? "split" : viewMode);

  /* ── 工具栏格式 ── */
  /**
   * @param {string} before
   * @param {string} [after]
   * @param {string} [placeholder]
   */
  function wrapSelection(before, after = before, placeholder = "") {
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const value = editor.value;
    const selected = value.slice(start, end) || placeholder;
    const next = value.slice(0, start) + before + selected + after + value.slice(end);
    editor.value = next;
    const cursor = start + before.length + selected.length;
    editor.focus();
    editor.setSelectionRange(start + before.length, cursor);
    dirty = true;
    setSaveStatus("未保存", "is-dirty");
    scheduleRender();
    scheduleAutoSave();
  }

  /** @param {string} prefix */
  function prefixLines(prefix) {
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const value = editor.value;
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    const lineEnd = value.indexOf("\n", end);
    const endPos = lineEnd === -1 ? value.length : lineEnd;
    const block = value.slice(lineStart, endPos);
    const nextBlock = block
      .split("\n")
      .map((/** @type {string} */ line) => (line.startsWith(prefix) ? line : prefix + line))
      .join("\n");
    editor.value = value.slice(0, lineStart) + nextBlock + value.slice(endPos);
    editor.focus();
    dirty = true;
    setSaveStatus("未保存", "is-dirty");
    scheduleRender();
    scheduleAutoSave();
  }

  /** @param {string|undefined} fmt */
  function applyFormat(fmt) {
    switch (fmt) {
      case "h1": return wrapSelection("# ", "", "标题");
      case "h2": return wrapSelection("## ", "", "标题");
      case "h3": return wrapSelection("### ", "", "标题");
      case "bold": return wrapSelection("**", "**", "加粗");
      case "italic": return wrapSelection("*", "*", "斜体");
      case "strike": return wrapSelection("~~", "~~", "删除线");
      case "link": return wrapSelection("[", "](https://)", "链接文字");
      case "image": return wrapSelection("![", "](https://)", "描述");
      case "quote": return prefixLines("> ");
      case "ul": return prefixLines("- ");
      case "ol": return prefixLines("1. ");
      case "task": return prefixLines("- [ ] ");
      case "code": return wrapSelection("`", "`", "code");
      case "codeblock": return wrapSelection("```\n", "\n```", "code");
      case "table":
        return wrapSelection(
          "| 列1 | 列2 | 列3 |\n| --- | --- | --- |\n| ",
          " |  |  |\n",
          "内容"
        );
      case "hr": return wrapSelection("\n\n---\n\n", "", "");
      case "find":
        findBar.hidden = false;
        $("#mdFindInput").focus();
        return;
      case "clean-escapes": {
        const val = editor.value;
        const cleaned = cleanMarkdownEscapes(val);
        if (cleaned !== val) {
          setContent(cleaned, { markDirty: true });
          scheduleAutoSave();
          showToast("已清理多余反斜杠转义");
        } else {
          showToast("未检测到多余反斜杠转义");
        }
        return;
      }
      default:
        return;
    }
  }

  /* ── 保存 ── */
  function scheduleAutoSave() {
    clearTimeout(/** @type {ReturnType<typeof setTimeout>} */ (saveTimer));
    setSaveStatus("正在保存…", "is-saving");
    saveTimer = setTimeout(() => {
      saveDoc().catch(() => setSaveStatus("保存失败", "is-error"));
    }, 700);
  }

  async function saveDoc() {
    if (!store) {
      setSaveStatus("浏览器不支持本地草稿");
      return;
    }
    const content = getContent();
    const title = titleInput.value.trim() || extractTitle(content) || "未命名文档";
    titleInput.value = title;
    let createdAt;
    if (currentId) {
      const prev = await store.get(currentId);
      createdAt = prev?.createdAt;
    }
    const doc = await store.save({ id: currentId || undefined, title, content, createdAt });
    currentId = doc.id;
    dirty = false;
    setSaveStatus("已保存", "is-saved");
    await refreshDocList();
  }

  async function refreshDocList() {
    if (!store) {
      docList.innerHTML = '<p class="md-outline-empty">当前环境不可用本地草稿</p>';
      return;
    }
    const docs = (await store.list()).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    if (!docs.length) {
      docList.innerHTML = '<p class="md-outline-empty">暂无草稿</p>';
      return;
    }
    docList.innerHTML = docs
      .map(
        (d) => `
      <div class="md-doc-item" data-id="${escapeAttr(d.id)}">
        <button type="button" class="md-doc-open" data-open="${escapeAttr(d.id)}">
          <strong>${escapeHtml(d.title || "未命名")}</strong>
          <span>${new Date(d.updatedAt || d.createdAt).toLocaleString("zh-CN")}</span>
        </button>
        <button type="button" class="md-doc-del" data-del="${escapeAttr(d.id)}" title="删除">×</button>
      </div>`
      )
      .join("");
  }

  /** @param {string} id */
  async function openDoc(id) {
    if (!store) return;
    const doc = await store.get(id);
    if (!doc) return;
    currentId = doc.id;
    titleInput.value = doc.title || "";
    setContent(doc.content || "", { markDirty: false });
    setSaveStatus("已加载");
  }

  function newDoc() {
    currentId = null;
    titleInput.value = "";
    setContent("", { markDirty: false });
    setSaveStatus("新文档");
    editor.focus();
  }

  /* ── 导入 ── */
  /** @param {File} file */
  async function importFile(file) {
    if (!file) return;
    const name = file.name || "document";
    const text = await file.text();
    const lower = name.toLowerCase();
    if (/\.(html?|htm)$/i.test(lower) || /text\/html/i.test(file.type)) {
      const result = htmlToMarkdown(text);
      setContent(result.markdown, { markDirty: true });
      titleInput.value = safeFilename(name.replace(/\.(html?|htm)$/i, ""));
      setSaveStatus("未保存", "is-dirty");
      scheduleAutoSave();
      showToast(result.message || "已导入 HTML");
      return;
    }
    const hasExcessiveEscapes = /(\d+)\\\./.test(text) || /\\\>/.test(text) || /\w\\\.com/.test(text);
    setContent(text, { markDirty: true });
    titleInput.value = safeFilename(name.replace(/\.(md|markdown|txt)$/i, ""));
    setSaveStatus("未保存", "is-dirty");
    scheduleAutoSave();
    if (hasExcessiveEscapes) {
      showToast("已导入文件（含 \\ 转义，可点击工具栏【净化转义】一键清理）");
    } else {
      showToast("已导入文件");
    }
  }

  /* ── 事件绑定 ── */
  editor.addEventListener("input", () => {
    dirty = true;
    setSaveStatus("未保存", "is-dirty");
    scheduleRender();
    scheduleAutoSave();
  });

  editor.addEventListener("keydown", (/** @type {KeyboardEvent} */ e) => {
    const mod = e.metaKey || e.ctrlKey;
    if (e.key === "Tab") {
      e.preventDefault();
      wrapSelection("  ", "", "");
      return;
    }
    if (mod && e.key.toLowerCase() === "b") {
      e.preventDefault();
      applyFormat("bold");
    } else if (mod && e.key.toLowerCase() === "i") {
      e.preventDefault();
      applyFormat("italic");
    } else if (mod && e.key.toLowerCase() === "k") {
      e.preventDefault();
      e.stopPropagation();
      applyFormat("link");
    } else if (mod && e.key.toLowerCase() === "s") {
      e.preventDefault();
      saveDoc().then(() => showToast("已保存到本地"));
    } else if (mod && e.key.toLowerCase() === "f") {
      e.preventDefault();
      applyFormat("find");
    } else if (e.key === "Escape" && root.classList.contains("md-is-fullscreen")) {
      setMode("split");
    }
  });

  mount.querySelector(".md-toolbar")?.addEventListener("click", (e) => {
    const btn = e.target instanceof Element ? e.target.closest("[data-fmt]") : null;
    if (btn instanceof HTMLElement) applyFormat(btn.dataset.fmt);
  });

  mount.querySelector(".md-mode-switch")?.addEventListener("click", (e) => {
    const btn = e.target instanceof Element ? e.target.closest("[data-mode]") : null;
    if (btn instanceof HTMLElement) setMode(/** @type {string} */ (btn.dataset.mode));
  });

  $("#mdFullscreenBtn").addEventListener("click", () => {
    setMode(root.classList.contains("md-is-fullscreen") ? "split" : "fullscreen");
  });
  if (exitFullscreenBtn) {
    exitFullscreenBtn.addEventListener("click", () => setMode("split"));
  }

  function updateOutlineToggleLabel() {
    const isMobile = window.matchMedia("(max-width: 900px)").matches;
    const expanded = isMobile
      ? outlinePane.classList.contains("is-visible")
      : !outlinePane.classList.contains("is-collapsed");
    outlineToggle.textContent = isMobile ? (expanded ? "隐藏大纲" : "显示大纲") : (expanded ? "收起" : "展开");
    outlineToggle.setAttribute("aria-expanded", String(expanded));
  }
  function toggleOutline() {
    const isMobile = window.matchMedia("(max-width: 900px)").matches;
    if (isMobile) {
      outlinePane.classList.toggle("is-visible");
    } else {
      outlinePane.classList.toggle("is-collapsed");
    }
    updateOutlineToggleLabel();
  }
  outlineToggle.addEventListener("click", toggleOutline);

  $("#mdSaveBtn").addEventListener("click", () => saveDoc().then(() => showToast("已保存")));
  $("#mdNewDoc").addEventListener("click", newDoc);
  $("#mdImportBtn").addEventListener("click", () => $("#mdFileInput").click());
  $("#mdFileInput").addEventListener("change", (/** @type {Event & { target: HTMLInputElement }} */ e) => {
    const f = e.target.files?.[0];
    if (f) importFile(f);
    e.target.value = "";
  });

  // drag import
  ["dragenter", "dragover"].forEach((ev) => {
    editorPane.addEventListener(ev, (/** @type {Event} */ e) => {
      e.preventDefault();
      $("#mdDropHint").hidden = false;
    });
  });
  editorPane.addEventListener("dragleave", () => {
    $("#mdDropHint").hidden = true;
  });
  editorPane.addEventListener("drop", (/** @type {DragEvent} */ e) => {
    e.preventDefault();
    $("#mdDropHint").hidden = true;
    const f = e.dataTransfer?.files?.[0];
    if (f) importFile(f);
  });

  outlineEl.addEventListener("click", (/** @type {MouseEvent & { target: Element }} */ e) => {
    const btn = /** @type {HTMLElement|null} */ (e.target.closest("[data-id]"));
    if (!btn) return;
    const target = preview.querySelector(`#${CSS.escape(/** @type {string} */ (btn.dataset.id))}`);
    if (!target || !previewPane) return;
    // 预览滚动容器是 pane，不是内部 .md-preview
    const paneRect = previewPane.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    previewPane.scrollTop += targetRect.top - paneRect.top - 12;
  });

  /* ── 同步滚动 ──
   * 编辑区滚动元素：#mdEditor (textarea)
   * 预览区滚动元素：#mdPreviewPane（CSS overflow 在 pane 上，不在 .md-preview 上）
   */
  let syncLock = false;

  /** @param {HTMLElement|null|undefined} el */
  function scrollMax(el) {
    if (!el) return 0;
    return Math.max(0, el.scrollHeight - el.clientHeight);
  }

  function bothPanesScrollable() {
    if (!syncScrollEl?.checked) return false;
    // 仅编辑 / 仅预览时另一侧不可见，无需同步
    if (viewMode === "edit" || viewMode === "preview") return false;
    return Boolean(editor && previewPane);
  }

  /**
   * @param {HTMLElement} source
   * @param {HTMLElement} target
   */
  function syncScrollFrom(source, target) {
    if (!bothPanesScrollable() || syncLock || !source || !target) return;
    const srcMax = scrollMax(source);
    const tgtMax = scrollMax(target);
    if (srcMax <= 0 && tgtMax <= 0) return;
    const ratio = srcMax <= 0 ? 0 : source.scrollTop / srcMax;
    syncLock = true;
    target.scrollTop = ratio * tgtMax;
    // 下一帧解除，避免 scroll 事件回环
    requestAnimationFrame(() => {
      syncLock = false;
    });
  }

  editor.addEventListener(
    "scroll",
    () => {
      syncScrollFrom(editor, previewPane);
    },
    { passive: true }
  );
  previewPane.addEventListener(
    "scroll",
    () => {
      syncScrollFrom(previewPane, editor);
    },
    { passive: true }
  );

  // splitter drag
  let dragging = false;
  splitter.addEventListener("pointerdown", (/** @type {PointerEvent} */ e) => {
    dragging = true;
    splitter.classList.add("is-dragging");
    splitter.setPointerCapture(e.pointerId);
  });
  splitter.addEventListener("pointermove", (/** @type {PointerEvent} */ e) => {
    if (!dragging) return;
    const rect = workspace.getBoundingClientRect();
    const outlineW = $("#mdOutlinePane").getBoundingClientRect().width || 0;
    const x = e.clientX - rect.left - outlineW;
    const usable = rect.width - outlineW - 8;
    applySplitRatio(x / usable);
  });
  splitter.addEventListener("pointerup", () => {
    dragging = false;
    splitter.classList.remove("is-dragging");
  });
  splitter.addEventListener("pointercancel", () => {
    dragging = false;
    splitter.classList.remove("is-dragging");
  });

  // find/replace
  $("#mdFindClose").addEventListener("click", () => {
    findBar.hidden = true;
  });
  $("#mdFindNext").addEventListener("click", () => {
    const q = $("#mdFindInput").value;
    if (!q) return;
    const text = editor.value;
    let idx = text.indexOf(q, lastFindIndex);
    if (idx === -1) idx = text.indexOf(q, 0);
    if (idx === -1) {
      showToast("未找到");
      return;
    }
    lastFindIndex = idx + q.length;
    editor.focus();
    editor.setSelectionRange(idx, idx + q.length);
  });
  $("#mdReplaceOne").addEventListener("click", () => {
    const q = $("#mdFindInput").value;
    const r = $("#mdReplaceInput").value;
    if (!q) return;
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    if (editor.value.slice(start, end) === q) {
      editor.setRangeText(r, start, end, "end");
      dirty = true;
      scheduleRender();
      scheduleAutoSave();
    } else {
      $("#mdFindNext").click();
    }
  });
  $("#mdReplaceAll").addEventListener("click", () => {
    const q = $("#mdFindInput").value;
    const r = $("#mdReplaceInput").value;
    if (!q) return;
    editor.value = editor.value.split(q).join(r);
    dirty = true;
    scheduleRender();
    scheduleAutoSave();
    showToast("已全部替换");
  });

  // export / copy
  $("#mdCopyMd").addEventListener("click", async () => {
    const ok = await writeClipboard(getContent());
    showToast(ok ? "已复制 Markdown" : "复制失败");
  });
  $("#mdCopyHtml").addEventListener("click", async () => {
    const html = buildSafeHtmlDocument(getContent(), titleInput.value || "document");
    const ok = await writeClipboard(html);
    showToast(ok ? "已复制 HTML" : "复制失败");
  });
  $("#mdExportMd").addEventListener("click", () => {
    exportMarkdownFile(getContent(), titleInput.value || extractTitle(getContent()) || "document");
    showToast("已导出 Markdown");
  });
  $("#mdExportHtml").addEventListener("click", () => {
    try {
      exportHtmlFile(getContent(), titleInput.value || extractTitle(getContent()) || "document");
      showToast("已导出 HTML");
    } catch (err) {
      showToast(err.message || "导出失败");
    }
  });

  docList.addEventListener("click", async (/** @type {MouseEvent & { target: Element }} */ e) => {
    const open = /** @type {HTMLElement|null} */ (e.target.closest("[data-open]"));
    if (open) {
      await openDoc(/** @type {string} */ (open.dataset.open));
      return;
    }
    const del = /** @type {HTMLElement|null} */ (e.target.closest("[data-del]"));
    if (del && store) {
      await store.remove(/** @type {string} */ (del.dataset.del));
      if (currentId === del.dataset.del) newDoc();
      await refreshDocList();
    }
  });

  $("#mdClearDocs").addEventListener("click", async () => {
    if (!store) return;
    if (!confirm("确定清空全部本地草稿？")) return;
    await store.clear();
    newDoc();
    await refreshDocList();
    showToast("已清空草稿");
  });

  // Esc exit fullscreen at document level while mounted
  /** @param {KeyboardEvent} e */
  const onKey = (e) => {
    if (e.key === "Escape" && root.classList.contains("md-is-fullscreen")) {
      setMode("split");
    }
  };
  document.addEventListener("keydown", onKey);

  // restore requested or latest draft
  (async () => {
    await refreshDocList();
    const pendingRestoreId = sessionStorage.getItem("toolmap_restore_markdown");
    if (pendingRestoreId) {
      sessionStorage.removeItem("toolmap_restore_markdown");
    }
    if (store) {
      const docs = (await store.list()).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      const targetDoc = pendingRestoreId ? docs.find((d) => d.id === pendingRestoreId) : null;
      if (targetDoc) {
        await openDoc(targetDoc.id);
      } else if (docs[0]) {
        await openDoc(docs[0].id);
      } else {
        setContent("# 欢迎使用 Markdown 创作台\n\n- 支持 **加粗**、*斜体*、`代码`\n- 可导入 `.md` / `.html`\n- 草稿自动保存在本地\n", { markDirty: false });
        titleInput.value = "欢迎使用 Markdown 创作台";
      }
    } else {
      setContent("# Markdown 创作台\n\n开始写作…\n", { markDirty: false });
    }
    renderAll();
  })();

  mount._cleanup = () => {
    clearTimeout(/** @type {ReturnType<typeof setTimeout>} */ (renderTimer));
    clearTimeout(/** @type {ReturnType<typeof setTimeout>} */ (saveTimer));
    document.removeEventListener("keydown", onKey);
    document.documentElement.classList.remove("toolmap-md-immersive");
  };
  currentMdCleanup = mount._cleanup;
}

/** @type {(() => void)|null} */
let currentMdCleanup = null;

export function unmountMarkdownEditorTool() {
  if (typeof currentMdCleanup === "function") {
    currentMdCleanup();
    currentMdCleanup = null;
  }
}

export { unmountMarkdownEditorTool as unmount };
