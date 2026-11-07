/**
 * 主题切换：跟随系统 → 浅色 → 深色，循环切换。
 * 选择保存在 localStorage 的 toolmap-theme；首次绘制前由 boot/early.js 先应用一次。
 */

const STORAGE_KEY = "toolmap-theme";
/** @type {Array<"system" | "light" | "dark">} */
const ORDER = ["system", "light", "dark"];
const LABELS = { system: "跟随系统", light: "浅色", dark: "深色" };

const ICONS = {
  system:
    '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 0 0 18z" fill="currentColor"/></svg>',
  light:
    '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>',
  dark:
    '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>',
};

/** @returns {"system" | "light" | "dark"} */
function readPref() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}

const media = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;

/** @param {"system" | "light" | "dark"} pref */
function apply(pref) {
  const dark = pref === "dark" || (pref === "system" && !!media?.matches);
  document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
}

/** @param {HTMLButtonElement | null} button */
export function initThemeToggle(button) {
  let pref = readPref();
  apply(pref);

  const render = () => {
    if (!button) return;
    const label = `外观：${LABELS[pref]}（点击切换）`;
    button.innerHTML = ICONS[pref];
    button.title = label;
    button.setAttribute("aria-label", label);
  };
  render();

  media?.addEventListener?.("change", () => {
    if (pref === "system") apply(pref);
  });

  button?.addEventListener("click", () => {
    pref = ORDER[(ORDER.indexOf(pref) + 1) % ORDER.length];
    try {
      if (pref === "system") localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, pref);
    } catch (err) {
      console.warn("[theme] save failed:", err);
    }
    apply(pref);
    render();
  });
}
