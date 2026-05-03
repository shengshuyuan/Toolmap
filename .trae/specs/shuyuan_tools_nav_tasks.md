# Spec（Phase 3 - Tasks）：树园的工具导航（首期：文本比对 MVP）

> 原则：每个任务尽量 ≤ 20 分钟；每个任务都附带验收点与验证方法。

## Task 0：初始化项目骨架（纯静态）
- [ ] 创建基础目录与文件：`index.html / assets/app.css / src/*.js`
  - Acceptance：能打开空白页面，且资源加载无 404
  - Verify：`python3 -m http.server 5173` 然后打开 `http://localhost:5173`
  - Files：`index.html`, `assets/app.css`, `src/app.js`

## Task 1：苹果风页面框架与排版系统
- [ ] Header/工具标签/工作台/结果区骨架 + 响应式布局
  - Acceptance：桌面双栏、移动端上下；整体留白与排版有层级
  - Verify：浏览器缩放窗口宽度检查布局
  - Files：`index.html`, `assets/app.css`

## Task 2：文本输入区与基础交互（不含 diff）
- [ ] 左右 textarea、按钮工具条（开始比对/清空空行/互换/清空/上一处下一处占位禁用）
  - Acceptance：文本可输入；按钮点击有反馈（console 或 UI toast）
  - Verify：手动输入文本点击按钮观察行为
  - Files：`src/app.js`, `index.html`

## Task 3：实现“清空空行”能力（sanitize）
- [ ] 实现 `sanitizeRemoveBlankLines(text)`，支持去除空行（含仅空格/Tab）
  - Acceptance：复制含空行文本后，一键清理能按预期删除空行
  - Verify：用带空行样例测试；按钮点击后 textarea 内容变化
  - Files：`src/sanitize.js`, `src/app.js`

## Task 4：实现行级 diff（LCS）
- [ ] 在 `src/diff.js` 实现 `diffLines(leftText, rightText)` 输出 `DiffLine[]`
  - Acceptance：对简单样例（增/删/改）输出正确 op 序列
  - Verify：在页面里跑样例；或临时在控制台打印结果
  - Files：`src/diff.js`, `src/app.js`

## Task 5：结果渲染（高亮 + 差异数量）
- [ ] 渲染差异列表；新增/删除/相同样式区分；顶部展示 `差异：N`
  - Acceptance：无差异显示 0；有差异显示正确数量；高亮明显
  - Verify：对比一致/不一致两组样例
  - Files：`src/render.js`, `assets/app.css`, `src/app.js`

## Task 6：差异导航（上一处/下一处）
- [ ] 建立差异锚点列表并实现滚动定位与短暂高亮
  - Acceptance：能逐个跳转差异项；无差异按钮禁用
  - Verify：制造 3+ 处差异，连续点击下一处检查定位
  - Files：`src/app.js`, `src/render.js`, `assets/app.css`

## Task 7：输入框同步滚动（可选但推荐）
- [ ] 左右 textarea 同步滚动（按滚动比例映射）
  - Acceptance：滚动一侧，另一侧跟随，体感顺滑
  - Verify：粘贴长文本滚动测试
  - Files：`src/app.js`

## Task 8：完善异常提示与易用性
- [ ] 两侧都空提示；一侧为空允许比对并显示提示语；重复点击去抖
  - Acceptance：不出现报错；提示语清晰
  - Verify：多种输入边界情况手测
  - Files：`src/app.js`, `index.html`

## Task 9：本地验证说明 + 云端部署文档（MVP）
- [ ] 写 `README.md`：本地启动、使用说明、部署到 Vercel/GitHub Pages 二选一（给出命令与步骤）
  - Acceptance：照 README 步骤可复现运行与部署
  - Verify：按 README 自己走一遍（至少本地）
  - Files：`README.md`

