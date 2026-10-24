/**
 * qrcode 工具的 HTML 模板（纯字符串，无运行时依赖），从 index.js 拆出以降低主文件体积。
 */

export function getQrcodeTemplate() {
  return /* html */ `
<div class="qrcode-tool qr-panel qr-panel--enter">
  <div class="qr-head">
    <div class="tool-breadcrumb">素材与交付 / 二维码</div>
    <h2 class="qr-title">二维码设计与识别</h2>
    <p class="qr-lead">输入内容实时生成二维码，支持外框、Logo 与可扫描性自检；识别全程本地完成。</p>
    <div class="privacy-badge"><strong>本地处理</strong><span>内容、Logo 与图片均不上传服务器</span></div>
  </div>

  <div class="capability-strip">
    <span class="capability-pill">文本 / URL</span>
    <span class="capability-pill">WiFi / vCard</span>
    <span class="capability-pill">外框 · Logo</span>
    <span class="capability-pill">扫描自检</span>
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
          <div class="qr-type-tabs" role="tablist" aria-label="内容类型">
            <button class="qr-type-tab qr-type-tab--active" data-type="text" type="button" role="tab" aria-selected="true">文本 / URL</button>
            <button class="qr-type-tab" data-type="wifi" type="button" role="tab" aria-selected="false">WiFi</button>
            <button class="qr-type-tab" data-type="vcard" type="button" role="tab" aria-selected="false">vCard 名片</button>
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
              <button class="qr-ec-btn" data-ec="L" type="button" role="radio" aria-checked="false" title="7% 容错">L</button>
              <button class="qr-ec-btn qr-ec-btn--active" data-ec="M" type="button" role="radio" aria-checked="true" title="15% 容错">M</button>
              <button class="qr-ec-btn" data-ec="Q" type="button" role="radio" aria-checked="false" title="25% 容错">Q</button>
              <button class="qr-ec-btn" data-ec="H" type="button" role="radio" aria-checked="false" title="30% 容错">H</button>
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
