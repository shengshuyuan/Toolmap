# Changelog

本文件用于记录面向版本发布的关键变化。  
更细的开发过程、回滚说明和影响范围请查看 `operateLog.md`。

格式参考 Keep a Changelog，版本号遵循 SemVer 风格。

## [Unreleased]

### Security
- CSP 的 `script-src` 移除 `'unsafe-inline'`：`index.html` 内联脚本拆为 `src/boot/early.js`、`src/boot/main.js`、`src/boot/register-sw.js`
- 修复「最近使用」与工作台卡片的 `data-tool` / `data-record-id` 属性未转义的问题（备份导入的记录 ID 可能含引号）
- 修复应用启动失败提示未转义 `err.message` 的问题；新增默认转义的 `html` 模板标签（`src/shared/html.js`），应用于 `app.js` 与数据管理页

### Performance
- Service Worker 安装期只预缓存应用壳层与 `src` 的 JS/CSS；`vendor/` 大文件（pdf-lib、jsqr）改为首次使用时缓存到独立的 `toolmap-vendor-v1`，跨版本保留
- 缓存名由 `版本号 + 预缓存内容哈希` 构建时生成，发版自动清理旧缓存
- 工具专属 CSS 改为首次挂载该工具时按需注入（注册表新增 `cssPath`），不再在首屏同步加载 6 份样式
- 构建时向 `dist/index.html` 注入首屏关键模块的 `modulepreload`，缓解动态 import 瀑布
- `/vendor/*` 增加 `max-age=86400, stale-while-revalidate=604800` 缓存头（`/src`、`/assets` 因内部 import 不带版本号，仍保持 `must-revalidate`）

### Changed
- 各工具 HTML 模板拆分到 `template.js`（`index.js` 继续导出 `getXxxTemplate`，对外接口不变）
- 新增 `src/shared/store-configs.js`，统一四个工具 IndexedDB 的库名/store 名/条数上限，工具存储层与 `recent-index` 共用
- `jsconfig.json` 开启 `noImplicitAny`、`strictNullChecks`、`noImplicitThis`、`alwaysStrict`、`strictBindCallApply`、`strictFunctionTypes`，并修复相应类型问题
- 构建前会清空 `dist/`、校验 `package.json` 与 `app-meta.js` 版本一致，并在产物中自动写入 `BUILD_LABEL` 构建日期
- 源码 `sw.js` 改为最小模板，完整预缓存列表仅在构建产物中生成

## [0.6.9] - 2026-09-28

### Fixed
- Markdown 超链接统一使用 `#3240FC` 蓝色，导出与预览反转义多余标点，并提供“清理转义”工具
- 移除程序化聚焦标题时浏览器默认描边（a11y 回归）

## [0.6.8] - 2026-09-24

### Fixed
- 修复 `[hidden]` 契约、Blob 备份导入导出往返、移动端横向溢出、搜索弹窗可访问性与视觉一致性问题

## [0.6.7] - 2026-09-24

### Fixed
- 修复文本比对缺失 `statNavIndex` 节点导致的报错，以及搜索弹窗布局泄漏

## [0.6.6] - 2026-09-24

### Fixed
- 修复全局 CSS 变量 `--pad-lg` 与 `--r2` 缺失导致的 5 个工具面板内容贴边与直角化问题
- 修复本地数据管理页（Data Manage）样式类名错位，对齐卡片、表头与横向滚动样式
- 修复最近使用卡片删除按钮 `.btn--danger-subtle` 类名书写错误
- 修复 `html-import.js` 中的 TypeScript 类型推断错误
- 修复各老工具写死 `Poppins` 字体问题，全站统一继承系统无衬线字体栈
- 修复 Markdown 草稿恢复机制，支持按 `restoreId` 恢复指定文档
- 移除各工具标题的“在线”前缀，补齐面包屑导航，统一“本地工作台”品牌定位
- 修正 `index.html` 与 `manifest.json` 的 SEO 描述与图标配置

## [0.4.1] - 2026-05-03

### Fixed
- 修正 Vercel 静态资源缓存策略：`assets/` 继续长期缓存，`src/` 模块改为 `must-revalidate`，避免内部未带版本号的 ES module import 长期命中旧代码

### Added
- 补充 `tests/vercel-config.test.mjs`
- README 增加 `vercel.json` 说明与本地开发 → Vercel 发布 SOP
- 新增 `vercel.json`

## [0.4.0] - 2026-05-03

### Added
- 新增统一版本配置：`src/config/app-meta.js`
- 新增统一工具注册表：`src/tool-registry.js`
- 新增统一 app shell 渲染：`src/app-shell.js`
- 新增统一 debug flag：`src/debug.js`
- 新增工程化测试：
  - `tests/tool-registry.test.mjs`
  - `tests/debug-flags.test.mjs`
  - `tests/app-smoke.test.mjs`

### Changed
- `src/app.js` 改为通过 registry 动态挂载工具
- 工具切换按钮与挂载区改为运行时生成
- 三个工具入口补充模板导出，便于 smoke test

## [0.3.9] - 2026-05-03

### Changed
- 移除字符统计中的「填入示例」按钮与相关逻辑
- 保留“输入即实时统计”的主流程

## [0.3.8] - 2026-05-03

### Added
- 文本比对新增统一规则提示
- 文本比对新增定位自动纠偏提示
- 文本比对新增开发态行号偏差告警
- 新增 `tests/text-diff-diagnostics.test.mjs`

## [0.3.7] - 2026-05-03

### Fixed
- 优化字符统计对 CRLF / CR 换行的统计口径

## [0.3.6] - 2026-05-03

### Added
- 新增第三个独立工具「在线字符统计」
- 支持字符、UTF-8 字节、JavaScript 字符长度实时统计

## [0.3.5] - 2026-05-02

### Changed
- 提升图片压缩在 JPG 场景下的默认压缩感知
- 智能推荐模式增强 WebP 压缩策略

## [0.3.4] - 2026-05-01

### Added
- 文本比对增加浏览器本地历史记录

## [0.3.3] - 2026-05-01

### Added
- 图片压缩增加浏览器本地历史记录

## [0.3.2] - 2026-05-01

### Changed
- 优化图片压缩默认策略以更符合“明显减小体积”的预期

## [0.3.1] - 2026-05-01

### Fixed
- 修复图片压缩工具首轮联调问题与挂载/显示问题

## [0.3.0] - 2026-05-01

### Added
- 新增第二个独立工具「在线图片压缩」

## [0.2.0] - 2026-04-30

### Changed
- 完成发布前打磨：更新首屏文案、标题、结果说明与缓存版本策略

## [0.1.0] - 2026-04-29

### Added
- 初始 MVP：新增「树园工具导航」与在线文本差异比对能力
