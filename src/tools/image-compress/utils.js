export const SUPPORTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function formatBytes(bytes) {
  const n = Number(bytes) || 0;
  if (n < 1024) return `${n} B`;
  const units = ["KB", "MB", "GB"];
  let value = n / 1024;
  let unit = units[0];
  for (let i = 1; i < units.length && value >= 1024; i++) {
    value = value / 1024;
    unit = units[i];
  }
  return `${value >= 10 ? value.toFixed(1) : value.toFixed(2)} ${unit}`;
}

export function formatPercent(value) {
  if (!Number.isFinite(value)) return "0%";
  return `${Math.max(0, value).toFixed(1)}%`;
}

export function getFileExtension(name) {
  const match = String(name ?? "").match(/\.([a-z0-9]+)$/i);
  return match ? match[1].toLowerCase() : "";
}

export function mimeToExtension(type) {
  if (type === "image/jpeg") return "jpg";
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  return "img";
}

export function mimeToLabel(type) {
  if (type === "image/jpeg") return "JPG";
  if (type === "image/png") return "PNG";
  if (type === "image/webp") return "WebP";
  return "Image";
}

export function sanitizeFilename(name) {
  return String(name ?? "image")
    .replace(/\.[^.]+$/, "")
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 90) || "image";
}

export function buildOutputName(originalName, mimeType, suffix = "-compressed") {
  return `${sanitizeFilename(originalName)}${suffix}.${mimeToExtension(mimeType)}`;
}

export function getModeSettings(mode) {
  if (mode === "lossless") {
    return {
      quality: 1,
      outputFormat: "original",
      maxEdge: 0,
      label: "无损优先",
      hint: "保持原格式和原尺寸，体积下降通常有限。",
    };
  }
  if (mode === "small") {
    return {
      quality: 0.56,
      outputFormat: "webp",
      maxEdge: 1600,
      label: "极限压缩",
      hint: "转 WebP，并把最长边压到 1600px。",
    };
  }
  if (mode === "high") {
    return {
      quality: 0.88,
      outputFormat: "webp",
      maxEdge: 3840,
      label: "高清优先",
      hint: "转 WebP，保留更大尺寸和更高清晰度。",
    };
  }
  return {
    quality: 0.72,
    outputFormat: "webp",
    maxEdge: 1920,
    label: "智能推荐",
    hint: "默认转 WebP，并把超大图压到 1920px。",
  };
}

export function getOutputMime(fileType, outputFormat, mode) {
  if (mode === "lossless") return fileType || "image/png";
  if (outputFormat === "webp") return "image/webp";
  return fileType || "image/jpeg";
}

export function isSupportedImage(file) {
  return file && SUPPORTED_TYPES.has(file.type);
}
