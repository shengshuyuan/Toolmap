/**
 * 本地数据与存储管理视图 (Data Management)
 * 对应交接文档 Section 3 & Section 6 本地数据管理
 */

import { getStorageEstimate, exportAllBackupData, importBackupData, clearAllLocalData } from "./shared/recent-index.js";
import { escapeHtml } from "./shared/escape.js";

/**
 * @param {HTMLElement} mount
 * @param {{ onNavigate: (target: string) => void }} options
 */
export async function mountDataManageView(mount, { onNavigate }) {
  mount.innerHTML = `
    <div class="data-manage-view">
      <div class="page-header">
        <div class="page-header__breadcrumb">工作台 / 本地数据管理</div>
        <div class="page-header__row">
          <div>
            <h1 class="page-header__title">本地数据管理</h1>
            <p class="page-header__subtitle">Toolmap 所有功能均在浏览器本地运行，数据保存在您设备的 IndexedDB 中，不会上传至任何第三方服务器。</p>
          </div>
        </div>
      </div>

      <div class="data-card">
        <div class="data-card__head">
          <h2 class="data-card__title">存储容量概览</h2>
          <span class="data-card__meta" id="dataTotalUsage">计算中…</span>
        </div>
        <div class="data-table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>工具 / 场景</th>
                <th>记录数</th>
                <th>预估占用</th>
                <th>存储库</th>
              </tr>
            </thead>
            <tbody id="dataTableBody">
              <tr><td colspan="4" class="data-loading">正在读取本地存储…</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="data-actions-grid">
        <div class="data-action-card">
          <div class="data-action-card__icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          </div>
          <div class="data-action-card__info">
            <h3 class="data-action-card__title">导出完整备份</h3>
            <p class="data-action-card__desc">将当前浏览器的所有工具历史和草稿打包下载为 JSON 文件，便于归档或迁移。</p>
          </div>
          <button type="button" class="btn btn--primary" id="btnDoExport">导出 JSON 备份</button>
        </div>

        <div class="data-action-card">
          <div class="data-action-card__icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          </div>
          <div class="data-action-card__info">
            <h3 class="data-action-card__title">恢复备份数据</h3>
            <p class="data-action-card__desc">从此前导出的 Toolmap JSON 备份文件中恢复历史记录与文档。</p>
          </div>
          <label class="btn btn--secondary" style="cursor: pointer;">
            <input type="file" id="inputImportBackup" accept=".json,application/json" hidden />
            导入备份文件
          </label>
        </div>

        <div class="data-action-card">
          <div class="data-action-card__icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </div>
          <div class="data-action-card__info">
            <h3 class="data-action-card__title">清空本地存储</h3>
            <p class="data-action-card__desc">清除当前浏览器内保存的所有工具记录与草稿。清除后无法恢复，请谨慎操作。</p>
          </div>
          <button type="button" class="btn btn--danger" id="btnDoClear">清空所有数据</button>
        </div>
      </div>
    </div>
  `;

  async function refreshStats() {
    const totalEl = mount.querySelector("#dataTotalUsage");
    const tbody = mount.querySelector("#dataTableBody");
    if (!totalEl || !tbody) return;

    try {
      const stats = await getStorageEstimate();
      totalEl.textContent = `总占用：${stats.formattedTotal} (${stats.totalRecords} 项)`;

      if (!stats.tools.length) {
        tbody.innerHTML = `<tr><td colspan="4" class="data-empty">暂无存储记录</td></tr>`;
        return;
      }

      tbody.innerHTML = stats.tools.map((t) => `
        <tr>
          <td><strong>${escapeHtml(t.label)}</strong></td>
          <td>${t.count} 条</td>
          <td>${t.formattedBytes}</td>
          <td><code>toolmap-${escapeHtml(t.toolId)}</code></td>
        </tr>
      `).join("");
    } catch (err) {
      console.warn("[data-manage] refresh failed:", err);
      totalEl.textContent = "读取失败";
      tbody.innerHTML = `<tr><td colspan="4" class="data-empty">存储读取受阻</td></tr>`;
    }
  }

  // 导出备份
  const btnExport = mount.querySelector("#btnDoExport");
  if (btnExport) {
    btnExport.addEventListener("click", async () => {
      try {
        await exportAllBackupData();
      } catch (err) {
        alert("导出失败：" + (err?.message || "未知错误"));
      }
    });
  }

  // 导入备份
  const inputImport = /** @type {HTMLInputElement|null} */ (mount.querySelector("#inputImportBackup"));
  if (inputImport) {
    inputImport.addEventListener("change", async () => {
      const file = inputImport.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const json = JSON.parse(text);
        const res = await importBackupData(json);
        await refreshStats();
        alert(`成功导入恢复 ${res.importedCount} 条历史记录！`);
      } catch (err) {
        alert("导入失败：" + (err?.message || "未知错误"));
      } finally {
        inputImport.value = "";
      }
    });
  }

  // 清空数据
  const btnClear = mount.querySelector("#btnDoClear");
  if (btnClear) {
    btnClear.addEventListener("click", async () => {
      if (window.confirm("确定要清空当前浏览器的所有 Toolmap 数据吗？操作无法撤销！")) {
        await clearAllLocalData();
        await refreshStats();
        alert("本地数据已成功清空。");
      }
    });
  }

  await refreshStats();
}
