import { normalizeNewlines } from "./sanitize.js";

/** @param {HTMLElement} el */
function maxScrollTop(el) {
  return Math.max(1, el.scrollHeight - el.clientHeight);
}

/**
 * @param {unknown} text
 * @param {number} lineNumber
 * @returns {number}
 */
function findCharIndexOfLine(text, lineNumber) {
  if (!lineNumber || lineNumber <= 1) return 0;
  const t = String(text ?? "");
  let line = 1;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (ch === "\n") {
      line++;
      if (line === lineNumber) return i + 1;
      continue;
    }
    if (ch === "\r") {
      const nextIsLF = t[i + 1] === "\n";
      const nextIndex = nextIsLF ? i + 2 : i + 1;
      line++;
      if (line === lineNumber) return nextIndex;
      if (nextIsLF) i++;
    }
  }
  return t.length;
}

/**
 * @param {HTMLTextAreaElement} textarea
 * @returns {number}
 */
function getCaretLineNumber(textarea) {
  const t = String(textarea.value ?? "");
  const idx = Math.max(0, Math.min(textarea.selectionStart ?? 0, t.length));
  let line = 1;
  for (let i = 0; i < idx; i++) {
    const ch = t[i];
    if (ch === "\n") {
      line++;
    } else if (ch === "\r") {
      line++;
      if (t[i + 1] === "\n") i++;
    }
  }
  return line;
}

/**
 * @param {HTMLTextAreaElement} textarea
 * @returns {string[]}
 */
function toDisplayLines(textarea) {
  const text = normalizeNewlines(textarea.value ?? "");
  const lines = text.split("\n");
  if (lines.length > 1 && lines[lines.length - 1] === "" && text.endsWith("\n")) lines.pop();
  return lines.length === 0 ? [""] : lines;
}

/**
 * @param {unknown} previous
 * @param {unknown} next
 * @returns {boolean}
 */
function shouldResetHorizontalScroll(previous, next) {
  return Math.abs(String(next ?? "").length - String(previous ?? "").length) > 1;
}

/**
 * @param {{ textarea: HTMLTextAreaElement, gutter: HTMLElement, highlight: HTMLElement }} params
 */
export function createEditorController({ textarea, gutter, highlight }) {
  /** @type {Set<number>} */
  let changedSet = new Set();
  /** @type {number|null} */
  let focusLine = null;
  let overlayRAF = 0;
  let overlayTimer = 0;
  let lastValue = textarea.value ?? "";

  function syncOverlayScroll() {
    const ratio = textarea.scrollTop / maxScrollTop(textarea);
    const gMax = Math.max(0, gutter.scrollHeight - gutter.clientHeight);
    const hMax = Math.max(0, highlight.scrollHeight - highlight.clientHeight);
    gutter.scrollTop = ratio * gMax;
    highlight.scrollTop = ratio * hMax;
  }

  function clearFocus() {
    gutter.querySelector(".editor__gline--focus")?.classList.remove("editor__gline--focus");
    highlight.querySelector(".editor__line--focus")?.classList.remove("editor__line--focus");
  }

  /** @param {number|null|undefined} [lineNumber] */
  function applyFocus(lineNumber = focusLine) {
    clearFocus();
    if (!lineNumber || lineNumber < 1) return;
    const g = gutter.children?.[lineNumber - 1];
    const h = highlight.children?.[lineNumber - 1];
    if (g) g.classList.add("editor__gline--focus");
    if (h) h.classList.add("editor__line--focus");
  }

  function renderOverlay() {
    const lines = toDisplayLines(textarea);
    let gutterHtml = "";
    let hlHtml = "";

    for (let i = 0; i < lines.length; i++) {
      const ln = i + 1;
      const isChanged = changedSet.has(ln);
      const gCls = isChanged ? "editor__gline editor__gline--changed" : "editor__gline";
      const lCls = isChanged ? "editor__line editor__line--changed" : "editor__line";
      gutterHtml += `<div class="${gCls}">${ln}</div>`;
      hlHtml += `<div class="${lCls}"> </div>`;
    }

    gutter.innerHTML = gutterHtml;
    highlight.innerHTML = hlHtml;
    syncOverlayScroll();
    applyFocus();
  }

  /** @param {{ debounce?: boolean }} [options] */
  function scheduleRender({ debounce = false } = {}) {
    window.clearTimeout(overlayTimer);
    if (overlayRAF) cancelAnimationFrame(overlayRAF);
    const run = () => {
      overlayRAF = requestAnimationFrame(() => {
        try {
          renderOverlay();
        } catch (e) {
          console.warn("[editor] overlay render failed:", e);
        }
      });
    };
    if (debounce) overlayTimer = window.setTimeout(run, 60);
    else run();
  }

  /** @param {Iterable<number>} lines */
  function setChangedLines(lines) {
    changedSet = new Set(lines);
    scheduleRender();
  }

  function resetScroll() {
    textarea.scrollLeft = 0;
    textarea.scrollTop = 0;
    syncOverlayScroll();
  }

  function rememberValue() {
    lastValue = textarea.value ?? "";
  }

  /** @param {{ onDirty?: () => void }} params */
  function handleInput({ onDirty }) {
    const next = textarea.value ?? "";
    const shouldResetScroll = shouldResetHorizontalScroll(lastValue, next);
    lastValue = next;
    onDirty?.();
    scheduleRender({ debounce: true });
    if (shouldResetScroll) requestAnimationFrame(resetScroll);
  }

  /**
   * @param {number} lineNumber
   * @returns {number|null}
   */
  function scrollToLine(lineNumber) {
    if (!lineNumber || lineNumber < 1) return null;
    const idx = findCharIndexOfLine(textarea.value ?? "", lineNumber);
    textarea.focus();
    textarea.setSelectionRange(idx, idx);
    const actual = getCaretLineNumber(textarea);
    focusLine = actual;
    applyFocus(actual);
    requestAnimationFrame(syncOverlayScroll);
    return actual;
  }

  /** @param {number|null|undefined} lineNumber */
  function flashLine(lineNumber) {
    focusLine = lineNumber ?? null;
    applyFocus(focusLine);
    window.setTimeout(() => {
      focusLine = null;
      clearFocus();
    }, 750);
  }

  function destroy() {
    if (overlayRAF) {
      cancelAnimationFrame(overlayRAF);
      overlayRAF = 0;
    }
    if (overlayTimer) {
      clearTimeout(overlayTimer);
      overlayTimer = 0;
    }
  }

  return {
    textarea,
    gutter,
    highlight,
    setChangedLines,
    resetScroll,
    rememberValue,
    handleInput,
    scrollToLine,
    flashLine,
    scheduleRender,
    syncOverlayScroll,
    destroy,
  };
}

/**
 * @param {{ textarea: HTMLTextAreaElement, syncOverlayScroll: () => void }} from
 * @param {{ textarea: HTMLTextAreaElement, syncOverlayScroll: () => void }} to
 */
export function syncEditorPairScroll(from, to) {
  const ratio = from.textarea.scrollTop / maxScrollTop(from.textarea);
  to.textarea.scrollTop = ratio * (to.textarea.scrollHeight - to.textarea.clientHeight);
  to.textarea.scrollLeft = from.textarea.scrollLeft;
  from.syncOverlayScroll();
  to.syncOverlayScroll();
}
