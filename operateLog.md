# operateLog.md

- **[2026-05-03 17:25]** 🟡修改
  - **影响范围**：`vercel.json` `src/config/app-meta.js` `README.md` `tests/vercel-config.test.mjs` `operateLog.md`
  - **变更摘要**：修正 Vercel 静态资源缓存策略：`assets/` 继续长期缓存，`src/` 模块改为重新校验，避免内部未带版本号的 ES module import 在用户浏览器里长期命中旧代码；补充 Vercel 缓存策略回归测试，版本升级到 `v0.4.1`
  - **回滚指南**：如已使用 Git：恢复 `vercel.json`、`src/config/app-meta.js`、`README.md`、`tests/vercel-config.test.mjs` 和 `operateLog.md` 到上一次版本

- **[2026-05-03 17:20]** 🟡修改
  - **影响范围**：`vercel.json` `README.md`
  - **变更摘要**：补充显式的 `vercel.json`，为纯静态站部署明确缓存与基础安全头策略；同时将“本地开发 → Vercel 发布”的 SOP 写入 `README.md`，方便后续由人或 Codex 复用相同发布流程
  - **回滚指南**：如已使用 Git：恢复 `vercel.json`、`README.md` 和 `operateLog.md` 到上一次版本

- **[2026-05-03 08:20]** 🟡修改
  - **影响范围**：`src/config/app-meta.js` `src/tool-registry.js` `src/app-shell.js` `src/debug.js` `src/app.js` `index.html` `src/tools/text-diff/index.js` `src/tools/image-compress/index.js` `src/tools/char-count/index.js` `src/tools/image-compress/compressor.js` `src/tools/text-diff/history-store.js` `tests/tool-registry.test.mjs` `tests/debug-flags.test.mjs` `tests/app-smoke.test.mjs` `README.md` `docs/plans/2026-05-03-engineering-foundation-plan.md`
  - **变更摘要**：完成第四优先级的首轮工程化收敛：新增统一版本配置、统一工具注册协议、统一 app shell 渲染、统一 debug flag，并补充 tool registry / debug flags / app smoke 三类测试；版本入口升级到 `v0.4.0`，减少后续新增工具和改版本时的多处重复维护
  - **回滚指南**：如已使用 Git：恢复上述文件到上一次版本；或重点回退 `src/app.js`、`index.html`、`src/tool-registry.js`、`src/config/app-meta.js` 和新增测试文件

- **[2026-05-03 07:55]** 🟡修改
  - **影响范围**：`src/tools/char-count/index.js` `tests/char-count-template.test.mjs` `src/app.js` `index.html` `README.md`
  - **变更摘要**：按当前交互取舍，移除字符统计中的「填入示例」按钮与相关逻辑，保留“输入即实时统计”的主流程；补充模板级回归测试，并将缓存版本升级到 `v0.3.9`
  - **回滚指南**：如已使用 Git：恢复 `src/tools/char-count/index.js`、`tests/char-count-template.test.mjs`、`src/app.js`、`index.html`、`README.md` 和 `operateLog.md` 到上一次版本

- **[2026-05-03 07:45]** 🟡修改
  - **影响范围**：`src/tools/text-diff/index.js` `src/tools/text-diff/diagnostics.js` `tests/text-diff-diagnostics.test.mjs` `assets/app.css` `src/app.js` `index.html` `README.md`
  - **变更摘要**：优先补强文本比对的稳定性与可信度：新增统一规则提示（末尾换行、大文本模式）、定位自动纠偏提示、开发态行号偏差告警，以及对应纯函数测试；同时升级缓存版本到 `v0.3.8`，降低旧模块缓存导致的“看起来没修复”风险
  - **回滚指南**：如已使用 Git：恢复 `src/tools/text-diff/index.js`、`src/tools/text-diff/diagnostics.js`、`tests/text-diff-diagnostics.test.mjs`、`assets/app.css`、`src/app.js`、`index.html`、`README.md` 和 `operateLog.md` 到上一次版本

- **[2026-05-03 07:35]** 🟡修改
  - **影响范围**：`src/tools/char-count/stats.js` `src/tools/char-count/index.js` `tests/char-count.test.mjs` `src/app.js` `index.html` `README.md` `operateLog.md`
  - **变更摘要**：优化「在线字符统计」换行统计口径：字符数、UTF-8 字节和 JavaScript 字符长度按用户输入原文统计，行数与非空行继续兼容 CRLF/CR 换行；补充 Windows 换行回归测试，并将缓存版本升级到 `v0.3.7`
  - **回滚指南**：如已使用 Git：恢复 `src/tools/char-count/stats.js`、`tests/char-count.test.mjs`、`src/tools/char-count/index.js`、`src/app.js`、`index.html`、`README.md` 和 `operateLog.md` 到上一次版本

- **[2026-05-03 00:00]** 🟢新增
  - **影响范围**：`src/tools/char-count/index.js` `src/tools/char-count/stats.js` `tests/char-count.test.mjs` `src/app.js` `index.html` `assets/app.css` `README.md` `docs/plans/2026-05-03-char-count-mvp-plan.md` `字符统计需求文档.md`
  - **变更摘要**：新增第三个独立工具「在线字符统计」MVP：支持字符、UTF-8 字节、JavaScript 字符长度三大核心统计，并补充总行数、非空行、中文、英文、数字、空格等辅助指标；支持实时统计、填入示例、复制文本、清空文本；以独立目录 `src/tools/char-count/` 开发接入，不改动文本比对与图片压缩的业务模块，并将缓存版本升级到 `v0.3.6`
  - **回滚指南**：如已使用 Git：恢复 `src/tools/char-count/`、`tests/char-count.test.mjs`、`src/app.js`、`index.html`、`assets/app.css`、`README.md`、`docs/plans/2026-05-03-char-count-mvp-plan.md`、`字符统计需求文档.md` 和 `operateLog.md` 到上一次版本

- **[2026-05-02 00:00]** 🟡修改
  - **影响范围**：`src/tools/image-compress/compressor.js` `src/tools/image-compress/utils.js` `src/tools/image-compress/index.js` `tests/image-compress.test.mjs` `README.md`
  - **变更摘要**：提升 JPG 场景下的默认压缩感知：智能推荐改为 WebP + 72% + 最长边 1920px，并在节省低于预期时自动尝试 68% / 1920px 与 68% / 1600px 的增强候选，最终选择体积更小的结果；列表中标识“已增强/自动增强”，并将缓存版本升级到 `v0.3.5`
  - **回滚指南**：如已使用 Git：恢复 `src/tools/image-compress/compressor.js`、`src/tools/image-compress/utils.js`、`src/tools/image-compress/index.js`、`tests/image-compress.test.mjs`、`README.md`、`index.html`、`src/app.js` 和 `operateLog.md` 到上一次版本

- **[2026-05-01 00:00]** 🟢新增
  - **影响范围**：`src/tools/text-diff/index.js` `src/tools/text-diff/history-store.js` `assets/app.css` `tests/text-history.test.mjs` `README.md`
  - **变更摘要**：为文本比对工具新增浏览器本地历史记录入口：比对完成后保存两侧文本、差异摘要和差异统计，最多保留最近 30 条；支持恢复历史文本、复制历史摘要、删除单条和清空历史；删除/清空前均有浏览器确认，并将缓存版本升级到 `v0.3.4`
  - **回滚指南**：如已使用 Git：恢复 `src/tools/text-diff/index.js`、`src/tools/text-diff/history-store.js`、`assets/app.css`、`tests/text-history.test.mjs`、`README.md`、`index.html`、`src/app.js` 和 `operateLog.md` 到上一次版本

- **[2026-05-01 00:00]** 🟢新增
  - **影响范围**：`src/tools/image-compress/index.js` `src/tools/image-compress/history-store.js` `assets/app.css` `tests/image-compress.test.mjs` `README.md`
  - **变更摘要**：为图片压缩工具新增浏览器本地历史记录：使用 IndexedDB 默认只保存压缩后的图片和元数据，最多保留最近 30 条；支持历史列表、缓存占用展示、重新下载、删除单条和清空历史；删除/清空前均有浏览器确认，并将缓存版本升级到 `v0.3.3`
  - **回滚指南**：如已使用 Git：恢复 `src/tools/image-compress/index.js`、`src/tools/image-compress/history-store.js`、`assets/app.css`、`tests/image-compress.test.mjs`、`README.md`、`index.html`、`src/app.js` 和 `operateLog.md` 到上一次版本

- **[2026-05-01 00:00]** 🟡修改
  - **影响范围**：`src/tools/image-compress/utils.js` `src/tools/image-compress/index.js` `tests/image-compress.test.mjs` `README.md`
  - **变更摘要**：优化图片压缩默认策略以匹配“明显减小体积”的产品预期：智能推荐默认转 WebP、质量 78%、最长边 2560px；高清优先改为 WebP + 3840px + 88%；极限压缩改为 WebP + 1600px + 58%；文件列表显示压缩前后尺寸变化，并将缓存版本升级到 `v0.3.2`
  - **回滚指南**：如已使用 Git：恢复 `src/tools/image-compress/utils.js`、`src/tools/image-compress/index.js`、`tests/image-compress.test.mjs`、`README.md`、`index.html`、`src/app.js` 和 `operateLog.md` 到上一次版本

- **[2026-05-01 00:00]** 🟡修改
  - **影响范围**：`assets/app.css` `src/tools/image-compress/index.js` `src/app.js` `index.html` `README.md` `tests/image-compress.test.mjs`
  - **变更摘要**：修复图片压缩 MVP 首轮联调问题：补上 `.tool-mount[hidden]` 强隐藏规则，避免文本比对和图片压缩两个工具叠在同一页面；将「选择图片」改为原生 `label for=file` 触发，提升文件选择弹窗可靠性；修正图片工具挂载时节点查找函数参数错误，并升级缓存版本到 `v0.3.1`
  - **回滚指南**：如已使用 Git：恢复 `assets/app.css`、`src/tools/image-compress/index.js`、`src/app.js`、`index.html`、`README.md`、`tests/image-compress.test.mjs` 和 `operateLog.md` 到上一次版本

- **[2026-05-01 00:00]** 🟢新增
  - **影响范围**：`index.html` `assets/app.css` `src/app.js` `src/tools/image-compress/*` `tests/image-compress.test.mjs` `README.md`
  - **变更摘要**：新增第二个独立工具「在线图片压缩」MVP：支持 JPG/PNG/WebP 多图上传、拖拽上传、本地 Canvas 压缩、智能/高清/极限/无损模式、质量滑杆、最大边限制、转 WebP、单图下载、ZIP 打包下载；站点工具切换改为可用状态并支持 hash 直达
  - **回滚指南**：如已使用 Git：恢复 `index.html`、`assets/app.css`、`src/app.js`、`src/tools/image-compress/`、`tests/image-compress.test.mjs`、`README.md` 和 `operateLog.md` 到上一次发布版本

- **[2026-05-01 00:00]** 🟡修改
  - **影响范围**：`index.html` `assets/app.css` `src/app.js` `src/tools/text-diff/*` `tests/*.mjs` `README.md`
  - **变更摘要**：将文本比对工具从首页内联结构中拆出，独立到 `src/tools/text-diff/`；`index.html` 只保留工具挂载点，`src/app.js` 只负责站点初始化和挂载当前工具；文本比对样式统一加 `.text-diff-tool` 作用域，测试引用同步到新目录，并在 README 增加后续工具隔离约定
  - **回滚指南**：如已使用 Git：恢复 `index.html`、`assets/app.css`、`src/app.js`、`src/tools/text-diff/`、`tests/`、`README.md` 和 `operateLog.md` 到上一次发布版本

- **[2026-04-30 00:00]** 🟡修改
  - **影响范围**：`index.html` `assets/app.css` `src/app.js` `README.md`
  - **变更摘要**：发布前打磨为 `v0.2.0`：更新页面 title、首屏主标题、工具卡文案、footer 构建信息和缓存版本号；将英文占位 `Coming soon` 改为中文规划态；结果说明补充橙/蓝差异类型含义；进一步压缩首屏编辑器高度，保证工具栏完整露出
  - **回滚指南**：如已使用 Git：`git checkout -- index.html assets/app.css src/app.js README.md operateLog.md`

- **[2026-04-30 00:00]** 🟡修改
  - **影响范围**：`src/diff.js` `src/render.js` `src/app.js` `src/summary.js` `tests/diff.test.mjs` `tests/summary.test.mjs` `index.html` `assets/app.css`
  - **变更摘要**：新增差异类型识别：将仅空格、Tab、空行变化归为「排版差异」，文字/标点/代码字符变化归为「内容差异」；结果区每条差异显示类型标签并使用不同底色；状态栏和复制摘要增加内容/排版差异数量；为模块引用增加版本号避免旧模块缓存
  - **回滚指南**：如已使用 Git：`git checkout -- src/diff.js src/render.js src/app.js src/summary.js tests/diff.test.mjs tests/summary.test.mjs index.html assets/app.css operateLog.md`

- **[2026-04-30 00:00]** 🟡修改
  - **影响范围**：`index.html` `assets/app.css` `src/diff.js` `tests/diff-large.test.mjs` `README.md`
  - **变更摘要**：按“在线文本差异比对支持中文、英文、代码、大文本”的能力方向优化页面文案与首屏能力标签；将单次比对行数保护从 4000 行提升到 20000 行，并补充 6000 行混合中文/英文/代码的大文本回归测试；README 同步说明“不限制字符数，本地处理，保留行数保护”
  - **回滚指南**：如已使用 Git：`git checkout -- index.html assets/app.css src/diff.js tests/diff-large.test.mjs README.md operateLog.md`

- **[2026-04-30 00:00]** 🟡修改
  - **影响范围**：`index.html` `assets/app.css` `src/app.js` `src/editor.js` `src/clipboard.js` `src/state.js` `README.md`
  - **变更摘要**：压缩首屏 header 与编辑器高度，让输入区和工具栏首屏可见；重组工具栏按钮分组避免「复制结果」换行；重构编辑器为“行号列 + 内容容器”结构，textarea 不再与行号共享滚动层；拆分 `app.js`，将编辑器、复制、状态逻辑抽到独立模块；输入时 overlay 渲染改为轻量/防抖路径以改善长文本性能
  - **回滚指南**：如已使用 Git：`git checkout -- index.html assets/app.css src/app.js src/editor.js src/clipboard.js src/state.js README.md operateLog.md`

- **[2026-04-30 00:00]** 🟡修改
  - **影响范围**：`index.html` `assets/app.css` `src/app.js`
  - **变更摘要**：更新文本比对提示文案；将 toast 改为工具条下方的页面内提示并延长展示时间；强化行号列层级、背景和遮罩阴影，减少横向滚动文字压到序号区的问题；为 CSS 增加版本号避免浏览器缓存旧样式
  - **回滚指南**：如已使用 Git：`git checkout -- index.html assets/app.css src/app.js operateLog.md`

- **[2026-04-30 00:00]** 🟡修改
  - **影响范围**：`index.html` `assets/app.css` `src/app.js` `src/summary.js` `tests/summary.test.mjs`
  - **变更摘要**：新增「交换文本」和「复制结果」按钮；复制结果支持未比对 toast 提示与比对摘要复制；修复粘贴/比对/交换后的横向滚动残留，并同步左右输入框横向滚动
  - **回滚指南**：如已使用 Git：`git checkout -- index.html assets/app.css src/app.js src/summary.js tests/summary.test.mjs operateLog.md`

- **[2026-04-30 00:00]** 🟡修改
  - **影响范围**：`assets/app.css` `src/app.js`
  - **变更摘要**：二次修复编辑器叠层：改为 grid 列内叠层，行号列与文本列真正分离，并同步高亮层横向滚动，避免真实长文本滚动时文字/高亮越界到行号区域
  - **回滚指南**：如已使用 Git：`git checkout -- assets/app.css src/app.js operateLog.md`

- **[2026-04-30 00:00]** 🟡修改
  - **影响范围**：`index.html` `assets/app.css`
  - **变更摘要**：修复输入框横向滚动时文字滑到左侧行号列下方的问题；将清空两侧内容入口改为明确的「一键清空文本」按钮
  - **回滚指南**：如已使用 Git：`git checkout -- index.html assets/app.css operateLog.md`

- **[2026-04-30 00:00]** 🟡修改
  - **影响范围**：`src/diff.js` `src/app.js` `tests/diff.test.mjs`
  - **变更摘要**：修复一侧为空时被误判为“修改”的 diff 口径，改为真实新增/删除；收拢页面交互里的重复状态重置逻辑；新增长文本 diff 回归测试（修改/新增/删除混合场景）
  - **回滚指南**：如已使用 Git：`git checkout -- src/diff.js src/app.js tests/diff.test.mjs operateLog.md`

- **[2026-04-29 00:00]** 🟢新增
  - **影响范围**：`index.html` `assets/app.css` `src/app.js` `src/diff.js` `src/render.js` `src/sanitize.js` `README.md`
  - **变更摘要**：新增「树园的工具导航」MVP：苹果风浅色单页 + 本地文本比对（差异高亮/计数/导航/清空空行等）
  - **回滚指南**：如已使用 Git：`git checkout -- .` 回到上一次提交；或恢复备份文件（如有）

- **[2026-04-29 00:00]** 🟡修改
  - **影响范围**：`index.html` `assets/app.css` `src/app.js`
  - **变更摘要**：输入框内增加“差异行标注”（行号 + 高亮底色），便于直接在原输入区修改；同时调整整体视觉更接近苹果的克制风格
  - **回滚指南**：如已使用 Git：`git checkout -- index.html assets/app.css src/app.js`

- **[2026-04-29 00:00]** 🟡修改
  - **影响范围**：`assets/app.css`
  - **变更摘要**：修复输入框区域适配：提升默认编辑高度，并允许拖拽调整高度，避免文本较少时输入区过矮
  - **回滚指南**：如已使用 Git：`git checkout -- assets/app.css`

- **[2026-04-29 00:00]** 🟡修改
  - **影响范围**：`index.html` `assets/app.css` `src/bg-art.js`
  - **变更摘要**：引入“树园雾纹”算法背景（Canvas 本地一次生成，极淡不抢内容），并微调主按钮为更接近苹果官网的纯蓝底样式
  - **回滚指南**：如已使用 Git：`git checkout -- index.html assets/app.css src/bg-art.js`

- **[2026-04-29 00:00]** 🟡修改
  - **影响范围**：`assets/app.css`
  - **变更摘要**：修复输入框“文字重叠”问题：高亮层仅显示底色标注，不再渲染文字，避免与 textarea 文本叠加
  - **回滚指南**：如已使用 Git：`git checkout -- assets/app.css`

- **[2026-04-29 00:00]** 🟡修改
  - **影响范围**：`assets/app.css` `src/bg-art.js`
  - **变更摘要**：按 brand-guidelines 应用 Anthropic 颜色与字体体系（Poppins/Lora 的回退栈），并将算法背景配色同步为品牌橙/蓝/绿；不改动任何功能逻辑
  - **回滚指南**：如已使用 Git：`git checkout -- assets/app.css src/bg-art.js`

- **[2026-04-29 00:00]** 🟡修改
  - **影响范围**：`index.html` `assets/app.css`
  - **变更摘要**：修正输入框与结果区行号不一致/“行号漂移”：关闭输入框自动换行（wrap=off），使“行号=真实换行行号”稳定一致，并保持差异定位准确
  - **回滚指南**：如已使用 Git：`git checkout -- index.html assets/app.css`

- **[2026-04-29 00:00]** 🟡修改
  - **影响范围**：`src/app.js`
  - **变更摘要**：修复“定位到目标行偏移”导致行号对不齐：改为使用浏览器原生 setSelectionRange 滚动定位，并在下一帧同步行号/高亮层滚动，保证输入框行号与比对结果一致
  - **回滚指南**：如已使用 Git：`git checkout -- src/app.js`

- **[2026-04-29 00:00]** 🟡修改
  - **影响范围**：`src/app.js`
  - **变更摘要**：修复滚动到底部时行号/高亮层与 textarea “最后几行错开”：改为按滚动比例映射同步 overlay，避免 scrollTop 直接赋值被 clamp
  - **回滚指南**：如已使用 Git：`git checkout -- src/app.js`

- **[2026-04-29 00:00]** 🟡修改
  - **影响范围**：`assets/app.css`
  - **变更摘要**：修复输入框“高亮行与实际行高度错位”：将代码编辑区行高改为固定像素（--code-line-height），避免 textarea 与 div 渲染的累计舍入误差
  - **回滚指南**：如已使用 Git：`git checkout -- assets/app.css`

- **[2026-04-29 00:00]** 🟡修改
  - **影响范围**：`src/app.js`
  - **变更摘要**：修复“行号偶发+1不一致”与“滚动时高亮闪烁廉价感”：定位时以光标实际行号为准；滚动时只同步 scrollTop 不重绘 overlay；聚焦高亮改为 DOM class 切换而非全量重渲染
  - **回滚指南**：如已使用 Git：`git checkout -- src/app.js`

- **[2026-04-29 00:00]** 🟡修改
  - **影响范围**：`src/app.js`
  - **变更摘要**：修复在包含 Windows 换行（CRLF, \\r\\n）的粘贴文本中出现的“定位行号+1偏移”：行首索引与光标行号计算改为基于 textarea 原始字符串扫描（不再先 normalize 导致索引漂移）
  - **回滚指南**：如已使用 Git：`git checkout -- src/app.js`
