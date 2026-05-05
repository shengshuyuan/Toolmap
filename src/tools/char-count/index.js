import { analyzeTextStats } from "./stats.js";
import { writeClipboard } from "../../shared/clipboard.js";

export function getCharCountTemplate() {
  return `
  <div class="char-count-tool char-panel char-panel--enter" aria-labelledby="char-count-title">
    <div class="char-head">
      <div>
        <h2 id="char-count-title" class="char-title">在线字符统计</h2>
        <p class="char-lead">实时统计文本的字符、UTF-8 字节和 JavaScript 字符长度。支持中文、英文、emoji 与多行文本，全程在浏览器本地完成。</p>
      </div>
      <div class="char-privacy">
        <strong>本地处理</strong>
        <span>文本不会上传服务器</span>
      </div>
    </div>

    <div class="char-capability-strip" aria-label="字符统计能力">
      <span class="char-capability-pill">实时统计</span>
      <span class="char-capability-pill">字符 / 字节 / 长度</span>
      <span class="char-capability-pill">中文 / emoji 支持</span>
      <span class="char-capability-pill char-capability-pill--safe">本地处理</span>
    </div>

    <div class="char-editor">
      <label class="char-editor__label" for="ccText">输入文本</label>
      <textarea id="ccText" class="char-editor__textarea" spellcheck="false" placeholder="把文本粘贴到这里，输入时会实时统计…"></textarea>
    </div>

    <div class="char-actions" role="group" aria-label="字符统计操作">
      <button id="ccCopyText" class="char-btn" type="button">复制文本</button>
      <button id="ccClearText" class="char-btn" type="button">清空文本</button>
      <div id="ccToast" class="char-toast" role="status" aria-live="polite"></div>
    </div>

    <div class="char-stats-grid" aria-live="polite">
      <div class="char-stat char-stat--core">
        <span>字符</span>
        <strong id="ccCharacters">0</strong>
        <small>按可见字符统计</small>
      </div>
      <div class="char-stat char-stat--core">
        <span>UTF-8 字节</span>
        <strong id="ccBytes">0</strong>
        <small>按存储体积统计</small>
      </div>
      <div class="char-stat char-stat--core">
        <span>字符长度</span>
        <strong id="ccLength">0</strong>
        <small>按 JS string.length 统计</small>
      </div>
    </div>

    <div class="char-metrics">
      <div class="char-metrics__head">
        <div class="char-metrics__title">补充统计</div>
        <div class="char-metrics__sub">辅助理解文本结构与字符组成</div>
      </div>
      <div class="char-metrics__grid">
        <div class="char-mini-stat"><span>总行数</span><strong id="ccLines">0</strong></div>
        <div class="char-mini-stat"><span>非空行</span><strong id="ccNonEmptyLines">0</strong></div>
        <div class="char-mini-stat"><span>中文</span><strong id="ccChinese">0</strong></div>
        <div class="char-mini-stat"><span>英文</span><strong id="ccEnglish">0</strong></div>
        <div class="char-mini-stat"><span>数字</span><strong id="ccDigits">0</strong></div>
        <div class="char-mini-stat"><span>空格</span><strong id="ccSpaces">0</strong></div>
      </div>
    </div>

    <section class="char-explain" aria-label="统计口径说明">
      <div class="char-explain__title">统计口径说明</div>
      <div class="char-explain__body">
        <p><strong>字符</strong>：按用户可见字符统计，更接近肉眼看到的数量。</p>
        <p><strong>UTF-8 字节</strong>：按文本在 UTF-8 编码下占用的存储大小统计。</p>
        <p><strong>字符长度</strong>：按 JavaScript 的 <code>string.length</code> 统计，emoji 等字符可能会大于 1。</p>
      </div>
      <div class="char-example">
        <span>示例</span>
        <code>A中😀</code>
        <span>字符 3 / UTF-8 字节 8 / 字符长度 4</span>
      </div>
    </section>
  </div>
`;
}

function $(root, id) {
  const el = root.querySelector(`#${id}`);
  if (!el) throw new Error(`字符统计工具缺少节点：#${id}`);
  return el;
}

export function mountCharCountTool(mount) {
  if (!(mount instanceof HTMLElement)) return;
  mount.innerHTML = getCharCountTemplate();

  const els = {
    text: /** @type {HTMLTextAreaElement} */ ($(mount, "ccText")),
    copyText: /** @type {HTMLButtonElement} */ ($(mount, "ccCopyText")),
    clearText: /** @type {HTMLButtonElement} */ ($(mount, "ccClearText")),
    toast: $(mount, "ccToast"),
    characters: $(mount, "ccCharacters"),
    bytes: $(mount, "ccBytes"),
    length: $(mount, "ccLength"),
    lines: $(mount, "ccLines"),
    nonEmptyLines: $(mount, "ccNonEmptyLines"),
    chinese: $(mount, "ccChinese"),
    english: $(mount, "ccEnglish"),
    digits: $(mount, "ccDigits"),
    spaces: $(mount, "ccSpaces"),
  };

  let toastTimer = 0;

  function showToast(text) {
    window.clearTimeout(toastTimer);
    els.toast.textContent = text;
    els.toast.classList.add("char-toast--show");
    toastTimer = window.setTimeout(() => {
      els.toast.classList.remove("char-toast--show");
    }, 2600);
  }

  function render() {
    const stats = analyzeTextStats(els.text.value ?? "");
    els.characters.textContent = String(stats.characters);
    els.bytes.textContent = String(stats.bytesUtf8);
    els.length.textContent = String(stats.stringLength);
    els.lines.textContent = String(stats.lines);
    els.nonEmptyLines.textContent = String(stats.nonEmptyLines);
    els.chinese.textContent = String(stats.chinese);
    els.english.textContent = String(stats.english);
    els.digits.textContent = String(stats.digits);
    els.spaces.textContent = String(stats.spaces);
  }

  els.text.addEventListener("input", render);
  els.clearText.addEventListener("click", () => {
    els.text.value = "";
    render();
    showToast("已清空文本。");
  });
  els.copyText.addEventListener("click", async () => {
    if (!els.text.value) {
      showToast("当前还没有可复制的文本。");
      return;
    }
    try {
      await writeClipboard(els.text.value);
      showToast("文本已复制。");
    } catch (err) {
      console.error("[char-count] copy failed:", err);
      showToast("复制失败，请稍后再试。");
    }
  });

  render();
}
