import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { blobToDataURL, dataURLToBlob, clearAllLocalData } from "../src/shared/recent-index.js";
import { TOOL_REGISTRY } from "../src/tool-registry.js";

const root = new URL("../", import.meta.url);
const appCss = await readFile(new URL("assets/app.css", root), "utf8");
const textDiffCss = await readFile(new URL("src/tools/text-diff/text-diff.css", root), "utf8");
const pdfToolsCss = await readFile(new URL("src/tools/pdf-tools/pdf-tools.css", root), "utf8");
const mdEditorCss = await readFile(new URL("src/tools/markdown-editor/markdown-editor.css", root), "utf8");
const searchModalJs = await readFile(new URL("src/search-modal.js", root), "utf8");
const recentViewJs = await readFile(new URL("src/recent-view.js", root), "utf8");
const qrcodeJs = await readFile(new URL("src/tools/qrcode/index.js", root), "utf8");
const textDiffJs = await readFile(new URL("src/tools/text-diff/index.js", root), "utf8");

// 1. [hidden] 契约测试：必须具备 display: none !important
assert.ok(appCss.includes("[hidden] { display: none !important; }"), "app.css 必须包含全局 [hidden] 强制隐藏规则");
assert.ok(textDiffCss.includes(".text-diff-tool [hidden] {\n  display: none !important;\n}"), "text-diff.css 必须包含 [hidden] 规则");
assert.ok(pdfToolsCss.includes(".pdf-tools-tool [hidden] {\n  display: none !important;\n}"), "pdf-tools.css 必须包含 [hidden] 规则");

// 2. Blob 完整备份与还原闭环测试（P0 #2）
const sampleBytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 1, 2, 3]);
const originalBlob = new Blob([sampleBytes], { type: "image/png" });
const dataUrl = await blobToDataURL(originalBlob);
assert.ok(dataUrl && dataUrl.startsWith("data:image/png;base64,"), "blobToDataURL 必须输出合法 DataURL");

const jsonString = JSON.stringify({ blobDataUrl: dataUrl });
assert.ok(!jsonString.includes("{}"), "序列化后的备份不能退化为 {}");

const restoredBlob = dataURLToBlob(dataUrl);
assert.ok(restoredBlob instanceof Blob, "还原后必须是标准 Blob 实例");
assert.equal(restoredBlob.size, sampleBytes.length, "还原后的 Blob 体积必须与原始一致");
assert.equal(restoredBlob.type, "image/png", "还原后的 MIME 类型必须一致");

const restoredBuffer = new Uint8Array(await restoredBlob.arrayBuffer());
assert.deepEqual(restoredBuffer, sampleBytes, "还原后的二进制字节流必须与原始完全一致");

// 3. 清空数据状态契约（P0 #3）
const clearResult = await clearAllLocalData();
assert.ok(typeof clearResult === "object" && "success" in clearResult && "failedStores" in clearResult, "clearAllLocalData 必须返回明确的执行状态对象");

// 4. 移动端 390px 布局与溢出防范（P1 #5）
assert.ok(appCss.includes(".app-main {\n  flex: 1;\n  margin-left: var(--sidebar-w);\n  min-height: 100vh;\n  display: flex;\n  flex-direction: column;\n  min-width: 0;\n  max-width: 100%;\n}"), ".app-main 必须设置 min-width: 0 与 max-width: 100%");
assert.ok(appCss.includes("min-width: 0;\n  box-sizing: border-box;\n}\n\n#toolMounts,\n.tool-mount {\n  min-width: 0;\n  max-width: 100%;"), ".main-stage 与挂载容器必须包含 min-width: 0");
assert.ok(mdEditorCss.includes(".markdown-editor-tool .md-toolbar-scroll{\n  display:flex; gap:6px; overflow-x:auto; max-width:100%; min-width: 0; flex: 1 1 0%;"), "Markdown 工具栏滚动容器必须设置 min-width: 0 和 flex: 1 1 0%");
assert.ok(mdEditorCss.includes("grid-template-columns: 1fr !important;"), "Markdown 移动端必须强制单列");

// 5. 全局 ⌘K 冲突防护与 Markdown 隔离（P1 #6）
const appJs = await readFile(new URL("src/app.js", root), "utf8");
assert.ok(appJs.includes("target.isContentEditable ||\n        target.tagName === \"INPUT\" ||\n        target.tagName === \"TEXTAREA\""), "全局快捷键必须跳过可编辑元素");
const mdJs = await readFile(new URL("src/tools/markdown-editor/index.js", root), "utf8");
assert.ok(mdJs.includes("e.stopPropagation();\n      applyFormat(\"link\");"), "Markdown 快捷键必须阻止冒泡");

// 6. 搜索首次打开异步刷新与无障碍语义（P1 #7 & P2 #10）
assert.ok(searchModalJs.includes('role="combobox"'), "搜索框必须有 combobox 语义");
assert.ok(searchModalJs.includes('role="listbox"'), "结果列表必须有 listbox 语义");
assert.ok(searchModalJs.includes('role="option"'), "搜索结果必须有 option 语义");
assert.ok(searchModalJs.includes("previouslyFocusedElement"), "搜索弹窗必须保留并恢复焦点");
assert.ok(searchModalJs.includes("renderResults(input.value)"), "拉取最近记录后必须刷新当前搜索结果");

// 7. Tablist / Radio 无障碍语义（P2 #10）
assert.ok(recentViewJs.includes('role="tab"'), "最近记录必须具备 tab 语义");
assert.ok(recentViewJs.includes('aria-selected'), "最近记录必须同步 aria-selected");
assert.ok(qrcodeJs.includes('role="tab"'), "二维码内容类型必须具备 tab 语义");
assert.ok(qrcodeJs.includes('role="radio"'), "二维码纠错等级必须具备 radio 语义");
assert.ok(qrcodeJs.includes('aria-checked'), "二维码纠错等级必须同步 aria-checked");
assert.ok(textDiffJs.includes('tabViewSide.setAttribute("aria-selected", "true")'), "文本比对必须同步 aria-selected");

// 8. 文本比对卸载监听器清理（P2 #13）
assert.ok(textDiffJs.includes('document.removeEventListener("click", onDocClickCloseMore)'), "文本比对卸载时必须移除 document 点击监听器");

// 9. Markdown 文案准确性（P2 #9）
const mdRegistry = TOOL_REGISTRY.find((t) => t.id === "markdown-editor");
assert.ok(mdRegistry, "必须存在 markdown-editor 工具配置");
assert.ok(!JSON.stringify(mdRegistry).includes("所见即所得"), "Markdown 注册表文案不应再含有'所见即所得'");

console.log("audit regression tests passed");
