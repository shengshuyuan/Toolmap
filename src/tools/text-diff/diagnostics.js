function hasCrlf(text) {
  return /\r\n/.test(String(text ?? ""));
}

function hasTrailingNewline(text) {
  return /(?:\r\n|\n|\r)$/.test(String(text ?? ""));
}

function countNormalizedLines(text) {
  const s = String(text ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (s === "") return 0;
  const parts = s.split("\n");
  if (parts.length > 1 && parts[parts.length - 1] === "") parts.pop();
  return parts.length;
}

export function collectComparisonHints({ leftText, rightText, hardMaxLines = 20000 }) {
  const left = String(leftText ?? "");
  const right = String(rightText ?? "");
  const messages = [];
  const hasAnyCrlf = hasCrlf(left) || hasCrlf(right);
  const hasAnyTrailingNewline = hasTrailingNewline(left) || hasTrailingNewline(right);
  const maxLines = Math.max(countNormalizedLines(left), countNormalizedLines(right));
  const isLargeTextMode = maxLines >= Math.floor(hardMaxLines * 0.9);

  if (hasAnyCrlf) messages.push("检测到 Windows 换行，已按统一规则比对。");
  if (hasAnyTrailingNewline) messages.push("检测到末尾换行，已按统一规则处理最后一行。");
  if (isLargeTextMode) messages.push(`当前文本较长，已进入大文本模式（约 ${maxLines} 行）。`);

  return {
    hasCrlf: hasAnyCrlf,
    hasTrailingNewline: hasAnyTrailingNewline,
    isLargeTextMode,
    maxLines,
    messages,
  };
}

export function shouldWarnLineMismatch({ expectedLeft, expectedRight, actualLeft, actualRight }) {
  return (
    (expectedLeft != null && actualLeft != null && expectedLeft !== actualLeft) ||
    (expectedRight != null && actualRight != null && expectedRight !== actualRight)
  );
}

export function buildLocateStatus({ expectedLeft, expectedRight, actualLeft, actualRight }) {
  const showLeft = actualLeft ?? expectedLeft ?? null;
  const showRight = actualRight ?? expectedRight ?? null;
  const parts = [];
  if (showLeft) parts.push(`原文本第 ${showLeft} 行`);
  if (showRight) parts.push(`对比文本第 ${showRight} 行`);
  const base = `已定位：${parts.join(" · ")}`;
  return shouldWarnLineMismatch({ expectedLeft, expectedRight, actualLeft, actualRight })
    ? `${base}（已按实际光标行自动校正）`
    : base;
}
