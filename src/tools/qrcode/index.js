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
import { writeClipboard } from "../../shared/clipboard.js";

/* ── 模板 ─────────────────────────────────────────────── */

export function getQrcodeTemplate() {
  return /* html */ `
<div class="qrcode-tool qr-panel qr-panel--enter">
  <div class="qr-head">
    <h2 class="qr-title">二维码设计与识别</h2>
    <p class="qr-lead">输入内容实时生成二维码，支持外框、Logo 与可扫描性自检；识别全程本地完成。</p>
    <div class="privacy-badge"><strong>本地处理</strong><span>内容、Logo 与图片均不上传服务器</span></div>
  </div>

  <div class="capability-strip">
    <span class="capability-pill">文本 / URL</span>
    <span class="capability-pill">WiFi / vCard</span>
    <span class="capability-pill">外框 · Logo</span>
    <span class="capability-pill">扫描自检</span>
    <span class="capability-pill capability-pill--safe">本地处理</span>
  </div>

  <div class="qr-tabs" role="tablist">
    <button class="qr-tab qr-tab--active" data-tab="generate" id="qrGenerateTab" role="tab" aria-selected="true" aria-controls="qrGeneratePane">生成二维码</button>
    <button class="qr-tab" data-tab="scan" id="qrScanTab" role="tab" aria-selected="false" aria-controls="qrScanPane">识别二维码</button>
  </div>

  <div class="qr-generate-pane" data-pane="generate" id="qrGeneratePane" role="tabpanel" aria-labelledby="qrGenerateTab">
    <div class="qr-main">
      <div class="qr-settings">
        <section class="qr-group">
          <h3 class="qr-group-title">1. 内容</h3>
          <div class="qr-type-tabs" role="tablist">
            <button class="qr-type-tab qr-type-tab--active" data-type="text" type="button">文本 / URL</button>
            <button class="qr-type-tab" data-type="wifi" type="button">WiFi</button>
            <button class="qr-type-tab" data-type="vcard" type="button">vCard 名片</button>
          </div>
          <div class="qr-form" data-form="text">
            <label class="qr-label" for="qrText">输入文本或网址</label>
            <textarea id="qrText" class="qr-textarea" placeholder="https://example.com 或任意文本..." rows="4"></textarea>
          </div>
          <div class="qr-form" data-form="wifi" hidden>
            <label class="qr-label" for="qrWifiSsid">WiFi 名称 (SSID)</label>
            <input id="qrWifiSsid" class="qr-input" type="text" placeholder="MyWiFi" />
            <label class="qr-label" for="qrWifiPass">密码</label>
            <input id="qrWifiPass" class="qr-input" type="text" placeholder="password" />
            <label class="qr-label" for="qrWifiEnc">加密方式</label>
            <select id="qrWifiEnc" class="qr-select">
              <option value="WPA">WPA/WPA2</option>
              <option value="WEP">WEP</option>
              <option value="nopass">无密码</option>
            </select>
          </div>
          <div class="qr-form" data-form="vcard" hidden>
            <label class="qr-label" for="qrVcardName">姓名</label>
            <input id="qrVcardName" class="qr-input" type="text" placeholder="张三" />
            <label class="qr-label" for="qrVcardPhone">电话</label>
            <input id="qrVcardPhone" class="qr-input" type="tel" placeholder="13800138000" />
            <label class="qr-label" for="qrVcardEmail">邮箱</label>
            <input id="qrVcardEmail" class="qr-input" type="email" placeholder="example@mail.com" />
            <label class="qr-label" for="qrVcardOrg">公司</label>
            <input id="qrVcardOrg" class="qr-input" type="text" placeholder="公司名称" />
          </div>
        </section>

        <section class="qr-group">
          <h3 class="qr-group-title">2. 基础设置</h3>
          <div class="qr-option-row">
            <label class="qr-label">纠错等级</label>
            <div class="qr-ec-group" role="radiogroup" aria-label="纠错等级">
              <button class="qr-ec-btn" data-ec="L" type="button" title="7% 容错">L</button>
              <button class="qr-ec-btn qr-ec-btn--active" data-ec="M" type="button" title="15% 容错">M</button>
              <button class="qr-ec-btn" data-ec="Q" type="button" title="25% 容错">Q</button>
              <button class="qr-ec-btn" data-ec="H" type="button" title="30% 容错">H</button>
            </div>
          </div>
          <div class="qr-option-row qr-option-row--inline">
            <label class="qr-label" for="qrFgColor">前景色</label>
            <input id="qrFgColor" class="qr-color" type="color" value="#000000" />
            <label class="qr-label" for="qrBgColor">背景色</label>
            <input id="qrBgColor" class="qr-color" type="color" value="#ffffff" />
          </div>
          <div class="qr-option-row qr-option-row--wrap">
            <label class="qr-label" for="qrSizeMode">输出尺寸</label>
            <select id="qrSizeMode" class="qr-select qr-select--sm">
              <option value="preset">预设</option>
              <option value="custom">自定义</option>
            </select>
            <select id="qrPngSize" class="qr-select qr-select--sm">
              <option value="256">256 × 256</option>
              <option value="512" selected>512 × 512</option>
              <option value="1024">1024 × 1024</option>
              <option value="2048">2048 × 2048</option>
            </select>
            <input id="qrCustomSize" class="qr-input qr-input--sm" type="number" min="128" max="4096" step="1" value="512" hidden placeholder="128–4096" />
          </div>
          <p id="qrSizeError" class="qr-field-error" hidden></p>
          <div class="qr-option-row">
            <label class="qr-label" for="qrMargin">安全留白（模块）</label>
            <input id="qrMargin" class="qr-input qr-input--sm" type="number" min="0" max="8" value="4" />
          </div>
          <p id="qrMarginWarn" class="qr-field-warn" hidden>安全留白小于 4 可能影响识别；小于 2 风险很高。</p>
          <button id="qrResetStyle" class="qr-btn qr-btn--sm" type="button">恢复默认设置</button>
        </section>

        <section class="qr-group">
          <h3 class="qr-group-title">3. 外框设置</h3>
          <label class="qr-check"><input id="qrFrameEnabled" type="checkbox" /> 启用装饰外框</label>
          <div id="qrFrameFields" class="qr-subfields" hidden>
            <div class="qr-option-row qr-option-row--inline">
              <label class="qr-label" for="qrFrameWidth">宽度</label>
              <input id="qrFrameWidth" class="qr-input qr-input--sm" type="number" min="0" max="80" value="10" />
              <label class="qr-label" for="qrFramePad">内边距</label>
              <input id="qrFramePad" class="qr-input qr-input--sm" type="number" min="0" max="80" value="14" />
            </div>
            <div class="qr-option-row qr-option-row--inline">
              <label class="qr-label" for="qrFrameColor">边框色</label>
              <input id="qrFrameColor" class="qr-color" type="color" value="#141413" />
              <label class="qr-label" for="qrFrameBg">外框背景</label>
              <input id="qrFrameBg" class="qr-color" type="color" value="#ffffff" />
            </div>
            <div class="qr-option-row qr-option-row--inline">
              <label class="qr-label" for="qrFrameRadius">圆角</label>
              <input id="qrFrameRadius" class="qr-input qr-input--sm" type="number" min="0" max="120" value="18" />
            </div>
          </div>
        </section>

        <section class="qr-group">
          <h3 class="qr-group-title">4. Logo 设置</h3>
          <div class="qr-logo-row">
            <input id="qrLogoInput" type="file" accept="image/png,image/jpeg,image/webp" hidden />
            <button id="qrLogoPick" class="qr-btn qr-btn--sm" type="button">上传 Logo</button>
            <button id="qrLogoClear" class="qr-btn qr-btn--sm" type="button" hidden>删除 Logo</button>
            <span id="qrLogoName" class="qr-muted"></span>
          </div>
          <p class="qr-hint">仅支持 PNG / JPG / WebP，本地读取，不上传。</p>
          <div id="qrLogoFields" class="qr-subfields" hidden>
            <div class="qr-option-row">
              <label class="qr-label" for="qrLogoRatio">大小</label>
              <input id="qrLogoRatio" class="qr-range" type="range" min="8" max="28" value="18" />
              <span id="qrLogoRatioVal" class="qr-muted">18%</span>
            </div>
            <div class="qr-option-row qr-option-row--inline">
              <label class="qr-label" for="qrLogoRadius">圆角</label>
              <input id="qrLogoRadius" class="qr-input qr-input--sm" type="number" min="0" max="64" value="10" />
              <label class="qr-label" for="qrLogoPad">内边距</label>
              <input id="qrLogoPad" class="qr-input qr-input--sm" type="number" min="0" max="32" value="6" />
            </div>
            <div class="qr-option-row qr-option-row--inline">
              <label class="qr-label" for="qrLogoBg">Logo 背景</label>
              <input id="qrLogoBg" class="qr-color" type="color" value="#ffffff" />
              <label class="qr-label" for="qrLogoFit">裁剪</label>
              <select id="qrLogoFit" class="qr-select qr-select--sm">
                <option value="contain">包含</option>
                <option value="cover">填满</option>
              </select>
            </div>
            <p id="qrLogoWarn" class="qr-field-warn" hidden></p>
          </div>
        </section>

        <details class="qr-group qr-group--advanced">
          <summary class="qr-group-title">5. 高级设置</summary>
          <p class="qr-hint">高级选项用于微调导出与历史行为。日常使用可保持默认。</p>
          <label class="qr-check"><input id="qrAutoEcH" type="checkbox" checked /> 添加 Logo 时自动切换 H 级纠错</label>
          <label class="qr-check"><input id="qrSelfCheck" type="checkbox" checked /> 生成后自动做识别自检</label>
        </details>
      </div>

      <div class="qr-preview-section">
        <div class="qr-preview-frame">
          <canvas id="qrCanvas" class="qr-canvas"></canvas>
          <div class="qr-placeholder" id="qrPlaceholder">输入内容后自动生成</div>
        </div>
        <div class="qr-version-info" id="qrVersionInfo"></div>
        <div id="qrScanCheck" class="qr-check-box" hidden role="status" aria-live="polite"></div>
        <div class="qr-download-group">
          <button id="qrDownloadPng" class="qr-btn qr-btn--primary" type="button" disabled>下载 PNG</button>
          <button id="qrDownloadSvg" class="qr-btn" type="button" disabled>下载 SVG</button>
        </div>
        <p class="qr-hint qr-hint--center">预览与导出结果一致 · 自检失败仍可下载，但有扫码风险</p>
      </div>
    </div>
  </div>

  <div class="qr-scan-pane" data-pane="scan" id="qrScanPane" role="tabpanel" aria-labelledby="qrScanTab" hidden>
    <div class="qr-upload-zone" id="qrUploadZone">
      <div class="qr-upload-icon" aria-hidden="true">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/>
          <line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
      </div>
      <p class="qr-upload-text">拖拽图片到此处，或点击选择文件</p>
      <p class="qr-upload-hint">支持 PNG、JPG、BMP、GIF 格式</p>
      <input id="qrFileInput" type="file" accept="image/*" hidden />
    </div>
    <div id="qrScanResult" class="qr-scan-result" hidden>
      <div class="qr-scan-preview">
        <img id="qrScanImage" class="qr-scan-img" alt="上传的图片" />
      </div>
      <div class="qr-scan-content">
        <h3 class="qr-scan-title">识别结果</h3>
        <div id="qrScanText" class="qr-scan-text"></div>
        <div class="qr-scan-actions">
          <button id="qrScanCopy" class="qr-btn qr-btn--primary" type="button">复制内容</button>
          <a id="qrScanLink" class="qr-btn" href="#" target="_blank" rel="noopener noreferrer" hidden>打开链接</a>
          <button id="qrScanReset" class="qr-btn" type="button">重新识别</button>
        </div>
      </div>
    </div>
    <div id="qrScanError" class="qr-scan-error" hidden>
      <p>未识别到二维码，请尝试其他图片。</p>
      <button id="qrScanRetry" class="qr-btn" type="button">重新选择</button>
    </div>
  </div>

  <div class="qr-actions">
    <div id="qrToast" class="qr-toast" role="status" aria-live="polite"></div>
  </div>

  <section class="qr-history" aria-label="生成历史">
    <div class="qr-section-head">
      <h3 class="qr-section-title">生成历史</h3>
      <div class="qr-section-actions">
        <button id="qrExportHistory" class="qr-btn qr-btn--sm" type="button">导出</button>
        <button id="qrClearHistory" class="qr-btn qr-btn--sm" type="button">清空</button>
      </div>
    </div>
    <div id="qrHistoryList" class="qr-history-list"></div>
  </section>
</div>`;
}

/* ── Mount ───────────────────────────────────────────── */

export function mountQrcodeTool(mount) {
  if (!(mount instanceof HTMLElement)) return;
  mount.innerHTML = getQrcodeTemplate();

  const $ = (sel) => mount.querySelector(sel);
  const $$ = (sel) => mount.querySelectorAll(sel);

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
  let currentModules = null;
  let currentContent = "";
  let historyRecords = [];
  let generateTimer = null;
  let checkTimer = null;
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
      btn.classList.toggle("qr-ec-btn--active", btn.dataset.ec === style.errorLevel);
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
    if (!checked.ok) {
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

  function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("图片读取失败"));
      reader.readAsDataURL(file);
    });
  }

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

  function switchType(type) {
    currentType = type;
    $$(".qr-type-tab").forEach((btn) => {
      btn.classList.toggle("qr-type-tab--active", btn.dataset.type === type);
    });
    $$(".qr-form").forEach((form) => {
      form.hidden = form.dataset.form !== type;
    });
    scheduleGenerate();
  }

  function switchEc(ec) {
    style.errorLevel = ec;
    $$(".qr-ec-btn").forEach((btn) => {
      btn.classList.toggle("qr-ec-btn--active", btn.dataset.ec === ec);
    });
    scheduleGenerate();
  }

  /* ── Logo ── */

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
      const store = createHistoryStore({ dbName: "toolmap-qrcode", storeName: "history", limit: 30 });
      historyRecords = await store.list();
      renderHistory();
      mount._qrStore = store;
    } catch { /* silent */ }
  }

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

  mount.addEventListener("click", (e) => {
    const tabBtn = e.target.closest(".qr-tab");
    if (tabBtn) switchTab(tabBtn.dataset.tab);

    const typeBtn = e.target.closest(".qr-type-tab");
    if (typeBtn) switchType(typeBtn.dataset.type);

    const ecBtn = e.target.closest(".qr-ec-btn");
    if (ecBtn) switchEc(ecBtn.dataset.ec);
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
  els.logoInput.addEventListener("change", (e) => {
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
  els.uploadZone.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      els.fileInput.click();
    }
  });
  els.uploadZone.addEventListener("click", () => els.fileInput.click());
  els.fileInput.addEventListener("change", (e) => {
    if (e.target.files[0]) handleScan(e.target.files[0]);
  });
  els.uploadZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    els.uploadZone.classList.add("qr-upload-zone--drag");
  });
  els.uploadZone.addEventListener("dragleave", () => els.uploadZone.classList.remove("qr-upload-zone--drag"));
  els.uploadZone.addEventListener("drop", (e) => {
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

  els.historyList.addEventListener("click", async (e) => {
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

let currentQrcodeCleanup = null;

export function unmountQrcodeTool() {
  if (typeof currentQrcodeCleanup === "function") {
    currentQrcodeCleanup();
    currentQrcodeCleanup = null;
  }
}

export { unmountQrcodeTool as unmount };
