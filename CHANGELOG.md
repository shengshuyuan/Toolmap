# Changelog

本文件用于记录面向版本发布的关键变化。  
更细的开发过程、回滚说明和影响范围请查看 `operateLog.md`。

格式参考 Keep a Changelog，版本号遵循 SemVer 风格。

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
