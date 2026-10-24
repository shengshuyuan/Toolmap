/**
 * @typedef {import("./diff.js").DiffLine} DiffLine
 * @typedef {Record<string, { leftLine: number|null, rightLine: number|null }>} AnchorMeta
 */

/**
 * @param {{ countEl: HTMLElement, prevButton: HTMLButtonElement, nextButton: HTMLButtonElement, diffView: HTMLElement }} params
 */
export function createComparisonState({ countEl, prevButton, nextButton, diffView }) {
  /** @type {{ anchors: string[], activeIndex: number, diffCount: number }} */
  const nav = { anchors: [], activeIndex: -1, diffCount: 0 };
  /** @type {AnchorMeta} */
  let anchorMeta = {};
  /** @type {DiffLine[]|null} */
  let latestCompareLines = null;

  /** @param {number} n */
  function setCount(n) {
    nav.diffCount = n;
    countEl.textContent = `差异：${n}`;
  }

  /** @param {string[]} anchors */
  function setNav(anchors) {
    nav.anchors = anchors;
    nav.activeIndex = anchors.length > 0 ? 0 : -1;
    prevButton.disabled = anchors.length === 0;
    nextButton.disabled = anchors.length === 0;
  }

  /** @param {{ clearResult?: boolean }} [options] */
  function reset({ clearResult = false } = {}) {
    anchorMeta = {};
    latestCompareLines = null;
    setCount(0);
    setNav([]);
    if (clearResult) {
      diffView.innerHTML = `<div class="diff-empty">还没有结果。点击上方「开始比对」。</div>`;
    }
  }

  /** @param {{ anchors: string[], meta?: AnchorMeta|null, lines: DiffLine[], diffCount: number }} params */
  function setRenderedResult({ anchors, meta, lines, diffCount }) {
    latestCompareLines = lines;
    anchorMeta = meta ?? {};
    setCount(diffCount);
    setNav(anchors);
  }

  return {
    nav,
    get anchorMeta() {
      return anchorMeta;
    },
    get latestCompareLines() {
      return latestCompareLines;
    },
    setCount,
    setNav,
    reset,
    setRenderedResult,
  };
}
