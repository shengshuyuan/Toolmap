import { encodeQR } from "./qr-encode.js";
import {
  renderDesignedCanvas,
  renderDesignedSVG,
  renderDesignedDataURL,
  downloadDataUrl,
  downloadSVG,
  buildExportFilename,
  isSafeImageDataUrl,
} from "./qr-render.js";
import { decodeFromImage, decodeFromCanvas } from "./qr-decode.js";
import {
  createDefaultStyle,
  validateOutputSize,
  resolveOutputSize,
  clampLogoRatio,
  clampMargin,
  serializeStyleForHistory,
  PRESET_SIZES,
  DEFAULT_MARGIN,
  MIN_SAFE_MARGIN,
} from "./qr-style.js";
import { evaluateScanCheck, scanCheckClass } from "./qr-scan-check.js";
import { createToast } from "../../shared/toast.js";
import { escapeHtml, escapeAttr } from "../../shared/escape.js";
import { STORE_CONFIGS } from "../../shared/store-configs.js";
import { writeClipboard } from "../../shared/clipboard.js";
import { getQrcodeTemplate } from "./template.js";

export { getQrcodeTemplate };

/**
 * @typedef {HTMLElement & { _qrStore?: any, _cleanup?: () => void }} QrMount
 * @typedef {{ id: string, createdAt: number, type: string, content: string, style?: import("./qr-style.js").QrStyleState, thumbnail?: string }} QrHistoryRecord
 */

/* ── Mount ───────────────────────────────────────────── */

/**
 * @param {QrMount} mount
 */
export function mountQrcodeTool(mount) {
  if (!(mount instanceof HTMLElement)) return;
  mount.innerHTML = getQrcodeTemplate();

  const $ = /** @type {(sel: string) => any} */ ((sel) => mount.querySelector(sel));
  const $$ = /** @type {(sel: string) => NodeListOf<any>} */ ((sel) => mount.querySelectorAll(sel));

  const els = {
    toast: $("#qrToast"),
    canvas: $("#qrCanvas"),
    placeholder: $("#qrPlaceholder"),
    versionInfo: $("#qrVersionInfo"),
    scanCheck: $("#qrScanCheck"),
    text: $("#qrText"),
    wifiSsid: $("#qrWifiSsid"),
    wifiPass: $("#qrWifiPass"),
    wifiEnc: $("#qrWifiEnc"),
    vcardName: $("#qrVcardName"),
    vcardPhone: $("#qrVcardPhone"),
    vcardEmail: $("#qrVcardEmail"),
    vcardOrg: $("#qrVcardOrg"),
    fgColor: $("#qrFgColor"),
    bgColor: $("#qrBgColor"),
    sizeMode: $("#qrSizeMode"),
    pngSize: $("#qrPngSize"),
    customSize: $("#qrCustomSize"),
    sizeError: $("#qrSizeError"),
    margin: $("#qrMargin"),
    marginWarn: $("#qrMarginWarn"),
    resetStyle: $("#qrResetStyle"),
    frameEnabled: $("#qrFrameEnabled"),
    frameFields: $("#qrFrameFields"),
    frameWidth: $("#qrFrameWidth"),
    framePad: $("#qrFramePad"),
    frameColor: $("#qrFrameColor"),
    frameBg: $("#qrFrameBg"),
    frameRadius: $("#qrFrameRadius"),
    logoInput: $("#qrLogoInput"),
    logoPick: $("#qrLogoPick"),
    logoClear: $("#qrLogoClear"),
    logoName: $("#qrLogoName"),
    logoFields: $("#qrLogoFields"),
    logoRatio: $("#qrLogoRatio"),
    logoRatioVal: $("#qrLogoRatioVal"),
    logoRadius: $("#qrLogoRadius"),
    logoPad: $("#qrLogoPad"),
    logoBg: $("#qrLogoBg"),
    logoFit: $("#qrLogoFit"),
    logoWarn: $("#qrLogoWarn"),
    autoEcH: $("#qrAutoEcH"),
    selfCheck: $("#qrSelfCheck"),
    downloadPng: $("#qrDownloadPng"),
    downloadSvg: $("#qrDownloadSvg"),
    uploadZone: $("#qrUploadZone"),
    fileInput: $("#qrFileInput"),
    scanResult: $("#qrScanResult"),
    scanImage: $("#qrScanImage"),
    scanText: $("#qrScanText"),
    scanCopy: $("#qrScanCopy"),
    scanLink: $("#qrScanLink"),
    scanReset: $("#qrScanReset"),
    scanError: $("#qrScanError"),
    scanRetry: $("#qrScanRetry"),
    historyList: $("#qrHistoryList"),
    exportHistory: $("#qrExportHistory"),
    clearHistory: $("#qrClearHistory"),
  };

  const showToast = createToast(els.toast, { showClass: "qr-toast--show", duration: 2600 });

  let currentType = "text";
  let style = createDefaultStyle();
  /** @type {boolean[][] | null} */
  let currentModules = null;
  let currentContent = "";
  /** @type {QrHistoryRecord[]} */
  let historyRecords = [];
  /** @type {any} */
  let generateTimer = null;
  /** @type {any} */
  let checkTimer = null;
  /** @type {string | null} */
  let currentPreviewUrl = null;
  let generateSeq = 0;

  function buildContent() {
    if (currentType === "text") return els.text.value.trim();
    if (currentType === "wifi") {
      const ssid = els.wifiSsid.value.trim();
      const pass = els.wifiPass.value;
      const enc = els.wifiEnc.value;
      if (!ssid) return "";
      if (enc === "nopass") return `WIFI:T:nopass;S:${ssid};;`;
      return `WIFI:T:${enc};S:${ssid};P:${pass};;`;
    }
    if (currentType === "vcard") {
      const name = els.vcardName.value.trim();
      const phone = els.vcardPhone.value.trim();
      const email = els.vcardEmail.value.trim();
      const org = els.vcardOrg.value.trim();
      if (!name && !phone && !email) return "";
      return [
        "BEGIN:VCARD",
        "VERSION:3.0",
        name ? `FN:${name}` : "",
        phone ? `TEL:${phone}` : "",
        email ? `EMAIL:${email}` : "",
        org ? `ORG:${org}` : "",
        "END:VCARD",
      ].filter(Boolean).join("\n");
    }
    return "";
  }

  function readStyleFromUI() {
    style.foreground = els.fgColor.value || "#000000";
    style.background = els.bgColor.value || "#ffffff";
    style.sizeMode = els.sizeMode.value === "custom" ? "custom" : "preset";
    style.outputSize = Number(els.pngSize.value) || 512;
    style.customSize = Number(els.customSize.value) || 512;
    style.margin = clampMargin(els.margin.value);
    style.frame = {
      enabled: els.frameEnabled.checked,
      width: Math.max(0, Number(els.frameWidth.value) || 0),
      color: els.frameColor.value || "#141413",
      radius: Math.max(0, Number(els.frameRadius.value) || 0),
      background: els.frameBg.value || "#ffffff",
      padding: Math.max(0, Number(els.framePad.value) || 0),
    };
    style.logo = {
      ...style.logo,
      enabled: Boolean(style.logo.dataUrl),
      sizeRatio: clampLogoRatio((Number(els.logoRatio.value) || 18) / 100),
      radius: Math.max(0, Number(els.logoRadius.value) || 0),
      padding: Math.max(0, Number(els.logoPad.value) || 0),
      background: els.logoBg.value || "#ffffff",
      fit: els.logoFit.value === "cover" ? "cover" : "contain",
    };
  }

  function applyStyleToUI() {
    els.fgColor.value = style.foreground;
    els.bgColor.value = style.background;
    els.sizeMode.value = style.sizeMode;
    els.pngSize.value = String(PRESET_SIZES.includes(style.outputSize) ? style.outputSize : 512);
    els.customSize.value = String(style.customSize || 512);
    els.margin.value = String(style.margin);
    els.frameEnabled.checked = style.frame.enabled;
    els.frameWidth.value = String(style.frame.width);
    els.framePad.value = String(style.frame.padding);
    els.frameColor.value = style.frame.color;
    els.frameBg.value = style.frame.background;
    els.frameRadius.value = String(style.frame.radius);
    els.logoRatio.value = String(Math.round((style.logo.sizeRatio || 0.18) * 100));
    els.logoRatioVal.textContent = `${els.logoRatio.value}%`;
    els.logoRadius.value = String(style.logo.radius);
    els.logoPad.value = String(style.logo.padding);
    els.logoBg.value = style.logo.background;
    els.logoFit.value = style.logo.fit;
    updateSizeModeUI();
    updateFrameUI();
    updateLogoUI();
    updateMarginWarn();
    $$(".qr-ec-btn").forEach((btn) => {
      const active = btn.dataset.ec === style.errorLevel;
      btn.classList.toggle("qr-ec-btn--active", active);
      btn.setAttribute("aria-checked", String(active));
    });
  }

  function updateSizeModeUI() {
    const custom = els.sizeMode.value === "custom";
    els.pngSize.hidden = custom;
    els.customSize.hidden = !custom;
    els.sizeError.hidden = true;
  }

  function updateFrameUI() {
    els.frameFields.hidden = !els.frameEnabled.checked;
  }

  function updateLogoUI() {
    const on = Boolean(style.logo.dataUrl);
    els.logoFields.hidden = !on;
    els.logoClear.hidden = !on;
    els.logoName.textContent = on ? (style.logo.name || "已选择 Logo") : "";
    const ratio = clampLogoRatio((Number(els.logoRatio.value) || 18) / 100);
    if (ratio > 0.22) {
      els.logoWarn.hidden = false;
      els.logoWarn.textContent = "Logo 较大，可能遮挡定位角，建议减小或使用 H 纠错。";
    } else {
      els.logoWarn.hidden = true;
    }
  }

  function updateMarginWarn() {
    const m = clampMargin(els.margin.value);
    if (m < DEFAULT_MARGIN) {
      els.marginWarn.hidden = false;
      els.marginWarn.textContent =
        m < MIN_SAFE_MARGIN
          ? "安全留白过小，扫码失败风险很高。"
          : "安全留白小于标准 4 模块，可能影响识别。";
    } else {
      els.marginWarn.hidden = true;
    }
  }

  /** @param {number} pixelSize */
  function getRenderOptions(pixelSize) {
    readStyleFromUI();
    return {
      foreground: style.foreground,
      background: style.background,
      margin: style.margin,
      pixelSize,
      frame: { ...style.frame },
      logo: {
        enabled: Boolean(style.logo.dataUrl),
        dataUrl: style.logo.dataUrl,
        sizeRatio: style.logo.sizeRatio,
        radius: style.logo.radius,
        padding: style.logo.padding,
        background: style.logo.background,
        fit: style.logo.fit,
      },
    };
  }

  function setPreviewEmpty() {
    currentModules = null;
    currentContent = "";
    if (els.placeholder) els.placeholder.hidden = false;
    if (els.canvas) els.canvas.classList.remove("is-visible");
    els.downloadPng.disabled = true;
    els.downloadSvg.disabled = true;
    els.versionInfo.textContent = "";
    els.scanCheck.hidden = true;
    els.scanCheck.textContent = "";
  }

  function validateSizeOrToast() {
    readStyleFromUI();
    if (style.sizeMode !== "custom") {
      els.sizeError.hidden = true;
      return true;
    }
    const checked = validateOutputSize(style.customSize);
    if (checked.ok === false) {
      els.sizeError.hidden = false;
      els.sizeError.textContent = checked.message;
      return false;
    }
    els.sizeError.hidden = true;
    return true;
  }

  function scheduleGenerate() {
    clearTimeout(generateTimer);
    generateTimer = setTimeout(() => {
      generate().catch((err) => showToast(err.message || "生成失败"));
    }, 140);
  }

  async function generate() {
    const seq = ++generateSeq;
    if (!validateSizeOrToast()) {
      if (seq === generateSeq) setPreviewEmpty();
      return;
    }
    readStyleFromUI();
    const content = buildContent();
    if (!content) {
      if (seq === generateSeq) setPreviewEmpty();
      return;
    }

    try {
      const qr = encodeQR(content, { errorCorrectionLevel: style.errorLevel });
      if (seq !== generateSeq) return;
      currentModules = qr.modules;
      currentContent = content;
      const previewSize = 280;
      const opts = getRenderOptions(previewSize);
      await renderDesignedCanvas(els.canvas, qr.modules, opts);
      if (seq !== generateSeq) return;
      els.placeholder.hidden = true;
      els.canvas.classList.add("is-visible");
      els.downloadPng.disabled = false;
      els.downloadSvg.disabled = false;
      els.versionInfo.textContent = `Version ${qr.version} · ${qr.size}×${qr.size} · ${style.errorLevel} · 导出 ${resolveOutputSize(style)}px`;
      scheduleSelfCheck();
    } catch (err) {
      if (seq !== generateSeq) return;
      showToast(err.message || "生成失败");
      setPreviewEmpty();
    }
  }

  function scheduleSelfCheck() {
    clearTimeout(checkTimer);
    if (!els.selfCheck.checked) {
      els.scanCheck.hidden = true;
      return;
    }
    checkTimer = setTimeout(() => {
      runSelfCheck().catch(() => {});
    }, 220);
  }

  async function runSelfCheck() {
    if (!currentModules || !currentContent) return;
    readStyleFromUI();
    try {
      const opts = getRenderOptions(360);
      const canvas = document.createElement("canvas");
      await renderDesignedCanvas(canvas, currentModules, opts);
      const result = await decodeFromCanvas(canvas);
      const check = evaluateScanCheck({
        expected: currentContent,
        decoded: result?.data ?? null,
        style,
      });
      els.scanCheck.hidden = false;
      els.scanCheck.className = `qr-check-box ${scanCheckClass(check.level)}`;
      const detail = check.details.length ? ` · ${check.details[0]}` : "";
      els.scanCheck.textContent = `${check.status}${detail}`;
    } catch (err) {
      const check = evaluateScanCheck({
        expected: currentContent,
        decoded: null,
        style,
        error: err,
      });
      els.scanCheck.hidden = false;
      els.scanCheck.className = `qr-check-box ${scanCheckClass(check.level)}`;
      els.scanCheck.textContent = check.status;
    }
  }

  async function handleDownloadPng() {
    if (!currentModules) return;
    if (!validateSizeOrToast()) return;
    const size = resolveOutputSize(style);
    const opts = getRenderOptions(size);
    const dataURL = await renderDesignedDataURL(currentModules, opts);
    downloadDataUrl(dataURL, buildExportFilename(currentType, size, "png"));
    showToast(`已下载 ${size}×${size} PNG`);
    await saveHistory(dataURL);
  }

  async function handleDownloadSvg() {
    if (!currentModules) return;
    if (!validateSizeOrToast()) return;
    const size = resolveOutputSize(style);
    const opts = getRenderOptions(size);
    const svg = renderDesignedSVG(currentModules, opts);
    downloadSVG(svg, buildExportFilename(currentType, size, "svg"));
    showToast("已下载 SVG");
    const thumb = await renderDesignedDataURL(currentModules, getRenderOptions(64));
    await saveHistory(thumb);
  }

  /* ── 识别页 ── */

  function clearScanPreview() {
    if (currentPreviewUrl?.startsWith("blob:")) URL.revokeObjectURL(currentPreviewUrl);
    currentPreviewUrl = null;
    if (els.scanImage) {
      els.scanImage.removeAttribute("src");
      els.scanImage.alt = "上传的图片";
    }
  }

  /** @param {File} file */
  function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("图片读取失败"));
      reader.readAsDataURL(file);
    });
  }

  /** @param {File} file */
  async function handleScan(file) {
    if (!file || !file.type.startsWith("image/")) return;
    els.uploadZone.hidden = true;
    els.scanResult.hidden = true;
    els.scanError.hidden = true;
    clearScanPreview();
    try {
      const previewUrl = await readFileAsDataURL(file);
      currentPreviewUrl = previewUrl;
      els.scanImage.alt = file.name || "上传的图片";
      els.scanImage.src = previewUrl;
    } catch { /* ignore */ }

    try {
      const result = await decodeFromImage(file);
      if (result) {
        els.scanResult.hidden = false;
        els.scanText.textContent = result.data;
        const isURL = /^https?:\/\//i.test(result.data);
        if (isURL) {
          els.scanLink.href = result.data;
          els.scanLink.hidden = false;
        } else {
          els.scanLink.hidden = true;
        }
      } else {
        els.scanError.hidden = false;
      }
    } catch {
      els.scanError.hidden = false;
    }
  }

  function resetScan() {
    clearScanPreview();
    els.uploadZone.hidden = false;
    els.scanResult.hidden = true;
    els.scanError.hidden = true;
    els.fileInput.value = "";
  }

  /** @param {string | undefined} tab */
  function switchTab(tab) {
    $$(".qr-tab").forEach((btn) => {
      const active = btn.dataset.tab === tab;
      btn.classList.toggle("qr-tab--active", active);
      btn.setAttribute("aria-selected", String(active));
    });
    $$(".qr-tabs ~ [data-pane]").forEach((pane) => {
      pane.hidden = pane.dataset.pane !== tab;
    });
    if (tab === "scan") resetScan();
  }

  /** @param {string} type */
  function switchType(type) {
    currentType = type;
    $$(".qr-type-tab").forEach((btn) => {
      const active = btn.dataset.type === type;
      btn.classList.toggle("qr-type-tab--active", active);
      btn.setAttribute("aria-selected", String(active));
    });
    $$(".qr-form").forEach((form) => {
      form.hidden = form.dataset.form !== type;
    });
    scheduleGenerate();
  }

  /** @param {'L'|'M'|'Q'|'H'} ec */
  function switchEc(ec) {
    style.errorLevel = ec;
    $$(".qr-ec-btn").forEach((btn) => {
      const active = btn.dataset.ec === ec;
      btn.classList.toggle("qr-ec-btn--active", active);
      btn.setAttribute("aria-checked", String(active));
    });
    scheduleGenerate();
  }

  /* ── Logo ── */

  /** @param {File} file */
  async function handleLogoFile(file) {
    if (!file) return;
    const okType = /image\/(png|jpeg|jpg|webp)/i.test(file.type);
    if (!okType) {
      showToast("Logo 仅支持 PNG、JPG、WebP");
      return;
    }
    const dataUrl = await readFileAsDataURL(file);
    if (!isSafeImageDataUrl(dataUrl)) {
      showToast("无法读取该 Logo 文件");
      return;
    }
    // 压缩历史体积：限制 dataURL 长度
    if (dataUrl.length > 900_000) {
      showToast("Logo 文件过大，请压缩后重试（建议 < 500KB）");
      return;
    }
    style.logo.dataUrl = dataUrl;
    style.logo.mime = file.type;
    style.logo.name = file.name || "logo";
    style.logo.enabled = true;
    updateLogoUI();
    if (els.autoEcH.checked && style.errorLevel !== "H") {
      switchEc("H");
      showToast("已添加 Logo，纠错等级切换为 H");
    } else {
      scheduleGenerate();
    }
  }

  function clearLogo() {
    style.logo = { ...createDefaultStyle().logo };
    els.logoInput.value = "";
    updateLogoUI();
    scheduleGenerate();
  }

  /* ── 历史 ── */

  function renderHistory() {
    if (historyRecords.length === 0) {
      els.historyList.innerHTML = '<p class="qr-history-empty">暂无历史记录</p>';
      return;
    }
    els.historyList.innerHTML = historyRecords
      .map(
        (r) => `
      <div class="qr-history-item" data-id="${escapeAttr(r.id)}" role="button" tabindex="0">
        <img class="qr-history-thumb" src="${escapeAttr(r.thumbnail || "")}" alt="二维码缩略图" />
        <div class="qr-history-meta">
          <span class="qr-history-type">${escapeHtml(r.type)}</span>
          <span class="qr-history-content">${escapeHtml(String(r.content || "").slice(0, 60))}</span>
          <span class="qr-history-time">${new Date(r.createdAt).toLocaleString("zh-CN")}</span>
        </div>
        <button class="qr-history-del" data-del="${escapeAttr(r.id)}" title="删除" type="button">&times;</button>
      </div>`
      )
      .join("");
  }

  async function loadHistory() {
    try {
      const { createHistoryStore, isHistoryAvailable } = await import("../../shared/history-db.js");
      if (!isHistoryAvailable()) return;
      const store = createHistoryStore(STORE_CONFIGS["qrcode"]);
      historyRecords = await store.list();
      renderHistory();
      mount._qrStore = store;
    } catch { /* silent */ }
  }

  /** @param {string} thumbnailDataUrl */
  async function saveHistory(thumbnailDataUrl) {
    if (!currentModules || !mount._qrStore) return;
    try {
      readStyleFromUI();
      await mount._qrStore.save({
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        createdAt: Date.now(),
        type: currentType,
        content: currentContent.slice(0, 500),
        style: serializeStyleForHistory(style),
        thumbnail: String(thumbnailDataUrl || "").slice(0, 120_000),
      });
      historyRecords = await mount._qrStore.list();
      renderHistory();
    } catch { /* silent */ }
  }

  /* ── 事件 ── */

  mount.addEventListener("click", (/** @type {any} */ e) => {
    const target = e.target instanceof Element ? e.target : null;
    const tabBtn = target?.closest(".qr-tab");
    if (tabBtn instanceof HTMLElement) switchTab(tabBtn.dataset.tab);

    const typeBtn = target?.closest(".qr-type-tab");
    if (typeBtn instanceof HTMLElement) switchType(/** @type {string} */ (typeBtn.dataset.type));

    const ecBtn = target?.closest(".qr-ec-btn");
    if (ecBtn instanceof HTMLElement) switchEc(/** @type {'L'|'M'|'Q'|'H'} */ (ecBtn.dataset.ec));
  });

  [
    els.text, els.wifiSsid, els.wifiPass, els.vcardName, els.vcardPhone, els.vcardEmail, els.vcardOrg,
  ].forEach((el) => el?.addEventListener("input", scheduleGenerate));
  els.wifiEnc.addEventListener("change", scheduleGenerate);
  [els.fgColor, els.bgColor, els.frameColor, els.frameBg, els.logoBg].forEach((el) =>
    el.addEventListener("input", scheduleGenerate)
  );
  [els.frameWidth, els.framePad, els.frameRadius, els.logoRadius, els.logoPad, els.margin].forEach((el) =>
    el.addEventListener("input", () => {
      updateMarginWarn();
      scheduleGenerate();
    })
  );
  els.frameEnabled.addEventListener("change", () => {
    updateFrameUI();
    scheduleGenerate();
  });
  els.logoFit.addEventListener("change", scheduleGenerate);
  els.logoRatio.addEventListener("input", () => {
    els.logoRatioVal.textContent = `${els.logoRatio.value}%`;
    updateLogoUI();
    scheduleGenerate();
  });
  els.sizeMode.addEventListener("change", () => {
    updateSizeModeUI();
    scheduleGenerate();
  });
  els.pngSize.addEventListener("change", scheduleGenerate);
  els.customSize.addEventListener("input", scheduleGenerate);
  els.resetStyle.addEventListener("click", () => {
    const keepLogo = style.logo.dataUrl;
    const keepName = style.logo.name;
    const keepMime = style.logo.mime;
    style = createDefaultStyle();
    if (keepLogo) {
      style.logo.dataUrl = keepLogo;
      style.logo.name = keepName;
      style.logo.mime = keepMime;
      style.logo.enabled = true;
    }
    applyStyleToUI();
    scheduleGenerate();
    showToast("已恢复默认设置");
  });

  els.logoPick.addEventListener("click", () => els.logoInput.click());
  els.logoClear.addEventListener("click", clearLogo);
  els.logoInput.addEventListener("change", (/** @type {any} */ e) => {
    const file = e.target.files?.[0];
    if (file) handleLogoFile(file).catch((err) => showToast(err.message || "Logo 读取失败"));
  });

  els.downloadPng.addEventListener("click", () => {
    handleDownloadPng().catch((err) => showToast(err.message || "下载失败"));
  });
  els.downloadSvg.addEventListener("click", () => {
    handleDownloadSvg().catch((err) => showToast(err.message || "下载失败"));
  });

  els.uploadZone.setAttribute("tabindex", "0");
  els.uploadZone.setAttribute("role", "button");
  els.uploadZone.setAttribute("aria-label", "点击或拖拽上传二维码图片");
  els.uploadZone.addEventListener("keydown", (/** @type {any} */ e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      els.fileInput.click();
    }
  });
  els.uploadZone.addEventListener("click", () => els.fileInput.click());
  els.fileInput.addEventListener("change", (/** @type {any} */ e) => {
    if (e.target.files[0]) handleScan(e.target.files[0]);
  });
  els.uploadZone.addEventListener("dragover", (/** @type {any} */ e) => {
    e.preventDefault();
    els.uploadZone.classList.add("qr-upload-zone--drag");
  });
  els.uploadZone.addEventListener("dragleave", () => els.uploadZone.classList.remove("qr-upload-zone--drag"));
  els.uploadZone.addEventListener("drop", (/** @type {any} */ e) => {
    e.preventDefault();
    els.uploadZone.classList.remove("qr-upload-zone--drag");
    const file = e.dataTransfer.files[0];
    if (file) handleScan(file);
  });
  els.scanCopy.addEventListener("click", async () => {
    const ok = await writeClipboard(els.scanText.textContent);
    showToast(ok ? "已复制到剪贴板" : "复制失败，请手动选择复制");
  });
  els.scanReset.addEventListener("click", resetScan);
  els.scanRetry?.addEventListener("click", resetScan);

  els.historyList.addEventListener("click", async (/** @type {any} */ e) => {
    const delBtn = e.target.closest("[data-del]");
    if (delBtn && mount._qrStore) {
      await mount._qrStore.remove(delBtn.dataset.del);
      historyRecords = await mount._qrStore.list();
      renderHistory();
      return;
    }
    const item = e.target.closest(".qr-history-item");
    if (!item) return;
    const record = historyRecords.find((r) => r.id === item.dataset.id);
    if (!record) return;
    switchTab("generate");
    switchType(record.type || "text");
    if (record.type === "text") els.text.value = record.content || "";
    if (record.style) {
      style = { ...createDefaultStyle(), ...record.style, frame: { ...createDefaultStyle().frame, ...(record.style.frame || {}) }, logo: { ...createDefaultStyle().logo, ...(record.style.logo || {}) } };
      // 历史不恢复大图 Logo data
      if (style.logo.dataUrl === "(local)") {
        style.logo.dataUrl = "";
        style.logo.enabled = false;
      }
      applyStyleToUI();
    }
    scheduleGenerate();
  });

  els.clearHistory.addEventListener("click", async () => {
    if (!mount._qrStore || historyRecords.length === 0) return;
    if (!confirm("确定要清空所有生成历史吗？")) return;
    await mount._qrStore.clear();
    historyRecords = [];
    renderHistory();
    showToast("历史已清空");
  });

  els.exportHistory.addEventListener("click", async () => {
    if (historyRecords.length === 0) {
      showToast("暂无历史可导出");
      return;
    }
    try {
      const { buildExportPayload, downloadJSON } = await import("../../shared/history-export.js");
      const payload = buildExportPayload("qrcode", historyRecords, { version: "1.1" });
      downloadJSON(payload, "qrcode-history.json");
      showToast("已导出历史记录");
    } catch {
      showToast("导出失败");
    }
  });

  applyStyleToUI();
  setPreviewEmpty();
  loadHistory();

  mount._cleanup = () => {
    clearTimeout(generateTimer);
    clearTimeout(checkTimer);
    clearScanPreview();
  };
  currentQrcodeCleanup = mount._cleanup;
}

/** @type {(() => void) | null} */
let currentQrcodeCleanup = null;

export function unmountQrcodeTool() {
  if (typeof currentQrcodeCleanup === "function") {
    currentQrcodeCleanup();
    currentQrcodeCleanup = null;
  }
}

export { unmountQrcodeTool as unmount };
