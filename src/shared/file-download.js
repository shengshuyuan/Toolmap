/**
 * 跨浏览器文本文件下载通用辅助函数
 * @param {string} content
 * @param {string} filename
 * @param {string} [mime="text/plain;charset=utf-8"]
 */
export function downloadText(content, filename, mime = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
