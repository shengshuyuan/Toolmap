import { APP_TITLE, APP_VERSION, BUILD_LABEL } from "./config/app-meta.js";
import { renderToolMountMarkup, renderToolSwitchMarkup } from "./app-shell.js";
import { TOOL_REGISTRY, getToolById, getToolIds } from "./tool-registry.js";

const mountedTools = new Set();
const mountingTools = new Map();
const loadedModules = new Map();

function $(id) {
  return document.getElementById(id);
}

function setShellMeta() {
  const year = $("year");
  if (year) year.textContent = String(new Date().getFullYear());
  const version = $("appVersionLabel");
  if (version) version.textContent = `v${APP_VERSION} · ${BUILD_LABEL}`;
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
  if (subtitle) subtitle.innerHTML = tool.subtitle;
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
  const promise = import(`${tool.importPath}?v=${APP_VERSION}`);
  loadedModules.set(tool.id, promise);
  return promise;
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
    await mountFn(mount);
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
  await mountTool(key);
  TOOL_REGISTRY.forEach((tool) => {
    const candidate = tool.id;
    const mount = $(tool.mountId);
    if (mount) mount.hidden = candidate !== key;
  });
  setShellCopy(key);
  updateSwitch(key);
  if (updateHash && window.location.hash !== `#${key}`) {
    history.replaceState(null, "", `#${key}`);
  }
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
