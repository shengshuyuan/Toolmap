# Engineering Foundation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 为树园工具导航建立统一的工具注册协议、统一版本管理、统一开发态调试开关，并补充 smoke test，降低后续新增工具和持续迭代的维护成本。

**Architecture:** 新增统一配置层作为单一事实来源：`app-meta` 管理版本与站点元数据，`tool-registry` 管理工具注册协议，`debug` 管理调试开关。`src/app.js` 只消费这些配置并驱动 UI；工具模块通过导出模板函数支持 smoke test，而不改变已有业务逻辑。`index.html` 只保留最小壳层和占位节点，版本号通过统一配置驱动。

**Tech Stack:** 原生 JavaScript ES Modules、静态 HTML/CSS、Node 内置 test runner

---

## Task 1: 为工程化抽象写失败测试

**Files:**
- Create: `tests/tool-registry.test.mjs`
- Create: `tests/debug-flags.test.mjs`
- Create: `tests/app-smoke.test.mjs`

**Step 1: Write the failing test**
- `tool-registry.test.mjs`
  - 断言存在 3 个工具注册项
  - 每项都包含 `id / mountId / title / subtitle / name / hint / importPath / exportName`
- `debug-flags.test.mjs`
  - 断言默认 debug flag 关闭
  - 断言 query string 能开启指定 debug scope
- `app-smoke.test.mjs`
  - 断言 registry 中的 3 个工具都能生成按钮 label
  - 断言 3 个工具都能提供模板
  - 断言核心按钮/输入节点存在

**Step 2: Run test to verify it fails**

Run:

```bash
node --test /sessions/69f20880a626ca4e0d7d7ffd/workspace/tests/tool-registry.test.mjs
node --test /sessions/69f20880a626ca4e0d7d7ffd/workspace/tests/debug-flags.test.mjs
node --test /sessions/69f20880a626ca4e0d7d7ffd/workspace/tests/app-smoke.test.mjs
```

Expected:
- FAIL
- 缺少 registry/debug 模块或缺少导出

---

## Task 2: 实现统一版本与站点配置

**Files:**
- Create: `src/config/app-meta.js`
- Modify: `src/app.js`
- Modify: `index.html`

**Step 1: Write minimal implementation**
- `src/config/app-meta.js` 导出：
  - `APP_VERSION`
  - `BUILD_LABEL`
  - `APP_TITLE`
- `src/app.js` 从这里读取版本信息
- `index.html` 把可见版本展示改为由 JS 填充，避免手写多处版本号

**Step 2: Run tests**
- 运行前述测试，确保不破坏现有行为

---

## Task 3: 实现统一工具注册协议

**Files:**
- Create: `src/tool-registry.js`
- Modify: `src/app.js`
- Modify: `index.html`

**Step 1: Define registry**
- 每个工具注册项包含：
  - `id`
  - `mountId`
  - `title`
  - `subtitle`
  - `name`
  - `hint`
  - `buttonLabel`
  - `importPath`
  - `exportName`

**Step 2: Refactor app.js**
- 不再手写 `tools = {}`
- 改为从 registry 读取
- mount 时用动态 import + exportName 解析

**Step 3: Keep HTML shell minimal**
- `index.html` 中按钮和挂载区可由 app.js 根据 registry 生成
- 保证不改动工具模块内部 DOM 结构

---

## Task 4: 实现统一 debug flag

**Files:**
- Create: `src/debug.js`
- Modify: `src/tools/text-diff/index.js`
- Test: `tests/debug-flags.test.mjs`

**Step 1: Minimal API**
- 导出：
  - `parseDebugScopes(search)`
  - `isDebugEnabled(scope, options?)`
  - `debugLog(scope, ...args)`

**Step 2: Hook into text diff**
- 把文本比对中“行号自动纠偏”的 console 输出改为 debugLog
- 默认不刷屏
- 支持 query string 开启：
  - `?debug=text-diff`
  - `?debug=*`

---

## Task 5: 补 smoke test 所需导出并回归

**Files:**
- Modify: `src/tools/text-diff/index.js`
- Modify: `src/tools/image-compress/index.js`
- Modify: `src/tools/char-count/index.js`
- Test: `tests/app-smoke.test.mjs`

**Step 1: Export template getters**
- `getTextDiffTemplate()`
- `getImageCompressTemplate()`
- `getCharCountTemplate()`

**Step 2: Write smoke assertions**
- 能覆盖：
  - 三个工具已注册
  - 三个工具模板可用
  - 文本比对核心按钮存在
  - 图片压缩上传/选择按钮存在
  - 字符统计输入框与核心按钮存在

**Step 3: Full regression**

Run:

```bash
node --test /sessions/69f20880a626ca4e0d7d7ffd/workspace/tests/*.mjs
```

Expected:
- 所有测试通过

---

## 自评审清单

### 架构
- [ ] 工具信息是否只在 registry 中维护一份
- [ ] 版本号是否只在 app-meta 中维护一份
- [ ] debug flag 是否统一走 `src/debug.js`

### 正确性
- [ ] 三个工具仍能正常切换
- [ ] 动态 import 不影响现有功能
- [ ] 旧测试与新增测试全部通过

### 可维护性
- [ ] 新增第四个工具时不需要改多处重复信息
- [ ] smoke test 能覆盖基础接入错误

