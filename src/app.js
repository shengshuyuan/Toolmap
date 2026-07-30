import { APP_TITLE, APP_VERSION, BUILD_LABEL } from "./config/app-meta.js";
import { escapeHtml } from "./shared/escape.js";

/**
 * 启动入口：用版本 query 动态加载注册表，绕过浏览器对旧 immutable 缓存的占用。
 * 注意：不要用 top-level await（esbuild es2020 构建会失败）。
 */
async function bootstrap() {
  const { renderToolMountMarkup, renderToolSwitchMarkup } = await import(
    `./app-shell.js?v=${APP_VERSION}`
  );
  const { TOOL_REGISTRY, getToolById, getToolIds } = await import(
    `./tool-registry.js?v=${APP_VERSION}`
  );

  const mountedTools = new Set();
  const mountingTools = new Map();
  const loadedModules = new Map();
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
        `[Toolmap] v${APP_VERSION} tools(${TOOL_REGISTRY.length}):`,
        TOOL_REGISTRY.map((t) => t.buttonLabel).join(" · ")
      );
    } catch (_) {}
  }

  function readInitialTool() {
    const hash = window.location.hash.replace(/^#/, "");
    return getToolIds().includes(hash) ? hash : "text-diff";
  }

  function renderToolShell() {
    const switchRoot = $("toolSwitch");
    const mountsRoot = $("toolMounts");
    if (switchRoot) switchRoot.innerHTML = renderToolSwitchMarkup(TOOL_REGISTRY);
    if (mountsRoot) mountsRoot.innerHTML = renderToolMountMarkup(TOOL_REGISTRY);
  }

  function setShellCopy(toolKey) {
    const tool = getToolById(toolKey);
    if (!tool) return;
    const title = $("shellTitle");
    const subtitle = $("shellSubtitle");
    const name = $("shellToolName");
    const hint = $("shellToolHint");
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
    document.title = `${tool.name} - ${APP_TITLE}`;
  }

  function updateSwitch(toolKey) {
    document.querySelectorAll("[data-tool-target]").forEach((button) => {
      const isActive = button.getAttribute("data-tool-target") === toolKey;
      button.classList.toggle("tool-switch__btn--active", isActive);
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
    const tool = getToolById(toolKey);
    if (!tool) return;
    const mount = $(tool.mountId);
    if (mount) {
      const heading = mount.querySelector(
        "h2, h1, .panel__title, .char-title, .qr-title, .md-title, .pdf-title"
      );
      if (heading) {
        if (!heading.hasAttribute("tabindex")) heading.setAttribute("tabindex", "-1");
        heading.focus();
      }
    }
  }

  async function mountTool(toolKey) {
    const tool = getToolById(toolKey);
    if (!tool) return;
    const mount = $(tool.mountId);
    if (!mount || mountedTools.has(toolKey)) return;
    if (mountingTools.has(toolKey)) return mountingTools.get(toolKey);
    const mounting = (async () => {
      const mod = await loadToolModule(tool);
      const mountFn = mod?.[tool.exportName];
      if (typeof mountFn !== "function") throw new Error(`工具 ${tool.id} 缺少挂载函数 ${tool.exportName}`);
      try {
        await mountFn(mount);
      } catch (err) {
        console.error(`[mount] ${tool.id} failed:`, err);
        mount.innerHTML = `<div class="tool-error">工具加载失败：${escapeHtml(err.message)}</div>`;
        mount.hidden = false;
        return;
      }
      mountedTools.add(toolKey);
    })();
    mountingTools.set(toolKey, mounting);
    try {
      await mounting;
    } finally {
      mountingTools.delete(toolKey);
    }
  }

  async function showTool(toolKey, { updateHash = true } = {}) {
    const key = getToolById(toolKey) ? toolKey : "text-diff";
    updateSwitch(key);
    setShellCopy(key);
    if (currentToolKey && currentToolKey !== key) {
      await unmountTool(currentToolKey);
    }
    await mountTool(key);
    currentToolKey = key;
    TOOL_REGISTRY.forEach((tool) => {
      const candidate = tool.id;
      const mount = $(tool.mountId);
      if (mount) mount.hidden = candidate !== key;
    });
    if (updateHash && window.location.hash !== `#${key}`) {
      history.replaceState(null, "", `#${key}`);
    }
    focusToolHeading(key);
  }

  function bindToolSwitch() {
    document.querySelectorAll("[data-tool-target]").forEach((button) => {
      button.addEventListener("click", () => {
        const target = button.getAttribute("data-tool-target");
        if (target) void showTool(target);
      });
    });
    window.addEventListener("hashchange", () => void showTool(readInitialTool(), { updateHash: false }));
  }

  renderToolShell();
  setShellMeta();
  bindToolSwitch();
  void showTool(readInitialTool(), { updateHash: false });
}

bootstrap().catch((err) => {
  console.error("[Toolmap] bootstrap failed:", err);
  const mounts = document.getElementById("toolMounts");
  if (mounts) {
    mounts.innerHTML = `<div class="tool-error">应用启动失败：${String(err?.message || err)}</div>`;
  }
});
