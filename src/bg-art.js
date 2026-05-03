/**
 * 算法背景（纯装饰，不影响功能）
 *
 * 目标：做一个“树园”气质的极淡纹理——像果园清晨雾气里的枝条轨迹。
 * - 无交互、无依赖、只在本地绘制到 <canvas>
 * - 只绘制一次（无动画），降低性能影响
 */

function mulberry32(seed) {
  // 一个轻量 PRNG：相同 seed 可复现
  let t = seed >>> 0;
  return function rand() {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function hashSeedFromDay() {
  // 为什么这么写：默认每天一个“轻微变化”的背景，但同一天稳定可复现
  const d = new Date();
  const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function flowAngle(x, y, t) {
  // 一个“伪噪声”的流场：用三组正弦叠加模拟柔和的风向变化
  const a =
    Math.sin(x * 0.004 + t * 0.7) +
    Math.sin(y * 0.005 - t * 0.5) +
    Math.sin((x + y) * 0.003 + t * 0.3);
  return a * Math.PI * 0.45;
}

function drawBackground(canvas) {
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return;

  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  const w = Math.floor(window.innerWidth);
  const h = Math.floor(window.innerHeight);
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // 清空
  ctx.clearRect(0, 0, w, h);

  // 轻雾底：非常淡的线性渐变
  const g = ctx.createLinearGradient(0, 0, w, h);
  // Anthropic accents（极淡）：蓝 / 绿 / 橙
  g.addColorStop(0, "rgba(106,155,204,0.035)");
  g.addColorStop(0.55, "rgba(120,140,93,0.022)");
  g.addColorStop(1, "rgba(217,119,87,0.018)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  const seed = hashSeedFromDay();
  const rand = mulberry32(seed);

  // 画“枝条流线”
  const strokes = clamp(Math.floor((w * h) / 25000), 26, 70);
  const steps = clamp(Math.floor(Math.min(w, h) / 18), 26, 60);

  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  for (let s = 0; s < strokes; s++) {
    const startEdge = rand();
    let x, y;
    if (startEdge < 0.33) {
      x = -20;
      y = rand() * h;
    } else if (startEdge < 0.66) {
      x = rand() * w;
      y = -20;
    } else {
      x = w + 20;
      y = rand() * h;
    }

    const t = rand() * 10;
    const baseW = 0.6 + rand() * 0.9;
    const alpha = 0.05 + rand() * 0.06; // 极淡

    // 颜色：使用品牌三原色做“雾化线条”，随机取一个
    const pick = rand();
    const col =
      pick < 0.34
        ? `rgba(106,155,204,${alpha})` // 蓝
        : pick < 0.67
          ? `rgba(120,140,93,${alpha})` // 绿
          : `rgba(217,119,87,${alpha})`; // 橙
    ctx.strokeStyle = col;
    ctx.lineWidth = baseW;

    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let i = 0; i < steps; i++) {
      const ang = flowAngle(x, y, t + i * 0.08);
      const sp = 10 + rand() * 10;
      x += Math.cos(ang) * sp;
      y += Math.sin(ang) * sp;
      ctx.lineTo(x, y);
      if (x < -80 || x > w + 80 || y < -80 || y > h + 80) break;
    }
    ctx.stroke();
  }

  // 极少量“露珠点”
  const dots = clamp(Math.floor((w * h) / 60000), 10, 40);
  for (let i = 0; i < dots; i++) {
    const x = rand() * w;
    const y = rand() * h;
    const r = 0.8 + rand() * 1.8;
    ctx.fillStyle = `rgba(106,155,204,${0.05 + rand() * 0.06})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function init() {
  const canvas = document.getElementById("bgCanvas");
  if (!(canvas instanceof HTMLCanvasElement)) return;

  const redraw = () => drawBackground(canvas);
  redraw();

  // 仅 resize 时重绘（避免持续动画带来的性能开销）
  let timer = 0;
  window.addEventListener(
    "resize",
    () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(redraw, 120);
    },
    { passive: true }
  );
}

init();
