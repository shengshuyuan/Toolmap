import assert from "node:assert/strict";
import { encodeQR } from "../src/tools/qrcode/qr-encode.js";

// 测试基本文本编码
{
  const qr = encodeQR("Hello");
  assert.ok(qr.modules.length > 0, "模块矩阵非空");
  assert.ok(qr.size >= 21, "尺寸至少 21");
  assert.ok(qr.version >= 1, "版本至少 1");
  assert.equal(qr.modules.length, qr.size, "行数等于 size");
  assert.equal(qr.modules[0].length, qr.size, "列数等于 size");
}

// 测试空字符串
{
  assert.throws(() => encodeQR(""), /内容不能为空/, "空字符串应报错");
}

// 测试中文 UTF-8
{
  const qr = encodeQR("你好世界");
  assert.ok(qr.version >= 1, "中文应编码成功");
  assert.ok(qr.modules.length >= 21);
}

// 测试 URL
{
  const qr = encodeQR("https://example.com/path?q=1&r=2");
  assert.ok(qr.version >= 1);
}

// 测试各纠错等级
{
  for (const level of ["L", "M", "Q", "H"]) {
    const qr = encodeQR("test", { errorCorrectionLevel: level });
    assert.ok(qr.modules.length >= 21, `${level} 级别应成功`);
  }
}

// 测试无效纠错等级
{
  assert.throws(() => encodeQR("test", { errorCorrectionLevel: "X" }), /无效纠错等级/);
}

// 测试较大文本（应选更大版本）
{
  const longText = "A".repeat(100);
  const qr = encodeQR(longText);
  assert.ok(qr.version > 1, "100 字符应需要 > Version 1");
}

// 测试模块只有 true/false 值
{
  const qr = encodeQR("QR");
  for (const row of qr.modules) {
    for (const cell of row) {
      assert.ok(typeof cell === "boolean", `模块值应为 boolean，实际为 ${typeof cell}`);
    }
  }
}

// 测试 Version 1 的 finder pattern 结构（3 个 7x7 finder 在角上）
{
  const qr = encodeQR("A");
  // 左上角 (0,0)-(6,6) 应全是功能模块
  assert.equal(qr.modules[0][0], true, "左上角 finder 黑");
  assert.equal(qr.modules[0][6], true, "左上角 finder 右边黑");
  assert.equal(qr.modules[6][0], true, "左上角 finder 下边黑");
  // 中心 (3,3) 应为黑
  assert.equal(qr.modules[3][3], true, "左上角 finder 中心黑");
}

// 测试 emoji
{
  const qr = encodeQR("🎉🚀");
  assert.ok(qr.version >= 1, "emoji 应编码成功");
}

console.log("QR encode tests passed");
