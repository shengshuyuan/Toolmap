/**
 * 文本清理相关能力（隐私：全程本地处理）
 */

/**
 * 统一换行符（Windows/Unix/Mac 旧格式）
 * 为什么这么写：不同系统复制来的文本换行不同，会影响 diff 的行对齐。
 */
export function normalizeNewlines(text) {
  return String(text ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

/**
 * 删除空行（包含只含空格/Tab 的行）
 * - 不改动非空内容
 * - 保留原本的行顺序
 */
export function removeBlankLines(text) {
  const normalized = normalizeNewlines(text);
  const lines = normalized.split("\n");
  const kept = [];
  for (const line of lines) {
    if (line.trim() === "") continue;
    kept.push(line);
  }
  return kept.join("\n");
}

