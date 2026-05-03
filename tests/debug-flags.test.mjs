import assert from "node:assert/strict";
import { parseDebugScopes, isDebugEnabled } from "../src/debug.js";

assert.deepEqual(parseDebugScopes(""), []);
assert.deepEqual(parseDebugScopes("?debug=text-diff,char-count"), ["text-diff", "char-count"]);
assert.deepEqual(parseDebugScopes("?foo=1&debug=*"), ["*"]);

assert.equal(isDebugEnabled("text-diff", { search: "" }), false);
assert.equal(isDebugEnabled("text-diff", { search: "?debug=text-diff" }), true);
assert.equal(isDebugEnabled("image-compress", { search: "?debug=text-diff" }), false);
assert.equal(isDebugEnabled("image-compress", { search: "?debug=*" }), true);

console.log("debug flags tests passed");
