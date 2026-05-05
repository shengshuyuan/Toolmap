import assert from "node:assert/strict";
import { escapeHtml, escapeAttr } from "../src/shared/escape.js";
import { formatBytes, formatPercent } from "../src/shared/format.js";

// escapeHtml
assert.equal(escapeHtml("a<b>&\"c"), "a&lt;b&gt;&amp;&quot;c");
assert.equal(escapeHtml(null), "");
assert.equal(escapeHtml(undefined), "");
assert.equal(escapeHtml("normal"), "normal");

// escapeAttr
assert.equal(escapeAttr("a'b"), "a&#39;b");
assert.equal(escapeAttr("<script>"), "&lt;script&gt;");

// formatBytes
assert.equal(formatBytes(0), "0 B");
assert.equal(formatBytes(512), "512 B");
assert.equal(formatBytes(1536), "1.50 KB");
assert.equal(formatBytes(1048576), "1.00 MB");
assert.equal(formatBytes(1073741824), "1.00 GB");

// formatPercent
assert.equal(formatPercent(50), "50.0%");
assert.equal(formatPercent(NaN), "0%");
assert.equal(formatPercent(-5), "0.0%");
assert.equal(formatPercent(33.333), "33.3%");

console.log("shared utility tests passed");
