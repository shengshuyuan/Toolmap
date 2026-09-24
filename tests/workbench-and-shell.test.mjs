import assert from "node:assert/strict";
import { TOOL_REGISTRY, getToolById, getToolIds } from "../src/tool-registry.js";
import { renderToolMountMarkup, renderToolSwitchMarkup } from "../src/app-shell.js";
import { getTextDiffTemplate } from "../src/tools/text-diff/index.js";
import {
  listAllRecentRecords,
  getLatestRestorableDraft,
  getStorageEstimate,
  importBackupData,
} from "../src/shared/recent-index.js";
import {
  filterSearchCandidates,
  TASK_SHORTCUTS,
} from "../src/search-modal.js";

// 1. Tool Registry 规范检验
{
  assert.equal(TOOL_REGISTRY.length, 6);
  assert.deepEqual(getToolIds(), [
    "text-diff",
    "image-compress",
    "char-count",
    "qrcode",
    "markdown-editor",
    "pdf-tools",
  ]);

  for (const tool of TOOL_REGISTRY) {
    assert.ok(tool.category, `${tool.id} 缺少分类 category`);
    assert.ok(tool.description, `${tool.id} 缺少描述 description`);
    assert.ok(Array.isArray(tool.keywords) && tool.keywords.length > 0, `${tool.id} 缺少搜索关键词`);
    assert.ok(tool.iconSvg && tool.iconSvg.includes("<svg"), `${tool.id} 缺少线性 SVG 图标`);
    assert.ok(tool.breadcrumb, `${tool.id} 缺少面包屑`);
  }

  // 交接文档文案订正验收
  const pdfTool = getToolById("pdf-tools");
  assert.ok(pdfTool);
  assert.ok(!pdfTool.description.includes("转换"), "PDF 工具简介不应包含当前未支持的'转换'");
  assert.ok(pdfTool.description.includes("合并、拆分与加水印"));

  const diffTool = getToolById("text-diff");
  assert.ok(diffTool);
  assert.ok(diffTool.description.includes("比较两段文本，定位每一处变更"));
}

// 2. App Shell 侧栏与挂载点检验
{
  const switchMarkup = renderToolSwitchMarkup(TOOL_REGISTRY);
  const mountMarkup = renderToolMountMarkup(TOOL_REGISTRY);

  assert.ok(switchMarkup.includes('data-nav-target="workbench"'), "侧栏应包含工作台入口");
  assert.ok(switchMarkup.includes('data-nav-target="recent"'), "侧栏应包含最近使用入口");
  assert.ok(switchMarkup.includes("文档与评审"), "侧栏应按场景划分'文档与评审'分组");
  assert.ok(switchMarkup.includes("素材与交付"), "侧栏应按场景划分'素材与交付'分组");

  assert.ok(mountMarkup.includes('id="workbenchMount"'), "应用应包含工作台容器");
  assert.ok(mountMarkup.includes('id="recentMount"'), "应用应包含最近使用容器");
  assert.ok(mountMarkup.includes('id="dataManageMount"'), "应用应包含本地数据管理容器");
}

// 3. 文本比对重设计检验
{
  const t = getTextDiffTemplate();
  assert.ok(t.includes("diff-header-bar"), "文本比对必须包含单标题头部");
  assert.ok(t.includes("diff-breadcrumb"), "文本比对必须包含面包屑");
  assert.ok(t.includes("diff-control-bar"), "文本比对必须包含控制条");
  assert.ok(t.includes("chkIgnoreWhitespace"), "文本比对必须支持'忽略空白'开关选项");
  assert.ok(t.includes("stageEditor"), "文本比对必须包含编辑舞台");
  assert.ok(t.includes("stageResult"), "文本比对必须包含差异展示舞台");
  assert.ok(t.includes("diff-bottom-bar"), "文本比对必须包含底部常驻栏");
  assert.ok(t.includes("statModCount"), "底部栏必须显示修改计数");
  assert.ok(t.includes("statAddCount"), "底部栏必须显示新增计数");
  assert.ok(t.includes("statDelCount"), "底部栏必须显示删除计数");
  assert.ok(t.includes("historyDrawer"), "文本比对必须包含历史抽屉");
  assert.ok(t.includes("btnLoadDemo"), "文本比对必须提供载入需求示例入口");
}

// 4. 最近使用索引接口检验
{
  const recent = await listAllRecentRecords();
  assert.ok(Array.isArray(recent), "最近记录应返回数组");

  const draft = await getLatestRestorableDraft();
  assert.ok(draft === null || typeof draft === "object", "草稿查询应返回对象或 null");

  const estimate = await getStorageEstimate();
  assert.ok(typeof estimate === "object");
  assert.ok("available" in estimate);
}

// 5. ⌘K 搜索与任务词匹配检验 (Section 3)
{
  const emptyResults = filterSearchCandidates("", {
    tools: TOOL_REGISTRY,
    tasks: TASK_SHORTCUTS,
    recents: [],
  });
  assert.equal(emptyResults.length, 6 + 3, "空输入应展示全部6个工具及3个推荐任务");

  const prdResults = filterSearchCandidates("需求", {
    tools: TOOL_REGISTRY,
    tasks: TASK_SHORTCUTS,
    recents: [],
  });
  const prdToolIds = prdResults.map((r) => r.toolId);
  assert.ok(prdToolIds.includes("text-diff"), "搜索'需求'必须能检索到文本比对");
  assert.ok(prdToolIds.includes("markdown-editor"), "搜索'需求'必须能检索到 Markdown 编辑器");

  const imgResults = filterSearchCandidates("图片变小", {
    tools: TOOL_REGISTRY,
    tasks: TASK_SHORTCUTS,
    recents: [],
  });
  assert.ok(imgResults.some((r) => r.toolId === "image-compress"), "搜索'图片变小'必须能匹配到图片压缩");

  const pdfResults = filterSearchCandidates("合并PDF", {
    tools: TOOL_REGISTRY,
    tasks: TASK_SHORTCUTS,
    recents: [],
  });
  assert.ok(pdfResults.some((r) => r.toolId === "pdf-tools"), "搜索'合并PDF'必须能匹配到 PDF 工具");

  const recentMock = [
    { title: "支付流程 PRD v2.1", summary: "对比完成", toolId: "text-diff", recordId: "rec-1", toolLabel: "文本比对" },
  ];
  const recentResults = filterSearchCandidates("支付流程", {
    tools: TOOL_REGISTRY,
    tasks: TASK_SHORTCUTS,
    recents: recentMock,
  });
  assert.ok(recentResults.some((r) => r.type === "recent" && r.title === "支付流程 PRD v2.1"), "搜索必须匹配最近记录");
}

// 6. 备份与恢复数据结构规范检验 (Section 6)
{
  await assert.rejects(
    async () => importBackupData(null),
    /无效的备份文件/,
    "导入空数据必须被拦截"
  );
  await assert.rejects(
    async () => importBackupData({ app: "OtherApp" }),
    /必须是 Toolmap 导出的 JSON 备份/,
    "导入非 Toolmap 数据必须被拦截"
  );
  await assert.rejects(
    async () => importBackupData({ app: "Toolmap" }),
    /缺少 stores 数据/,
    "缺少 stores 的数据必须被拦截"
  );
}

console.log("workbench and shell tests passed");
