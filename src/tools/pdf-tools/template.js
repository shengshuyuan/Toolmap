/**
 * pdf-tools 工具的 HTML 模板（纯字符串，无运行时依赖），从 index.js 拆出以降低主文件体积。
 */

export function getPdfToolsTemplate() {
  return /* html */ `
<div class="pdf-tools-tool pdf-panel pdf-panel--enter">
  <!-- 头部 -->
  <div class="pdf-head">
    <div class="tool-breadcrumb">素材与交付 / PDF 工具</div>
    <h2 class="pdf-title">PDF 工具</h2>
    <p class="pdf-lead">合并、拆分、加水印 — 全部在浏览器本地完成，文件不离开你的设备。</p>
    <div class="privacy-badge"><strong>本地处理</strong><span>所有操作在浏览器完成，不上传任何文件</span></div>
  </div>

  <div class="capability-strip">
    <span class="capability-pill">合并</span>
    <span class="capability-pill">拆分</span>
    <span class="capability-pill">加水印</span>
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
