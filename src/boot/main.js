import { APP_VERSION } from "../config/app-meta.js";

const VERSION_KEY = "toolmap-seen-version";
const prevVersion = localStorage.getItem(VERSION_KEY);
if (prevVersion !== APP_VERSION) {
  localStorage.setItem(VERSION_KEY, APP_VERSION);
}

const style = /** @type {HTMLLinkElement | null} */ (document.querySelector("[data-app-style]"));
if (style) style.href = `./assets/app.css?v=${APP_VERSION}`;

import(`../app.js?v=${APP_VERSION}`).catch((err) => {
  console.error("[Toolmap] failed to load app entry:", err);
  const mounts = document.getElementById("toolMounts");
  if (mounts) mounts.textContent = `应用启动失败：${String(err?.message || err)}`;
});
