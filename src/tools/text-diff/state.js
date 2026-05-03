export function createComparisonState({ countEl, prevButton, nextButton, diffView }) {
  const nav = { anchors: [], activeIndex: -1, diffCount: 0 };
  let anchorMeta = {};
  let latestCompareLines = null;

  function setCount(n) {
    nav.diffCount = n;
    countEl.textContent = `差异：${n}`;
  }

  function setNav(anchors) {
    nav.anchors = anchors;
    nav.activeIndex = anchors.length > 0 ? 0 : -1;
    prevButton.disabled = anchors.length === 0;
    nextButton.disabled = anchors.length === 0;
  }

  function reset({ clearResult = false } = {}) {
    anchorMeta = {};
    latestCompareLines = null;
    setCount(0);
    setNav([]);
    if (clearResult) {
      diffView.innerHTML = `<div class="diff-empty">还没有结果。点击上方「开始比对」。</div>`;
    }
  }

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
