import assert from "node:assert/strict";
import {
  collectComparisonHints,
  buildLocateStatus,
  shouldWarnLineMismatch,
} from "../src/tools/text-diff/diagnostics.js";

{
  const hints = collectComparisonHints({
    leftText: "A\r\nB\r\n",
    rightText: "A\nB\n",
    hardMaxLines: 20000,
  });
  assert.equal(hints.hasCrlf, true);
  assert.equal(hints.hasTrailingNewline, true);
  assert.ok(hints.messages.some((x) => x.includes("Windows 换行")));
  assert.ok(hints.messages.some((x) => x.includes("末尾换行")));
}

{
  const large = Array.from({ length: 18001 }, (_, i) => `第${i + 1}行`).join("\n");
  const hints = collectComparisonHints({
    leftText: large,
    rightText: "",
    hardMaxLines: 20000,
  });
  assert.equal(hints.isLargeTextMode, true);
  assert.ok(hints.messages.some((x) => x.includes("大文本模式")));
}

{
  const status = buildLocateStatus({
    expectedLeft: 280,
    expectedRight: 280,
    actualLeft: 279,
    actualRight: 280,
  });
  assert.ok(status.includes("原文本第 279 行"));
  assert.ok(status.includes("已按实际光标行自动校正"));
}

{
  const status = buildLocateStatus({
    expectedLeft: 12,
    expectedRight: 16,
    actualLeft: 12,
    actualRight: 16,
  });
  assert.equal(status, "已定位：原文本第 12 行 · 对比文本第 16 行");
}

{
  assert.equal(
    shouldWarnLineMismatch({
      expectedLeft: 10,
      expectedRight: 11,
      actualLeft: 10,
      actualRight: 11,
    }),
    false
  );
  assert.equal(
    shouldWarnLineMismatch({
      expectedLeft: 10,
      expectedRight: 11,
      actualLeft: 9,
      actualRight: 11,
    }),
    true
  );
}

console.log("text diff diagnostics tests passed");
