import { APP_TITLE, APP_VERSION, BUILD_LABEL } from "./config/app-meta.js";
import { createLatestNavigationQueue } from "./navigation-state.js";
import { escapeHtml } from "./shared/escape.js";

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
  let currentToolKey = null;

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

  function setShellCopy(toolKey) {
    const tool = getToolById(toolKey);
    const title = $("shellTitle");
    const subtitle = $("shellSubtitle");
    const name = $("shellToolName");
    const hint = $("shellToolHint");

    if (tool) {
      if (title) title.textContent = tool.title;
      if (subtitle) {
        subtitle.textContent = "";
        if (tool.subtitlePrefix) subtitle.appendChild(document.createTextNode(tool.subtitlePrefix));
        if (tool.subtitleBadge) {
          const badgeEl = document.createElement("span");
          badgeEl.className = "badge";
          badgeEl.textContent = tool.subtitleBadge;
          subtitle.appendChild(badgeEl);
        }
        if (tool.subtitleSuffix) subtitle.appendChild(document.createTextNode(tool.subtitleSuffix));
        if (!tool.subtitlePrefix && !tool.subtitleBadge) {
          subtitle.textContent = tool.subtitle;
        }
      }
      if (name) name.textContent = tool.name;
      if (hint) hint.textContent = tool.hint;
      document.title = `${tool.buttonLabel} - ${APP_TITLE}`;
    } else if (toolKey === "workbench") {
      if (title) title.textContent = "工作台";
      if (subtitle) subtitle.textContent = "产品经理的本地工作台";
      document.title = `工作台 - ${APP_TITLE}`;
    } else if (toolKey === "recent") {
      if (title) title.textContent = "最近使用";
      if (subtitle) subtitle.textContent = "跨工具历史记录与草稿";
      document.title = `最近使用 - ${APP_TITLE}`;
    } else if (toolKey === "data-manage") {
      if (title) title.textContent = "本地数据管理";
      if (subtitle) subtitle.textContent = "存储容量与备份";
      document.title = `本地数据管理 - ${APP_TITLE}`;
    }
  }

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

  async function loadToolModule(tool) {
    if (loadedModules.has(tool.id)) return loadedModules.get(tool.id);
    const promise = import(`${tool.importPath}?v=${APP_VERSION}`).catch((err) => {
      loadedModules.delete(tool.id);
      throw err;
    });
    loadedModules.set(tool.id, promise);
    return promise;
  }

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

  async function mountViewOrTool(key, options = {}) {
    if (key === "workbench") {
      const mount = $("workbenchMount");
      if (mount) {
        const { mountWorkbench } = await import(`./workbench.js?v=${APP_VERSION}`);
        await mountWorkbench(mount, {
          onNavigate: (tgt, opts) => showTool(tgt, opts),
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
          onNavigate: (tgt, opts) => showTool(tgt, opts),
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
          onNavigate: (tgt, opts) => showTool(tgt, opts),
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
        mount.innerHTML = `<div class="tool-error">工具加载失败：${escapeHtml(err.message)}</div>`;
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

  function showTool(toolKey, { updateHash = true, restoreId = null } = {}) {
    return navigationQueue.run(async (isLatest) => {
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
        ...TOOL_REGISTRY.map((t) => ({ id: t.mountId, key: t.id })),
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
    onNavigate: (tgt, opts) => showTool(tgt, opts),
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

  // 键盘快捷键 ⌘K
  window.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
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
    mounts.innerHTML = `<div class="tool-error">应用启动失败：${String(err?.message || err)}</div>`;
  }
});
