/**
 * image-compress 工具的 HTML 模板（纯字符串，无运行时依赖），从 index.js 拆出以降低主文件体积。
 */

export function getImageCompressTemplate() {
  return `
  <div class="image-compress-tool image-panel image-panel--enter" aria-labelledby="image-compress-title">
    <div class="image-head">
      <div>
        <div class="tool-breadcrumb">素材与交付 / 图片压缩</div>
        <h2 id="image-compress-title" class="image-title">图片压缩</h2>
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
