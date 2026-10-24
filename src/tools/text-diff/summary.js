/**
 * 复制结果文案：给用户一个可直接粘贴给他人的简短结论。
 */

/**
 * @param {{op:"equal"|"insert"|"delete"|"replace", left?:string, right?:string, diffType?:"content"|"format"}[]} lines
 */
export function summarizeDiffLines(lines) {
  const safeLines = Array.isArray(lines) ? lines : [];
  /** @type {number[]} */
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

/**
 * 生成可导出的差异详细报告（Markdown 或 TXT 格式）
 * @param {{op:"equal"|"insert"|"delete"|"replace", left?:string, right?:string, diffType?:"content"|"format"}[]} lines
 * @param {{ format?: "markdown"|"txt", title?: string }} [options]
 */
export function generateDiffReport(lines, options = {}) {
  const { format = "markdown", title = "文本比对差异报告" } = options;
  const safeLines = Array.isArray(lines) ? lines : [];
  const dateStr = new Date().toLocaleString("zh-CN");

  let leftLn = 0;
  let rightLn = 0;
  let contentDiffCount = 0;
  let formatDiffCount = 0;
  let modCount = 0;
  let addCount = 0;
  let delCount = 0;

  const diffItems = [];

  for (const row of safeLines) {
    if (row.op === "equal" || row.op === "delete" || row.op === "replace") leftLn++;
    if (row.op === "equal" || row.op === "insert" || row.op === "replace") rightLn++;

    if (row.op === "equal") continue;

    if (row.diffType === "format") formatDiffCount++;
    else contentDiffCount++;

    if (row.op === "replace") modCount++;
    else if (row.op === "insert") addCount++;
    else if (row.op === "delete") delCount++;

    diffItems.push({
      op: row.op,
      diffType: row.diffType || "content",
      leftLn: row.op === "insert" ? "-" : leftLn,
      rightLn: row.op === "delete" ? "-" : rightLn,
      left: row.left ?? "",
      right: row.right ?? "",
    });
  }

  /** @param {string} op */
  const opLabel = (op) => (op === "replace" ? "修改" : op === "insert" ? "新增" : "删除");

  if (format === "markdown") {
    const header = [
      `# ${title}`,
      ``,
      `> **生成时间**：${dateStr}  `,
      `> **比对统计**：总行数 ${safeLines.length} 行 · 发现差异 ${diffItems.length} 处（修改 ${modCount} · 新增 ${addCount} · 删除 ${delCount}）`,
      ``,
    ];

    if (diffItems.length === 0) {
      header.push(`**比对结论**：两侧文本内容完全一致，无任何差异。`);
      return header.join("\n");
    }

    header.push(`## 差异明细对照`);
    header.push(``);
    header.push(`| 原行号 | 对比行号 | 类型 | 原文本 | 对比文本 |`);
    header.push(`| :---: | :---: | :---: | :--- | :--- |`);

    for (const item of diffItems) {
      const cleanLeft = item.left.replace(/\|/g, "\\|").replace(/\n/g, " ");
      const cleanRight = item.right.replace(/\|/g, "\\|").replace(/\n/g, " ");
      header.push(
        `| ${item.leftLn} | ${item.rightLn} | ${opLabel(item.op)} | \`${cleanLeft || "—"}\` | \`${cleanRight || "—"}\` |`
      );
    }

    return header.join("\n") + "\n";
  }

  // TXT 格式
  const linesTxt = [
    `========================================`,
    `${title}`,
    `生成时间：${dateStr}`,
    `比对统计：总行数 ${safeLines.length} 行 · 差异 ${diffItems.length} 处 (修改 ${modCount} / 新增 ${addCount} / 删除 ${delCount})`,
    `========================================`,
    ``,
  ];

  if (diffItems.length === 0) {
    linesTxt.push(`比对结论：两侧文本完全一致，无差异。`);
    return linesTxt.join("\n");
  }

  for (const item of diffItems) {
    linesTxt.push(`[原行 ${item.leftLn} -> 新行 ${item.rightLn}] (${opLabel(item.op)})`);
    if (item.op !== "insert") linesTxt.push(`  - 原文: ${item.left}`);
    if (item.op !== "delete") linesTxt.push(`  + 对比: ${item.right}`);
    linesTxt.push(``);
  }

  return linesTxt.join("\n");
}
