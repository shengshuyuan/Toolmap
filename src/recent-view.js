/**
 * 跨工具最近使用管理视图 (Recent View)
 */

import { listAllRecentRecords, deleteRecentRecord, clearAllLocalData, exportAllBackupData } from "./shared/recent-index.js";
import { escapeHtml } from "./shared/escape.js";

/**
 * @param {HTMLElement} mount
 * @param {{ onNavigate: (target: string, options?: any) => void }} options
 */
export async function mountRecentView(mount, { onNavigate }) {
  mount.innerHTML = `
    <div class="recent-view">
      <div class="page-header">
        <div class="page-header__breadcrumb">工作台 / 最近使用</div>
        <div class="page-header__row">
          <div>
            <h1 class="page-header__title">最近使用</h1>
            <p class="page-header__subtitle">跨工具本地记录与草稿，仅保存在当前设备浏览器中。</p>
          </div>
          <div class="page-header__actions">
            <button type="button" class="btn btn--secondary" id="btnExportAllData">导出备份</button>
            <button type="button" class="btn btn--danger-subtle" id="btnClearAllData">清空所有记录</button>
          </div>
        </div>
      </div>

      <div class="recent-filter-bar" role="tablist" aria-label="工具筛选">
        <button type="button" class="filter-pill filter-pill--active" data-filter="all">全部</button>
        <button type="button" class="filter-pill" data-filter="text-diff">文本比对</button>
        <button type="button" class="filter-pill" data-filter="markdown-editor">Markdown</button>
        <button type="button" class="filter-pill" data-filter="image-compress">图片压缩</button>
        <button type="button" class="filter-pill" data-filter="qrcode">二维码</button>
      </div>

      <div id="recentFullList" class="recent-full-list">
        <div class="wb-recent-loading">加载中…</div>
      </div>
    </div>
  `;

  let currentFilter = "all";
  let allRecords = [];

  async function refresh() {
    allRecords = await listAllRecentRecords();
    render();
  }

  function render() {
    const listEl = mount.querySelector("#recentFullList");
    if (!listEl) return;

    const filtered = currentFilter === "all"
      ? allRecords
      : allRecords.filter((item) => item.toolId === currentFilter);

    if (!filtered.length) {
      listEl.innerHTML = `
        <div class="recent-empty-state">
          <p>当前分类下暂无记录。</p>
        </div>
      `;
      return;
    }

    listEl.innerHTML = filtered.map((item) => {
      const dateStr = new Date(item.updatedAt).toLocaleString("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
      return `
        <article class="recent-card" data-tool="${item.toolId}" data-record-id="${item.recordId}">
          <div class="recent-card__body">
            <div class="recent-card__top">
              <span class="recent-card__badge">${escapeHtml(item.toolLabel)}</span>
              <span class="recent-card__status">${escapeHtml(item.status)}</span>
              <span class="recent-card__time">${escapeHtml(dateStr)}</span>
            </div>
            <h3 class="recent-card__title">${escapeHtml(item.title)}</h3>
            <div class="recent-card__summary">${escapeHtml(item.summary)}</div>
          </div>
          <div class="recent-card__actions">
            ${item.restorable ? `<button type="button" class="btn btn--sm btn--primary recent-action-open" data-tool="${item.toolId}" data-record-id="${item.recordId}">继续编辑</button>` : `<button type="button" class="btn btn--sm btn--secondary recent-action-view" data-tool="${item.toolId}">前往工具</button>`}
            <button type="button" class="btn btn--sm btn--subtle-danger recent-action-del" data-tool="${item.toolId}" data-record-id="${item.recordId}">删除</button>
          </div>
        </article>
      `;
    }).join("");

    // 绑定卡片操作
    listEl.querySelectorAll(".recent-action-open").forEach((btn) => {
      btn.addEventListener("click", () => {
        const tId = btn.getAttribute("data-tool");
        const rId = btn.getAttribute("data-record-id");
        if (tId) onNavigate(tId, { restoreId: rId });
      });
    });

    listEl.querySelectorAll(".recent-action-view").forEach((btn) => {
      btn.addEventListener("click", () => {
        const tId = btn.getAttribute("data-tool");
        if (tId) onNavigate(tId);
      });
    });

    listEl.querySelectorAll(".recent-action-del").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const tId = btn.getAttribute("data-tool");
        const rId = btn.getAttribute("data-record-id");
        if (!tId || !rId) return;
        if (window.confirm("确定要删除这条本地记录吗？")) {
          await deleteRecentRecord(tId, rId);
          await refresh();
        }
      });
    });
  }

  // 绑定分类筛选
  mount.querySelectorAll(".filter-pill").forEach((pill) => {
    pill.addEventListener("click", () => {
      mount.querySelectorAll(".filter-pill").forEach((p) => p.classList.remove("filter-pill--active"));
      pill.classList.add("filter-pill--active");
      currentFilter = pill.getAttribute("data-filter") || "all";
      render();
    });
  });

  // 绑定全局导出
  const btnExport = mount.querySelector("#btnExportAllData");
  if (btnExport) {
    btnExport.addEventListener("click", async () => {
      try {
        await exportAllBackupData();
      } catch (err) {
        alert("导出失败：" + err.message);
      }
    });
  }

  // 绑定全局清空
  const btnClear = mount.querySelector("#btnClearAllData");
  if (btnClear) {
    btnClear.addEventListener("click", async () => {
      if (window.confirm("确定要清空所有工具的本地历史数据吗？此操作不可逆！")) {
        await clearAllLocalData();
        await refresh();
      }
    });
  }

  await refresh();
}
