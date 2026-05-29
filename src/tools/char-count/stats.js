function normalizeNewlines(text) {
  return String(text ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

const sharedEncoder = new TextEncoder();

/**
 * 一次遍历同时统计中文、英文、数字、空格（避免四次正则扫描）。
 * @param {string} text
 * @returns {{ chinese: number, english: number, digits: number, spaces: number }}
 */
function countCharCategories(text) {
  let chinese = 0;
  let english = 0;
  let digits = 0;
  let spaces = 0;
  for (const ch of text) {
    if (ch === " ") {
      spaces++;
    } else if (ch >= "0" && ch <= "9") {
      digits++;
    } else if ((ch >= "A" && ch <= "Z") || (ch >= "a" && ch <= "z")) {
      english++;
    } else if (/[\p{Unified_Ideograph}]/u.test(ch)) {
      chinese++;
    }
  }
  return { chinese, english, digits, spaces };
}

/**
 * 行数统计：与主流编辑器一致，尾部换行产生新行。
 * "a\n" → 2 行（VS Code 行为）
 */
function countLines(text) {
  if (text === "") return { lines: 0, nonEmptyLines: 0 };
  const parts = text.split("\n");
  // 不再 pop 尾部空串，"a\n" 的第二行（空行）也计入总行数
  const lines = parts.length;
  const nonEmptyLines = parts.filter((line) => line.trim() !== "").length;
  return { lines, nonEmptyLines };
}

export function analyzeTextStats(input) {
  const text = String(input ?? "");
  const textForLines = normalizeNewlines(text);
  const { lines, nonEmptyLines } = countLines(textForLines);
  const { chinese, english, digits, spaces } = countCharCategories(text);

  return {
    characters: Array.from(text).length,
    bytesUtf8: sharedEncoder.encode(text).length,
    stringLength: text.length,
    lines,
    nonEmptyLines,
    chinese,
    english,
    digits,
    spaces,
  };
}
