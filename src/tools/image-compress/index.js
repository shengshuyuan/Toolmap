import { compressImageFile } from "./compressor.js";
import { readImageMeta } from "./image-meta.js";
import { buildZip, downloadBlob } from "./download.js";
import { formatBytes, formatPercent, getModeSettings, isSupportedImage, mimeToLabel } from "./utils.js";
import { createToast } from "../../shared/toast.js";
import { exportImageHistory } from "../../shared/history-export.js";
import {
  HISTORY_LIMIT,
  clearHistory,
  createHistoryRecord,
  deleteHistoryRecord,
  getHistoryRecord,
  getHistoryUsage,
  isHistoryAvailable,
  listHistoryMeta,
  saveHistoryRecord,
} from "./history-store.js";
import { escapeHtml, escapeAttr } from "../../shared/escape.js";
import { getImageCompressTemplate } from "./template.js";

export { getImageCompressTemplate };


/**
 * @param {ParentNode} root
 * @param {string} id
 * @returns {HTMLElement}
 */
function $(root, id) {
  const el = root.querySelector(`#${id}`);
  if (!el) throw new Error(`图片压缩工具缺少节点：#${id}`);
  return /** @type {HTMLElement} */ (el);
}

/**
 * @typedef {import("./utils.js").ImageItem} ImageItem
 * @typedef {import("./utils.js").HistoryMeta} HistoryMeta
 * @typedef {import("./utils.js").CompressResult} CompressResult
 */

/** @param {HTMLElement & { _cleanup?: () => void }} mount */
export function mountImageCompressTool(mount) {
  if (!(mount instanceof HTMLElement)) return;
  mount.innerHTML = getImageCompressTemplate();
  /** @param {string} id */
  const find = (id) => $(mount, id);

  const els = {
    drop: find("icDropZone"),
    fileInput: /** @type {HTMLInputElement} */ (find("icFileInput")),
    compress: /** @type {HTMLButtonElement} */ (find("icCompress")),
    downloadAll: /** @type {HTMLButtonElement} */ (find("icDownloadAll")),
    clear: /** @type {HTMLButtonElement} */ (find("icClear")),
    toast: find("icToast"),
    list: find("icList"),
    preview: find("icPreview"),
    previewMeta: find("icPreviewMeta"),
    quality: /** @type {HTMLInputElement} */ (find("icQuality")),
    qualityLabel: find("icQualityLabel"),
    outputFormat: /** @type {HTMLSelectElement} */ (find("icOutputFormat")),
    maxEdge: /** @type {HTMLSelectElement} */ (find("icMaxEdge")),
    modeHint: find("icModeHint"),
    count: find("icCount"),
    before: find("icBefore"),
    after: find("icAfter"),
    saved: find("icSaved"),
    historyMeta: find("icHistoryMeta"),
    historyList: find("icHistoryList"),
    refreshHistory: /** @type {HTMLButtonElement} */ (find("icRefreshHistory")),
    exportHistory: /** @type {HTMLButtonElement} */ (find("icExportHistory")),
    clearHistory: /** @type {HTMLButtonElement} */ (find("icClearHistory")),
  };

  /** @type {ImageItem[]} */
  let items = [];
  /** @type {string | null} */
  let selectedId = null;
  let busy = false;
  let toastTimer = 0;
  let customQuality = false;
  const showToast = createToast(els.toast, { showClass: "image-toast--show", duration: 3200 });
  /** @type {HistoryMeta[]} */
  let historyRecords = [];

  function getSettings() {
    const mode = customQuality ? "custom" : /** @type {HTMLInputElement | null} */ (mount.querySelector('input[name="icMode"]:checked'))?.value || "smart";
    return {
      mode,
      quality: Number(els.quality.value) / 100,
      outputFormat: els.outputFormat.value,
      maxEdge: Number(els.maxEdge.value),
    };
  }

  function updateSettingsState() {
    const settings = getSettings();
    const mode = getModeSettings(settings.mode);
    els.modeHint.textContent = settings.mode === "custom" ? "按你手动选择的质量值压缩。" : mode.hint;
    if (settings.mode !== "custom") {
      els.quality.value = String(Math.round(mode.quality * 100));
    }
    els.qualityLabel.textContent = `${els.quality.value}%`;
    const lossless = settings.mode === "lossless";
    els.outputFormat.disabled = lossless;
    els.quality.disabled = lossless;
  }

  function applyModePreset() {
    const settings = getSettings();
    const mode = getModeSettings(settings.mode);
    if (settings.mode === "custom") return;
    els.quality.value = String(Math.round(mode.quality * 100));
    els.outputFormat.value = mode.outputFormat;
    els.maxEdge.value = String(mode.maxEdge);
    updateSettingsState();
  }

  /** @param {FileList | File[] | null | undefined} fileList */
  async function addFiles(fileList) {
    const incoming = Array.from(fileList || []);
    const supported = incoming.filter(isSupportedImage);
    if (incoming.length && supported.length !== incoming.length) {
      showToast("有些文件不是 JPG、PNG 或 WebP，已经跳过。");
    }
    if (!supported.length) return;

    /** @type {ImageItem[]} */
    const nextItems = [];
    for (const file of supported) {
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const originalUrl = URL.createObjectURL(file);
      /** @type {ImageItem} */
      const item = {
        id,
        file,
        originalUrl,
        result: null,
        status: "ready",
        error: "",
        meta: { width: 0, height: 0 },
      };
      nextItems.push(item);
      readImageMeta(file)
        .then((meta) => {
          item.meta = meta;
          render();
        })
        .catch(() => {
          item.meta = { width: 0, height: 0, error: true };
          render();
        });
    }

    items = [...items, ...nextItems];
    if (!selectedId) selectedId = nextItems[0].id;
    render();
  }

  async function compressAll() {
    if (busy || items.length === 0) return;
    busy = true;
    els.compress.disabled = true;
    const settings = getSettings();
    const total = items.length;
    try {
      for (let idx = 0; idx < items.length; idx++) {
        const item = items[idx];
        els.compress.textContent = `压缩中 ${idx + 1}/${total}`;
        item.status = "processing";
        item.error = "";
        render();
        try {
          if (item.result?.url) URL.revokeObjectURL(item.result.url);
          item.result = await compressImageFile(item.file, settings);
          item.status = "done";
          selectedId = item.id;
          await saveCompressedHistory(item);
        } catch (err) {
          item.status = "error";
          item.error = err instanceof Error ? err.message : "压缩失败";
        }
        render();
      }
      showToast("压缩完成了，可以下载啦。");
    } finally {
      busy = false;
      els.compress.textContent = "开始压缩";
      render();
    }
  }

  async function downloadAll() {
    const done = items.filter((item) => item.result?.blob);
    if (!done.length) {
      showToast("还没有可下载的压缩结果。");
      return;
    }
    const zip = await buildZip(done.map((item) => ({ blob: /** @type {CompressResult} */ (item.result).blob, name: /** @type {CompressResult} */ (item.result).fileName })));
    downloadBlob(zip, `toolmap-images-${Date.now()}.zip`);
  }

  function clearAll() {
    for (const item of items) {
      URL.revokeObjectURL(item.originalUrl);
      if (item.result?.url) URL.revokeObjectURL(item.result.url);
    }
    items = [];
    selectedId = null;
    els.fileInput.value = "";
    render();
  }

  /** @param {ImageItem} item */
  async function saveCompressedHistory(item) {
    if (!isHistoryAvailable()) return;
    const record = createHistoryRecord(item);
    if (!record) return;
    try {
      await saveHistoryRecord(record);
      await loadHistory({ silent: true });
    } catch (err) {
      if (err.message === "HISTORY_QUOTA_EXCEEDED") {
        showToast("存储空间不足，历史记录保存失败，请清理一些历史记录。");
      } else {
        console.warn("[image-history] save failed:", err);
        showToast("压缩完成了，但历史记录保存失败。");
      }
    }
  }

  async function loadHistory({ silent = false } = {}) {
    if (!isHistoryAvailable()) {
      els.historyMeta.textContent = "当前浏览器不支持历史记录缓存。";
      historyRecords = [];
      renderHistory();
      return;
    }
    try {
      historyRecords = await listHistoryMeta();
      renderHistory();
    } catch (err) {
      console.warn("[image-history] load failed:", err);
      historyRecords = [];
      renderHistory();
      if (!silent) showToast("历史记录读取失败。");
    }
  }

  /** @param {string} id */
  async function removeHistory(id) {
    const ok = window.confirm("确定删除这条图片压缩历史吗？这只会删除浏览器本地保存的压缩结果。");
    if (!ok) return;
    await deleteHistoryRecord(id);
    await loadHistory({ silent: true });
    showToast("已删除这条历史记录。");
  }

  async function removeAllHistory() {
    if (!historyRecords.length) return;
    const ok = window.confirm("确定清空图片压缩历史吗？这只会删除浏览器本地保存的压缩结果。");
    if (!ok) return;
    await clearHistory();
    await loadHistory({ silent: true });
    showToast("历史记录已清空。");
  }

  function renderStats() {
    const originalTotal = items.reduce((sum, item) => sum + item.file.size, 0);
    const outputTotal = items.reduce((sum, item) => sum + (item.result?.outputSize || 0), 0);
    const done = items.filter((item) => item.result).length;
    const ratio = originalTotal && outputTotal ? ((originalTotal - outputTotal) / originalTotal) * 100 : 0;
    els.count.textContent = `${items.length} 张`;
    els.before.textContent = formatBytes(originalTotal);
    els.after.textContent = done ? formatBytes(outputTotal) : "0 B";
    els.saved.textContent = done ? formatPercent(ratio) : "0%";
  }

  function renderList() {
    if (!items.length) {
      els.list.innerHTML = `<div class="image-empty">还没有图片。选择或拖入图片后开始压缩。</div>`;
      return;
    }

    els.list.innerHTML = items
      .map((item) => {
        const done = item.result;
        const statusText = /** @type {Record<string, string>} */ ({
          ready: "待压缩",
          processing: "压缩中",
          done: done?.keptOriginal ? "已保留原图" : done?.adaptive ? "已增强" : "已完成",
          error: "失败",
        })[item.status];
        const dimensions = done
          ? `${item.meta.width || "-"}×${item.meta.height || "-"} → ${done.width}×${done.height}${done.adaptive ? " · 自动增强" : ""}`
          : `${item.meta.width || "-"}×${item.meta.height || "-"}`;
        const sizeText = done ? `${formatBytes(item.file.size)} → ${formatBytes(done.outputSize)}` : formatBytes(item.file.size);
        const savedText = done ? formatPercent(done.savedRatio) : mimeToLabel(item.file.type);
        return `
          <article class="image-row ${item.id === selectedId ? "image-row--active" : ""}" data-id="${item.id}">
            <img src="${item.originalUrl}" alt="" class="image-row__thumb" />
            <div class="image-row__main">
              <div class="image-row__name" title="${escapeAttr(item.file.name)}">${escapeHtml(item.file.name)}</div>
              <div class="image-row__meta">${sizeText} · ${dimensions}</div>
              ${item.error ? `<div class="image-row__error">${escapeHtml(item.error)}</div>` : ""}
            </div>
            <div class="image-row__side">
              <span class="image-row__badge image-row__badge--${item.status}">${statusText}</span>
              <strong>${savedText}</strong>
              ${done ? `<button class="image-row__download" type="button" data-download="${item.id}">下载</button>` : ""}
            </div>
          </article>
        `;
      })
      .join("");
  }

  function renderPreview() {
    const item = items.find((candidate) => candidate.id === selectedId);
    if (!item) {
      els.previewMeta.textContent = "等待图片";
      els.preview.innerHTML = `<div class="image-empty">选择列表中的图片查看压缩前后。</div>`;
      return;
    }

    const result = item.result;
    els.previewMeta.textContent = result
      ? `${mimeToLabel(result.type)} · ${result.width}×${result.height} · 节省 ${formatPercent(result.savedRatio)}`
      : `${mimeToLabel(item.file.type)} · ${item.meta.width || "-"}×${item.meta.height || "-"}`;
    els.preview.innerHTML = `
      <div class="image-preview-card">
        <div class="image-preview-card__pane">
          <span>原图</span>
          <img src="${item.originalUrl}" alt="原图预览" />
          <strong>${formatBytes(item.file.size)}</strong>
        </div>
        <div class="image-preview-card__pane">
          <span>压缩后</span>
          ${
            result
              ? `<img src="${result.url}" alt="压缩后预览" /><strong>${formatBytes(result.outputSize)}</strong>`
              : `<div class="image-preview-card__placeholder">待压缩</div><strong>-</strong>`
          }
        </div>
      </div>
    `;
  }

  function renderHistory() {
    const usage = getHistoryUsage(historyRecords);
    els.historyMeta.textContent = historyRecords.length
      ? `已保存 ${historyRecords.length}/${HISTORY_LIMIT} 条，占用 ${formatBytes(usage)}。仅保存压缩后结果。`
      : "仅保存压缩后的图片，最多保留最近 30 条。";
    els.clearHistory.disabled = historyRecords.length === 0;
    els.exportHistory.disabled = historyRecords.length === 0;

    if (!historyRecords.length) {
      els.historyList.innerHTML = `<div class="image-empty">压缩完成后会自动保存到这里。</div>`;
      return;
    }

    els.historyList.innerHTML = historyRecords
      .map((record) => {
        const created = new Date(record.createdAt).toLocaleString("zh-CN", {
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        });
        return `
          <article class="image-history-row" data-history-id="${record.id}">
            <div class="image-history-row__main">
              <div class="image-history-row__name" title="${escapeAttr(record.outputName)}">${escapeHtml(record.outputName)}</div>
              <div class="image-history-row__meta">
                ${formatBytes(record.originalSize)} → ${formatBytes(record.outputSize)} · 节省 ${formatPercent(record.savedRatio)} · ${record.outputWidth}×${record.outputHeight} · ${created}
              </div>
            </div>
            <div class="image-history-row__actions">
              <button class="image-row__download" type="button" data-history-download="${record.id}">下载</button>
              <button class="image-row__download image-row__download--danger" type="button" data-history-delete="${record.id}">删除</button>
            </div>
          </article>
        `;
      })
      .join("");
  }

  function render() {
    renderStats();
    renderList();
    renderPreview();
    renderHistory();
    const hasItems = items.length > 0;
    const hasDone = items.some((item) => item.result?.blob);
    els.compress.disabled = busy || !hasItems;
    els.downloadAll.disabled = busy || !hasDone;
    els.clear.disabled = busy || !hasItems;
  }

  els.fileInput.addEventListener("change", () => addFiles(els.fileInput.files));
  els.compress.addEventListener("click", compressAll);
  els.downloadAll.addEventListener("click", downloadAll);
  els.clear.addEventListener("click", clearAll);
  els.refreshHistory.addEventListener("click", () => loadHistory());
  els.exportHistory.addEventListener("click", async () => {
    if (!historyRecords.length) { showToast("没有可导出的历史记录。"); return; }
    try {
      showToast("正在导出...");
      const fullRecords = await Promise.all(
        historyRecords.map((meta) => getHistoryRecord(meta.id).then((r) => r || meta))
      );
      await exportImageHistory(fullRecords);
      showToast("图片压缩历史已导出。");
    } catch (err) {
      console.error("[image-history] export failed:", err);
      showToast("导出失败，请稍后再试。");
    }
  });
  els.clearHistory.addEventListener("click", removeAllHistory);
  els.quality.addEventListener("input", () => {
    customQuality = true;
    els.qualityLabel.textContent = `${els.quality.value}%`;
    els.modeHint.textContent = "按你手动选择的质量值压缩。";
  });
  mount.querySelectorAll('input[name="icMode"]').forEach((radio) => {
    radio.addEventListener("change", () => {
      customQuality = false;
      applyModePreset();
    });
  });

  els.drop.setAttribute("tabindex", "0");
  els.drop.setAttribute("role", "button");
  els.drop.setAttribute("aria-label", "点击或拖拽上传图片");
  els.drop.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter" || ev.key === " ") {
      ev.preventDefault();
      els.fileInput.click();
    }
  });

  els.drop.addEventListener("dragover", (ev) => {
    ev.preventDefault();
    els.drop.classList.add("image-drop--over");
  });
  els.drop.addEventListener("dragleave", () => els.drop.classList.remove("image-drop--over"));
  els.drop.addEventListener("drop", (ev) => {
    ev.preventDefault();
    els.drop.classList.remove("image-drop--over");
    addFiles(ev.dataTransfer?.files);
  });
  els.list.addEventListener("click", (ev) => {
    const target = ev.target;
    if (!(target instanceof HTMLElement)) return;
    const downloadId = target.getAttribute("data-download");
    if (downloadId) {
      const item = items.find((candidate) => candidate.id === downloadId);
      if (item?.result) downloadBlob(item.result.blob, item.result.fileName);
      return;
    }
    const row = target.closest(".image-row");
    if (row instanceof HTMLElement) {
      selectedId = row.dataset.id || selectedId;
      render();
    }
  });
  els.historyList.addEventListener("click", (ev) => {
    const target = ev.target;
    if (!(target instanceof HTMLElement)) return;
    const downloadId = target.getAttribute("data-history-download");
    if (downloadId) {
      getHistoryRecord(downloadId)
        .then((record) => {
          if (record?.blob) downloadBlob(record.blob, record.outputName);
          else showToast("记录读取失败，请刷新历史后再试。");
        })
        .catch(() => showToast("记录读取失败，请刷新历史后再试。"));
      return;
    }
    const deleteId = target.getAttribute("data-history-delete");
    if (deleteId) removeHistory(deleteId);
  });

  applyModePreset();
  render();
  loadHistory({ silent: true });

  mount._cleanup = () => {
    items.forEach((item) => {
      if (item.originalUrl) URL.revokeObjectURL(item.originalUrl);
      if (item.result?.url) URL.revokeObjectURL(item.result.url);
    });
    items = [];
  };
  currentImageCompressCleanup = mount._cleanup;
}

/** @type {(() => void) | null} */
let currentImageCompressCleanup = null;

export function unmountImageCompressTool() {
  if (typeof currentImageCompressCleanup === "function") {
    currentImageCompressCleanup();
    currentImageCompressCleanup = null;
  }
}
export { unmountImageCompressTool as unmount };


