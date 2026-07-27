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

export function getImageCompressTemplate() {
  return `
  <div class="image-compress-tool image-panel image-panel--enter" aria-labelledby="image-compress-title">
    <div class="image-head">
      <div>
        <h2 id="image-compress-title" class="image-title">在线图片压缩</h2>
        <p class="image-lead">拖入或选择图片，在浏览器本地完成压缩。智能推荐会自动转 WebP、收敛尺寸，并在省得少时自动增强压缩。</p>
      </div>
      <div class="privacy-badge">
        <strong>本地处理</strong>
        <span>图片不会上传服务器</span>
      </div>
    </div>

    <div class="image-grid">
      <section class="image-drop" id="icDropZone" aria-label="图片上传区域">
        <input id="icFileInput" class="image-file-input" type="file" accept="image/jpeg,image/png,image/webp" multiple />
        <div class="image-drop__icon" aria-hidden="true">⇣</div>
        <div class="image-drop__title">拖拽图片到这里</div>
        <div class="image-drop__sub">支持 JPG、PNG、WebP；默认 WebP + 长边 1920px</div>
        <label class="image-btn image-btn--primary image-pick-label" for="icFileInput">选择图片</label>
      </section>

      <aside class="image-settings" aria-label="压缩设置">
        <div class="image-settings__head">
          <div class="image-settings__title">压缩设置</div>
          <div id="icModeHint" class="image-settings__hint">兼顾清晰度和体积。</div>
        </div>

        <div class="image-mode-list" role="radiogroup" aria-label="压缩模式">
          <label class="image-mode">
            <input type="radio" name="icMode" value="smart" checked />
            <span>智能推荐</span>
          </label>
          <label class="image-mode">
            <input type="radio" name="icMode" value="high" />
            <span>高清优先</span>
          </label>
          <label class="image-mode">
            <input type="radio" name="icMode" value="small" />
            <span>极限压缩</span>
          </label>
          <label class="image-mode">
            <input type="radio" name="icMode" value="lossless" />
            <span>无损优先</span>
          </label>
        </div>

        <label class="image-control">
          <span>输出格式</span>
          <select id="icOutputFormat">
            <option value="webp" selected>转为 WebP（推荐）</option>
            <option value="original">保持原格式</option>
          </select>
        </label>

        <label class="image-control">
          <span>质量 <strong id="icQualityLabel">72%</strong></span>
          <input id="icQuality" type="range" min="40" max="100" value="72" />
        </label>

        <label class="image-control">
          <span>最大边</span>
          <select id="icMaxEdge">
            <option value="0">保持原尺寸</option>
            <option value="3840">最长边 3840px</option>
            <option value="2560">最长边 2560px</option>
            <option value="1920" selected>最长边 1920px</option>
            <option value="1600">最长边 1600px</option>
            <option value="1280">最长边 1280px</option>
          </select>
        </label>
      </aside>
    </div>

    <div class="image-actions" role="group" aria-label="图片压缩操作">
      <button id="icCompress" class="image-btn image-btn--primary" type="button" disabled>开始压缩</button>
      <button id="icDownloadAll" class="image-btn" type="button" disabled>下载全部</button>
      <button id="icClear" class="image-btn" type="button" disabled>清空</button>
      <div id="icToast" class="image-toast" role="status" aria-live="polite"></div>
    </div>

    <div class="image-stats" aria-live="polite">
      <div class="image-stat">
        <span>已选择</span>
        <strong id="icCount">0 张</strong>
      </div>
      <div class="image-stat">
        <span>压缩前</span>
        <strong id="icBefore">0 B</strong>
      </div>
      <div class="image-stat">
        <span>压缩后</span>
        <strong id="icAfter">0 B</strong>
      </div>
      <div class="image-stat image-stat--save">
        <span>节省</span>
        <strong id="icSaved">0%</strong>
      </div>
    </div>

    <div class="image-result-grid">
      <section class="image-list-wrap">
        <div class="image-section-head">
          <div class="image-section-title">文件列表</div>
          <div class="image-section-sub">压缩完成后可单独下载</div>
        </div>
        <div id="icList" class="image-list">
          <div class="image-empty">还没有图片。选择或拖入图片后开始压缩。</div>
        </div>
      </section>

      <section class="image-preview">
        <div class="image-section-head">
          <div class="image-section-title">预览</div>
          <div id="icPreviewMeta" class="image-section-sub">等待图片</div>
        </div>
        <div id="icPreview" class="image-preview__body">
          <div class="image-empty">选择列表中的图片查看压缩前后。</div>
        </div>
      </section>
    </div>

    <section class="image-history" aria-label="压缩历史记录">
      <div class="image-section-head">
        <div>
          <div class="image-section-title">历史记录</div>
          <div id="icHistoryMeta" class="image-section-sub">仅保存压缩后的图片，最多保留最近 30 条。</div>
        </div>
        <div class="image-history__actions">
          <button id="icRefreshHistory" class="image-mini-btn" type="button">刷新</button>
          <button id="icExportHistory" class="image-mini-btn" type="button">导出</button>
          <button id="icClearHistory" class="image-mini-btn image-mini-btn--danger" type="button" disabled>清空历史</button>
        </div>
      </div>
      <div id="icHistoryList" class="image-history-list">
        <div class="image-empty">压缩完成后会自动保存到这里。</div>
      </div>
    </section>
  </div>
`;
}

function $(root, id) {
  const el = root.querySelector(`#${id}`);
  if (!el) throw new Error(`图片压缩工具缺少节点：#${id}`);
  return el;
}

export function mountImageCompressTool(mount) {
  if (!(mount instanceof HTMLElement)) return;
  mount.innerHTML = getImageCompressTemplate();
  const find = (id) => $(mount, id);

  const els = {
    drop: find("icDropZone"),
    fileInput: find("icFileInput"),
    compress: find("icCompress"),
    downloadAll: find("icDownloadAll"),
    clear: find("icClear"),
    toast: find("icToast"),
    list: find("icList"),
    preview: find("icPreview"),
    previewMeta: find("icPreviewMeta"),
    quality: find("icQuality"),
    qualityLabel: find("icQualityLabel"),
    outputFormat: find("icOutputFormat"),
    maxEdge: find("icMaxEdge"),
    modeHint: find("icModeHint"),
    count: find("icCount"),
    before: find("icBefore"),
    after: find("icAfter"),
    saved: find("icSaved"),
    historyMeta: find("icHistoryMeta"),
    historyList: find("icHistoryList"),
    refreshHistory: find("icRefreshHistory"),
    exportHistory: find("icExportHistory"),
    clearHistory: find("icClearHistory"),
  };

  /** @type {Array<any>} */
  let items = [];
  let selectedId = null;
  let busy = false;
  let toastTimer = 0;
  let customQuality = false;
  const showToast = createToast(els.toast, { showClass: "image-toast--show", duration: 3200 });
  let historyRecords = [];

  function getSettings() {
    const mode = customQuality ? "custom" : mount.querySelector('input[name="icMode"]:checked')?.value || "smart";
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

  async function addFiles(fileList) {
    const incoming = Array.from(fileList || []);
    const supported = incoming.filter(isSupportedImage);
    if (incoming.length && supported.length !== incoming.length) {
      showToast("有些文件不是 JPG、PNG 或 WebP，已经跳过。");
    }
    if (!supported.length) return;

    const nextItems = [];
    for (const file of supported) {
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const originalUrl = URL.createObjectURL(file);
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
    const zip = await buildZip(done.map((item) => ({ blob: item.result.blob, name: item.result.fileName })));
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
        const statusText = {
          ready: "待压缩",
          processing: "压缩中",
          done: done?.keptOriginal ? "已保留原图" : done?.adaptive ? "已增强" : "已完成",
          error: "失败",
        }[item.status];
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

let currentImageCompressCleanup = null;

export function unmountImageCompressTool() {
  if (typeof currentImageCompressCleanup === "function") {
    currentImageCompressCleanup();
    currentImageCompressCleanup = null;
  }
}
export { unmountImageCompressTool as unmount };



