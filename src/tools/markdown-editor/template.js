/**
 * markdown-editor 工具的 HTML 模板（纯字符串，无运行时依赖），从 index.js 拆出以降低主文件体积。
 */

export function getMarkdownEditorTemplate() {
  return /* html */ `
<div class="markdown-editor-tool md-panel md-panel--enter" id="mdRoot">
  <button type="button" class="md-exit-fullscreen" id="mdExitFullscreen" hidden>退出沉浸</button>
  <div class="md-head">
    <div>
      <div class="tool-breadcrumb">文档与评审 / Markdown</div>
      <h2 class="md-title">Markdown 创作台</h2>
      <p class="md-lead">Markdown / HTML 导入 · 实时预览 · 本地保存 · 沉浸式写作</p>
      <div class="privacy-badge"><strong>本地处理</strong><span>文档不上传服务器，草稿保存在本机浏览器</span></div>
    </div>
    <div class="md-head-actions">
      <button type="button" class="md-btn md-btn--sm" id="mdImportBtn">导入</button>
      <input id="mdFileInput" type="file" accept=".md,.markdown,.txt,.html,.htm,text/markdown,text/html,text/plain" hidden />
      <button type="button" class="md-btn md-btn--sm" id="mdNewDoc">新建</button>
      <button type="button" class="md-btn md-btn--sm md-btn--primary" id="mdSaveBtn">保存</button>
      <button type="button" class="md-btn md-btn--sm" id="mdFullscreenBtn">沉浸式</button>
    </div>
  </div>

  <div class="capability-strip">
    <span class="capability-pill">实时预览</span>
    <span class="capability-pill">HTML 导入</span>
    <span class="capability-pill">大纲</span>
    <span class="capability-pill">本地草稿</span>
    <span class="capability-pill capability-pill--safe">离线可用</span>
  </div>

  <div class="md-toolbar" role="toolbar" aria-label="格式工具栏">
    <div class="md-toolbar-scroll">
      <button type="button" class="md-tb" data-fmt="h1" title="标题1">H1</button>
      <button type="button" class="md-tb" data-fmt="h2" title="标题2">H2</button>
      <button type="button" class="md-tb" data-fmt="h3" title="标题3">H3</button>
      <button type="button" class="md-tb" data-fmt="bold" title="加粗 (⌘B)"><b>B</b></button>
      <button type="button" class="md-tb" data-fmt="italic" title="斜体 (⌘I)"><i>I</i></button>
      <button type="button" class="md-tb" data-fmt="strike" title="删除线"><s>S</s></button>
      <button type="button" class="md-tb" data-fmt="link" title="链接 (⌘K)">链接</button>
      <button type="button" class="md-tb" data-fmt="image" title="图片">图片</button>
      <button type="button" class="md-tb" data-fmt="quote" title="引用">引用</button>
      <button type="button" class="md-tb" data-fmt="ul" title="无序列表">• 列表</button>
      <button type="button" class="md-tb" data-fmt="ol" title="有序列表">1. 列表</button>
      <button type="button" class="md-tb" data-fmt="task" title="任务列表">☐ 任务</button>
      <button type="button" class="md-tb" data-fmt="code" title="行内代码">\`code\`</button>
      <button type="button" class="md-tb" data-fmt="codeblock" title="代码块">\`\`\`</button>
      <button type="button" class="md-tb" data-fmt="table" title="表格">表格</button>
      <button type="button" class="md-tb" data-fmt="hr" title="分割线">—</button>
      <button type="button" class="md-tb" data-fmt="find" title="查找 (⌘F)">查找</button>
      <button type="button" class="md-tb" data-fmt="clean-escapes" title="清理多余反斜杠转义（如将 4\.3\. 净化为 4.3.）">净化转义</button>
    </div>
    <div class="md-mode-switch" role="group" aria-label="视图模式">
      <button type="button" class="md-mode" data-mode="edit">编辑</button>
      <button type="button" class="md-mode md-mode--active" data-mode="split">分屏</button>
      <button type="button" class="md-mode" data-mode="preview">预览</button>
    </div>
  </div>

  <div class="md-meta-row">
    <input id="mdTitle" class="md-title-input" type="text" placeholder="文档标题" maxlength="120" />
    <span id="mdSaveStatus" class="md-save-status">未保存</span>
    <label class="md-sync-label"><input id="mdSyncScroll" type="checkbox" checked /> 同步滚动</label>
  </div>

  <div class="md-workspace" id="mdWorkspace">
    <aside class="md-outline" id="mdOutlinePane" aria-label="文档大纲">
      <div class="md-outline-head">
        <strong>大纲</strong>
        <button type="button" class="md-btn md-btn--sm md-outline-toggle" id="mdOutlineToggle" aria-expanded="true" aria-controls="mdOutlinePane">收起</button>
      </div>
      <div id="mdOutline" class="md-outline-list"></div>
    </aside>

    <div class="md-editor-pane" id="mdEditorPane">
      <label class="md-sr-only" for="mdEditor">Markdown 编辑区</label>
      <textarea id="mdEditor" class="md-editor" spellcheck="true" placeholder="# 标题&#10;&#10;开始写作…"></textarea>
      <div id="mdDropHint" class="md-drop-hint" hidden>松开以导入文件</div>
    </div>

    <div class="md-splitter" id="mdSplitter" role="separator" aria-orientation="vertical" aria-label="调整分屏比例" tabindex="0"></div>

    <div class="md-preview-pane" id="mdPreviewPane">
      <div id="mdPreview" class="md-preview" tabindex="0"></div>
    </div>
  </div>

  <div class="md-footer-bar">
    <div id="mdStats" class="md-stats"></div>
    <div class="md-export-actions">
      <button type="button" class="md-btn md-btn--sm" id="mdCopyMd">复制 MD</button>
      <button type="button" class="md-btn md-btn--sm" id="mdCopyHtml">复制 HTML</button>
      <button type="button" class="md-btn md-btn--sm" id="mdExportMd">导出 .md</button>
      <button type="button" class="md-btn md-btn--sm" id="mdExportHtml">导出 HTML</button>
    </div>
  </div>

  <section class="md-docs" aria-label="最近文档">
    <div class="md-docs-head">
      <h3>最近草稿</h3>
      <button type="button" class="md-btn md-btn--sm" id="mdClearDocs">清空全部</button>
    </div>
    <div id="mdDocList" class="md-doc-list"></div>
  </section>

  <div id="mdFindBar" class="md-find-bar" hidden>
    <input id="mdFindInput" class="md-input" type="text" placeholder="查找" />
    <input id="mdReplaceInput" class="md-input" type="text" placeholder="替换为" />
    <button type="button" class="md-btn md-btn--sm" id="mdFindNext">下一个</button>
    <button type="button" class="md-btn md-btn--sm" id="mdReplaceOne">替换</button>
    <button type="button" class="md-btn md-btn--sm" id="mdReplaceAll">全部替换</button>
    <button type="button" class="md-btn md-btn--sm" id="mdFindClose">关闭</button>
  </div>

  <div id="mdToast" class="md-toast" role="status" aria-live="polite"></div>
</div>`;
}
