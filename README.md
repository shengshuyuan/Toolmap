# 树园工具导航 (Toolmap)

<div align="center">

**隐私优先的在线工具箱 — 所有计算全程在浏览器本地完成，不上传任何数据。**

[在线体验](https://toolmap.shuyuan.me/) · [功能介绍](#-工具一览) · [本地运行](#-快速开始) · [部署](#-部署)

</div>

---

## ✨ 特性

- **零后端** — 纯静态站点，所有处理在浏览器本地完成，无服务器、无 API、无数据上传
- **隐私优先** — 你的文本、图片、数据永远不会离开你的设备
- **PWA 支持** — 可安装到桌面，离线可用
- **按需加载** — ES Module 架构，工具间代码隔离，切换时动态加载
- **移动端适配** — 响应式布局，手机/平板/桌面均可使用
- **历史记录** — IndexedDB 本地存储，支持导出备份

---

## 🧰 工具一览

### 📝 文本差异比对

对比两段文本的差异，支持中文、英文、代码和大文本。

| 功能 | 说明 |
|------|------|
| 行级 Diff | 基于 Myers 算法（Int32Array 优化）的行级差异比对 |
| 字符级 Diff | 对差异行进一步做字符级高亮，精确到每一个字 |
| 快速跳转 | 上一处 / 下一处差异快速定位 |
| 一键清空空行 | 比对前快速清理干扰项 |
| 复制结果 | 一键复制比对摘要 |
| 历史记录 | 自动保存最近 30 条比对记录，支持恢复和导出 |

### 🖼️ 图片压缩

批量压缩图片，智能推荐最优参数，支持 JPG / PNG / WebP。

| 功能 | 说明 |
|------|------|
| 批量上传 | 拖拽或选择多张图片 |
| 智能模式 | 智能推荐 / 高清优先 / 极限压缩 / 无损优先 四种模式 |
| 格式转换 | 自动转 WebP，可选保留原格式 |
| 质量控制 | 可调压缩质量和最大边长 |
| 批量下载 | 单图下载或 ZIP 打包下载全部 |
| 历史记录 | 按需加载压缩结果（blob 不驻留内存），支持导出 |

### 📊 字符统计

实时统计文本的字符数、字节数和各类语言成分。

| 功能 | 说明 |
|------|------|
| 三种维度 | 可见字符数 / UTF-8 字节数 / JavaScript 字符长度 |
| 辅助统计 | 总行数、非空行、中文、英文、数字、空格 |
| 实时更新 | 单次遍历统计，输入即更新 |
| 一键操作 | 复制文本 / 清空文本 |

---

## 🚀 快速开始

> **不要直接双击 `index.html`（file://）**，浏览器会拦截 ES Module 导致按钮无响应。

### 本地开发

```bash
# 克隆仓库
git clone https://github.com/shengshuyuan/Toolmap.git
cd Toolmap

# 启动本地服务器（任意一种均可）
python3 -m http.server 5173
# 或
npx serve .
```

浏览器打开 `http://localhost:5173` 即可使用。

### 生产构建

```bash
# 安装依赖
npm install

# 构建到 dist/ 目录（JS/CSS minify）
npm run build
```

### 运行测试

```bash
# 运行全部测试
npm test

# 或使用 node 直接运行
node --test 'tests/*.test.mjs' 'tests/**/*.test.mjs'
```

---

## 🌐 部署

### Vercel（推荐）

1. 把项目推到 GitHub
2. 打开 [Vercel](https://vercel.com) → Add New → Project → 选择仓库
3. Framework Preset 选 "Other"，Build Command 和 Output Directory 留空
4. Deploy

项目已包含 `vercel.json`，自动配置了缓存策略和安全响应头（CSP / HSTS / X-Frame-Options / Permissions-Policy）。

### 其他平台

这是纯静态站点，任何静态托管服务都能部署：Netlify、Cloudflare Pages、GitHub Pages、S3 + CloudFront 等。直接把项目根目录作为静态文件目录即可。

---

## 📁 目录结构

```
.
├── index.html                 # 站点入口
├── manifest.json              # PWA 配置
├── sw.js                      # Service Worker
├── vercel.json                # Vercel 部署配置
├── assets/
│   └── app.css                # 全局样式
├── src/
│   ├── app.js                 # 应用初始化 & 工具挂载
│   ├── app-shell.js           # Shell 逻辑（标题/导航切换）
│   ├── bg-art.js              # 背景动画
│   ├── tool-registry.js       # 工具注册表
│   ├── config/
│   │   └── app-meta.js        # 版本号 & 应用元信息
│   ├── shared/                # 共享模块
│   │   ├── clipboard.js       # 剪贴板操作
│   │   ├── escape.js          # HTML 转义
│   │   ├── format.js          # 格式化工具（文件大小等）
│   │   ├── history-db.js      # IndexedDB 历史记录封装
│   │   ├── history-export.js  # 历史记录导出
│   │   ├── idb-store.js       # IndexedDB 底层事务封装
│   │   └── toast.js           # Toast 提示组件
│   └── tools/
│       ├── text-diff/         # 文本比对工具
│       ├── image-compress/    # 图片压缩工具
│       └── char-count/        # 字符统计工具
├── tests/                     # 测试文件
└── scripts/
    └── build.mjs              # esbuild 构建脚本
```

---

## 🏗️ 架构设计

### 工具隔离

每个工具放在 `src/tools/<tool-name>/` 下，拥有独立的模板、状态、事件和业务模块。`index.html` 只放站点外壳和挂载点，不包含具体工具的 DOM。

新增工具只需：

1. 在 `src/tools/<name>/` 下创建工具模块，导出 `mount` 函数
2. 在 `src/tool-registry.js` 注册工具配置
3. 工具会自动出现在导航栏，按需加载

### 技术栈

| 层级 | 选型 |
|------|------|
| 运行时 | 原生 ES Module，无框架 |
| 样式 | 原生 CSS，CSS 变量主题 |
| 存储 | IndexedDB（通过 shared/history-db.js 封装） |
| 构建 | esbuild（生产 minify） |
| 测试 | Node.js 内置 test runner |
| 部署 | 纯静态，Vercel 托管 |

### 设计规范

- **品牌色**：`#FF642B`（亮橙色），全局 CSS 变量 `--accent`
- **主题**：浅色暖底 + 亮橙高亮
- **响应式**：480px / 700px 两级断点

---

## 🤝 参与贡献

欢迎提交 Issue 和 Pull Request。详见 [CONTRIBUTING.md](./CONTRIBUTING.md)。

---

## 📄 许可证

[Apache License 2.0](./LICENSE)

---

<div align="center">

Made with ❤️ by [Shuyuan](https://github.com/shengshuyuan)

</div>
