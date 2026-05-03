# 字符统计 MVP Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 为树园工具导航新增一个独立的「字符统计」工具，支持字符、字节、字符长度三种核心统计，不影响现有文本比对和图片压缩功能。

**Architecture:** 沿用现有“工具壳层 + 独立工具目录”架构，在 `src/tools/char-count/` 下新增独立模块；`src/app.js` 只新增挂载配置，`index.html` 只新增工具挂载点与切换按钮，避免侵入 `text-diff` 与 `image-compress` 的业务代码。统计逻辑封装在纯函数模块中，UI 模块只负责事件绑定与渲染，便于测试。

**Tech Stack:** 原生 JavaScript ES Modules、静态 HTML、CSS、Node 内置 test runner、浏览器 `TextEncoder`

---

## 技术方案

### 1. 工具接入方式
- 新增工具目录：`src/tools/char-count/`
- 新增模块建议：
  - `index.js`：挂载入口、模板、事件绑定、实时统计 UI
  - `stats.js`：纯统计函数，实现字符/字节/字符长度等计算
- 修改 `src/app.js`
  - 注册 `char-count` 工具配置
  - 设置标题、副标题、提示文案
- 修改 `index.html`
  - 新增切换按钮
  - 新增工具挂载容器 `<section id="charCountTool">`
- 修改 `assets/app.css`
  - 仅新增 `char-count` 命名空间样式，不改旧工具选择器逻辑

### 2. 统计口径
- 字符：
  - 按 Unicode code point 统计
  - 目标：用户可见字符数更符合直觉
- 字节：
  - 按 UTF-8 编码后的字节数统计
  - 使用 `new TextEncoder().encode(text).length`
- 字符长度：
  - 按 JavaScript `string.length`
  - 反映程序中的 UTF-16 code unit 长度

### 3. MVP 页面结构
- 标题区
  - 在线字符统计
  - 本地处理 / 实时统计
- 输入区
  - 单个大文本输入框
- 操作区
  - 清空文本
  - 复制文本
- 结果区
  - 核心三指标：字符 / UTF-8 字节 / 字符长度
  - 增强指标：总行数 / 非空行数 / 中文数 / 英文数 / 数字数 / 空格数
- 说明区
  - 给出示例 `A中😀` 的三种口径差异说明

### 4. 风险点与规避
- 风险：emoji 统计不准
  - 规避：字符数使用 `Array.from(text).length` 或等价 code point 口径
- 风险：换行统计口径混乱
  - 规避：统一先做 `normalizeNewlines`
- 风险：影响现有工具
  - 规避：不修改旧工具目录；壳层只追加，不重构旧逻辑

---

## 任务拆解

### Task 1: 先写统计逻辑测试

**Files:**
- Create: `tests/char-count.test.mjs`
- Test: `tests/char-count.test.mjs`

**Step 1: Write the failing test**

覆盖这些行为：
- 空文本统计
- 英文文本 `abc`
- 中文文本 `中文`
- emoji 文本 `😀`
- 混合文本 `A中😀`
- 多行文本行数/非空行数统计
- 中文/英文/数字/空格分类统计

**Step 2: Run test to verify it fails**

Run:

```bash
node --test /sessions/69f20880a626ca4e0d7d7ffd/workspace/tests/char-count.test.mjs
```

Expected:
- FAIL
- 原因应为 `Cannot find module` 或导出函数不存在

**Step 3: Commit**

不提交，继续进入实现任务。

---

### Task 2: 实现纯统计模块

**Files:**
- Create: `src/tools/char-count/stats.js`
- Test: `tests/char-count.test.mjs`

**Step 1: Write minimal implementation**

导出建议函数：

```js
export function analyzeTextStats(text) {}
```

返回结构建议：

```js
{
  characters: 0,
  bytesUtf8: 0,
  stringLength: 0,
  lines: 0,
  nonEmptyLines: 0,
  chinese: 0,
  english: 0,
  digits: 0,
  spaces: 0,
}
```

**Step 2: Run test to verify it passes**

Run:

```bash
node --test /sessions/69f20880a626ca4e0d7d7ffd/workspace/tests/char-count.test.mjs
```

Expected:
- PASS

**Step 3: Refactor**
- 如果需要，抽出 `normalizeNewlines` 复用逻辑
- 保持纯函数，不耦合 DOM

---

### Task 3: 新增字符统计工具 UI

**Files:**
- Create: `src/tools/char-count/index.js`
- Modify: `src/app.js`
- Modify: `index.html`
- Modify: `assets/app.css`

**Step 1: 先定义最小交互**
- 工具标题/副标题/提示
- 输入框
- 3 个主统计卡片
- 4~6 个辅助指标
- 操作按钮：清空、复制

**Step 2: 实现挂载入口**
- `mountCharCountTool(mount)`
- 输入事件实时触发统计
- 初始状态显示 0

**Step 3: 接入工具壳层**
- `src/app.js` 增加 `char-count` 配置
- `index.html` 增加工具按钮与挂载点

**Step 4: 新增样式**
- 所有新样式加 `char-count-tool` 命名空间
- 不改现有 `text-diff-tool` 和 `image-compress-tool` 行为

**Step 5: 运行站点手动验证**

Run:

```bash
python3 -m http.server 5183
```

Verify:
- 能切换到字符统计工具
- 输入即更新
- 清空/复制可用
- 旧工具可正常切换

---

### Task 4: 为 UI 行为补测试

**Files:**
- Create: `tests/char-count-ui.test.mjs`（如不适合 DOM 测试，可只保留 stats 单测并用手工验证替代）

**Step 1: 优先保证逻辑测试完整**
- MVP 阶段可以不强行引入 DOM 测试框架
- 用 stats 单测 + 手动验证 + 回归测试组合替代

**Step 2: 回归运行已有测试**

Run:

```bash
node --test /sessions/69f20880a626ca4e0d7d7ffd/workspace/tests/*.mjs
```

Expected:
- 所有旧测试继续通过
- 新增测试通过

---

### Task 5: 文档与变更记录

**Files:**
- Modify: `README.md`
- Modify: `operateLog.md`

**Step 1: 更新 README**
- 加入字符统计工具说明
- 加入功能概述

**Step 2: 更新变更日志**
- 记录新增字符统计工具
- 记录不影响已有两个工具

---

## 自评审清单

### 架构评审
- [ ] 新功能是否完全在 `src/tools/char-count/` 内独立实现
- [ ] 是否仅对壳层做最小追加改动
- [ ] 是否没有修改 `text-diff` / `image-compress` 的业务实现

### 产品评审
- [ ] 用户是否能理解“字符 / 字节 / 字符长度”的差异
- [ ] 默认页面是否足够简洁，不像“分析仪表盘”
- [ ] 输入是否实时反馈，无需按钮触发

### 实现评审
- [ ] emoji 场景统计是否准确
- [ ] CRLF / LF 是否统一处理
- [ ] 空文本是否稳定显示 0
- [ ] 示例文本是否能直观看出三种口径差异

### 回归评审
- [ ] 文本比对仍可切换、可用
- [ ] 图片压缩仍可切换、可用
- [ ] 所有现有自动化测试通过

---

## MVP 完成定义
- 新增第三工具「字符统计」
- 支持字符、字节、字符长度三大核心指标
- 支持实时输入统计
- 支持清空 / 复制 / 示例
- 不影响现有文本比对与图片压缩
- 新增测试通过，旧测试全部通过
