/**
 * 工作台页面视图 (Workbench)
 * 对应设计稿 01-workbench.png 与交接文档 Section 5
 */

import { TOOL_REGISTRY } from "./tool-registry.js";
import { escapeHtml } from "./shared/escape.js";
import { getLatestRestorableDraft, listAllRecentRecords } from "./shared/recent-index.js";

/**
 * @param {HTMLElement} mount
 * @param {{ onNavigate: (target: string, options?: any) => void, onOpenSearch: () => void }} options
 */
export async function mountWorkbench(mount, { onNavigate, onOpenSearch }) {
  mount.innerHTML = `
    <div class="workbench-view">
      <header class="wb-hero">
        <div class="wb-hero__kicker">产品经理的本地工具箱</div>
        <h1 class="wb-hero__title">把琐碎工作，做得分明顺手。</h1>
        <p class="wb-hero__subtitle">文本、图片与文档，在浏览器内完成处理。</p>

        <div class="wb-search" id="wbSearchTrigger" role="button" tabindex="0" aria-label="搜索工具与任务">
          <svg class="wb-search__icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <span class="wb-search__placeholder">今天要做什么？按 ⌘K 随时检索工具与任务...</span>
          <kbd class="wb-search__kbd">⌘K</kbd>
        </div>
      </header>

      <section id="wbResumeSection" class="wb-resume" hidden>
        <div class="wb-section-head">
          <h2 class="wb-section-title">继续上次的工作</h2>
        </div>
        <div class="wb-resume-card" id="wbResumeCard">
          <div class="wb-resume-card__left">
            <div class="wb-resume-card__icon" id="wbResumeIcon">📄</div>
            <div class="wb-resume-card__info">
              <div class="wb-resume-card__title" id="wbResumeTitle">未命名文档</div>
              <div class="wb-resume-card__meta" id="wbResumeMeta">草稿 · 本地存储</div>
            </div>
          </div>
          <button type="button" class="btn btn--primary wb-resume-card__btn" id="wbResumeBtn">继续编辑</button>
        </div>
      </section>

      <section class="wb-tools-section">
        <div class="wb-section-head">
          <h2 class="wb-section-title">常用工具</h2>
        </div>
        <div class="wb-tools-grid">
          ${TOOL_REGISTRY.map(
            (tool) => `
            <div class="wb-tool-card" data-tool-target="${tool.id}" role="button" tabindex="0" aria-label="${escapeHtml(tool.buttonLabel)}：${escapeHtml(tool.description)}">
              <div class="wb-tool-card__icon">${tool.iconSvg}</div>
              <div class="wb-tool-card__content">
                <div class="wb-tool-card__title">${escapeHtml(tool.buttonLabel)}</div>
                <div class="wb-tool-card__desc">${escapeHtml(tool.description)}</div>
              </div>
              <svg class="wb-tool-card__arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </div>
          `
          ).join("")}
        </div>
      </section>

      <section class="wb-recent-section">
        <div class="wb-section-head">
          <h2 class="wb-section-title">最近使用</h2>
          <a href="#recent" class="wb-section-more" id="wbRecentMore">查看全部 →</a>
        </div>
        <div id="wbRecentList" class="wb-recent-list">
          <div class="wb-recent-loading">加载中…</div>
        </div>
      </section>
    </div>
  `;

  // 绑定搜索点击
  const searchTrigger = mount.querySelector("#wbSearchTrigger");
  if (searchTrigger) {
    searchTrigger.addEventListener("click", () => onOpenSearch?.());
    searchTrigger.addEventListener("keydown", (/** @type {KeyboardEvent} */ e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onOpenSearch?.();
      }
    });
  }

  // 绑定常用工具卡片点击
  mount.querySelectorAll(".wb-tool-card").forEach((card) => {
    const toolId = card.getAttribute("data-tool-target");
    if (!toolId) return;
    const trigger = () => onNavigate(toolId);
    card.addEventListener("click", trigger);
    card.addEventListener("keydown", (/** @type {KeyboardEvent} */ e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        trigger();
      }
    });
  });

  // 异步加载草稿和最近记录
  try {
    const [draft, recents] = await Promise.all([
      getLatestRestorableDraft(),
      listAllRecentRecords(),
    ]);

    // 1. 草稿卡片
    const resumeSection = /** @type {HTMLElement | null} */ (mount.querySelector("#wbResumeSection"));
    const resumeTitle = mount.querySelector("#wbResumeTitle");
    const resumeMeta = mount.querySelector("#wbResumeMeta");
    const resumeBtn = /** @type {HTMLElement | null} */ (mount.querySelector("#wbResumeBtn"));

    if (draft && resumeSection && resumeTitle && resumeMeta && resumeBtn) {
      resumeTitle.textContent = draft.title;
      resumeMeta.textContent = `${draft.toolLabel} · ${draft.summary || "本地存储"}`;
      resumeSection.hidden = false;
      resumeBtn.onclick = () => {
        onNavigate(draft.toolId, { restoreId: draft.recordId, rawRecord: draft.raw });
      };
    } else if (resumeSection) {
      resumeSection.hidden = true;
    }

    // 2. 最近使用列表
    const recentList = mount.querySelector("#wbRecentList");
    if (recentList) {
      if (!recents.length) {
        recentList.innerHTML = `
          <div class="wb-recent-empty">
            <p>暂无最近记录。使用文本比对、Markdown 写作或图片压缩后，记录将自动保存在当前浏览器本地。</p>
          </div>
        `;
      } else {
        const top5 = recents.slice(0, 5);
        recentList.innerHTML = top5
          .map((item) => {
            const dateStr = new Date(item.updatedAt).toLocaleString("zh-CN", {
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            });
            return `
            <div class="wb-recent-item" data-tool="${item.toolId}" data-record-id="${item.recordId}" role="button" tabindex="0">
              <div class="wb-recent-item__left">
                <span class="wb-recent-item__tag">${escapeHtml(item.toolLabel)}</span>
                <span class="wb-recent-item__title">${escapeHtml(item.title)}</span>
                <span class="wb-recent-item__status">${escapeHtml(item.status)}</span>
              </div>
              <div class="wb-recent-item__right">
                <span class="wb-recent-item__time">${escapeHtml(dateStr)}</span>
                <svg class="wb-recent-item__arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              </div>
            </div>
          `;
          })
          .join("");

        recentList.querySelectorAll(".wb-recent-item").forEach((row) => {
          const tId = row.getAttribute("data-tool");
          const rId = row.getAttribute("data-record-id");
          if (!tId) return;
          const openRecord = () => onNavigate(tId, { restoreId: rId });
          row.addEventListener("click", openRecord);
          row.addEventListener("keydown", (/** @type {KeyboardEvent} */ e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              openRecord();
            }
          });
        });
      }
    }
  } catch (err) {
    console.warn("[workbench] load data failed:", err);
  }
}
