/**
 * 二维码样式参数：默认值、校验、对比度与可扫描性启发式检查
 */

export const MIN_OUTPUT_SIZE = 128;
export const MAX_OUTPUT_SIZE = 4096;
export const PRESET_SIZES = [256, 512, 1024, 2048];
export const DEFAULT_MARGIN = 4;
export const MIN_SAFE_MARGIN = 2;
export const MAX_LOGO_RATIO = 0.28;
export const WARN_LOGO_RATIO = 0.22;

/** @returns {import("./qr-style.js").QrStyleState} */
export function createDefaultStyle() {
  return {
    foreground: "#000000",
    background: "#ffffff",
    errorLevel: "M",
    margin: DEFAULT_MARGIN,
    outputSize: 512,
    sizeMode: "preset", // preset | custom
    customSize: 512,
    frame: {
      enabled: false,
      width: 10,
      color: "#141413",
      radius: 18,
      background: "#ffffff",
      padding: 14,
    },
    logo: {
      enabled: false,
      dataUrl: "",
      mime: "",
      name: "",
      sizeRatio: 0.18,
      radius: 10,
      padding: 6,
      background: "#ffffff",
      fit: "contain", // contain | cover
    },
  };
}

/**
 * @param {unknown} value
 * @returns {{ ok: true, size: number } | { ok: false, message: string }}
 */
export function validateOutputSize(value) {
  const n = typeof value === "number" ? value : Number(String(value ?? "").trim());
  if (!Number.isFinite(n) || !Number.isInteger(n)) {
    return { ok: false, message: `请输入 ${MIN_OUTPUT_SIZE}～${MAX_OUTPUT_SIZE} 之间的整数像素` };
  }
  if (n < MIN_OUTPUT_SIZE || n > MAX_OUTPUT_SIZE) {
    return { ok: false, message: `尺寸需在 ${MIN_OUTPUT_SIZE}～${MAX_OUTPUT_SIZE} 像素之间` };
  }
  return { ok: true, size: n };
}

/**
 * @param {object} style
 * @returns {number}
 */
export function resolveOutputSize(style) {
  if (style?.sizeMode === "custom") {
    const checked = validateOutputSize(style.customSize);
    return checked.ok ? checked.size : 512;
  }
  const preset = Number(style?.outputSize) || 512;
  return PRESET_SIZES.includes(preset) ? preset : 512;
}

/**
 * 解析 #rgb / #rrggbb
 * @param {string} hex
 * @returns {{ r: number, g: number, b: number } | null}
 */
export function parseHexColor(hex) {
  const raw = String(hex || "").trim();
  const m = raw.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

/**
 * 相对亮度 (WCAG)
 * @param {{ r: number, g: number, b: number }} c
 */
export function relativeLuminance(c) {
  const f = (v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
}

/**
 * @param {string} fg
 * @param {string} bg
 * @returns {number} contrast ratio
 */
export function contrastRatio(fg, bg) {
  const a = parseHexColor(fg);
  const b = parseHexColor(bg);
  if (!a || !b) return 21;
  const L1 = relativeLuminance(a);
  const L2 = relativeLuminance(b);
  const light = Math.max(L1, L2);
  const dark = Math.min(L1, L2);
  return (light + 0.05) / (dark + 0.05);
}

/**
 * 导出用：清理历史里的 Logo 大图，仅保留缩略状态
 * @param {object} style
 */
export function serializeStyleForHistory(style) {
  const base = createDefaultStyle();
  const s = { ...base, ...style, frame: { ...base.frame, ...(style?.frame || {}) }, logo: { ...base.logo, ...(style?.logo || {}) } };
  const hasLogo = Boolean(s.logo.enabled && s.logo.dataUrl);
  return {
    foreground: s.foreground,
    background: s.background,
    errorLevel: s.errorLevel,
    margin: s.margin,
    outputSize: resolveOutputSize(s),
    sizeMode: s.sizeMode,
    customSize: s.customSize,
    frame: { ...s.frame },
    logo: {
      enabled: hasLogo,
      // 历史里不存完整大图，仅标记与参数；缩略图用 record.thumbnail
      dataUrl: hasLogo ? "(local)" : "",
      mime: s.logo.mime || "",
      name: s.logo.name || "",
      sizeRatio: s.logo.sizeRatio,
      radius: s.logo.radius,
      padding: s.logo.padding,
      background: s.logo.background,
      fit: s.logo.fit,
    },
  };
}

/**
 * 启发式可扫描风险（不含实际解码）
 * @param {object} style
 * @param {{ hasContent?: boolean }} [meta]
 * @returns {string[]}
 */
export function collectStyleWarnings(style, meta = {}) {
  const warnings = [];
  const margin = Number(style?.margin ?? DEFAULT_MARGIN);
  if (margin < DEFAULT_MARGIN) {
    warnings.push(margin < MIN_SAFE_MARGIN ? "安全留白严重不足" : "安全留白不足");
  }

  const ratio = contrastRatio(style?.foreground || "#000", style?.background || "#fff");
  if (ratio < 3) warnings.push("对比度可能不足");
  else if (ratio < 4.5) warnings.push("对比度偏低，建议加深前景或提亮背景");

  const logoOn = Boolean(style?.logo?.enabled && style?.logo?.dataUrl);
  if (logoOn) {
    const logoRatio = Number(style.logo.sizeRatio) || 0;
    if (logoRatio > MAX_LOGO_RATIO) warnings.push("Logo 过大，可能遮挡定位区");
    else if (logoRatio > WARN_LOGO_RATIO) warnings.push("Logo 可能过大");
    if ((style.errorLevel || "M") !== "H") {
      warnings.push("添加 Logo 后建议使用 H 级纠错");
    }
  }

  if (style?.frame?.enabled && Number(style.frame.padding) < 4) {
    warnings.push("外框内边距过小，可能影响识别");
  }

  if (!meta.hasContent) return warnings;
  return warnings;
}

/**
 * 限制 Logo 比例
 * @param {number} ratio
 */
export function clampLogoRatio(ratio) {
  const n = Number(ratio);
  if (!Number.isFinite(n)) return 0.18;
  return Math.min(MAX_LOGO_RATIO, Math.max(0.08, n));
}

/**
 * @param {number} margin
 */
export function clampMargin(margin) {
  const n = Number(margin);
  if (!Number.isFinite(n)) return DEFAULT_MARGIN;
  return Math.min(8, Math.max(0, Math.round(n)));
}
