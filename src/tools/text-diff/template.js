/**
 * text-diff 工具的 HTML 模板（纯字符串，无运行时依赖），从 index.js 拆出以降低主文件体积。
 */

export function getTextDiffTemplate() {
  return `
  <div class="text-diff-tool panel panel--enter" aria-labelledby="diff-title">
    <div class="diff-header-bar">
      <div class="diff-header-bar__left">
        <div class="diff-breadcrumb">文档与评审 / 文本比对</div>
        <h1 id="diff-title" class="diff-page-title">文本比对</h1>
        <p class="diff-page-subtitle">看清每一处修改。</p>
      </div>
      <div class="diff-header-bar__actions">
        <button id="btnOpenHistory" class="btn btn--outline" type="button">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          历史记录
        </button>
        <button id="btnCompare" class="btn btn--primary" type="button">
          开始比对
        </button>
      </div>
    </div>

    <div class="diff-control-bar">
      <div class="diff-control-bar__left">
        <div class="diff-view-tabs" role="tablist">
          <button type="button" class="diff-tab-btn diff-tab-btn--active" id="tabViewSide" role="tab" aria-selected="true">左右对照</button>
          <button type="button" class="diff-tab-btn" id="tabViewInline" role="tab" aria-selected="false">逐条查看</button>
        </div>
        <button type="button" class="btn btn--xs btn--subtle" id="btnBackToEdit" hidden>返回编辑</button>
      </div>

      <div class="diff-control-bar__right">
        <label class="diff-switch-label" title="比对时忽略空格与空行差异（不修改原文）">
          <input type="checkbox" id="chkIgnoreWhitespace" class="diff-switch-input" />
          <span class="diff-switch-text">忽略空白</span>
        </label>

        <div class="diff-more-dropdown-wrap">
          <button type="button" class="btn btn--sm btn--outline" id="btnMoreToggle">
            更多 ▾
          </button>
          <div class="diff-more-menu" id="moreDropdownMenu" hidden>
            <button type="button" class="diff-menu-item" id="btnClean">清空空行</button>
            <button type="button" class="diff-menu-item" id="btnSwap">交换文本</button>
            <button type="button" class="diff-menu-item" id="btnLoadDemo">载入需求变更示例</button>
            <div class="diff-menu-divider"></div>
            <button type="button" class="diff-menu-item diff-menu-item--danger" id="btnClear">清空全部文本</button>
          </div>
        </div>
      </div>
    </div>

    <div id="diffStaleBanner" class="diff-stale-banner" hidden>
      <span>输入内容已更新，当前展示的为旧比对结果。点击「开始比对」重新计算。</span>
    </div>

    <!-- 舞台区域：编辑与差异同台切换 -->
    <div class="diff-stage" id="diffStage">
      <!-- 1. 编辑模式 -->
      <div class="diff-stage-editor" id="stageEditor">
        <div class="diff-editor-pane">
          <div class="diff-pane-head">
            <div class="diff-pane-head__left">
              <span class="diff-pane-label">原文本</span>
              <span class="diff-pane-sub">Original</span>
            </div>
            <div class="diff-pane-head__right">
              <label class="diff-file-import-btn" title="导入本地文件">
                <input type="file" id="fileInputLeft" accept=".txt,.md,.json,.js,.ts,.html,.css,.csv,.xml" hidden />
                导入 ⭡
              </label>
              <button type="button" class="diff-pane-clear-btn" id="btnClearLeft">清空</button>
            </div>
          </div>
          <div class="editor" aria-label="原文本编辑器">
            <div id="leftGutter" class="editor__gutter" aria-hidden="true"></div>
            <div class="editor__content">
              <div id="leftHL" class="editor__hl" aria-hidden="true"></div>
              <textarea
                id="leftText"
                class="textarea textarea--overlay"
                wrap="off"
                spellcheck="false"
                placeholder="粘贴原始需求、说明或旧版代码…"
              ></textarea>
            </div>
          </div>
        </div>

        <div class="diff-editor-pane">
          <div class="diff-pane-head">
            <div class="diff-pane-head__left">
              <span class="diff-pane-label">对比文本</span>
              <span class="diff-pane-sub">Changed</span>
            </div>
            <div class="diff-pane-head__right">
              <label class="diff-file-import-btn" title="导入本地文件">
                <input type="file" id="fileInputRight" accept=".txt,.md,.json,.js,.ts,.html,.css,.csv,.xml" hidden />
                导入 ⭡
              </label>
              <button type="button" class="diff-pane-clear-btn" id="btnClearRight">清空</button>
            </div>
          </div>
          <div class="editor" aria-label="对比文本编辑器">
            <div id="rightGutter" class="editor__gutter" aria-hidden="true"></div>
            <div class="editor__content">
              <div id="rightHL" class="editor__hl" aria-hidden="true"></div>
              <textarea
                id="rightText"
                class="textarea textarea--overlay"
                wrap="off"
                spellcheck="false"
                placeholder="粘贴修改后的需求、新版说明或对比材料…"
              ></textarea>
            </div>
          </div>
        </div>
      </div>

      <!-- 2. 差异查看模式 -->
      <div class="diff-stage-result" id="stageResult" hidden>
        <div id="diffView" class="diff-view" role="region" aria-label="差异结果区">
          <div class="diff-empty">还没有结果。点击上方「开始比对」。</div>
        </div>
      </div>
    </div>

    <!-- 底部常驻栏：统计、定位导航、复制摘要 -->
    <footer class="diff-bottom-bar" id="diffBottomBar">
      <div class="diff-bottom-bar__left">
        <div class="diff-stats-counts" id="diffStatsCounts">
          修改 <b id="statModCount">0</b> · <span class="stat--add">新增 <b id="statAddCount">0</b></span> · <span class="stat--del">删除 <b id="statDelCount">0</b></span>
        </div>
        <div id="statusText" class="diff-status-tip">准备就绪。快捷键 ⌘/Ctrl + Enter。</div>
        <div id="diffCount" hidden>0</div>
      </div>

      <div class="diff-bottom-bar__center">
        <div class="diff-nav-pill">
          <span id="statNavIndex">第 0 / 0 处</span>
          <button id="btnPrev" class="diff-nav-btn" type="button" title="上一处修改" disabled>↑</button>
          <button id="btnNext" class="diff-nav-btn" type="button" title="下一处修改" disabled>↓</button>
        </div>
      </div>

      <div class="diff-bottom-bar__right">
        <button id="btnCopy" class="btn btn--outline" type="button">
          复制差异摘要
        </button>
      </div>
    </footer>

    <div id="compareHints" class="compare-hints" hidden></div>
    <div id="toast" class="toast" role="status" aria-live="polite"></div>

    <!-- 历史记录抽屉 -->
    <div id="historyDrawerBackdrop" class="drawer-backdrop" hidden></div>
    <aside id="historyDrawer" class="text-history-drawer" aria-label="文本比对历史记录" hidden>
      <div class="text-history">
        <div class="text-history__head">
          <div>
            <h2 class="text-history__title">历史记录</h2>
            <div id="textHistoryMeta" class="text-history__sub">保存两侧文本和比对摘要，仅当前浏览器本地可见。</div>
          </div>
          <button type="button" class="drawer-close-btn" id="btnCloseHistoryDrawer" aria-label="关闭历史记录">✕</button>
        </div>

        <div class="text-history__actions">
          <button id="btnRefreshTextHistory" class="history-mini-btn" type="button">刷新</button>
          <button id="btnExportTextHistory" class="history-mini-btn" type="button">导出</button>
          <button id="btnClearTextHistory" class="history-mini-btn history-mini-btn--danger" type="button" disabled>清空历史</button>
        </div>

        <div id="textHistoryList" class="text-history__list">
          <div class="diff-empty">比对完成后会自动保存到这里。</div>
        </div>
      </div>
    </aside>
  </div>
`;
}
