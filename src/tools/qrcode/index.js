import { encodeQR } from "./qr-encode.js";
import { renderToCanvas, renderToSVG, renderAtSize, downloadDataUrl, downloadSVG } from "./qr-render.js";
import { decodeFromImage } from "./qr-decode.js";
import { createToast } from "../../shared/toast.js";
import { escapeHtml, escapeAttr } from "../../shared/escape.js";
import { writeClipboard } from "../../shared/clipboard.js";

/* ── 模板 ─────────────────────────────────────────────── */

export function getQrcodeTemplate() {
  return /* html */ `
<div class="qrcode-tool qr-panel qr-panel--enter">
  <!-- 头部 -->
  <div class="qr-head">
    <h2 class="qr-title">二维码生成与解析</h2>
    <p class="qr-lead">输入内容实时生成二维码，或上传图片识别二维码内容。</p>
    <div class="privacy-badge"><strong>本地处理</strong><span>所有操作在浏览器完成，不上传任何数据</span></div>
  </div>

  <div class="capability-strip">
    <span class="capability-pill">文本 / URL</span>
    <span class="capability-pill">WiFi 连接</span>
    <span class="capability-pill">vCard 名片</span>
    <span class="capability-pill">图片识别</span>
    <span class="capability-pill capability-pill--safe">本地处理</span>
  </div>

  <!-- Tab 切换 -->
  <div class="qr-tabs" role="tablist">
    <button class="qr-tab qr-tab--active" data-tab="generate" id="qrGenerateTab" role="tab" aria-selected="true" aria-controls="qrGeneratePane">生成二维码</button>
    <button class="qr-tab" data-tab="scan" id="qrScanTab" role="tab" aria-selected="false" aria-controls="qrScanPane">识别二维码</button>
  </div>

  <!-- 生成面板 -->
  <div class="qr-generate-pane" data-pane="generate" id="qrGeneratePane" role="tabpanel" aria-labelledby="qrGenerateTab">
    <!-- 内容类型选择 -->
    <div class="qr-type-tabs" role="tablist">
      <button class="qr-type-tab qr-type-tab--active" data-type="text" role="tab">文本 / URL</button>
      <button class="qr-type-tab" data-type="wifi" role="tab">WiFi</button>
      <button class="qr-type-tab" data-type="vcard" role="tab">vCard 名片</button>
    </div>

    <div class="qr-main">
      <!-- 输入区 -->
      <div class="qr-input-section">
        <!-- 文本输入 -->
        <div class="qr-form" data-form="text">
          <label class="qr-label" for="qrText">输入文本或网址</label>
          <textarea id="qrText" class="qr-textarea" placeholder="https://example.com 或任意文本..." rows="4"></textarea>
        </div>

        <!-- WiFi 输入 -->
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

        <!-- vCard 输入 -->
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

        <!-- 选项 -->
        <div class="qr-options">
          <div class="qr-option-row">
            <label class="qr-label">纠错等级</label>
            <div class="qr-ec-group" role="radiogroup">
              <button class="qr-ec-btn" data-ec="L" title="7% 容错">L</button>
              <button class="qr-ec-btn qr-ec-btn--active" data-ec="M" title="15% 容错">M</button>
              <button class="qr-ec-btn" data-ec="Q" title="25% 容错">Q</button>
              <button class="qr-ec-btn" data-ec="H" title="30% 容错">H</button>
            </div>
          </div>
          <div class="qr-option-row">
            <label class="qr-label">前景色</label>
            <input id="qrFgColor" class="qr-color" type="color" value="#000000" />
            <label class="qr-label">背景色</label>
            <input id="qrBgColor" class="qr-color" type="color" value="#ffffff" />
          </div>
        </div>
      </div>

      <!-- 预览区 -->
      <div class="qr-preview-section">
        <div class="qr-preview-frame">
          <canvas id="qrCanvas" class="qr-canvas"></canvas>
          <div class="qr-placeholder" id="qrPlaceholder">输入内容后自动生成</div>
        </div>
        <div class="qr-version-info" id="qrVersionInfo"></div>
        <div class="qr-download-group">
          <button id="qrDownloadPng" class="qr-btn qr-btn--primary" disabled>下载 PNG</button>
          <button id="qrDownloadSvg" class="qr-btn" disabled>下载 SVG</button>
        </div>
        <div class="qr-size-select">
          <label class="qr-label">PNG 尺寸</label>
          <select id="qrPngSize" class="qr-select qr-select--sm">
            <option value="256">256 × 256</option>
            <option value="512" selected>512 × 512</option>
            <option value="1024">1024 × 1024</option>
            <option value="2048">2048 × 2048</option>
          </select>
        </div>
      </div>
    </div>
  </div>

  <!-- 识别面板 -->
  <div class="qr-scan-pane" data-pane="scan" id="qrScanPane" role="tabpanel" aria-labelledby="qrScanTab" hidden>
    <div class="qr-upload-zone" id="qrUploadZone">
      <div class="qr-upload-icon">
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
          <button id="qrScanCopy" class="qr-btn qr-btn--primary">复制内容</button>
          <a id="qrScanLink" class="qr-btn" href="#" target="_blank" rel="noopener" hidden>打开链接</a>
          <button id="qrScanReset" class="qr-btn">重新识别</button>
        </div>
      </div>
    </div>
    <div id="qrScanError" class="qr-scan-error" hidden>
      <p>未识别到二维码，请尝试其他图片。</p>
      <button id="qrScanRetry" class="qr-btn">重新选择</button>
    </div>
  </div>

  <!-- 操作区 -->
  <div class="qr-actions">
    <div id="qrToast" class="qr-toast" role="status" aria-live="polite"></div>
  </div>

  <!-- 历史记录 -->
  <section class="qr-history" aria-label="生成历史">
    <div class="qr-section-head">
      <h3 class="qr-section-title">生成历史</h3>
      <div class="qr-section-actions">
        <button id="qrExportHistory" class="qr-btn qr-btn--sm">导出</button>
        <button id="qrClearHistory" class="qr-btn qr-btn--sm">清空</button>
      </div>
    </div>
    <div id="qrHistoryList" class="qr-history-list"></div>
  </section>
</div>`;
}

/* ── Mount 函数 ───────────────────────────────────────── */

export function mountQrcodeTool(mount) {
  if (!(mount instanceof HTMLElement)) return;
  mount.innerHTML = getQrcodeTemplate();

  const $ = (sel) => mount.querySelector(sel);
  const $$ = (sel) => mount.querySelectorAll(sel);

  const els = {
    toast: $("#qrToast"),
    // 生成
    canvas: $("#qrCanvas"),
    placeholder: $("#qrPlaceholder"),
    versionInfo: $("#qrVersionInfo"),
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
    pngSize: $("#qrPngSize"),
    downloadPng: $("#qrDownloadPng"),
    downloadSvg: $("#qrDownloadSvg"),
    // 识别
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
    // 历史
    historyList: $("#qrHistoryList"),
    exportHistory: $("#qrExportHistory"),
    clearHistory: $("#qrClearHistory"),
  };

  const showToast = createToast(els.toast, { showClass: "qr-toast--show", duration: 2600 });

  let currentType = "text";
  let currentEc = "M";
  let currentModules = null;
  let historyRecords = [];

  /* ── 内容编码 ── */

  function buildContent() {
    if (currentType === "text") {
      return els.text.value.trim();
    }
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
      const lines = [
        "BEGIN:VCARD", "VERSION:3.0",
        name ? `FN:${name}` : "",
        phone ? `TEL:${phone}` : "",
        email ? `EMAIL:${email}` : "",
        org ? `ORG:${org}` : "",
        "END:VCARD",
      ].filter(Boolean);
      return lines.join("\n");
    }
    return "";
  }

  /* ── 生成 ── */

  let generateTimer = null;

  function scheduleGenerate() {
    clearTimeout(generateTimer);
    generateTimer = setTimeout(generate, 120);
  }

  function generate() {
    const content = buildContent();
    if (!content) {
      currentModules = null;
      els.placeholder.hidden = false;
      els.canvas.style.display = "none";
      els.downloadPng.disabled = true;
      els.downloadSvg.disabled = true;
      els.versionInfo.textContent = "";
      return;
    }

    try {
      const qr = encodeQR(content, { errorCorrectionLevel: currentEc });
      currentModules = qr.modules;
      renderToCanvas(els.canvas, qr.modules, {
        cellSize: 4,
        foreground: els.fgColor.value,
        background: els.bgColor.value,
      });
      els.placeholder.hidden = true;
      els.canvas.style.display = "block";
      els.downloadPng.disabled = false;
      els.downloadSvg.disabled = false;
      els.versionInfo.textContent = `Version ${qr.version} · ${qr.size}×${qr.size} · ${currentEc}`;
    } catch (err) {
      showToast(err.message || "生成失败");
      currentModules = null;
    }
  }

  /* ── 下载 ── */

  function handleDownloadPng() {
    if (!currentModules) return;
    const size = parseInt(els.pngSize.value, 10);
    const dataURL = renderAtSize(currentModules, size, {
      foreground: els.fgColor.value,
      background: els.bgColor.value,
    });
    downloadDataUrl(dataURL, `qrcode-${size}px.png`);
    showToast(`已下载 ${size}×${size} PNG`);
  }

  function handleDownloadSvg() {
    if (!currentModules) return;
    const svg = renderToSVG(currentModules, {
      foreground: els.fgColor.value,
      background: els.bgColor.value,
    });
    downloadSVG(svg, "qrcode.svg");
    showToast("已下载 SVG");
  }

  /* ── 识别 ── */

  let currentPreviewUrl = null;

  async function handleScan(file) {
    if (!file || !file.type.startsWith("image/")) return;

    els.uploadZone.hidden = true;
    els.scanResult.hidden = true;
    els.scanError.hidden = true;

    // 释放之前的预览 URL
    if (currentPreviewUrl) { URL.revokeObjectURL(currentPreviewUrl); currentPreviewUrl = null; }

    // 显示预览
    const previewUrl = URL.createObjectURL(file);
    currentPreviewUrl = previewUrl;
    els.scanImage.src = previewUrl;

    try {
      const result = await decodeFromImage(file);
      if (result) {
        els.scanResult.hidden = false;
        els.scanText.textContent = result.data;

        // 判断是否为 URL
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
    if (currentPreviewUrl) { URL.revokeObjectURL(currentPreviewUrl); currentPreviewUrl = null; }
    els.uploadZone.hidden = false;
    els.scanResult.hidden = true;
    els.scanError.hidden = true;
    els.fileInput.value = "";
  }

  /* ── Tab 切换 ── */

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
    currentEc = ec;
    $$(".qr-ec-btn").forEach((btn) => {
      btn.classList.toggle("qr-ec-btn--active", btn.dataset.ec === ec);
    });
    scheduleGenerate();
  }

  /* ── 历史记录 ── */

  function renderHistory() {
    if (historyRecords.length === 0) {
      els.historyList.innerHTML = '<p class="qr-history-empty">暂无历史记录</p>';
      return;
    }
    els.historyList.innerHTML = historyRecords.map((r) => `
      <div class="qr-history-item" data-id="${escapeAttr(r.id)}" role="button" tabindex="0">
        <img class="qr-history-thumb" src="${escapeAttr(r.thumbnail)}" alt="二维码缩略图" />
        <div class="qr-history-meta">
          <span class="qr-history-type">${escapeHtml(r.type)}</span>
          <span class="qr-history-content">${escapeHtml(r.content.slice(0, 60))}</span>
          <span class="qr-history-time">${new Date(r.createdAt).toLocaleString("zh-CN")}</span>
        </div>
        <button class="qr-history-del" data-del="${escapeAttr(r.id)}" title="删除" type="button">&times;</button>
      </div>
    `).join("");
  }

  async function loadHistory() {
    try {
      const { createHistoryStore, isHistoryAvailable } = await import("../../shared/history-db.js");
      if (!isHistoryAvailable()) return;
      const store = createHistoryStore({ dbName: "toolmap-qrcode", storeName: "history", limit: 30 });
      historyRecords = await store.list();
      renderHistory();
      // 暴露给外部使用
      mount._qrStore = store;
    } catch { /* IndexedDB 不可用时静默 */ }
  }

  async function saveHistory() {
    if (!currentModules || !mount._qrStore) return;
    try {
      const thumbnail = renderAtSize(currentModules, 64, {
        foreground: els.fgColor.value,
        background: els.bgColor.value,
      });
      const content = buildContent();
      await mount._qrStore.save({
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        createdAt: Date.now(),
        type: currentType,
        content: content.slice(0, 200),
        options: {
          foreground: els.fgColor.value,
          background: els.bgColor.value,
          errorLevel: currentEc,
        },
        thumbnail,
      });
      historyRecords = await mount._qrStore.list();
      renderHistory();
    } catch { /* 存储失败静默 */ }
  }

  /* ── 事件绑定 ── */

  // Tab 切换
  mount.addEventListener("click", (e) => {
    const tabBtn = e.target.closest(".qr-tab");
    if (tabBtn) switchTab(tabBtn.dataset.tab);

    const typeBtn = e.target.closest(".qr-type-tab");
    if (typeBtn) switchType(typeBtn.dataset.type);

    const ecBtn = e.target.closest(".qr-ec-btn");
    if (ecBtn) switchEc(ecBtn.dataset.ec);
  });

  // 输入事件
  els.text.addEventListener("input", scheduleGenerate);
  els.wifiSsid.addEventListener("input", scheduleGenerate);
  els.wifiPass.addEventListener("input", scheduleGenerate);
  els.wifiEnc.addEventListener("change", scheduleGenerate);
  els.vcardName.addEventListener("input", scheduleGenerate);
  els.vcardPhone.addEventListener("input", scheduleGenerate);
  els.vcardEmail.addEventListener("input", scheduleGenerate);
  els.vcardOrg.addEventListener("input", scheduleGenerate);
  els.fgColor.addEventListener("input", scheduleGenerate);
  els.bgColor.addEventListener("input", scheduleGenerate);

  // 下载
  els.downloadPng.addEventListener("click", () => { handleDownloadPng(); saveHistory(); });
  els.downloadSvg.addEventListener("click", () => { handleDownloadSvg(); saveHistory(); });

  // 识别
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
  els.uploadZone.addEventListener("dragover", (e) => { e.preventDefault(); els.uploadZone.classList.add("qr-upload-zone--drag"); });
  els.uploadZone.addEventListener("dragleave", () => els.uploadZone.classList.remove("qr-upload-zone--drag"));
  els.uploadZone.addEventListener("drop", (e) => {
    e.preventDefault();
    els.uploadZone.classList.remove("qr-upload-zone--drag");
    const file = e.dataTransfer.files[0];
    if (file) handleScan(file);
  });

  els.scanCopy.addEventListener("click", async () => {
    const text = els.scanText.textContent;
    const ok = await writeClipboard(text);
    showToast(ok ? "已复制到剪贴板" : "复制失败，请手动选择复制");
  });
  els.scanReset.addEventListener("click", resetScan);
  els.scanRetry?.addEventListener("click", resetScan);

  // 历史记录
  els.historyList.addEventListener("click", async (e) => {
    const delBtn = e.target.closest("[data-del]");
    if (delBtn && mount._qrStore) {
      await mount._qrStore.remove(delBtn.dataset.del);
      historyRecords = await mount._qrStore.list();
      renderHistory();
      return;
    }
    const item = e.target.closest(".qr-history-item");
    if (item) {
      const id = item.dataset.id;
      const record = historyRecords.find((r) => r.id === id);
      if (record) {
        // 恢复到生成模式
        switchTab("generate");
        switchType(record.type);
        if (record.type === "text") els.text.value = record.content;
        if (record.options) {
          els.fgColor.value = record.options.foreground || "#000000";
          els.bgColor.value = record.options.background || "#ffffff";
          if (record.options.errorLevel) switchEc(record.options.errorLevel);
        }
        scheduleGenerate();
      }
    }
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
      const payload = buildExportPayload("qrcode", historyRecords, { version: "1.0" });
      downloadJSON(payload, "qrcode-history.json");
      showToast("已导出历史记录");
    } catch {
      showToast("导出失败");
    }
  });

  // 初始加载
  loadHistory();

  mount._cleanup = () => {
    if (generateTimer) {
      clearTimeout(generateTimer);
      generateTimer = null;
    }
    if (currentPreviewUrl) {
      URL.revokeObjectURL(currentPreviewUrl);
      currentPreviewUrl = null;
    }
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
