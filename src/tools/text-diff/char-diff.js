/**
 * Character-level & Word-level diff for short strings (used to highlight changed parts within "replace" rows).
 * Returns HTML strings with <mark> tags around changed characters/words.
 * 
 * @param {string} left
 * @param {string} right
 * @param {{ granularity?: "char"|"word", ignoreCase?: boolean }} [options]
 */
export function charDiffHtml(left, right, options = {}) {
  const granularity = options.granularity || "char";
  const ignoreCase = Boolean(options.ignoreCase);
  const MAX_LEN = 1000;
  if (left.length > MAX_LEN || right.length > MAX_LEN) {
    return { leftHtml: escapeForDiff(left), rightHtml: escapeForDiff(right) };
  }

  const leftTokens = tokenize(left, granularity);
  const rightTokens = tokenize(right, granularity);
  const script = simpleTokenLcsDiff(leftTokens, rightTokens, ignoreCase);

  let leftHtml = "";
  let rightHtml = "";

  for (let i = 0; i < script.length; i++) {
    const op = script[i];
    if (op.type === "equal") {
      leftHtml += escapeForDiff(op.token);
      rightHtml += escapeForDiff(op.token);
    } else if (op.type === "delete") {
      let buf = op.token;
      while (i + 1 < script.length && script[i + 1].type === "delete") {
        buf += script[++i].token;
      }
      leftHtml += `<mark class="diff-char--del">${escapeForDiff(buf)}</mark>`;
    } else if (op.type === "insert") {
      let buf = op.token;
      while (i + 1 < script.length && script[i + 1].type === "insert") {
        buf += script[++i].token;
      }
      rightHtml += `<mark class="diff-char--ins">${escapeForDiff(buf)}</mark>`;
    }
  }

  return { leftHtml, rightHtml };
}

/**
 * @param {unknown} text
 * @param {string} [granularity]
 * @returns {string[]}
 */
function tokenize(text, granularity) {
  const s = String(text ?? "");
  if (granularity === "word") {
    // 词级分词：中文按单字，英文/数字为词组，符号与空白为段
    return s.match(/[\p{Unified_Ideograph}]|[A-Za-z0-9_]+|[^\s\w\p{Unified_Ideograph}]|\s+/gu) || [];
  }
  return [...s];
}

/** @param {unknown} text */
function escapeForDiff(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Simple LCS-based diff on token arrays.
 * For short strings (<1000 tokens), O(N*M) is fast and precise.
 * @param {string[]} a
 * @param {string[]} b
 * @param {boolean} [ignoreCase]
 */
function simpleTokenLcsDiff(a, b, ignoreCase = false) {
  const N = a.length;
  const M = b.length;
  /** @type {(x: string, y: string) => boolean} */
  const match = (x, y) => (ignoreCase ? x.toLowerCase() === y.toLowerCase() : x === y);

  const dp = Array.from({ length: N + 1 }, () => new Uint16Array(M + 1));
  for (let i = 1; i <= N; i++) {
    for (let j = 1; j <= M; j++) {
      dp[i][j] = match(a[i - 1], b[j - 1])
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  const ops = [];
  let i = N,
    j = M;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && match(a[i - 1], b[j - 1])) {
      ops.push({ type: "equal", token: a[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      ops.push({ type: "insert", token: b[j - 1] });
      j--;
    } else {
      ops.push({ type: "delete", token: a[i - 1] });
      i--;
    }
  }

  ops.reverse();
  return ops;
}
