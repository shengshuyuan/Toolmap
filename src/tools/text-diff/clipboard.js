/**
 * @param {string} text
 * @returns {Promise<boolean>} 复制是否成功
 */
export async function writeClipboard(text) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (_) {
      // Some browser contexts expose clipboard but reject writes.
    }
  }

  // execCommand fallback（已 deprecated，部分环境已移除）
  const helper = document.createElement("textarea");
  helper.value = text;
  helper.setAttribute("readonly", "");
  helper.style.position = "fixed";
  helper.style.left = "-9999px";
  document.body.appendChild(helper);
  helper.select();
  const ok = document.execCommand("copy");
  helper.remove();
  return ok;
}
