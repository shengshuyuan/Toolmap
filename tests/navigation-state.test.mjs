import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const navigationModule = await import("../src/navigation-state.js").catch(() => ({}));
assert.equal(
  typeof navigationModule.createLatestNavigationGuard,
  "function",
  "应提供只允许最后一次导航提交状态的并发保护"
);
assert.equal(
  typeof navigationModule.createLatestNavigationQueue,
  "function",
  "异步工具切换必须串行收口，避免旧卸载与最新挂载交叉"
);

const guard = navigationModule.createLatestNavigationGuard();
const first = guard.begin();
assert.equal(guard.isLatest(first), true);

const second = guard.begin();
assert.equal(guard.isLatest(first), false, "较早的异步导航必须过期");
assert.equal(guard.isLatest(second), true, "最后一次导航必须保持有效");

const queue = navigationModule.createLatestNavigationQueue();
const steps = [];
let releaseFirst;
const firstDone = queue.run(async (isLatest) => {
  steps.push("first-start");
  await new Promise((resolve) => { releaseFirst = resolve; });
  steps.push(isLatest() ? "first-current" : "first-stale");
});
await Promise.resolve();
const secondDone = queue.run(async (isLatest) => {
  steps.push("second-start");
  assert.equal(isLatest(), true);
});
await Promise.resolve();
assert.deepEqual(steps, ["first-start"], "后一导航不得与前一导航的卸载/挂载交叉执行");
releaseFirst();
await Promise.all([firstDone, secondDone]);
assert.deepEqual(steps, ["first-start", "first-stale", "second-start"]);

const appSource = await readFile(new URL("../src/app.js", import.meta.url), "utf8");
assert.match(appSource, /createLatestNavigationQueue/);
assert.ok(
  (appSource.match(/isLatest\(\)/g) || []).length >= 2,
  "工具切换应在异步卸载和挂载后都检查导航是否仍为最新"
);

console.log("navigation state tests passed");
