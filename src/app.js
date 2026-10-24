import { APP_TITLE, APP_VERSION, BUILD_LABEL } from "./config/app-meta.js";
import { createLatestNavigationQueue } from "./navigation-state.js";
import { html } from "./shared/html.js";

/**
 * @typedef {Object} ShowToolOptions
 * @property {boolean} [updateHash]
 * @property {string | null} [restoreId]
 */

/**
 * 启动入口：动态加载注册表与 Shell，管理工具与工作台生命周期
 * 注意：保持 createLatestNavigationQueue 与 isLatest() 串行导航保护
 */
async function bootstrap() {
  const { renderToolMountMarkup, renderToolSwitchMarkup } = await import(
    `./app-shell.js?v=${APP_VERSION}`
  );
  const { TOOL_REGISTRY, getToolById, getToolIds } = await import(
    `./tool-registry.js?v=${APP_VERSION}`
  );
  const { createSearchModal } = await import(
    `./search-modal.js?v=${APP_VERSION}`
  );

  const mountedTools = new Set();
  const mountingTools = new Map();
  const loadedModules = new Map();
  const navigationQueue = createLatestNavigationQueue();
  /** @type {string | null} */
  let currentToolKey = null;

  /** @param {string} id */
  function $(id) {
    return document.getElementById(id);
  }

  function setShellMeta() {
    const year = $("year");
    if (year) year.textContent = String(new Date().getFullYear());
    const version = $("appVersionLabel");
    if (version) version.textContent = `v${APP_VERSION} · ${BUILD_LABEL}`;
    try {
      console.info(
        `[Toolmap] v${APP_VERSION} initialized with ${TOOL_REGISTRY.length} tools`
      );
    } catch (_) {}
  }

  function readInitialTool() {
    const hash = window.location.hash.replace(/^#/, "");
    if (hash === "workbench" || hash === "" || hash === "/") return "workbench";
    if (hash === "recent") return "recent";
    if (hash === "data-manage") return "data-manage";
    return getToolIds().includes(hash) ? hash : "workbench";
  }

  function renderToolShell() {
    const switchRoot = $("toolSwitch");
    const mountsRoot = $("toolMounts");
    if (switchRoot) switchRoot.innerHTML = renderToolSwitchMarkup(TOOL_REGISTRY);
    if (mountsRoot) mountsRoot.innerHTML = renderToolMountMarkup(TOOL_REGISTRY);
  }

  /** @param {string} toolKey */
  function setShellCopy(toolKey) {
    const tool = getToolById(toolKey);
    if (tool) {
      document.title = `${tool.buttonLabel} - ${APP_TITLE}`;
    } else if (toolKey === "workbench") {
      document.title = `工作台 - ${APP_TITLE}`;
    } else if (toolKey === "recent") {
      document.title = `最近使用 - ${APP_TITLE}`;
    } else if (toolKey === "data-manage") {
      document.title = `本地数据管理 - ${APP_TITLE}`;
    }
  }

  /** @param {string} toolKey */
  function updateSwitch(toolKey) {
    // 工具按钮
    document.querySelectorAll("[data-tool-target]").forEach((button) => {
      const isActive = button.getAttribute("data-tool-target") === toolKey;
      button.classList.toggle("tool-switch__btn--active", isActive);
      button.classList.toggle("nav-btn--active", isActive);
      if (isActive) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });

    // Shell 内置视图导航项
    document.querySelectorAll("[data-nav-target]").forEach((button) => {
      const isActive = button.getAttribute("data-nav-target") === toolKey;
      button.classList.toggle("nav-btn--active", isActive);
      if (isActive) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });
  }

  const styleLoads = new Map();

  /**
   * 按需注入工具专属样式；样式加载失败不阻塞工具挂载（无样式仍可用）。
   * @param {import('./tool-registry.js').ToolConfig} tool
   */
  function ensureToolStyles(tool) {
    if (!tool.cssPath) return Promise.resolve();
    if (styleLoads.has(tool.id)) return styleLoads.get(tool.id);
    const href = new URL(`${tool.cssPath}?v=${APP_VERSION}`, import.meta.url).href;
    const promise = /** @type {Promise<void>} */ (new Promise((resolve) => {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      link.dataset.toolStyle = tool.id;
      link.addEventListener("load", () => resolve(undefined), { once: true });
      link.addEventListener(
        "error",
        () => {
          console.warn(`[style] ${tool.id} stylesheet failed to load`);
          resolve(undefined);
        },
        { once: true }
      );
      document.head.appendChild(link);
    }));
    styleLoads.set(tool.id, promise);
    return promise;
  }

  /** @param {import('./tool-registry.js').ToolConfig} tool */
  async function loadToolModule(tool) {
    if (loadedModules.has(tool.id)) return loadedModules.get(tool.id);
    const promise = Promise.all([
      import(`${tool.importPath}?v=${APP_VERSION}`),
      ensureToolStyles(tool),
    ])
      .then(([mod]) => mod)
      .catch((err) => {
        loadedModules.delete(tool.id);
        styleLoads.delete(tool.id);
        throw err;
      });
    loadedModules.set(tool.id, promise);
    return promise;
  }

  /** @param {string} toolKey */
  async function unmountTool(toolKey) {
    if (toolKey === "workbench" || toolKey === "recent" || toolKey === "data-manage") {
      mountedTools.delete(toolKey);
      return;
    }
    const tool = getToolById(toolKey);
    if (!tool) return;
    const mount = $(tool.mountId);
    if (mount && typeof mount._cleanup === "function") {
      try {
        mount._cleanup();
      } catch (err) {
        console.warn(`[unmount mount._cleanup] ${toolKey} failed:`, err);
      }
      delete mount._cleanup;
    }
    if (loadedModules.has(toolKey)) {
      try {
        const mod = await loadedModules.get(toolKey);
        const unmountFn = mod.unmount || mod[`unmount${tool.exportName.slice(5)}`];
        if (typeof unmountFn === "function") {
          unmountFn();
        }
      } catch (err) {
        console.warn(`[unmount] ${toolKey} failed:`, err);
      }
    }
    mountedTools.delete(toolKey);
  }

  /** @param {string} toolKey */
  function focusToolHeading(toolKey) {
    const mountId = toolKey === "workbench"
      ? "workbenchMount"
      : toolKey === "recent"
        ? "recentMount"
        : toolKey === "data-manage"
          ? "dataManageMount"
          : getToolById(toolKey)?.mountId;
    if (!mountId) return;
    const mount = $(mountId);
    if (mount) {
      const heading = mount.querySelector(
        "h1, h2, .panel__title, .char-title, .qr-title, .md-title, .pdf-title, .wb-hero__title"
      );
      if (heading instanceof HTMLElement) {
        if (!heading.hasAttribute("tabindex")) heading.setAttribute("tabindex", "-1");
        heading.focus();
      }
    }
  }

  /**
   * @param {string} key
   * @param {{ restoreId?: string | null }} [options]
   */
  async function mountViewOrTool(key, options = {}) {
    if (key === "workbench") {
      const mount = $("workbenchMount");
      if (mount) {
        const { mountWorkbench } = await import(`./workbench.js?v=${APP_VERSION}`);
        await mountWorkbench(mount, {
          onNavigate: (/** @type {string} */ tgt, /** @type {ShowToolOptions} */ opts) => showTool(tgt, opts),
          onOpenSearch: () => searchModal.open(),
        });
      }
      mountedTools.add("workbench");
      return;
    }

    if (key === "recent") {
      const mount = $("recentMount");
      if (mount) {
        const { mountRecentView } = await import(`./recent-view.js?v=${APP_VERSION}`);
        await mountRecentView(mount, {
          onNavigate: (/** @type {string} */ tgt, /** @type {ShowToolOptions} */ opts) => showTool(tgt, opts),
        });
      }
      mountedTools.add("recent");
      return;
    }

    if (key === "data-manage") {
      const mount = $("dataManageMount");
      if (mount) {
        const { mountDataManageView } = await import(`./data-manage.js?v=${APP_VERSION}`);
        await mountDataManageView(mount, {
          onNavigate: (/** @type {string} */ tgt, /** @type {ShowToolOptions} */ opts) => showTool(tgt, opts),
        });
      }
      mountedTools.add("data-manage");
      return;
    }

    const tool = getToolById(key);
    if (!tool) return;
    const mount = $(tool.mountId);
    if (!mount) return;

    if (options.restoreId) {
      if (key === "text-diff") {
        sessionStorage.setItem("toolmap_restore_text_diff", options.restoreId);
      } else if (key === "markdown-editor") {
        sessionStorage.setItem("toolmap_restore_markdown", options.restoreId);
      }
    }

    if (mountedTools.has(key)) return;
    if (mountingTools.has(key)) return mountingTools.get(key);

    const mounting = (async () => {
      const mod = await loadToolModule(tool);
      const mountFn = mod?.[tool.exportName];
      if (typeof mountFn !== "function") throw new Error(`工具 ${tool.id} 缺少挂载函数 ${tool.exportName}`);
      try {
        await mountFn(mount);
      } catch (err) {
        console.error(`[mount] ${tool.id} failed:`, err);
        mount.innerHTML = html`<div class="tool-error">工具加载失败：${err.message}</div>`.toString();
        return;
      }
      mountedTools.add(key);
    })();

    mountingTools.set(key, mounting);
    try {
      await mounting;
    } finally {
      mountingTools.delete(key);
    }
  }

  /**
   * @param {string} toolKey
   * @param {ShowToolOptions} [options]
   */
  function showTool(toolKey, { updateHash = true, restoreId = null } = {}) {
    return navigationQueue.run(async (/** @type {() => boolean} */ isLatest) => {
      if (!isLatest()) return;

      const validKeys = ["workbench", "recent", "data-manage", ...getToolIds()];
      const key = validKeys.includes(toolKey) ? toolKey : "workbench";

      updateSwitch(key);
      setShellCopy(key);

      if (currentToolKey && currentToolKey !== key) {
        await unmountTool(currentToolKey);
        if (!isLatest()) return;
      }

      await mountViewOrTool(key, { restoreId });
      if (!isLatest()) {
        if (key !== currentToolKey) await unmountTool(key);
        return;
      }

      currentToolKey = key;

      // 切换 mount 可见性
      const allMounts = [
        { id: "workbenchMount", key: "workbench" },
        { id: "recentMount", key: "recent" },
        { id: "dataManageMount", key: "data-manage" },
        ...TOOL_REGISTRY.map((/** @type {import('./tool-registry.js').ToolConfig} */ t) => ({ id: t.mountId, key: t.id })),
      ];

      allMounts.forEach(({ id, key: mKey }) => {
        const el = $(id);
        if (el) el.hidden = mKey !== key;
      });

      const hashTarget = key === "workbench" ? "" : `#${key}`;
      if (updateHash && window.location.hash !== hashTarget) {
        history.replaceState(null, "", hashTarget || window.location.pathname);
      }

      focusToolHeading(key);
      closeMobileSidebar();
      window.scrollTo({ top: 0, behavior: "instant" });
    });
  }

  // 快捷全局搜索弹窗
  const searchModal = createSearchModal({
    onNavigate: (/** @type {string} */ tgt, /** @type {ShowToolOptions} */ opts) => showTool(tgt, opts),
  });

  // 移动端侧栏抽屉
  const sidebarEl = $("siteSidebar");
  const sidebarBackdrop = $("sidebarBackdrop");
  const btnMobileMenu = $("btnMobileMenu");
  const btnCloseSidebar = $("btnCloseSidebar");

  function openMobileSidebar() {
    if (sidebarEl) sidebarEl.classList.add("sidebar--open");
    if (sidebarBackdrop) sidebarBackdrop.hidden = false;
  }

  function closeMobileSidebar() {
    if (sidebarEl) sidebarEl.classList.remove("sidebar--open");
    if (sidebarBackdrop) sidebarBackdrop.hidden = true;
  }

  if (btnMobileMenu) btnMobileMenu.addEventListener("click", openMobileSidebar);
  if (btnCloseSidebar) btnCloseSidebar.addEventListener("click", closeMobileSidebar);
  if (sidebarBackdrop) sidebarBackdrop.addEventListener("click", closeMobileSidebar);

  // 键盘快捷键 ⌘K（在输入框、文本域内或已被消费时不触发全局弹窗）
  window.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      const target = e.target;
      const isInput = target instanceof HTMLElement && (
        target.isContentEditable ||
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT"
      );
      if (isInput || e.defaultPrevented) return;
      e.preventDefault();
      searchModal.open();
    }
  });

  const sidebarSearchBtn = $("sidebarSearchBtn");
  if (sidebarSearchBtn) {
    sidebarSearchBtn.addEventListener("click", () => searchModal.open());
  }

  function bindNavigation() {
    document.addEventListener("click", (e) => {
      const target = /** @type {HTMLElement} */ (e.target);
      const toolBtn = target.closest("[data-tool-target]");
      if (toolBtn) {
        const tgt = toolBtn.getAttribute("data-tool-target");
        if (tgt) {
          e.preventDefault();
          void showTool(tgt);
          return;
        }
      }

      const navBtn = target.closest("[data-nav-target]");
      if (navBtn) {
        const tgt = navBtn.getAttribute("data-nav-target");
        if (tgt) {
          e.preventDefault();
          void showTool(tgt);
        }
      }
    });

    window.addEventListener("hashchange", () => void showTool(readInitialTool(), { updateHash: false }));
  }

  renderToolShell();
  setShellMeta();
  bindNavigation();
  void showTool(readInitialTool(), { updateHash: false });
}

bootstrap().catch((err) => {
  console.error("[Toolmap] bootstrap failed:", err);
  const mounts = document.getElementById("toolMounts");
  if (mounts) {
    mounts.innerHTML = html`<div class="tool-error">应用启动失败：${String(err?.message || err)}</div>`.toString();
  }
});
