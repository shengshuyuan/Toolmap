import { debugLog } from "../../debug.js";
import { removeBlankLines, normalizeNewlines } from "./sanitize.js";
import { diffLines } from "./diff.js";
import { renderDiff, focusAnchor } from "./render.js";
import { summarizeDiffLines } from "./summary.js";
import { writeClipboard } from "../../shared/clipboard.js";
import { escapeHtml } from "../../shared/escape.js";
import { formatBytes } from "../../shared/format.js";
import { createEditorController, syncEditorPairScroll } from "./editor.js";
import { createComparisonState } from "./state.js";
import { buildLocateStatus, collectComparisonHints, shouldWarnLineMismatch } from "./diagnostics.js";
import { createToast } from "../../shared/toast.js";
import {
  TEXT_HISTORY_LIMIT,
  clearTextHistory,
  createTextHistoryRecord,
  deleteTextHistoryRecord,
  getTextHistoryUsage,
  isTextHistoryAvailable,
  listTextHistory,
  saveTextHistoryRecord,
} from "./history-store.js";
import { exportTextHistory } from "../../shared/history-export.js";
import { getTextDiffTemplate } from "./template.js";

export { getTextDiffTemplate };

const DEMO_LEFT = `会员权益说明 (v1.0)
1. 免费用户每天可导出 3 次
2. 专业版支持批量导出
3. 导出失败不退还次数
4. 支持导出格式：CSV、JSON`;

const DEMO_RIGHT = `会员权益说明 (v2.0)
1. 免费用户每天可导出 5 次
2. 专业版支持批量导出
3. 导出失败不扣减次数
4. 支持导出格式：CSV、JSON、PDF
5. 企业版支持团队成员协作`;


/**
 * @param {ParentNode} root
 * @param {string} id
 * @returns {any} 模板内元素类型各异，调用处自行断言
 */
function getRequiredElement(root, id) {
  let el = root.querySelector(`#${id}`);
  if (!el && id === "statNavIndex") {
    el = root.querySelector("#statNavLabel");
  }
  if (!el) throw new Error(`文本比对工具缺少节点：#${id}`);
  return el;
}

/** @param {HTMLElement & { _cleanup?: () => void }} mount */
export function mountTextDiffTool(mount) {
  if (!(mount instanceof HTMLElement)) return;
  mount.innerHTML = getTextDiffTemplate();

  /** @param {string} id @returns {any} */
  const $ = (id) => getRequiredElement(mount, id);

  const elLeft = /** @type {HTMLTextAreaElement} */ ($("leftText"));
  const elRight = /** @type {HTMLTextAreaElement} */ ($("rightText"));
  const elDiffView = $("diffView");
  const elStatus = $("statusText");
  const elToast = $("toast");
  const elCompareHints = $("compareHints");

  const btnCompare = /** @type {HTMLButtonElement} */ ($("btnCompare"));
  const btnPrev = /** @type {HTMLButtonElement} */ ($("btnPrev"));
  const btnNext = /** @type {HTMLButtonElement} */ ($("btnNext"));
  const btnClean = /** @type {HTMLButtonElement} */ ($("btnClean"));
  const btnSwap = /** @type {HTMLButtonElement} */ ($("btnSwap"));
  const btnClear = /** @type {HTMLButtonElement} */ ($("btnClear"));
  const btnCopy = /** @type {HTMLButtonElement} */ ($("btnCopy"));
  const btnRefreshTextHistory = /** @type {HTMLButtonElement} */ ($("btnRefreshTextHistory"));
  const btnExportTextHistory = /** @type {HTMLButtonElement} */ ($("btnExportTextHistory"));
  const btnClearTextHistory = /** @type {HTMLButtonElement} */ ($("btnClearTextHistory"));
  const elTextHistoryMeta = $("textHistoryMeta");
  const elTextHistoryList = $("textHistoryList");

  // 新架构节点
  const stageEditor = $("stageEditor");
  const stageResult = $("stageResult");
  const btnBackToEdit = $("btnBackToEdit");
  const tabViewSide = $("tabViewSide");
  const tabViewInline = $("tabViewInline");
  const chkIgnoreWhitespace = /** @type {HTMLInputElement} */ ($("chkIgnoreWhitespace"));
  const btnMoreToggle = $("btnMoreToggle");
  const moreDropdownMenu = $("moreDropdownMenu");
  const btnLoadDemo = $("btnLoadDemo");
  const btnClearLeft = $("btnClearLeft");
  const btnClearRight = $("btnClearRight");
  const fileInputLeft = /** @type {HTMLInputElement} */ ($("fileInputLeft"));
  const fileInputRight = /** @type {HTMLInputElement} */ ($("fileInputRight"));
  const diffStaleBanner = $("diffStaleBanner");
  const statModCount = $("statModCount");
  const statAddCount = $("statAddCount");
  const statDelCount = $("statDelCount");
  const statNavIndex = $("statNavIndex");

  // 抽屉
  const historyDrawer = $("historyDrawer");
  const historyDrawerBackdrop = $("historyDrawerBackdrop");
  const btnOpenHistory = $("btnOpenHistory");
  const btnCloseHistoryDrawer = $("btnCloseHistoryDrawer");

  const leftEditor = createEditorController({
    textarea: elLeft,
    gutter: $("leftGutter"),
    highlight: $("leftHL"),
  });
  const rightEditor = createEditorController({
    textarea: elRight,
    gutter: $("rightGutter"),
    highlight: $("rightHL"),
  });

  const comparison = createComparisonState({
    countEl: $("diffCount"),
    prevButton: btnPrev,
    nextButton: btnNext,
    diffView: elDiffView,
  });

  let compareLock = false;
  const showToast = createToast(elToast, { showClass: "toast--show", duration: 3500 });
  /** @type {any[]} */
  let textHistoryRecords = [];
  let isDiffMode = false;
  let viewMode = "side"; // 'side' | 'inline'
  let isDirtyAfterDiff = false;
  // 卸载时在 _cleanup 里直接传给 removeEventListener（可能仍为 null），故用 any
  /** @type {any} */
  let onDocClickCloseMore = null;

  /** @param {string} text @param {string} [tone] */
  function setStatus(text, tone = "muted") {
    elStatus.textContent = text;
    elStatus.style.color = tone === "danger" ? "rgba(255,59,48,.88)" : "";
  }

  /** @param {string} mode */
  function setStage(mode) {
    isDiffMode = mode === "diff";
    stageEditor.hidden = isDiffMode;
    stageResult.hidden = !isDiffMode;
    btnBackToEdit.hidden = !isDiffMode;

    if (isDiffMode) {
      btnCompare.textContent = "重新比对";
    } else {
      btnCompare.textContent = "开始比对";
    }
  }

  /** @param {boolean} stale */
  function markDiffStale(stale) {
    isDirtyAfterDiff = stale;
    diffStaleBanner.hidden = !stale;
  }

  function openDrawer() {
    historyDrawer.hidden = false;
    historyDrawerBackdrop.hidden = false;
    loadTextHistory();
  }

  function closeDrawer() {
    historyDrawer.hidden = true;
    historyDrawerBackdrop.hidden = true;
  }

  /** @param {string[]} [messages] */
  function renderCompareHints(messages = []) {
    if (!messages.length) {
      elCompareHints.hidden = true;
      elCompareHints.innerHTML = "";
      return;
    }
    elCompareHints.hidden = false;
    elCompareHints.innerHTML = messages.map((msg) => `<span class="compare-hint">${escapeHtml(msg)}</span>`).join("");
  }

  function resetChangedEditors() {
    leftEditor.setChangedLines([]);
    rightEditor.setChangedLines([]);
  }

  function resetBothEditorScrolls() {
    leftEditor.resetScroll();
    rightEditor.resetScroll();
  }

  function rememberEditorValues() {
    leftEditor.rememberValue();
    rightEditor.rememberValue();
  }

  function resetDirtyComparison({ clearResult = false } = {}) {
    comparison.reset({ clearResult });
    resetChangedEditors();
    renderCompareHints();
    statModCount.textContent = "0";
    statAddCount.textContent = "0";
    statDelCount.textContent = "0";
    statNavIndex.textContent = "第 0 / 0 处";
  }

  function updateNavIndexDisplay() {
    const total = comparison.nav.anchors.length;
    const current = total > 0 ? comparison.nav.activeIndex + 1 : 0;
    statNavIndex.textContent = `第 ${current} / ${total} 处`;
  }

  /** @param {{ leftLine?: number | null, rightLine?: number | null } | null | undefined} meta */
  function locateFromMeta(meta) {
    const leftLine = meta?.leftLine ?? null;
    const rightLine = meta?.rightLine ?? null;
    const actualLeft = leftLine ? leftEditor.scrollToLine(leftLine) : null;
    const actualRight = rightLine ? rightEditor.scrollToLine(rightLine) : null;
    if (actualLeft) leftEditor.flashLine(actualLeft);
    if (actualRight) rightEditor.flashLine(actualRight);
    return { leftLine, rightLine, actualLeft, actualRight };
  }

  /** @param {number} index */
  function goto(index) {
    if (comparison.nav.anchors.length === 0) return;
    const clamped = Math.max(0, Math.min(comparison.nav.anchors.length - 1, index));
    comparison.nav.activeIndex = clamped;
    /** @type {any} */
    const anchor = comparison.nav.anchors[clamped];
    focusAnchor(anchor);
    const located = locateFromMeta(/** @type {Record<string, any>} */ (comparison.anchorMeta)[anchor]);
    updateNavIndexDisplay();
    setStatus(`定位差异 ${clamped + 1}/${comparison.nav.anchors.length} · ${buildLocateStatus({
      expectedLeft: located.leftLine,
      expectedRight: located.rightLine,
      actualLeft: located.actualLeft,
      actualRight: located.actualRight,
    }).replace(/^已定位：/, "")}`);
  }

  function onCleanBlankLines() {
    elLeft.value = removeBlankLines(elLeft.value);
    elRight.value = removeBlankLines(elRight.value);
    resetBothEditorScrolls();
    rememberEditorValues();
    setStatus("已清空空行（两侧）。");
    resetDirtyComparison();
    markDiffStale(true);
    leftEditor.scheduleRender();
    rightEditor.scheduleRender();
  }

  function onSwap() {
    const tmp = elLeft.value;
    elLeft.value = elRight.value;
    elRight.value = tmp;
    resetBothEditorScrolls();
    rememberEditorValues();
    setStatus("已交换文本。");
    resetDirtyComparison();
    markDiffStale(true);
    leftEditor.scheduleRender();
    rightEditor.scheduleRender();
  }

  function onClear() {
    const hasContent = elLeft.value.trim() || elRight.value.trim();
    if (hasContent && !window.confirm("确定要清空两侧文本吗？")) return;
    elLeft.value = "";
    elRight.value = "";
    resetBothEditorScrolls();
    rememberEditorValues();
    setStatus("已清空。");
    resetDirtyComparison({ clearResult: true });
    setStage("edit");
    markDiffStale(false);
    leftEditor.scheduleRender();
    rightEditor.scheduleRender();
  }

  async function onCopyResult() {
    if (!comparison.latestCompareLines) {
      showToast("还没有可复制的比对结果，请先比对。");
      return;
    }

    try {
      const ok = await writeClipboard(summarizeDiffLines(comparison.latestCompareLines));
      showToast(ok ? "差异摘要已复制到剪贴板。" : "复制失败，请手动选择复制。");
    } catch (err) {
      console.error("[copy] failed:", err);
      showToast("复制失败，请重试。");
    }
  }

  /** @param {{ leftText: string, rightText: string, result: ReturnType<typeof diffLines> }} params */
  async function saveComparisonHistory({ leftText, rightText, result }) {
    if (!isTextHistoryAvailable()) return;
    try {
      await saveTextHistoryRecord(createTextHistoryRecord({ leftText, rightText, result }));
      await loadTextHistory({ silent: true });
    } catch (err) {
      if (err.message === "HISTORY_QUOTA_EXCEEDED") {
        showToast("存储空间不足，历史记录保存失败，请清理一些历史记录。");
      } else {
        console.warn("[text-history] save failed:", err);
        showToast("比对完成了，但历史记录保存失败。");
      }
    }
  }

  async function loadTextHistory({ silent = false } = {}) {
    if (!isTextHistoryAvailable()) {
      textHistoryRecords = [];
      elTextHistoryMeta.textContent = "当前浏览器不支持文本比对历史。";
      renderTextHistory();
      return;
    }
    try {
      textHistoryRecords = await listTextHistory();
      renderTextHistory();
    } catch (err) {
      console.warn("[text-history] load failed:", err);
      textHistoryRecords = [];
      renderTextHistory();
      if (!silent) showToast("文本比对历史读取失败。");
    }
  }

  /** @param {string} id */
  function restoreTextHistory(id) {
    const record = textHistoryRecords.find((item) => item.id === id);
    if (!record) return;
    elLeft.value = record.leftText || "";
    elRight.value = record.rightText || "";
    resetBothEditorScrolls();
    rememberEditorValues();
    resetDirtyComparison({ clearResult: true });
    leftEditor.scheduleRender();
    rightEditor.scheduleRender();
    closeDrawer();
    setStage("edit");
    markDiffStale(false);
    setStatus("已恢复历史文本，可继续修改或重新比对。");
    showToast("历史文本已恢复。");
  }

  /** @param {string} id */
  async function copyTextHistorySummary(id) {
    const record = textHistoryRecords.find((item) => item.id === id);
    if (!record) return;
    const ok = await writeClipboard(record.summary || "暂无摘要。");
    showToast(ok ? "历史摘要已复制。" : "复制失败了，请手动选择文本复制。");
  }

  /** @param {string} id */
  async function removeTextHistory(id) {
    const ok = window.confirm("确定删除这条文本比对历史吗？这只会删除当前浏览器本地保存的记录。");
    if (!ok) return;
    await deleteTextHistoryRecord(id);
    await loadTextHistory({ silent: true });
    showToast("已删除这条历史记录。");
  }

  async function removeAllTextHistory() {
    if (!textHistoryRecords.length) return;
    const ok = window.confirm("确定清空文本比对历史吗？这只会删除当前浏览器本地保存的记录。");
    if (!ok) return;
    await clearTextHistory();
    await loadTextHistory({ silent: true });
    showToast("文本比对历史已清空。");
  }

  function renderTextHistory() {
    const usage = getTextHistoryUsage(textHistoryRecords);
    elTextHistoryMeta.textContent = textHistoryRecords.length
      ? `已保存 ${textHistoryRecords.length}/${TEXT_HISTORY_LIMIT} 条，占用 ${formatBytes(usage)}。仅当前设备浏览器可见。`
      : "保存两侧文本和比对摘要，仅当前设备浏览器可见。";
    btnClearTextHistory.disabled = textHistoryRecords.length === 0;
    btnExportTextHistory.disabled = textHistoryRecords.length === 0;

    if (!textHistoryRecords.length) {
      elTextHistoryList.innerHTML = `<div class="diff-empty">比对完成后会自动保存到这里。</div>`;
      return;
    }

    elTextHistoryList.innerHTML = textHistoryRecords
      .map((record) => {
        const created = new Date(record.createdAt).toLocaleString("zh-CN", {
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        });
        return `
          <article class="text-history-row" data-history-id="${record.id}">
            <div class="text-history-row__main">
              <div class="text-history-row__title">${escapeHtml(created)} · 差异 ${record.diffCount}</div>
              <div class="text-history-row__meta">内容差异 ${record.contentDiffCount} · 排版差异 ${record.formatDiffCount} · 原文 ${record.leftChars} 字 · 对比 ${record.rightChars} 字</div>
              <div class="text-history-row__summary">${escapeHtml(record.summary || "")}</div>
            </div>
            <div class="text-history-row__actions">
              <button class="history-link-btn" type="button" data-text-history-restore="${record.id}">恢复</button>
              <button class="history-link-btn" type="button" data-text-history-copy="${record.id}">复制摘要</button>
              <button class="history-link-btn history-link-btn--danger" type="button" data-text-history-delete="${record.id}">删除</button>
            </div>
          </article>
        `;
      })
      .join("");
  }

  async function onCompare() {
    if (compareLock) return;
    compareLock = true;
    btnCompare.disabled = true;

    try {
      let leftRaw = elLeft.value ?? "";
      let rightRaw = elRight.value ?? "";

      if (leftRaw.trim() === "" && rightRaw.trim() === "") {
        setStatus("请在两侧输入文本后再比对。", "danger");
        resetDirtyComparison();
        return;
      }

      resetBothEditorScrolls();
      setStatus("正在比对…");

      const hints = collectComparisonHints({
        leftText: leftRaw,
        rightText: rightRaw,
      });

      // 忽略空白比对选项（不直接改写用户输入）
      let leftToDiff = normalizeNewlines(leftRaw);
      let rightToDiff = normalizeNewlines(rightRaw);
      if (chkIgnoreWhitespace.checked) {
        leftToDiff = leftToDiff.split("\n").map((s) => s.trimEnd()).join("\n");
        rightToDiff = rightToDiff.split("\n").map((s) => s.trimEnd()).join("\n");
      }

      const result = diffLines(leftToDiff, rightToDiff);

      // 精确统计修改、新增、删除（三口径独立，不重叠计入）
      let modCount = 0;
      let addCount = 0;
      let delCount = 0;
      for (const line of result.lines) {
        if (line.op === "replace") modCount++;
        else if (line.op === "insert") addCount++;
        else if (line.op === "delete") delCount++;
      }
      statModCount.textContent = String(modCount);
      statAddCount.textContent = String(addCount);
      statDelCount.textContent = String(delCount);

      const rendered = renderDiff(elDiffView, result);
      comparison.setRenderedResult({
        anchors: rendered.anchors,
        meta: rendered.anchorMeta,
        lines: result.lines,
        diffCount: result.diffCount,
      });

      await saveComparisonHistory({ leftText: leftRaw, rightText: rightRaw, result });
      renderCompareHints(hints.messages);

      setStage("diff");
      markDiffStale(false);
      updateNavIndexDisplay();

      if (result.diffCount === 0) {
        setStatus("两侧内容一致：未发现差异。");
      } else {
        goto(0);
        setStatus(`比对完成：修改 ${modCount} · 新增 ${addCount} · 删除 ${delCount}。`);
      }
    } catch (err) {
      console.error("[compare] failed:", err);
      const msg = err instanceof Error ? err.message : String(err);
      setStatus(`比对失败：${msg}`, "danger");
    } finally {
      btnCompare.disabled = false;
      compareLock = false;
    }
  }

  /**
   * @param {HTMLInputElement} inputEl
   * @param {HTMLTextAreaElement} targetTextarea
   * @param {ReturnType<typeof createEditorController>} editorController
   */
  function handleFileInput(inputEl, targetTextarea, editorController) {
    const file = inputEl.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (/** @type {ProgressEvent<FileReader>} */ e) => {
      targetTextarea.value = String(e.target?.result || "");
      editorController.rememberValue();
      editorController.resetScroll();
      editorController.scheduleRender();
      markDiffStale(true);
      setStatus(`已导入文件：${file.name}`);
    };
    reader.readAsText(file);
    inputEl.value = "";
  }

  function loadDemoData() {
    elLeft.value = DEMO_LEFT;
    elRight.value = DEMO_RIGHT;
    rememberEditorValues();
    resetBothEditorScrolls();
    leftEditor.scheduleRender();
    rightEditor.scheduleRender();
    resetDirtyComparison({ clearResult: true });
    setStage("edit");
    markDiffStale(false);
    setStatus("已填入「需求变更示例」：可直接点击「开始比对」。");
  }

  function bindToolbar() {
    btnCompare.addEventListener("click", onCompare);
    btnBackToEdit.addEventListener("click", () => setStage("edit"));
    btnClean.addEventListener("click", () => {
      moreDropdownMenu.hidden = true;
      onCleanBlankLines();
    });
    btnSwap.addEventListener("click", () => {
      moreDropdownMenu.hidden = true;
      onSwap();
    });
    btnClear.addEventListener("click", () => {
      moreDropdownMenu.hidden = true;
      onClear();
    });
    btnLoadDemo.addEventListener("click", () => {
      moreDropdownMenu.hidden = true;
      loadDemoData();
    });
    btnCopy.addEventListener("click", onCopyResult);
    btnPrev.addEventListener("click", () => goto(comparison.nav.activeIndex - 1));
    btnNext.addEventListener("click", () => goto(comparison.nav.activeIndex + 1));

    // 更多下拉菜单
    onDocClickCloseMore = () => {
      moreDropdownMenu.hidden = true;
    };
    btnMoreToggle.addEventListener("click", (/** @type {MouseEvent} */ e) => {
      e.stopPropagation();
      moreDropdownMenu.hidden = !moreDropdownMenu.hidden;
    });
    document.addEventListener("click", onDocClickCloseMore);

    // 左右对照 vs 逐条查看
    tabViewSide.addEventListener("click", () => {
      tabViewSide.classList.add("diff-tab-btn--active");
      tabViewSide.setAttribute("aria-selected", "true");
      tabViewInline.classList.remove("diff-tab-btn--active");
      tabViewInline.setAttribute("aria-selected", "false");
      elDiffView.classList.remove("diff-view--inline");
      viewMode = "side";
    });
    tabViewInline.addEventListener("click", () => {
      tabViewInline.classList.add("diff-tab-btn--active");
      tabViewInline.setAttribute("aria-selected", "true");
      tabViewSide.classList.remove("diff-tab-btn--active");
      tabViewSide.setAttribute("aria-selected", "false");
      elDiffView.classList.add("diff-view--inline");
      viewMode = "inline";
    });

    // 文件导入与单侧清空
    fileInputLeft.addEventListener("change", () => handleFileInput(fileInputLeft, elLeft, leftEditor));
    fileInputRight.addEventListener("change", () => handleFileInput(fileInputRight, elRight, rightEditor));
    btnClearLeft.addEventListener("click", () => {
      elLeft.value = "";
      leftEditor.scheduleRender();
      markDiffStale(true);
    });
    btnClearRight.addEventListener("click", () => {
      elRight.value = "";
      rightEditor.scheduleRender();
      markDiffStale(true);
    });

    // 快捷键 ⌘/Ctrl + Enter
    mount.addEventListener("keydown", (/** @type {KeyboardEvent} */ ev) => {
      if ((ev.ctrlKey || ev.metaKey) && ev.key === "Enter") {
        ev.preventDefault();
        onCompare();
      }
    });

    // 抽屉开关
    btnOpenHistory.addEventListener("click", openDrawer);
    btnCloseHistoryDrawer.addEventListener("click", closeDrawer);
    historyDrawerBackdrop.addEventListener("click", closeDrawer);

    btnRefreshTextHistory.addEventListener("click", () => loadTextHistory());
    btnExportTextHistory.addEventListener("click", async () => {
      if (!textHistoryRecords.length) { showToast("没有可导出的历史记录。"); return; }
      try {
        await exportTextHistory(textHistoryRecords);
        showToast("文本比对历史已导出。");
      } catch (err) {
        console.error("[text-history] export failed:", err);
        showToast("导出失败，请稍后再试。");
      }
    });
    btnClearTextHistory.addEventListener("click", removeAllTextHistory);
  }

  /** @type {ReturnType<typeof setTimeout> | null} */
  let inputDebounceTimer = null;
  function bindEditorInputs() {
    function onInputChanged() {
      if (inputDebounceTimer) clearTimeout(inputDebounceTimer);
      inputDebounceTimer = setTimeout(() => {
        inputDebounceTimer = null;
        if (comparison.latestCompareLines) {
          markDiffStale(true);
        }
      }, 100);
    }
    elLeft.addEventListener("input", () => {
      leftEditor.handleInput({ onDirty: onInputChanged });
    });
    elRight.addEventListener("input", () => {
      rightEditor.handleInput({ onDirty: onInputChanged });
    });
  }

  function bindEditorScroll() {
    let lock = false;
    /** @param {ReturnType<typeof createEditorController>} from @param {ReturnType<typeof createEditorController>} to */
    function sync(from, to) {
      if (lock) return;
      lock = true;
      try {
        syncEditorPairScroll(from, to);
      } finally {
        lock = false;
      }
    }
    elLeft.addEventListener("scroll", () => sync(leftEditor, rightEditor), { passive: true });
    elRight.addEventListener("scroll", () => sync(rightEditor, leftEditor), { passive: true });
  }

  function bindDiffClickLocate() {
    elDiffView.addEventListener("click", (/** @type {MouseEvent} */ ev) => {
      const target = /** @type {HTMLElement} */ (ev.target);
      const tr = target?.closest?.("tr.diff-row");
      if (!(tr instanceof HTMLElement)) return;
      const leftLine = Number(tr.dataset.leftLine || "0") || null;
      const rightLine = Number(tr.dataset.rightLine || "0") || null;
      const located = locateFromMeta({ leftLine, rightLine });
      setStatus(buildLocateStatus({
        expectedLeft: located?.leftLine ?? leftLine,
        expectedRight: located?.rightLine ?? rightLine,
        actualLeft: located?.actualLeft ?? leftLine,
        actualRight: located?.actualRight ?? rightLine,
      }));
    });
  }

  function bindTextHistory() {
    elTextHistoryList.addEventListener("click", (/** @type {MouseEvent} */ ev) => {
      const target = /** @type {HTMLElement} */ (ev.target);
      if (!(target instanceof HTMLElement)) return;
      const restoreId = target.getAttribute("data-text-history-restore");
      const copyId = target.getAttribute("data-text-history-copy");
      const deleteId = target.getAttribute("data-text-history-delete");
      if (restoreId) restoreTextHistory(restoreId);
      if (copyId) copyTextHistorySummary(copyId);
      if (deleteId) removeTextHistory(deleteId);
    });
  }

  comparison.reset();
  bindToolbar();
  bindEditorInputs();
  bindEditorScroll();
  bindDiffClickLocate();
  bindTextHistory();

  // 检查是否有外部跳转要求恢复的历史记录
  const pendingRestoreId = sessionStorage.getItem("toolmap_restore_text_diff");
  if (pendingRestoreId) {
    sessionStorage.removeItem("toolmap_restore_text_diff");
    listTextHistory().then((recs) => {
      textHistoryRecords = recs;
      restoreTextHistory(pendingRestoreId);
    }).catch(() => {});
  }

  mount._cleanup = () => {
    document.removeEventListener("click", onDocClickCloseMore);
    if (inputDebounceTimer) {
      clearTimeout(inputDebounceTimer);
      inputDebounceTimer = null;
    }
    leftEditor?.destroy?.();
    rightEditor?.destroy?.();
    comparison?.reset?.();
  };
  currentTextDiffCleanup = mount._cleanup;
}

/** @type {(() => void) | null} */
let currentTextDiffCleanup = null;

export function unmountTextDiffTool() {
  if (typeof currentTextDiffCleanup === "function") {
    currentTextDiffCleanup();
    currentTextDiffCleanup = null;
  }
}
export { unmountTextDiffTool as unmount };
