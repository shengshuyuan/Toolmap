/**
 * 复制结果文案：给用户一个可直接粘贴给他人的简短结论。
 */

/**
 * @param {{op:"equal"|"insert"|"delete"|"replace", left?:string, right?:string}[]} lines
 */
export function summarizeDiffLines(lines) {
  const safeLines = Array.isArray(lines) ? lines : [];
  const inconsistent = [];
  let contentDiffCount = 0;
  let formatDiffCount = 0;
  let leftLn = 0;
  let rightLn = 0;

  for (const row of safeLines) {
    if (row.op === "equal" || row.op === "delete" || row.op === "replace") leftLn++;
    if (row.op === "equal" || row.op === "insert" || row.op === "replace") rightLn++;

    if (row.op === "equal") continue;
    if (row.diffType === "format") formatDiffCount++;
    else contentDiffCount++;
    const lineNo = row.op === "insert" ? rightLn : leftLn;
    if (lineNo && !inconsistent.includes(lineNo)) inconsistent.push(lineNo);
  }

  const total = safeLines.length;
  if (inconsistent.length === 0) {
    return `本次比对共${total}行，未发现不一致。`;
  }

  return `本次比对共${total}行，${inconsistent.join("行、")}行存在不一致，其中内容差异${contentDiffCount}处，排版差异${formatDiffCount}处，请留意及处理。`;
}
