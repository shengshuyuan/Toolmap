# 树园工具导航（v0.4.1）

当前工具：

- **在线文本差异比对**：支持中文 / 英文 / 代码 / 大文本粘贴 / 行级 diff / 差异类型 / 快速跳转 / 复制结果 / 本地历史记录
- **在线图片压缩**：支持 JPG / PNG / WebP 批量上传、本地压缩、智能转 WebP、质量模式、最大边限制、单图下载、ZIP 打包下载和本地历史记录
- **在线字符统计**：支持字符、UTF-8 字节、JavaScript 字符长度实时统计，并提供总行数、非空行、中文、英文、数字、空格等辅助统计

## 版本与协作

- 发布记录：`CHANGELOG.md`
- 详细变更日志：`operateLog.md`
- 协作与发布规范：`CONTRIBUTING.md`

## 本地运行

> 这是纯静态站点，不需要安装 Node，也不需要数据库。
>
> 注意：**不要直接双击打开 `index.html`（file://）**，浏览器会拦截 ES Module 导入，导致“点按钮没反应”。请用本地 http 服务器方式打开。

在项目根目录执行：

```bash
python3 -m http.server 5173
```

然后浏览器打开：

`http://localhost:5173`

## 开发调试

- 统一版本号入口：`src/config/app-meta.js`
- 统一工具注册入口：`src/tool-registry.js`
- 文本比对开发态调试可通过 query 打开：
  - `?debug=text-diff`
  - `?debug=*`

## 文本比对使用说明

1. 左侧粘贴「原文本」，右侧粘贴「对比文本」
2. 建议先点「一键清空空行」（可选）
3. 点「开始比对」
4. 页面会显示：
   - **差异：N**（N=0 表示一致）
   - 新增/删除/修改会高亮
   - 可用「上一处 / 下一处」快速跳转差异
   - 可用「复制结果」复制简短比对结论
   - 比对完成后会保存到「历史记录」，可恢复文本或复制历史摘要

> 说明：工具不限制字符数，内容只在浏览器本地处理；文本比对历史会保存两侧文本和摘要，最多最近 30 条，仅当前浏览器本地可见。为避免极端超大文本卡死浏览器，单次比对会保留行数保护。

## 图片压缩使用说明

1. 切换到「图片压缩」
2. 拖入或选择 JPG / PNG / WebP 图片
3. 选择压缩模式：
   - 智能推荐：默认转 WebP，并把超大图最长边压到 1920px；如果节省不明显，会自动尝试增强压缩
   - 高清优先：转 WebP，最长边 3840px，画质更稳
   - 极限压缩：转 WebP，最长边 1600px，体积更小
   - 无损优先：尽量保持原格式和像素
4. 可选设置输出格式为 WebP、调整质量或限制最大边
5. 点击「开始压缩」，完成后可单独下载或「下载全部」
6. 压缩后的结果会自动保存到「历史记录」，可稍后重新下载

> 说明：图片压缩同样在浏览器本地完成，不上传原图。历史记录只保存压缩后的结果，默认最多最近 30 条；清理浏览器数据后会消失。无损模式体积下降通常有限，高质量有损模式会尽量减少肉眼可见损失。

## 字符统计使用说明

1. 切换到「字符统计」
2. 在输入框中粘贴或输入任意文本
3. 页面会实时显示：
   - **字符**：按可见字符统计
   - **UTF-8 字节**：按存储体积统计
   - **字符长度**：按 JavaScript `string.length` 统计
4. 同时会提供：
   - 总行数 / 非空行
   - 中文 / 英文 / 数字 / 空格
5. 可使用：
   - 「复制文本」复制当前输入
   - 「清空文本」恢复为空状态

> 说明：字符统计同样完全在浏览器本地完成，不上传文本。其中 UTF-8 字节可用于估算接口/存储体积，字符长度可用于理解 JavaScript 中 emoji 等字符的长度差异。

## 云端部署（推荐：Vercel，最省事）

1. 把这个项目推到 GitHub 仓库
2. 打开 Vercel → Add New → Project → 选择该仓库
3. Framework Preset 选 “Other”
4. Build Command 留空
5. Output Directory 留空（默认根目录）
6. Deploy

> 由于是纯静态文件，Vercel 会直接托管 `index.html`。

### vercel.json 说明

- 项目根目录已包含 `vercel.json`
- 当前配置目标：
  - 明确这是纯静态站点
  - HTML 始终走重新校验，避免首页缓存过旧
  - `assets/` 与 `src/` 下带版本参数的静态资源可长期缓存
  - 增加基础安全响应头

### 本地开发 → Vercel 发布 SOP

#### 一次性初始化

1. 在项目根目录确认能本地运行：

```bash
python3 -m http.server 5173
```

2. 打开浏览器验证：

```text
http://localhost:5173
```

3. 登录 Vercel：

```bash
npm exec --yes vercel@53.1.0 -- login
```

4. 首次绑定项目：

```bash
npm exec --yes vercel@53.1.0 -- link --yes
```

> 完成后会生成 `.vercel/project.json`，后续可复用该绑定。

#### 预览部署

适合先看一版临时线上结果：

```bash
CI=1 npm exec --yes vercel@53.1.0 -- deploy --yes
```

执行完成后会得到一个预览地址，例如：

```text
https://toolmap-xxxx.vercel.app
```

#### 生产部署

确认无误后执行：

```bash
CI=1 npm exec --yes vercel@53.1.0 -- deploy --prod --yes
```

如果项目已经绑定了正式域名，生产别名会自动指向主域名，例如：

```text
https://toolmap.vercel.app
```

#### 发布后检查

1. 打开线上首页，确认三个工具都能切换
2. 检查文本比对、图片压缩、字符统计是否都能正常挂载
3. 如已改动静态资源版本，确认浏览器已加载最新脚本
4. 可用以下命令快速确认线上首页状态码：

```bash
curl -I https://toolmap.vercel.app
```

#### 常见维护动作

- 查看当前登录用户：

```bash
npm exec --yes vercel@53.1.0 -- whoami
```

- 查看线上生产部署：

```bash
npm exec --yes vercel@53.1.0 -- inspect toolmap.vercel.app
```

- 如果切换了账号/团队，建议重新执行：

```bash
npm exec --yes vercel@53.1.0 -- link --yes
```

## 目录结构

```
.
├── index.html
├── assets/
│   └── app.css
└── src/
    ├── app.js
    ├── bg-art.js
    └── tools/
        ├── text-diff/
        │   ├── index.js
        │   ├── clipboard.js
        │   ├── diff.js
        │   ├── editor.js
        │   ├── history-store.js
        │   ├── render.js
        │   ├── sanitize.js
        │   ├── state.js
        │   └── summary.js
        ├── image-compress/
        │   ├── index.js
        │   ├── compressor.js
        │   ├── download.js
        │   ├── history-store.js
        │   ├── image-meta.js
        │   └── utils.js
        └── char-count/
            ├── index.js
            └── stats.js
```

## 工具隔离约定

- `index.html` 只放站点外壳和工具挂载点，不直接写具体工具的业务 DOM。
- `src/app.js` 只做初始化和挂载，不承载具体工具逻辑。
- 每个工具放在 `src/tools/<tool-name>/` 下，包含自己的模板、状态、事件绑定和业务模块。
- 新增工具时优先新增自己的目录和挂载入口，避免修改 `text-diff` 目录内文件。
