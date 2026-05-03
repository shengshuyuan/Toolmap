/**
 * 结果渲染：把 diffLines 输出渲染成“双栏对照表”
 */

/**
 * @typedef {"equal" | "insert" | "delete" | "replace"} DiffOp
 * @typedef {"content" | "format"} DiffType
 * @typedef {{ op: DiffOp, left?: string, right?: string, diffType?: DiffType }} DiffLine
 */

/**
 * @param {HTMLElement} mount
 * @param {{lines: DiffLine[], diffCount: number, contentDiffCount?: number, formatDiffCount?: number}} result
 * @returns {{ anchors: string[] }}
 */
export function renderDiff(mount, result) {
  const { lines } = result;
  mount.innerHTML = "";

  if (!lines || lines.length === 0) {
    const empty = document.createElement("div");
    empty.className = "diff-empty";
    empty.textContent = "没有内容可展示。";
    mount.appendChild(empty);
    return { anchors: [] };
  }

  const table = document.createElement("table");
  table.className = "diff-table";

  const tbody = document.createElement("tbody");
  table.appendChild(tbody);

  /** @type {string[]} */
  const anchors = [];
  /** @type {Record<string, { leftLine: number|null, rightLine: number|null }>} */
  const anchorMeta = {};

  let leftLn = 0;
  let rightLn = 0;
  let diffIndex = 0;

  for (const row of lines) {
    if (row.op === "equal" || row.op === "delete" || row.op === "replace") leftLn++;
    if (row.op === "equal" || row.op === "insert" || row.op === "replace") rightLn++;

    const tr = document.createElement("tr");
    tr.className = `diff-row diff-row--${row.op}`;

    if (row.op !== "equal") {
      const id = `diff-${diffIndex++}`;
      tr.id = id;
      anchors.push(id);
      if (row.diffType) tr.classList.add(`diff-row--${row.diffType}`);

      const leftLine = row.op === "insert" ? null : leftLn;
      const rightLine = row.op === "delete" ? null : rightLn;
      tr.dataset.leftLine = leftLine == null ? "" : String(leftLine);
      tr.dataset.rightLine = rightLine == null ? "" : String(rightLine);
      anchorMeta[id] = { leftLine, rightLine };
    }

    // 左行号
    const tdLnL = document.createElement("td");
    tdLnL.className = "diff-table__ln";
    tdLnL.textContent =
      row.op === "insert" ? "" : String(leftLn);

    // 左内容
    const tdL = document.createElement("td");
    tdL.className = "diff-table__cell";
    if (row.op === "insert") {
      tdL.classList.add("diff-side--empty");
      tdL.textContent = "—";
    } else {
      tdL.textContent = row.left ?? "";
    }

    // 右行号
    const tdLnR = document.createElement("td");
    tdLnR.className = "diff-table__ln";
    tdLnR.textContent =
      row.op === "delete" ? "" : String(rightLn);

    // 右内容
    const tdR = document.createElement("td");
    tdR.className = "diff-table__cell";
    if (row.op === "delete") {
      tdR.classList.add("diff-side--empty");
      tdR.textContent = "—";
    } else {
      tdR.textContent = row.right ?? "";
    }

    if (row.op !== "equal" && row.diffType) {
      const badge = document.createElement("span");
      badge.className = `diff-type diff-type--${row.diffType}`;
      badge.textContent = row.diffType === "format" ? "排版差异" : "内容差异";
      tdR.prepend(badge);
    }

    tr.appendChild(tdLnL);
    tr.appendChild(tdL);
    tr.appendChild(tdLnR);
    tr.appendChild(tdR);
    tbody.appendChild(tr);
  }

  mount.appendChild(table);
  return { anchors, anchorMeta };
}

export function focusAnchor(anchorId) {
  const el = document.getElementById(anchorId);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  el.classList.add("diff-row--focus");
  window.setTimeout(() => el.classList.remove("diff-row--focus"), 650);
}
