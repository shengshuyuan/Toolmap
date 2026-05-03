import { debugLog } from "../../debug.js";
import { removeBlankLines, normalizeNewlines } from "./sanitize.js";
import { diffLines } from "./diff.js";
import { renderDiff, focusAnchor } from "./render.js";
import { summarizeDiffLines } from "./summary.js";
import { writeClipboard } from "./clipboard.js";
import { createEditorController, syncEditorPairScroll } from "./editor.js";
import { createComparisonState } from "./state.js";
import { buildLocateStatus, collectComparisonHints, shouldWarnLineMismatch } from "./diagnostics.js";
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

export function getTextDiffTemplate() {
  return `
  <div class="text-diff-tool panel panel--enter" aria-labelledby="diff-title">
    <div class="panel__head">
      <h2 id="diff-title" class="panel__title">在线文本差异比对</h2>
      <div class="panel__hint">提示：先点「一键清空空行」，再点「开始比对」，效果更好哦。</div>
    </div>

    <div class="capability-strip" aria-label="文本比对能力">
      <span class="capability-pill">中文比对</span>
      <span class="capability-pill">英文比对</span>
      <span class="capability-pill">代码比对</span>
      <span class="capability-pill">大文本粘贴</span>
      <span class="capability-pill capability-pill--safe">本地处理</span>
    </div>

    <div class="workspace">
      <div class="workspace__col">
        <div class="field">
          <div class="field__label-row">
            <label class="field__label" for="leftText">原文本</label>
            <div class="field__sub">Original</div>
          </div>
          <div class="editor" aria-label="原文本编辑器">
            <div id="leftGutter" class="editor__gutter" aria-hidden="true"></div>
            <div class="editor__content">
              <div id="leftHL" class="editor__hl" aria-hidden="true"></div>
              <textarea
                id="leftText"
                class="textarea textarea--overlay"
                wrap="off"
                spellcheck="false"
                placeholder="把原文本粘贴到这里…"
              ></textarea>
            </div>
          </div>
        </div>
      </div>

      <div class="workspace__col">
        <div class="field">
          <div class="field__label-row">
            <label class="field__label" for="rightText">对比文本</label>
            <div class="field__sub">Changed</div>
          </div>
          <div class="editor" aria-label="对比文本编辑器">
            <div id="rightGutter" class="editor__gutter" aria-hidden="true"></div>
            <div class="editor__content">
              <div id="rightHL" class="editor__hl" aria-hidden="true"></div>
              <textarea
                id="rightText"
                class="textarea textarea--overlay"
                wrap="off"
                spellcheck="false"
                placeholder="把需要比对的文本粘贴到这里…"
              ></textarea>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="toolbar" role="group" aria-label="文本比对工具条">
      <div class="toolbar__group toolbar__group--primary">
        <button id="btnCompare" class="btn btn--primary" type="button">
          <span class="btn__icon" aria-hidden="true">◎</span>
          开始比对
        </button>
      </div>

      <div class="toolbar__group">
        <button id="btnPrev" class="btn" type="button" disabled>
          <span class="btn__icon" aria-hidden="true">↑</span>
          上一处
        </button>
        <button id="btnNext" class="btn" type="button" disabled>
          <span class="btn__icon" aria-hidden="true">↓</span>
          下一处
        </button>
      </div>

      <div class="toolbar__group toolbar__group--tools">
        <button id="btnClean" class="btn" type="button">
          <span class="btn__icon" aria-hidden="true">⎚</span>
          清空空行
        </button>
        <button id="btnClear" class="btn" type="button">
          <span class="btn__icon" aria-hidden="true">⌫</span>
          清空文本
        </button>
        <button id="btnSwap" class="btn" type="button">
          <span class="btn__icon" aria-hidden="true">⇄</span>
          交换文本
        </button>
      </div>

      <div class="toolbar__group toolbar__group--result">
        <button id="btnCopy" class="btn" type="button">
          <span class="btn__icon" aria-hidden="true">▣</span>
          复制结果
        </button>
      </div>
    </div>

    <div id="toast" class="toast" role="status" aria-live="polite"></div>

    <div class="status-row" aria-live="polite">
      <div id="statusText" class="status-text">准备就绪。</div>
      <div class="status-right">
        <div id="diffCount" class="count-pill" title="差异条目数">差异：0</div>
      </div>
    </div>
    <div id="compareHints" class="compare-hints" hidden></div>

    <div class="result">
      <div class="result__head">
        <div class="result__title">比对结果</div>
        <div class="result__sub">橙色为内容差异，蓝色为排版差异（空格/空行）。</div>
      </div>
      <div id="diffView" class="diff-view" role="region" aria-label="差异结果区">
        <div class="diff-empty">还没有结果。点击上方「开始比对」。</div>
      </div>
    </div>

    <section class="text-history" aria-label="文本比对历史记录">
      <div class="text-history__head">
        <div>
          <div class="text-history__title">历史记录</div>
          <div id="textHistoryMeta" class="text-history__sub">保存两侧文本和比对摘要，仅当前浏览器本地可见。</div>
        </div>
        <div class="text-history__actions">
          <button id="btnRefreshTextHistory" class="history-mini-btn" type="button">刷新</button>
          <button id="btnClearTextHistory" class="history-mini-btn history-mini-btn--danger" type="button" disabled>清空历史</button>
        </div>
      </div>
      <div id="textHistoryList" class="text-history__list">
        <div class="diff-empty">比对完成后会自动保存到这里。</div>
      </div>
    </section>
  </div>
`;
}

function getRequiredElement(root, id) {
  const el = root.querySelector(`#${id}`);
  if (!el) throw new Error(`文本比对工具缺少节点：#${id}`);
  return el;
}

function normalizeForDiff(text) {
  return normalizeNewlines(text);
}

function computeChangedLineSets(lines) {
  const leftChanged = new Set();
  const rightChanged = new Set();
  let l = 0;
  let r = 0;

  for (const row of lines) {
    if (row.op === "equal") {
      l++;
      r++;
      continue;
    }
    if (row.op === "delete") {
      l++;
      leftChanged.add(l);
      continue;
    }
    if (row.op === "insert") {
      r++;
      rightChanged.add(r);
      continue;
    }
    l++;
    r++;
    leftChanged.add(l);
    rightChanged.add(r);
  }
  return { leftChanged, rightChanged };
}

export function mountTextDiffTool(mount) {
  if (!(mount instanceof HTMLElement)) return;
  mount.innerHTML = getTextDiffTemplate();

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
  const btnClearTextHistory = /** @type {HTMLButtonElement} */ ($("btnClearTextHistory"));
  const elTextHistoryMeta = $("textHistoryMeta");
  const elTextHistoryList = $("textHistoryList");

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
  let toastTimer = 0;
  let textHistoryRecords = [];

  function setStatus(text, tone = "muted") {
    elStatus.textContent = text;
    elStatus.style.color = tone === "danger" ? "rgba(255,59,48,.88)" : "";
  }

  function showToast(text) {
    window.clearTimeout(toastTimer);
    elToast.textContent = text;
    elToast.classList.add("toast--show");
    toastTimer = window.setTimeout(() => {
      elToast.classList.remove("toast--show");
    }, 3500);
  }

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
  }

  function locateFromMeta(meta) {
    const leftLine = meta?.leftLine ?? null;
    const rightLine = meta?.rightLine ?? null;
    const actualLeft = leftLine ? leftEditor.scrollToLine(leftLine) : null;
    const actualRight = rightLine ? rightEditor.scrollToLine(rightLine) : null;
    if (actualLeft) leftEditor.flashLine(actualLeft);
    if (actualRight) rightEditor.flashLine(actualRight);
    if (
      shouldWarnLineMismatch({
        expectedLeft: leftLine,
        expectedRight: rightLine,
        actualLeft,
        actualRight,
      })
    ) {
      debugLog("text-diff", "line mismatch auto-corrected", {
        expectedLeft: leftLine,
        expectedRight: rightLine,
        actualLeft,
        actualRight,
      });
    }
    return { leftLine, rightLine, actualLeft, actualRight };
  }

  function goto(index) {
    if (comparison.nav.anchors.length === 0) return;
    const clamped = Math.max(0, Math.min(comparison.nav.anchors.length - 1, index));
    comparison.nav.activeIndex = clamped;
    const anchor = comparison.nav.anchors[clamped];
    focusAnchor(anchor);
    const located = locateFromMeta(comparison.anchorMeta[anchor]);
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
    leftEditor.scheduleRender();
    rightEditor.scheduleRender();
  }

  function onClear() {
    elLeft.value = "";
    elRight.value = "";
    resetBothEditorScrolls();
    rememberEditorValues();
    setStatus("已清空。");
    resetDirtyComparison({ clearResult: true });
    leftEditor.scheduleRender();
    rightEditor.scheduleRender();
  }

  async function onCopyResult() {
    if (!comparison.latestCompareLines) {
      showToast("你好像还没比对呢，比对后再试试吧！");
      return;
    }

    try {
      await writeClipboard(summarizeDiffLines(comparison.latestCompareLines));
      showToast("复制完成了，粘贴看看吧");
    } catch (err) {
      console.error("[copy] failed:", err);
      showToast("复制失败了，请稍后再试。");
    }
  }

  async function saveComparisonHistory({ leftText, rightText, result }) {
    if (!isTextHistoryAvailable()) return;
    try {
      await saveTextHistoryRecord(createTextHistoryRecord({ leftText, rightText, result }));
      await loadTextHistory({ silent: true });
    } catch (err) {
      console.warn("[text-history] save failed:", err);
      showToast("比对完成了，但历史记录保存失败。");
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
    setStatus("已恢复历史文本，可继续修改或重新比对。");
    showToast("历史文本已恢复。");
  }

  async function copyTextHistorySummary(id) {
    const record = textHistoryRecords.find((item) => item.id === id);
    if (!record) return;
    await writeClipboard(record.summary || "暂无摘要。");
    showToast("历史摘要已复制。");
  }

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
      ? `已保存 ${textHistoryRecords.length}/${TEXT_HISTORY_LIMIT} 条，占用 ${formatBytes(usage)}。仅当前浏览器本地可见。`
      : "保存两侧文本和比对摘要，仅当前浏览器本地可见。";
    btnClearTextHistory.disabled = textHistoryRecords.length === 0;

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
      const leftRaw = elLeft.value ?? "";
      const rightRaw = elRight.value ?? "";

      if (leftRaw.trim() === "" && rightRaw.trim() === "") {
        setStatus("请在两侧输入文本后再比对。", "danger");
        resetDirtyComparison();
        return;
      }

      resetBothEditorScrolls();
      setStatus(leftRaw.trim() === "" || rightRaw.trim() === "" ? "提示：一侧为空时，将显示为“全新增/全删除”。" : "正在比对…");
      const hints = collectComparisonHints({
        leftText: leftRaw,
        rightText: rightRaw,
      });

      const result = diffLines(normalizeForDiff(leftRaw), normalizeForDiff(rightRaw));
      const changed = computeChangedLineSets(result.lines);
      leftEditor.setChangedLines(changed.leftChanged);
      rightEditor.setChangedLines(changed.rightChanged);

      const rendered = renderDiff(elDiffView, result);
      comparison.setRenderedResult({
        anchors: rendered.anchors,
        meta: rendered.anchorMeta,
        lines: result.lines,
        diffCount: result.diffCount,
      });
      await saveComparisonHistory({ leftText: leftRaw, rightText: rightRaw, result });
      renderCompareHints(hints.messages);

      if (result.diffCount === 0) {
        setStatus(hints.isLargeTextMode ? "两侧内容一致：差异为 0（大文本模式已完成）。" : "两侧内容一致：差异为 0。");
      } else {
        goto(0);
        setStatus(
          `比对完成：内容差异 ${result.contentDiffCount}，排版差异 ${result.formatDiffCount}${hints.isLargeTextMode ? "，已按大文本模式处理" : ""}。`
        );
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

  function bindToolbar() {
    btnCompare.addEventListener("click", onCompare);
    btnClean.addEventListener("click", onCleanBlankLines);
    btnSwap.addEventListener("click", onSwap);
    btnClear.addEventListener("click", onClear);
    btnCopy.addEventListener("click", onCopyResult);
    btnPrev.addEventListener("click", () => goto(comparison.nav.activeIndex - 1));
    btnNext.addEventListener("click", () => goto(comparison.nav.activeIndex + 1));
    btnRefreshTextHistory.addEventListener("click", () => loadTextHistory());
    btnClearTextHistory.addEventListener("click", removeAllTextHistory);
  }

  function bindEditorInputs() {
    elLeft.addEventListener("input", () => {
      leftEditor.handleInput({ onDirty: () => resetDirtyComparison() });
    });
    elRight.addEventListener("input", () => {
      rightEditor.handleInput({ onDirty: () => resetDirtyComparison() });
    });
  }

  function bindEditorScroll() {
    let lock = false;
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
    elDiffView.addEventListener("click", (ev) => {
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
    elTextHistoryList.addEventListener("click", (ev) => {
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

  function initDemoText() {
    elLeft.value = `第一行
第二行
第三行

第五行（中间故意有空行）`;
    elRight.value = `第一行
第二行（被修改）
第三行
第四行（新增）
第五行（中间故意有空行）`;
    rememberEditorValues();
    resetBothEditorScrolls();
    leftEditor.scheduleRender();
    rightEditor.scheduleRender();
    setStatus("已填入演示文本：可直接点击「开始比对」。");
  }

  comparison.reset();
  bindToolbar();
  bindEditorInputs();
  bindEditorScroll();
  bindDiffClickLocate();
  bindTextHistory();
  initDemoText();
  loadTextHistory({ silent: true });
}

function formatBytes(bytes) {
  const n = Number(bytes) || 0;
  if (n < 1024) return `${n} B`;
  const value = n / 1024;
  if (value < 1024) return `${value >= 10 ? value.toFixed(1) : value.toFixed(2)} KB`;
  const mb = value / 1024;
  return `${mb >= 10 ? mb.toFixed(1) : mb.toFixed(2)} MB`;
}

function escapeHtml(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
