import { mergePDFs, getPDFPageCount } from "./pdf-merge.js";
import { splitPDF, splitPDFEveryPage, parsePageRanges } from "./pdf-split.js";
import { addWatermark } from "./pdf-watermark.js";
import { createToast } from "../../shared/toast.js";
import { escapeHtml } from "../../shared/escape.js";
import { formatBytes } from "../../shared/format.js";
import { getPdfToolsTemplate } from "./template.js";

export { getPdfToolsTemplate };

/* ── Mount 函数 ───────────────────────────────────────── */

/** @param {HTMLElement} mount */
export function mountPdfToolsTool(mount) {
  if (!(mount instanceof HTMLElement)) return;
  mount.innerHTML = getPdfToolsTemplate();

  /** @param {string} sel */
  const $ = (sel) => /** @type {HTMLElement} */ (mount.querySelector(sel));
  /** @param {string} sel */
  const $$ = (sel) => /** @type {NodeListOf<HTMLElement>} */ (mount.querySelectorAll(sel));

  const els = {
    toast: $("#pdfToast"),
    // 合并
    mergeUpload: $("#pdfMergeUpload"),
    mergeInput: /** @type {HTMLInputElement} */ ($("#pdfMergeInput")),
    mergeList: $("#pdfMergeList"),
    mergeBtn: /** @type {HTMLButtonElement} */ ($("#pdfMergeBtn")),
    mergeClear: /** @type {HTMLButtonElement} */ ($("#pdfMergeClear")),
    mergeProgress: $("#pdfMergeProgress"),
    mergeProgressFill: $("#pdfMergeProgressFill"),
    mergeProgressText: $("#pdfMergeProgressText"),
    // 拆分
    splitUpload: $("#pdfSplitUpload"),
    splitInput: /** @type {HTMLInputElement} */ ($("#pdfSplitInput")),
    splitInfo: $("#pdfSplitInfo"),
    splitFileName: $("#pdfSplitFileName"),
    splitPageCount: $("#pdfSplitPageCount"),
    pageRange: /** @type {HTMLInputElement} */ ($("#pdfPageRange")),
    splitEvery: /** @type {HTMLInputElement} */ ($("#pdfSplitEvery")),
    splitBtn: /** @type {HTMLButtonElement} */ ($("#pdfSplitBtn")),
    splitClear: /** @type {HTMLButtonElement} */ ($("#pdfSplitClear")),
    splitProgress: $("#pdfSplitProgress"),
    splitProgressFill: $("#pdfSplitProgressFill"),
    splitProgressText: $("#pdfSplitProgressText"),
    // 水印
    wmUpload: $("#pdfWmUpload"),
    wmInput: /** @type {HTMLInputElement} */ ($("#pdfWmInput")),
    wmOptions: $("#pdfWmOptions"),
    wmFileName: $("#pdfWmFileName"),
    wmText: /** @type {HTMLInputElement} */ ($("#pdfWmText")),
    wmSize: /** @type {HTMLInputElement} */ ($("#pdfWmSize")),
    wmColor: /** @type {HTMLInputElement} */ ($("#pdfWmColor")),
    wmOpacity: /** @type {HTMLInputElement} */ ($("#pdfWmOpacity")),
    wmOpacityVal: $("#pdfWmOpacityVal"),
    wmRotation: /** @type {HTMLInputElement} */ ($("#pdfWmRotation")),
    wmBtn: /** @type {HTMLButtonElement} */ ($("#pdfWmBtn")),
    wmClear: /** @type {HTMLButtonElement} */ ($("#pdfWmClear")),
    wmProgress: $("#pdfWmProgress"),
    wmProgressFill: $("#pdfWmProgressFill"),
    wmProgressText: $("#pdfWmProgressText"),
  };

  const showToast = createToast(els.toast, { showClass: "pdf-toast--show", duration: 2600 });

  /** @type {File[]} */
  let mergeFiles = [];
  /** @type {File | null} */
  let splitFile = null;
  let splitPageCount = 0;
  /** @type {File | null} */
  let wmFile = null;
  let wmPosition = "mc";

  /* ── Tab 切换 ── */

  /** @param {string | undefined} tab */
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
    const target = e.target instanceof Element ? e.target : null;
    const tabBtn = target?.closest(".pdf-tab");
    if (tabBtn instanceof HTMLElement) switchTab(tabBtn.dataset.tab);

    const posBtn = target?.closest(".pdf-pos-btn");
    if (posBtn instanceof HTMLElement) {
      wmPosition = posBtn.dataset.pos ?? wmPosition;
      $$(".pdf-pos-btn").forEach((b) => b.classList.toggle("pdf-pos-btn--active", b === posBtn));
    }
  });

  /* ── 通用：下载 Blob ── */

  /**
   * @param {Blob} blob
   * @param {string} filename
   */
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

  /**
   * @param {HTMLElement} container
   * @param {HTMLElement} fill
   * @param {HTMLElement} text
   * @param {number} ratio
   * @param {string} [msg]
   */
  function showProgress(container, fill, text, ratio, msg) {
    container.hidden = false;
    fill.style.width = `${Math.round(ratio * 100)}%`;
    text.textContent = msg || `处理中 ${Math.round(ratio * 100)}%`;
  }

  /** @param {HTMLElement} container */
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

  /** @param {FileList | File[]} fileList */
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
    addMergeFiles(/** @type {HTMLInputElement & { files: FileList }} */ (e.target).files);
    els.mergeInput.value = "";
  });
  els.mergeUpload.addEventListener("dragover", (e) => { e.preventDefault(); els.mergeUpload.classList.add("pdf-upload-zone--drag"); });
  els.mergeUpload.addEventListener("dragleave", () => els.mergeUpload.classList.remove("pdf-upload-zone--drag"));
  els.mergeUpload.addEventListener("drop", (e) => {
    e.preventDefault();
    els.mergeUpload.classList.remove("pdf-upload-zone--drag");
    addMergeFiles(/** @type {DataTransfer} */ (e.dataTransfer).files);
  });

  els.mergeList.addEventListener("click", (e) => {
    const removeBtn = /** @type {HTMLElement | null} */ (/** @type {Element} */ (e.target).closest("[data-remove]"));
    if (removeBtn) {
      mergeFiles.splice(parseInt(/** @type {string} */ (removeBtn.dataset.remove), 10), 1);
      renderMergeList();
      return;
    }
    const moveBtn = /** @type {HTMLElement | null} */ (/** @type {Element} */ (e.target).closest("[data-move]"));
    if (moveBtn) {
      const to = parseInt(/** @type {string} */ (moveBtn.dataset.move), 10);
      const from = to + 1;
      [mergeFiles[from], mergeFiles[to]] = [mergeFiles[to], mergeFiles[from]];
      renderMergeList();
      return;
    }
    const moveUpBtn = /** @type {HTMLElement | null} */ (/** @type {Element} */ (e.target).closest("[data-move-up]"));
    if (moveUpBtn) {
      const from = parseInt(/** @type {string} */ (moveUpBtn.dataset.moveUp), 10);
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

  /** @param {File} file */
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
    if (/** @type {HTMLInputElement & { files: FileList }} */ (e.target).files[0]) loadSplitFile(/** @type {HTMLInputElement & { files: FileList }} */ (e.target).files[0]);
  });
  els.splitUpload.addEventListener("dragover", (e) => { e.preventDefault(); els.splitUpload.classList.add("pdf-upload-zone--drag"); });
  els.splitUpload.addEventListener("dragleave", () => els.splitUpload.classList.remove("pdf-upload-zone--drag"));
  els.splitUpload.addEventListener("drop", (e) => {
    e.preventDefault();
    els.splitUpload.classList.remove("pdf-upload-zone--drag");
    const file = [.../** @type {DataTransfer} */ (e.dataTransfer).files].find((f) => f.type === "application/pdf" || f.name.endsWith(".pdf"));
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

  /** @param {File} file */
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
    if (/** @type {HTMLInputElement & { files: FileList }} */ (e.target).files[0]) loadWmFile(/** @type {HTMLInputElement & { files: FileList }} */ (e.target).files[0]);
  });
  els.wmUpload.addEventListener("dragover", (e) => { e.preventDefault(); els.wmUpload.classList.add("pdf-upload-zone--drag"); });
  els.wmUpload.addEventListener("dragleave", () => els.wmUpload.classList.remove("pdf-upload-zone--drag"));
  els.wmUpload.addEventListener("drop", (e) => {
    e.preventDefault();
    els.wmUpload.classList.remove("pdf-upload-zone--drag");
    const file = [.../** @type {DataTransfer} */ (e.dataTransfer).files].find((f) => f.type === "application/pdf" || f.name.endsWith(".pdf"));
    if (file) loadWmFile(file);
  });

  els.wmClear.addEventListener("click", resetWm);

  els.wmOpacity.addEventListener("input", () => {
    els.wmOpacityVal.textContent = `${Math.round(/** @type {any} */ (els.wmOpacity.value) * 100)}%`;
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

/** @type {(() => void) | null} */
let currentPdfToolsCleanup = null;

export function unmountPdfToolsTool() {
  if (typeof currentPdfToolsCleanup === "function") {
    currentPdfToolsCleanup();
    currentPdfToolsCleanup = null;
  }
}
export { unmountPdfToolsTool as unmount };
