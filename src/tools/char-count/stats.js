function normalizeNewlines(text) {
  return String(text ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function countChinese(text) {
  const matches = text.match(/[\p{Unified_Ideograph}]/gu);
  return matches ? matches.length : 0;
}

function countEnglish(text) {
  const matches = text.match(/[A-Za-z]/g);
  return matches ? matches.length : 0;
}

function countDigits(text) {
  const matches = text.match(/[0-9]/g);
  return matches ? matches.length : 0;
}

function countSpaces(text) {
  const matches = text.match(/ /g);
  return matches ? matches.length : 0;
}

function countLines(text) {
  if (text === "") return { lines: 0, nonEmptyLines: 0 };
  const parts = text.split("\n");
  if (parts.length > 1 && parts[parts.length - 1] === "") parts.pop();
  const lines = parts.length;
  const nonEmptyLines = parts.filter((line) => line.trim() !== "").length;
  return { lines, nonEmptyLines };
}

export function analyzeTextStats(input) {
  const text = String(input ?? "");
  const textForLines = normalizeNewlines(text);
  const encoder = new TextEncoder();
  const { lines, nonEmptyLines } = countLines(textForLines);

  return {
    characters: Array.from(text).length,
    bytesUtf8: encoder.encode(text).length,
    stringLength: text.length,
    lines,
    nonEmptyLines,
    chinese: countChinese(text),
    english: countEnglish(text),
    digits: countDigits(text),
    spaces: countSpaces(text),
  };
}
