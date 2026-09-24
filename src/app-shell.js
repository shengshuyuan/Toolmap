/**
 * App Shell 视图架构与导航渲染
 * 对应设计稿 01-workbench.png / 02-text-diff.png 与交接文档 Section 3 / Section 6
 */

/**
 * 渲染侧栏导航按钮
 * @param {Array<import('./tool-registry.js').ToolConfig>} registry
 */
export function renderToolSwitchMarkup(registry) {
  const docTools = registry.filter((t) => t.categoryKey === "doc-review" || t.category === "文档与评审");
  const assetTools = registry.filter((t) => t.categoryKey === "asset-delivery" || t.category === "素材与交付");

  return `
    <div class="nav-section nav-section--main">
      <button class="nav-btn" type="button" data-nav-target="workbench" id="navBtnWorkbench">
        <span class="nav-btn__icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        </span>
        <span class="nav-btn__label">工作台</span>
      </button>
      <button class="nav-btn" type="button" data-nav-target="recent" id="navBtnRecent">
        <span class="nav-btn__icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        </span>
        <span class="nav-btn__label">最近使用</span>
      </button>
    </div>

    <div class="nav-group">
      <div class="nav-group__title">文档与评审</div>
      <div class="nav-group__items">
        ${docTools
          .map(
            (tool) => `
          <button class="tool-switch__btn nav-btn" type="button" data-tool-target="${tool.id}" id="navTool-${tool.id}">
            <span class="nav-btn__icon">${tool.iconSvg || ""}</span>
            <span class="nav-btn__label">${tool.buttonLabel}</span>
          </button>
        `
          )
          .join("")}
      </div>
    </div>

    <div class="nav-group">
      <div class="nav-group__title">素材与交付</div>
      <div class="nav-group__items">
        ${assetTools
          .map(
            (tool) => `
          <button class="tool-switch__btn nav-btn" type="button" data-tool-target="${tool.id}" id="navTool-${tool.id}">
            <span class="nav-btn__icon">${tool.iconSvg || ""}</span>
            <span class="nav-btn__label">${tool.buttonLabel}</span>
          </button>
        `
          )
          .join("")}
      </div>
    </div>
  `;
}

/**
 * 渲染挂载容器
 * @param {Array<import('./tool-registry.js').ToolConfig>} registry
 */
export function renderToolMountMarkup(registry) {
  const customMounts = `
    <section id="workbenchMount" class="tool-mount" data-view="workbench"></section>
    <section id="recentMount" class="tool-mount" data-view="recent" hidden></section>
    <section id="dataManageMount" class="tool-mount" data-view="data-manage" hidden></section>
  `;
  const toolMounts = registry
    .map((tool) => `<section id="${tool.mountId}" class="tool-mount" data-tool="${tool.id}" hidden></section>`)
    .join("");

  return customMounts + toolMounts;
}
