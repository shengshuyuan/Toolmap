import assert from "node:assert/strict";
import { buildExportPayload } from "../src/shared/history-export.js";
import { APP_VERSION } from "../src/config/app-meta.js";

const records = [
  { id: "test-1", createdAt: 1716900000000, leftText: "a", rightText: "b" },
];
const payload = buildExportPayload("text-diff", records);

assert.equal(payload.toolmapVersion, APP_VERSION);
assert.equal(payload.tool, "text-diff");
assert.equal(payload.count, 1);
assert.equal(payload.records.length, 1);
assert.ok(typeof payload.exportedAt === "string");
assert.ok(!isNaN(Date.parse(payload.exportedAt)));

const empty = buildExportPayload("image-compress", []);
assert.equal(empty.count, 0);
assert.deepEqual(empty.records, []);

const custom = buildExportPayload("text-diff", [], { version: "1.0.0" });
assert.equal(custom.toolmapVersion, "1.0.0");

console.log("history export tests passed");
