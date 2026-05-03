# Dogfood Report: 树园的工具导航（文本比对）

| Field | Value |
|-------|-------|
| **Date** | 2026-04-30 |
| **App URL** | http://localhost:5183/ |
| **Session** | toolmap |
| **Scope** | 文本比对：行号/定位一致性、滚动体验、差异点击定位 |

## Summary

| Severity | Count |
|----------|-------|
| Critical | 0 |
| High | 1 |
| Medium | 1 |
| Low | 0 |
| **Total** | **2** |

> 说明：由于运行环境缺少可用的 Chromium/Lightpanda，`agent-browser` 无法录制视频与自动截图。本报告使用用户提供的复现截图 + 逻辑复测（通过页面交互与状态校验）完成。

## Issues

### ISSUE-001: 行号口径不一致（输入框 vs 比对结果/定位提示）

| Field | Value |
|-------|-------|
| **Severity** | high |
| **Category** | ux / functional |
| **URL** | http://localhost:5183/ |
| **Repro Video** | N/A |

**Description**

用户在长文本（隐私政策）场景中，观察到输入框左侧行号（例如 279）与比对结果/定位提示（例如 280）不一致，造成“定位与识别不准”的感知与误导风险。

常见诱因包括（可叠加）：
- 粘贴文本包含 Windows 换行（CRLF，`\\r\\n`）或混合换行
- 文本末尾存在额外换行/空行，`split(\"\\n\")` 会产生额外空行导致 +1
- 定位使用的行首索引基于“归一化后的字符串”计算，但 `setSelectionRange` 需要“原始字符串索引”，导致偶发行偏移

**Repro Steps**

1. 粘贴长文本到左右输入框，并对其中某一行做少量修改后点击「开始比对」。
2. 点击比对结果中对应差异行，观察上方输入框行号高亮与下方行号/提示不一致。
   ![Issue 001](screenshots/issue-001-user.png)

**Notes / Current Fix Verification**

已做的修复点（需要用户确认是否已生效到其本机页面）：
- 行首索引与光标行号计算改为基于 `textarea.value` 原始字符串扫描（把 `\\r\\n` 视为一个换行），避免索引漂移
- diff 与输入框覆盖层统一“不把末尾换行当作新增一行”（避免末尾 +1）
- 点击比对结果行后，状态栏显示改为“光标实际行号口径”，避免状态栏与高亮口径不一致

请用户确认页面右下角 build 标识为：`build 2026-04-29`，并强制刷新（Cmd+Shift+R）后复测。

---

### ISSUE-002: 滚动时高亮闪烁/跟随抖动（廉价感）

| Field | Value |
|-------|-------|
| **Severity** | medium |
| **Category** | ux |
| **URL** | http://localhost:5183/ |
| **Repro Video** | N/A |

**Description**

在滚动输入框时，差异高亮/聚焦高亮出现“闪烁、一闪一闪”的观感，影响质感。通常由滚动事件中触发 overlay 全量重渲染（innerHTML 重建）导致。

**Repro Steps**

1. 粘贴长文本，点击「开始比对」生成差异。
2. 在输入框中滚动，观察高亮与行号层频繁重绘造成闪烁。
   ![Issue 002](screenshots/issue-002-user.png)

**Notes / Current Fix Verification**

已做的修复点（需要用户确认是否已生效到其本机页面）：
- 滚动时仅同步 overlay 的 scrollTop（按比例映射），不再触发 overlay 全量重绘
- 聚焦高亮改为 DOM class 切换（对单行加/删 class），避免滚动时频繁重排

---

