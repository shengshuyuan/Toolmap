/**
 * Character-level diff for short strings (used to highlight changed chars within "replace" rows).
 * Returns HTML strings with <mark> tags around changed characters.
 */

export function charDiffHtml(left, right) {
  const MAX_LEN = 500;
  if (left.length > MAX_LEN || right.length > MAX_LEN) {
    return { leftHtml: escapeForDiff(left), rightHtml: escapeForDiff(right) };
  }

  const leftChars = [...left];
  const rightChars = [...right];
  const script = simpleLcsDiff(leftChars, rightChars);

  let leftHtml = "";
  let rightHtml = "";

  for (const op of script) {
    if (op.type === "equal") {
      leftHtml += escapeChar(op.char);
      rightHtml += escapeChar(op.char);
    } else if (op.type === "delete") {
      leftHtml += `<mark class="diff-char--del">${escapeChar(op.char)}</mark>`;
    } else if (op.type === "insert") {
      rightHtml += `<mark class="diff-char--ins">${escapeChar(op.char)}</mark>`;
    }
  }

  return { leftHtml, rightHtml };
}

function escapeChar(ch) {
  if (ch === "&") return "&amp;";
  if (ch === "<") return "&lt;";
  if (ch === ">") return "&gt;";
  if (ch === '"') return "&quot;";
  return ch;
}

function escapeForDiff(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Simple LCS-based diff on character arrays.
 * For short strings (<500 chars), O(N*M) is perfectly fine.
 */
function simpleLcsDiff(a, b) {
  const N = a.length;
  const M = b.length;

  const dp = Array.from({ length: N + 1 }, () => new Uint16Array(M + 1));
  for (let i = 1; i <= N; i++) {
    for (let j = 1; j <= M; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1] + 1
          : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  const ops = [];
  let i = N,
    j = M;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      ops.push({ type: "equal", char: a[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      ops.push({ type: "insert", char: b[j - 1] });
      j--;
    } else {
      ops.push({ type: "delete", char: a[i - 1] });
      i--;
    }
  }

  ops.reverse();
  return ops;
}
