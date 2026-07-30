import assert from "node:assert/strict";
import {
  createDefaultStyle,
  validateOutputSize,
  resolveOutputSize,
  contrastRatio,
  collectStyleWarnings,
  serializeStyleForHistory,
  clampLogoRatio,
  clampMargin,
  MIN_OUTPUT_SIZE,
  MAX_OUTPUT_SIZE,
  DEFAULT_MARGIN,
} from "../src/tools/qrcode/qr-style.js";
import { evaluateScanCheck, scanCheckClass } from "../src/tools/qrcode/qr-scan-check.js";
import { encodeQR } from "../src/tools/qrcode/qr-encode.js";
import { renderToSVG, renderDesignedSVG, isSafeImageDataUrl, buildExportFilename, computeLayout } from "../src/tools/qrcode/qr-render.js";

// 默认样式
{
  const s = createDefaultStyle();
  assert.equal(s.foreground, "#000000");
  assert.equal(s.background, "#ffffff");
  assert.equal(s.errorLevel, "M");
  assert.equal(s.margin, DEFAULT_MARGIN);
  assert.equal(s.outputSize, 512);
  assert.equal(s.frame.enabled, false);
  assert.equal(s.logo.enabled, false);
}

// 尺寸校验
{
  assert.equal(validateOutputSize(512).ok, true);
  assert.equal(validateOutputSize(MIN_OUTPUT_SIZE).ok, true);
  assert.equal(validateOutputSize(MAX_OUTPUT_SIZE).ok, true);
  assert.equal(validateOutputSize(100).ok, false);
  assert.equal(validateOutputSize(99999).ok, false);
  assert.equal(validateOutputSize("abc").ok, false);
  assert.equal(validateOutputSize(256.5).ok, false);
}

// resolveOutputSize
{
  assert.equal(resolveOutputSize({ sizeMode: "preset", outputSize: 1024 }), 1024);
  assert.equal(resolveOutputSize({ sizeMode: "custom", customSize: 777 }), 777);
  assert.equal(resolveOutputSize({ sizeMode: "custom", customSize: 10 }), 512);
}

// 对比度
{
  assert.ok(contrastRatio("#000000", "#ffffff") > 20);
  assert.ok(contrastRatio("#777777", "#888888") < 2);
}

// 警告收集
{
  const w1 = collectStyleWarnings({ ...createDefaultStyle(), margin: 1, logo: { enabled: true, dataUrl: "x", sizeRatio: 0.3 }, errorLevel: "L" }, { hasContent: true });
  assert.ok(w1.some((x) => x.includes("留白") || x.includes("Logo") || x.includes("纠错")));
}

// 历史序列化不存大图
{
  const s = createDefaultStyle();
  s.logo.enabled = true;
  s.logo.dataUrl = "data:image/png;base64,AAAA";
  const hist = serializeStyleForHistory(s);
  assert.equal(hist.logo.dataUrl, "(local)");
  assert.equal(hist.logo.enabled, true);
}

// clamp
{
  assert.equal(clampLogoRatio(0.5), 0.28);
  assert.equal(clampMargin(-1), 0);
  assert.equal(clampMargin(99), 8);
}

// 扫描自检状态
{
  const style = createDefaultStyle();
  const pass = evaluateScanCheck({ expected: "hi", decoded: "hi", style });
  assert.equal(pass.level, "pass");
  assert.equal(pass.status, "识别测试通过");

  const fail = evaluateScanCheck({ expected: "hi", decoded: null, style });
  assert.equal(fail.level, "fail");

  const warn = evaluateScanCheck({
    expected: "hi",
    decoded: "hi",
    style: { ...style, foreground: "#888888", background: "#999999" },
  });
  assert.ok(warn.level === "warn" || warn.level === "pass");

  assert.equal(scanCheckClass("pass"), "qr-check--pass");
  assert.equal(scanCheckClass("fail"), "qr-check--fail");
}

// SVG 基础导出与安全
{
  const qr = encodeQR("https://example.com");
  const svg = renderToSVG(qr.modules, { foreground: "#000", background: "#fff" });
  assert.ok(svg.startsWith("<svg"));
  assert.ok(!/<script/i.test(svg));
  assert.ok(svg.includes('fill="#000"') || svg.includes('fill="#000000"') || svg.includes("fill=\"#000\""));

  const designed = renderDesignedSVG(qr.modules, {
    pixelSize: 256,
    foreground: "#111111",
    background: "#ffffff",
    margin: 4,
    frame: { enabled: true, width: 8, color: "#222222", radius: 12, background: "#fafafa", padding: 10 },
    logo: { enabled: false },
  });
  assert.ok(designed.includes("viewBox"));
  assert.ok(!/<script/i.test(designed));
  assert.ok(!/\bonerror=/i.test(designed));
}

// data URL 白名单
{
  assert.equal(isSafeImageDataUrl("data:image/png;base64,abc"), true);
  assert.equal(isSafeImageDataUrl("data:image/svg+xml;base64,abc"), false);
  assert.equal(isSafeImageDataUrl("https://evil.com/x.png"), false);
}

// 布局与文件名
{
  const qr = encodeQR("A");
  const layout = computeLayout(qr.modules, {
    pixelSize: 512,
    margin: 4,
    frame: { enabled: true, width: 10, padding: 12, radius: 8 },
  });
  assert.equal(layout.totalSize, 512);
  assert.ok(layout.qrSize > 0);
  assert.equal(buildExportFilename("wifi", 512, "png"), "qrcode-wifi-512px.png");
}

// 外框参数默认
{
  const s = createDefaultStyle();
  assert.ok("width" in s.frame);
  assert.ok("padding" in s.frame);
  assert.ok("radius" in s.frame);
}

// Logo 参数默认
{
  const s = createDefaultStyle();
  assert.equal(s.logo.fit, "contain");
  assert.ok(s.logo.sizeRatio > 0);
}

console.log("QR style / render / scan-check tests passed");
