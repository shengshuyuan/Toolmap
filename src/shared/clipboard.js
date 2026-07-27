export async function writeClipboard(text) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (_) {
      // Some browser contexts expose clipboard but reject writes.
    }
  }

  try {
    const helper = document.createElement("textarea");
    helper.value = text;
    helper.setAttribute("readonly", "");
    helper.style.position = "fixed";
    helper.style.left = "-9999px";
    document.body.appendChild(helper);
    helper.select();
    const ok = document.queryCommandSupported?.("copy") ? document.execCommand("copy") : false;
    helper.remove();
    return Boolean(ok);
  } catch (_) {
    return false;
  }
}
