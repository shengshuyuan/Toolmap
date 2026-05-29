# 贡献与发布规范

本项目当前采用轻量、可回溯、适合人与 AI 协同的工作流。

## 目标

- 保持 `main` 随时可部署
- 每次改动都能快速追踪、回滚、复盘
- 让人工开发、Codex、其他 Agent 使用同一套约定

## 分支策略

- 小改动可直接在 `main` 上完成，但提交必须原子化
- 较明显的功能或修复建议使用短分支：
  - `feat/<short-name>`
  - `fix/<short-name>`
  - `docs/<short-name>`
  - `refactor/<short-name>`

示例：

```text
feat/char-count-polish
fix/vercel-cache-policy
docs/release-sop
```

## 提交信息规范

推荐格式：

```text
<type>: <简短说明>
```

常用类型：

- `feat`: 新功能
- `fix`: 缺陷修复
- `docs`: 文档变更
- `refactor`: 重构但不改行为
- `test`: 测试补充或调整
- `chore`: 工具、配置、依赖类调整

示例：

```text
feat: add char count tool
fix: correct vercel cache policy for src modules
docs: add release and rollback workflow
test: add app smoke coverage
```

## 提交前检查

提交前至少完成以下检查：

1. 查看改动范围

```bash
git status
git diff
```

2. 运行测试

```bash
node --test tests/*.mjs
```

3. 检查是否误提交以下内容：

- `.env`
- 私密 token / cookie / key
- 临时截图或调试文件
- 本地构建垃圾文件

## 版本发布规则

### 需要同步更新的文件

当准备发布一个明确版本时，至少同步检查：

- `src/config/app-meta.js`
- `CHANGELOG.md`
- `operateLog.md`
- `README.md`（如果发布方式、能力边界或 SOP 有变化）

### 推荐顺序

1. 完成代码改动
2. 跑测试
3. 更新版本号
4. 更新 `CHANGELOG.md`
5. 更新 `operateLog.md`
6. 推送 GitHub
7. 部署到 Vercel
8. 验证线上结果

## GitHub 协作建议

- 不要直接覆盖远端历史
- 优先保留已有提交，再合并本地改动
- 遇到远端已有更新时，优先：
  - 拉取
  - 合并/变基
  - 再推送

## Vercel 发布约定

发布流程以 `README.md` 中的 “本地开发 → Vercel 发布 SOP” 为准。

核心命令：

```bash
CI=1 npm exec --yes vercel@53.1.0 -- deploy --yes
CI=1 npm exec --yes vercel@53.1.0 -- deploy --prod --yes
```

## 回滚建议

如果线上发布异常，优先做两件事：

1. 用 Git 找到上一个稳定提交
2. 在 Vercel 中检查上一条生产部署并回退到稳定版本

建议在 `CHANGELOG.md` 和 `operateLog.md` 中都保留可追踪的版本信息。

## 对 Codex / Agent 的要求

如果由 Codex 或其他 Agent 修改项目，建议它们遵守：

- 不跨范围重构无关文件
- 改配置时同步更新文档
- 提交前跑 `node --test tests/*.mjs`
- 发布前确认 `src/config/app-meta.js` 版本号正确
- 输出变更摘要，说明：
  - 改了什么
  - 没改什么
  - 有什么风险
