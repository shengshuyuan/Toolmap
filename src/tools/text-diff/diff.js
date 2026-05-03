/**
 * 行级 diff（本地运行）
 *
 * 这里采用 Myers diff（O((N+M)D)）在多数场景比 LCS 的 O(N*M) 更快。
 * 为什么这么写：你会遇到粘贴较长文本的情况，Myers 更不容易卡。
 */

/**
 * @typedef {"equal" | "insert" | "delete" | "replace"} DiffOp
 * @typedef {"content" | "format"} DiffType
 * @typedef {{ op: DiffOp, left?: string, right?: string, diffType?: DiffType }} DiffLine
 */

/**
 * 把文本拆成行数组（保留空行由上层决定是否 sanitize）
 */
export function toLines(text) {
  const s = String(text ?? "");
  if (s === "") return [];
  // 重要：不把“末尾换行”视为新增一行。
  // String.split("\n") 在 s 以 \n 结尾时会产生一个额外的 ""（空行），
  // 这会导致：输入框行号/用户感知行号 与 diff 结果行号在末尾附近出现 +1 偏移。
  const out = s.split("\n");
  if (out.length > 1 && out[out.length - 1] === "" && s.endsWith("\n")) out.pop();
  return out;
}

/**
 * Myers diff 的核心：返回 edit script（insert/delete/equal）
 * 参考：Myers 1986，最短编辑路径。
 */
function myersDiff(a, b) {
  const N = a.length;
  const M = b.length;
  const max = N + M;
  /** @type {Map<number, number>} */
  const v = new Map();
  v.set(1, 0);
  /** @type {Array<Map<number, number>>} */
  const trace = [];

  for (let d = 0; d <= max; d++) {
    const vCopy = new Map(v);
    trace.push(vCopy);

    for (let k = -d; k <= d; k += 2) {
      const down = k === -d;
      const up = k === d;

      const kPlus = v.get(k + 1) ?? 0;
      const kMinus = v.get(k - 1) ?? 0;

      // 选择走“删除”(down) 还是 “插入”(right)
      let x;
      if (down || (!up && kMinus < kPlus)) {
        x = kPlus; // down：来自 k+1
      } else {
        x = kMinus + 1; // right：来自 k-1
      }
      let y = x - k;

      // snake：尽可能走 equal
      while (x < N && y < M && a[x] === b[y]) {
        x++;
        y++;
      }
      v.set(k, x);

      if (x >= N && y >= M) {
        return { trace, d };
      }
    }
  }
  return { trace, d: max };
}

function backtrack(trace, a, b) {
  const N = a.length;
  const M = b.length;
  let x = N;
  let y = M;
  /** @type {Array<{op:"equal"|"insert"|"delete", left?:string, right?:string}>} */
  const script = [];

  for (let d = trace.length - 1; d >= 0; d--) {
    const v = trace[d];
    const k = x - y;

    const down = k === -d;
    const up = k === d;
    const kPlus = v.get(k + 1) ?? 0;
    const kMinus = v.get(k - 1) ?? 0;

    let prevK;
    if (down || (!up && kMinus < kPlus)) {
      prevK = k + 1;
    } else {
      prevK = k - 1;
    }

    const prevX = v.get(prevK) ?? 0;
    const prevY = prevX - prevK;

    while (x > prevX && y > prevY) {
      // equal
      script.push({ op: "equal", left: a[x - 1], right: b[y - 1] });
      x--;
      y--;
    }

    if (d === 0) break;

    if (x === prevX) {
      // insert
      script.push({ op: "insert", right: b[y - 1] });
      y--;
    } else {
      // delete
      script.push({ op: "delete", left: a[x - 1] });
      x--;
    }
  }

  script.reverse();
  return script;
}

/**
 * 把 insert/delete 邻接对合并成 replace（更符合“修改”的直觉）
 * 为什么这么写：用户想看到“修改”而不是一堆 delete+insert。
 * @param {ReturnType<typeof backtrack>} script
 * @returns {DiffLine[]}
 */
function coalesceReplace(script) {
  /** @type {DiffLine[]} */
  const out = [];
  for (let i = 0; i < script.length; i++) {
    const cur = script[i];
    if (cur.op === "delete" || cur.op === "insert") {
      const deletes = [];
      const inserts = [];
      while (i < script.length && (script[i].op === "delete" || script[i].op === "insert")) {
        if (script[i].op === "delete") deletes.push(script[i].left ?? "");
        else inserts.push(script[i].right ?? "");
        i++;
      }
      i--;

      const paired = Math.min(deletes.length, inserts.length);
      for (let j = 0; j < paired; j++) {
        out.push({ op: "replace", left: deletes[j], right: inserts[j] });
      }
      for (let j = paired; j < deletes.length; j++) {
        out.push({ op: "delete", left: deletes[j] });
      }
      for (let j = paired; j < inserts.length; j++) {
        out.push({ op: "insert", right: inserts[j] });
      }
      continue;
    }
    out.push({ op: "equal", left: cur.left ?? "", right: cur.right ?? "" });
  }
  return out;
}

function stripWhitespace(text) {
  return String(text ?? "").replace(/\s+/g, "");
}

function classifyDiffLine(line) {
  if (line.op === "equal") return undefined;
  if (line.op === "insert") return String(line.right ?? "").trim() === "" ? "format" : "content";
  if (line.op === "delete") return String(line.left ?? "").trim() === "" ? "format" : "content";
  return stripWhitespace(line.left) === stripWhitespace(line.right) ? "format" : "content";
}

function annotateDiffTypes(lines) {
  return lines.map((line) => {
    const diffType = classifyDiffLine(line);
    return diffType ? { ...line, diffType } : line;
  });
}

/**
 * 对外：计算行级 diff。
 * @returns {{ lines: DiffLine[], diffCount: number, contentDiffCount: number, formatDiffCount: number }}
 */
export function diffLines(leftText, rightText) {
  const left = toLines(leftText);
  const right = toLines(rightText);

  // 保护浏览器主线程：不限制字符数，但对“行数”保留上限，避免极端差异文本卡死。
  const HARD_MAX = 20000;
  if (left.length > HARD_MAX || right.length > HARD_MAX) {
    throw new Error(`文本行数过多（>${HARD_MAX} 行），建议分段比对。`);
  }

  const { trace } = myersDiff(left, right);
  const script = backtrack(trace, left, right);
  const lines = annotateDiffTypes(coalesceReplace(script));

  let diffCount = 0;
  let contentDiffCount = 0;
  let formatDiffCount = 0;
  for (const l of lines) {
    if (l.op !== "equal") {
      diffCount++;
      if (l.diffType === "format") formatDiffCount++;
      else contentDiffCount++;
    }
  }

  return { lines, diffCount, contentDiffCount, formatDiffCount };
}
