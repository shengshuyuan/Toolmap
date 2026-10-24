import assert from "node:assert/strict";
import { charDiffHtml } from "../src/tools/text-diff/char-diff.js";

// basic change
{
  const { leftHtml, rightHtml } = charDiffHtml("abc", "axc");
  assert.ok(leftHtml.includes("<mark"));
  assert.ok(rightHtml.includes("<mark"));
  assert.ok(leftHtml.includes("b"));
  assert.ok(rightHtml.includes("x"));
}

// identical strings
{
  const { leftHtml, rightHtml } = charDiffHtml("same", "same");
  assert.equal(leftHtml, "same");
  assert.equal(rightHtml, "same");
}

// empty left
{
  const { rightHtml } = charDiffHtml("", "new");
  assert.ok(rightHtml.includes("<mark"));
  assert.ok(rightHtml.includes("n"));
}

// empty right
{
  const { leftHtml } = charDiffHtml("old", "");
  assert.ok(leftHtml.includes("<mark"));
  assert.ok(leftHtml.includes("o"));
}

// XSS-safe: special chars escaped
{
  const { leftHtml, rightHtml } = charDiffHtml("<script>", "<b>bold</b>");
  assert.ok(!leftHtml.includes("<script>"));
  assert.ok(leftHtml.includes("&lt;"));
  assert.ok(!rightHtml.includes("<b>"));
  assert.ok(rightHtml.includes("&lt;"));
  assert.ok(rightHtml.includes("&gt;"));
}

// chinese chars
{
  const { leftHtml, rightHtml } = charDiffHtml("你好世界", "你好地球");
  assert.ok(leftHtml.includes("世"));
  assert.ok(leftHtml.includes("界"));
  assert.ok(rightHtml.includes("地"));
  assert.ok(rightHtml.includes("球"));
}

// word-level granularity
{
  const { leftHtml, rightHtml } = charDiffHtml("The quick brown fox", "The fast brown fox", { granularity: "word" });
  assert.ok(leftHtml.includes('<mark class="diff-char--del">quick</mark>'));
  assert.ok(rightHtml.includes('<mark class="diff-char--ins">fast</mark>'));
}

// ignoreCase in charDiffHtml
{
  const { leftHtml, rightHtml } = charDiffHtml("Hello", "hello", { ignoreCase: true });
  assert.ok(!leftHtml.includes("<mark"));
  assert.ok(!rightHtml.includes("<mark"));
}

console.log("char-diff tests passed");
