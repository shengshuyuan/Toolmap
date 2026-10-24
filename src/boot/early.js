// 最早执行的同步脚本：file:// 打开时给 <html> 打标记，供样式降级使用。
(function () {
  try {
    if (location.protocol === "file:") {
      document.documentElement.classList.add("is-file-protocol");
    }
  } catch (_) {}
})();
