// 最早执行的同步脚本（在页面绘制前运行）：
// 1. file:// 打开时给 <html> 打标记，供样式降级使用；
// 2. 按用户选择或系统设置写入 data-theme，避免深色用户先看到一闪而过的浅色页面。
(function () {
  try {
    if (location.protocol === "file:") {
      document.documentElement.classList.add("is-file-protocol");
    }
  } catch (_) {}
  try {
    var pref = localStorage.getItem("toolmap-theme");
    var dark =
      pref === "dark" ||
      (pref !== "light" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  } catch (_) {}
})();
