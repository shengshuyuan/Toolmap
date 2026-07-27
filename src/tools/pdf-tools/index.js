import { mergePDFs, getPDFPageCount } from "./pdf-merge.js";
import { splitPDF, splitPDFEveryPage, parsePageRanges } from "./pdf-split.js";
import { addWatermark } from "./pdf-watermark.js";
import { createToast } from "../../shared/toast.js";
import { escapeHtml } from "../../shared/escape.js";
import { formatBytes } from "../../shared/format.js";

/* ── 模板 ─────────────────────────────────────────────── */

export function getPdfToolsTemplate() {
  return /* html */ `
<div class="pdf-tools-tool pdf-panel pdf-panel--enter">
  <!-- 头部 -->
  <div class="pdf-head">
    <h2 class="pdf-title">PDF 工具</h2>
    <p class="pdf-lead">合并、拆分、加水印 — 全部在浏览器本地完成，文件不离开你的设备。</p>
    <div class="privacy-badge"><strong>本地处理</strong><span>所有操作在浏览器完成，不上传任何文件</span></div>
  </div>

  <div class="capability-strip">
    <span class="capability-pill">合并</span>
    <span class="capability-pill">拆分</span>
    <span class="capability-pill">加水印</span>
    <span class="capability-pill capability-pill--safe">本地处理</span>
  </div>

  <!-- Tab 切换 -->
  <div class="pdf-tabs" role="tablist">
    <button class="pdf-tab pdf-tab--active" data-tab="merge" id="pdfMergeTab" role="tab" aria-selected="true" aria-controls="pdfMergePane">合并 PDF</button>
    <button class="pdf-tab" data-tab="split" id="pdfSplitTab" role="tab" aria-selected="false" aria-controls="pdfSplitPane">拆分 PDF</button>
    <button class="pdf-tab" data-tab="watermark" id="pdfWatermarkTab" role="tab" aria-selected="false" aria-controls="pdfWatermarkPane">加水印</button>
  </div>

  <!-- 合并面板 -->
  <div class="pdf-pane" data-pane="merge" id="pdfMergePane" role="tabpanel" aria-labelledby="pdfMergeTab">
    <div class="pdf-upload-zone" id="pdfMergeUpload">
      <div class="pdf-upload-icon">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="12" y1="18" x2="12" y2="12"/>
          <polyline points="9 15 12 12 15 15"/>
        </svg>
      </div>
      <p class="pdf-upload-text">拖拽 PDF 文件到此处，或点击选择</p>
      <p class="pdf-upload-hint">支持选择多个文件，按顺序合并</p>
      <input id="pdfMergeInput" type="file" accept=".pdf,application/pdf" multiple hidden />
    </div>
    <div id="pdfMergeList" class="pdf-file-list" hidden></div>
    <div class="pdf-progress" id="pdfMergeProgress" hidden>
      <div class="pdf-progress-bar"><div class="pdf-progress-fill" id="pdfMergeProgressFill"></div></div>
      <span class="pdf-progress-text" id="pdfMergeProgressText">处理中...</span>
    </div>
    <div class="pdf-pane-actions">
      <button id="pdfMergeBtn" class="pdf-btn pdf-btn--primary" disabled>合并下载</button>
      <button id="pdfMergeClear" class="pdf-btn" hidden>清空文件</button>
    </div>
  </div>

  <!-- 拆分面板 -->
  <div class="pdf-pane" data-pane="split" id="pdfSplitPane" role="tabpanel" aria-labelledby="pdfSplitTab" hidden>
    <div class="pdf-upload-zone" id="pdfSplitUpload">
      <div class="pdf-upload-icon">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
        </svg>
      </div>
      <p class="pdf-upload-text">拖拽 PDF 文件到此处，或点击选择</p>
      <p class="pdf-upload-hint">选择一个 PDF 文件进行拆分</p>
      <input id="pdfSplitInput" type="file" accept=".pdf,application/pdf" hidden />
    </div>
    <div id="pdfSplitInfo" class="pdf-split-info" hidden>
      <div class="pdf-file-info">
        <span class="pdf-file-name" id="pdfSplitFileName"></span>
        <span class="pdf-file-pages" id="pdfSplitPageCount"></span>
      </div>
      <div class="pdf-split-options">
        <label class="pdf-label" for="pdfPageRange">页码范围</label>
        <input id="pdfPageRange" class="pdf-input" type="text" placeholder="例：1-3, 5, 7-9" />
        <p class="pdf-hint">输入页码范围，用逗号分隔。如 <code>1-3, 5, 7-9</code></p>
        <label class="pdf-checkbox-label">
          <input id="pdfSplitEvery" type="checkbox" />
          每一页单独拆分为一个文件
        </label>
      </div>
    </div>
    <div class="pdf-progress" id="pdfSplitProgress" hidden>
      <div class="pdf-progress-bar"><div class="pdf-progress-fill" id="pdfSplitProgressFill"></div></div>
      <span class="pdf-progress-text" id="pdfSplitProgressText">处理中...</span>
    </div>
    <div class="pdf-pane-actions">
      <button id="pdfSplitBtn" class="pdf-btn pdf-btn--primary" disabled>拆分下载</button>
      <button id="pdfSplitClear" class="pdf-btn" hidden>重新选择</button>
    </div>
  </div>

  <!-- 水印面板 -->
  <div class="pdf-pane" data-pane="watermark" id="pdfWatermarkPane" role="tabpanel" aria-labelledby="pdfWatermarkTab" hidden>
    <div class="pdf-upload-zone" id="pdfWmUpload">
      <div class="pdf-upload-icon">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
      </div>
      <p class="pdf-upload-text">拖拽 PDF 文件到此处，或点击选择</p>
      <p class="pdf-upload-hint">选择一个 PDF 文件添加水印</p>
      <input id="pdfWmInput" type="file" accept=".pdf,application/pdf" hidden />
    </div>
    <div id="pdfWmOptions" class="pdf-wm-options" hidden>
      <div class="pdf-file-info">
        <span class="pdf-file-name" id="pdfWmFileName"></span>
      </div>
      <div class="pdf-wm-form">
        <div class="pdf-form-row">
          <label class="pdf-label" for="pdfWmText">水印文字</label>
          <input id="pdfWmText" class="pdf-input" type="text" placeholder="机密 / Confidential" value="机密" />
        </div>
        <div class="pdf-form-row pdf-form-row--inline">
          <div class="pdf-form-field">
            <label class="pdf-label" for="pdfWmSize">字号</label>
            <input id="pdfWmSize" class="pdf-input pdf-input--sm" type="number" value="48" min="8" max="200" />
          </div>
          <div class="pdf-form-field">
            <label class="pdf-label" for="pdfWmColor">颜色</label>
            <input id="pdfWmColor" class="pdf-color" type="color" value="#999999" />
          </div>
          <div class="pdf-form-field">
            <label class="pdf-label" for="pdfWmOpacity">透明度</label>
            <input id="pdfWmOpacity" class="pdf-range" type="range" min="0.05" max="1" step="0.05" value="0.3" />
            <span id="pdfWmOpacityVal" class="pdf-range-val">30%</span>
          </div>
        </div>
        <div class="pdf-form-row pdf-form-row--inline">
          <div class="pdf-form-field">
            <label class="pdf-label" for="pdfWmRotation">旋转角度</label>
            <input id="pdfWmRotation" class="pdf-input pdf-input--sm" type="number" value="-45" min="-180" max="180" step="5" />
          </div>
        </div>
        <div class="pdf-form-row">
          <label class="pdf-label">水印位置</label>
          <div class="pdf-position-grid">
            <button class="pdf-pos-btn" data-pos="tl" title="左上">↖</button>
            <button class="pdf-pos-btn" data-pos="tc" title="中上">↑</button>
            <button class="pdf-pos-btn" data-pos="tr" title="右上">↗</button>
            <button class="pdf-pos-btn" data-pos="ml" title="左中">←</button>
            <button class="pdf-pos-btn pdf-pos-btn--active" data-pos="mc" title="居中">●</button>
            <button class="pdf-pos-btn" data-pos="mr" title="右中">→</button>
            <button class="pdf-pos-btn" data-pos="bl" title="左下">↙</button>
            <button class="pdf-pos-btn" data-pos="bc" title="中下">↓</button>
            <button class="pdf-pos-btn" data-pos="br" title="右下">↘</button>
          </div>
        </div>
      </div>
    </div>
    <div class="pdf-progress" id="pdfWmProgress" hidden>
      <div class="pdf-progress-bar"><div class="pdf-progress-fill" id="pdfWmProgressFill"></div></div>
      <span class="pdf-progress-text" id="pdfWmProgressText">处理中...</span>
    </div>
    <div class="pdf-pane-actions">
      <button id="pdfWmBtn" class="pdf-btn pdf-btn--primary" disabled>添加水印并下载</button>
      <button id="pdfWmClear" class="pdf-btn" hidden>重新选择</button>
    </div>
  </div>

  <!-- 操作区 -->
  <div class="pdf-actions">
    <div id="pdfToast" class="pdf-toast" role="status" aria-live="polite"></div>
  </div>
</div>`;
}

/* ── Mount 函数 ───────────────────────────────────────── */

export function mountPdfToolsTool(mount) {
  if (!(mount instanceof HTMLElement)) return;
  mount.innerHTML = getPdfToolsTemplate();

  const $ = (sel) => mount.querySelector(sel);
  const $$ = (sel) => mount.querySelectorAll(sel);

  const els = {
    toast: $("#pdfToast"),
    // 合并
    mergeUpload: $("#pdfMergeUpload"),
    mergeInput: $("#pdfMergeInput"),
    mergeList: $("#pdfMergeList"),
    mergeBtn: $("#pdfMergeBtn"),
    mergeClear: $("#pdfMergeClear"),
    mergeProgress: $("#pdfMergeProgress"),
    mergeProgressFill: $("#pdfMergeProgressFill"),
    mergeProgressText: $("#pdfMergeProgressText"),
    // 拆分
    splitUpload: $("#pdfSplitUpload"),
    splitInput: $("#pdfSplitInput"),
    splitInfo: $("#pdfSplitInfo"),
    splitFileName: $("#pdfSplitFileName"),
    splitPageCount: $("#pdfSplitPageCount"),
    pageRange: $("#pdfPageRange"),
    splitEvery: $("#pdfSplitEvery"),
    splitBtn: $("#pdfSplitBtn"),
    splitClear: $("#pdfSplitClear"),
    splitProgress: $("#pdfSplitProgress"),
    splitProgressFill: $("#pdfSplitProgressFill"),
    splitProgressText: $("#pdfSplitProgressText"),
    // 水印
    wmUpload: $("#pdfWmUpload"),
    wmInput: $("#pdfWmInput"),
    wmOptions: $("#pdfWmOptions"),
    wmFileName: $("#pdfWmFileName"),
    wmText: $("#pdfWmText"),
    wmSize: $("#pdfWmSize"),
    wmColor: $("#pdfWmColor"),
    wmOpacity: $("#pdfWmOpacity"),
    wmOpacityVal: $("#pdfWmOpacityVal"),
    wmRotation: $("#pdfWmRotation"),
    wmBtn: $("#pdfWmBtn"),
    wmClear: $("#pdfWmClear"),
    wmProgress: $("#pdfWmProgress"),
    wmProgressFill: $("#pdfWmProgressFill"),
    wmProgressText: $("#pdfWmProgressText"),
  };

  const showToast = createToast(els.toast, { showClass: "pdf-toast--show", duration: 2600 });

  let mergeFiles = [];
  let splitFile = null;
  let splitPageCount = 0;
  let wmFile = null;
  let wmPosition = "mc";

  /* ── Tab 切换 ── */

  function switchTab(tab) {
    $$(".pdf-tab").forEach((btn) => {
      const active = btn.dataset.tab === tab;
      btn.classList.toggle("pdf-tab--active", active);
      btn.setAttribute("aria-selected", String(active));
    });
    $$(".pdf-pane").forEach((pane) => {
      pane.hidden = pane.dataset.pane !== tab;
    });
  }

  mount.addEventListener("click", (e) => {
    const tabBtn = e.target.closest(".pdf-tab");
    if (tabBtn) switchTab(tabBtn.dataset.tab);

    const posBtn = e.target.closest(".pdf-pos-btn");
    if (posBtn) {
      wmPosition = posBtn.dataset.pos;
      $$(".pdf-pos-btn").forEach((b) => b.classList.toggle("pdf-pos-btn--active", b === posBtn));
    }
  });

  /* ── 通用：下载 Blob ── */

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function showProgress(container, fill, text, ratio, msg) {
    container.hidden = false;
    fill.style.width = `${Math.round(ratio * 100)}%`;
    text.textContent = msg || `处理中 ${Math.round(ratio * 100)}%`;
  }

  function hideProgress(container) {
    container.hidden = true;
  }

  /* ── 合并 ── */

  function resetMerge() {
    mergeFiles = [];
    renderMergeList();
  }

  function renderMergeList() {
    if (mergeFiles.length === 0) {
      els.mergeList.hidden = true;
      els.mergeUpload.hidden = false;
      els.mergeBtn.disabled = true;
      els.mergeClear.hidden = true;
      return;
    }
    els.mergeList.hidden = false;
    els.mergeUpload.hidden = true;
    els.mergeBtn.disabled = mergeFiles.length < 2;
    els.mergeClear.hidden = false;

    els.mergeList.innerHTML = mergeFiles.map((f, i) => `
      <div class="pdf-file-row" data-index="${i}">
        <span class="pdf-file-order">${i + 1}</span>
        <span class="pdf-file-name">${escapeHtml(f.name)}</span>
        <span class="pdf-file-size">${formatBytes(f.size)}</span>
        <div class="pdf-file-move">
          ${i > 0 ? `<button class="pdf-move-btn" data-move="${i - 1}" title="上移" type="button">↑</button>` : ""}
          ${i < mergeFiles.length - 1 ? `<button class="pdf-move-btn" data-move-up="${i}" title="下移" type="button">↓</button>` : ""}
        </div>
        <button class="pdf-file-remove" data-remove="${i}" title="移除" type="button">&times;</button>
      </div>
    `).join("");
  }

  function addMergeFiles(fileList) {
    const newFiles = [...fileList].filter((f) => f.type === "application/pdf" || f.name.endsWith(".pdf"));
    if (newFiles.length === 0) {
      showToast("请选择 PDF 文件");
      return;
    }
    mergeFiles = mergeFiles.concat(newFiles);
    renderMergeList();
  }

  els.mergeUpload.setAttribute("tabindex", "0");
  els.mergeUpload.setAttribute("role", "button");
  els.mergeUpload.setAttribute("aria-label", "点击或拖拽上传 PDF 文件合并");
  els.mergeUpload.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      els.mergeInput.click();
    }
  });
  els.mergeUpload.addEventListener("click", () => els.mergeInput.click());
  els.mergeInput.addEventListener("change", (e) => {
    addMergeFiles(e.target.files);
    els.mergeInput.value = "";
  });
  els.mergeUpload.addEventListener("dragover", (e) => { e.preventDefault(); els.mergeUpload.classList.add("pdf-upload-zone--drag"); });
  els.mergeUpload.addEventListener("dragleave", () => els.mergeUpload.classList.remove("pdf-upload-zone--drag"));
  els.mergeUpload.addEventListener("drop", (e) => {
    e.preventDefault();
    els.mergeUpload.classList.remove("pdf-upload-zone--drag");
    addMergeFiles(e.dataTransfer.files);
  });

  els.mergeList.addEventListener("click", (e) => {
    const removeBtn = e.target.closest("[data-remove]");
    if (removeBtn) {
      mergeFiles.splice(parseInt(removeBtn.dataset.remove, 10), 1);
      renderMergeList();
      return;
    }
    const moveBtn = e.target.closest("[data-move]");
    if (moveBtn) {
      const to = parseInt(moveBtn.dataset.move, 10);
      const from = to + 1;
      [mergeFiles[from], mergeFiles[to]] = [mergeFiles[to], mergeFiles[from]];
      renderMergeList();
      return;
    }
    const moveUpBtn = e.target.closest("[data-move-up]");
    if (moveUpBtn) {
      const from = parseInt(moveUpBtn.dataset.moveUp, 10);
      const to = from + 1;
      [mergeFiles[from], mergeFiles[to]] = [mergeFiles[to], mergeFiles[from]];
      renderMergeList();
    }
  });

  els.mergeClear.addEventListener("click", resetMerge);

  els.mergeBtn.addEventListener("click", async () => {
    if (mergeFiles.length < 2) return;
    els.mergeBtn.disabled = true;
    try {
      const blob = await mergePDFs(mergeFiles, (p) => {
        showProgress(els.mergeProgress, els.mergeProgressFill, els.mergeProgressText, p, `合并中 ${Math.round(p * 100)}%`);
      });
      downloadBlob(blob, "merged.pdf");
      showToast("PDF 合并成功");
    } catch (err) {
      showToast(err.message || "合并失败");
    } finally {
      hideProgress(els.mergeProgress);
      els.mergeBtn.disabled = mergeFiles.length < 2;
    }
  });

  /* ── 拆分 ── */

  async function loadSplitFile(file) {
    splitFile = file;
    els.splitUpload.hidden = true;
    els.splitInfo.hidden = false;
    els.splitFileName.textContent = file.name;
    els.splitBtn.disabled = false;
    els.splitClear.hidden = false;

    try {
      splitPageCount = await getPDFPageCount(file);
      els.splitPageCount.textContent = `${splitPageCount} 页`;
      els.pageRange.placeholder = `例：1-${splitPageCount}`;
    } catch {
      splitPageCount = 0;
      els.splitPageCount.textContent = "无法读取页数";
    }
  }

  function resetSplit() {
    splitFile = null;
    splitPageCount = 0;
    els.splitUpload.hidden = false;
    els.splitInfo.hidden = true;
    els.splitBtn.disabled = true;
    els.splitClear.hidden = true;
    els.splitInput.value = "";
    els.pageRange.value = "";
    els.splitEvery.checked = false;
  }

  els.splitUpload.setAttribute("tabindex", "0");
  els.splitUpload.setAttribute("role", "button");
  els.splitUpload.setAttribute("aria-label", "点击或拖拽上传 PDF 文件拆分");
  els.splitUpload.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      els.splitInput.click();
    }
  });
  els.splitUpload.addEventListener("click", () => els.splitInput.click());
  els.splitInput.addEventListener("change", (e) => {
    if (e.target.files[0]) loadSplitFile(e.target.files[0]);
  });
  els.splitUpload.addEventListener("dragover", (e) => { e.preventDefault(); els.splitUpload.classList.add("pdf-upload-zone--drag"); });
  els.splitUpload.addEventListener("dragleave", () => els.splitUpload.classList.remove("pdf-upload-zone--drag"));
  els.splitUpload.addEventListener("drop", (e) => {
    e.preventDefault();
    els.splitUpload.classList.remove("pdf-upload-zone--drag");
    const file = [...e.dataTransfer.files].find((f) => f.type === "application/pdf" || f.name.endsWith(".pdf"));
    if (file) loadSplitFile(file);
  });

  els.splitClear.addEventListener("click", resetSplit);

  els.splitBtn.addEventListener("click", async () => {
    if (!splitFile) return;
    els.splitBtn.disabled = true;
    try {
      if (els.splitEvery.checked) {
        const blobs = await splitPDFEveryPage(splitFile, (p) => {
          showProgress(els.splitProgress, els.splitProgressFill, els.splitProgressText, p, `拆分中 ${Math.round(p * 100)}%`);
        });
        for (let i = 0; i < blobs.length; i++) {
          downloadBlob(blobs[i], `${splitFile.name.replace(/\.pdf$/i, "")}_p${i + 1}.pdf`);
        }
        showToast(`已拆分为 ${blobs.length} 个文件`);
      } else {
        const range = els.pageRange.value.trim();
        if (!range) {
          showToast("请输入页码范围");
          els.splitBtn.disabled = false;
          return;
        }
        const pages = parsePageRanges(range, splitPageCount);
        if (pages.length === 0) {
          showToast("页码范围无效");
          els.splitBtn.disabled = false;
          return;
        }
        const blob = await splitPDF(splitFile, pages, (p) => {
          showProgress(els.splitProgress, els.splitProgressFill, els.splitProgressText, p, `拆分中 ${Math.round(p * 100)}%`);
        });
        downloadBlob(blob, `${splitFile.name.replace(/\.pdf$/i, "")}_split.pdf`);
        showToast("PDF 拆分成功");
      }
    } catch (err) {
      showToast(err.message || "拆分失败");
    } finally {
      hideProgress(els.splitProgress);
      els.splitBtn.disabled = false;
    }
  });

  /* ── 水印 ── */

  function loadWmFile(file) {
    wmFile = file;
    els.wmUpload.hidden = true;
    els.wmOptions.hidden = false;
    els.wmFileName.textContent = file.name;
    els.wmBtn.disabled = false;
    els.wmClear.hidden = false;
  }

  function resetWm() {
    wmFile = null;
    els.wmUpload.hidden = false;
    els.wmOptions.hidden = true;
    els.wmBtn.disabled = true;
    els.wmClear.hidden = true;
    els.wmInput.value = "";
  }

  els.wmUpload.setAttribute("tabindex", "0");
  els.wmUpload.setAttribute("role", "button");
  els.wmUpload.setAttribute("aria-label", "点击或拖拽上传 PDF 文件加水印");
  els.wmUpload.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      els.wmInput.click();
    }
  });
  els.wmUpload.addEventListener("click", () => els.wmInput.click());
  els.wmInput.addEventListener("change", (e) => {
    if (e.target.files[0]) loadWmFile(e.target.files[0]);
  });
  els.wmUpload.addEventListener("dragover", (e) => { e.preventDefault(); els.wmUpload.classList.add("pdf-upload-zone--drag"); });
  els.wmUpload.addEventListener("dragleave", () => els.wmUpload.classList.remove("pdf-upload-zone--drag"));
  els.wmUpload.addEventListener("drop", (e) => {
    e.preventDefault();
    els.wmUpload.classList.remove("pdf-upload-zone--drag");
    const file = [...e.dataTransfer.files].find((f) => f.type === "application/pdf" || f.name.endsWith(".pdf"));
    if (file) loadWmFile(file);
  });

  els.wmClear.addEventListener("click", resetWm);

  els.wmOpacity.addEventListener("input", () => {
    els.wmOpacityVal.textContent = `${Math.round(els.wmOpacity.value * 100)}%`;
  });

  els.wmBtn.addEventListener("click", async () => {
    if (!wmFile) return;
    const text = els.wmText.value.trim();
    if (!text) {
      showToast("请输入水印文字");
      return;
    }
    if (text.length > 200) {
      showToast("水印文字不能超过 200 个字符");
      return;
    }
    els.wmBtn.disabled = true;
    try {
      const blob = await addWatermark(wmFile, {
        text,
        fontSize: parseInt(els.wmSize.value, 10) || 48,
        color: els.wmColor.value,
        opacity: parseFloat(els.wmOpacity.value),
        position: wmPosition,
        rotation: parseInt(els.wmRotation.value, 10) || 0,
      }, (p) => {
        showProgress(els.wmProgress, els.wmProgressFill, els.wmProgressText, p, `处理中 ${Math.round(p * 100)}%`);
      });
      downloadBlob(blob, wmFile.name.replace(/\.pdf$/i, "") + "_watermarked.pdf");
      showToast("水印已添加");
    } catch (err) {
      showToast(err.message || "添加水印失败");
    } finally {
      hideProgress(els.wmProgress);
      els.wmBtn.disabled = false;
    }
  });

  mount._cleanup = () => {
    resetMerge();
    resetSplit();
    resetWm();
  };
  currentPdfToolsCleanup = mount._cleanup;
}

let currentPdfToolsCleanup = null;

export function unmountPdfToolsTool() {
  if (typeof currentPdfToolsCleanup === "function") {
    currentPdfToolsCleanup();
    currentPdfToolsCleanup = null;
  }
}
export { unmountPdfToolsTool as unmount };
