/**
 * QR Code Encoder — 纯 JS 实现（Byte 模式，Version 1-40）
 * 参考 ISO/IEC 18004，支持 L/M/Q/H 四级纠错
 */

/* ── 常量 ─────────────────────────────────────────────── */

const EC_LEVELS = ["L", "M", "Q", "H"];

/** 每个版本每个 EC 级别的数据容量（字节） */
const DATA_CODEWORDS = [
  null, // placeholder for version 0
  [19,16,13,9],[34,28,22,16],[55,44,34,28],[80,64,48,32],
  [108,86,62,46],[136,108,76,60],[156,124,88,74],[194,154,110,90],
  [232,182,132,114],[274,216,154,132],[324,254,180,154],[370,290,206,180],
  [428,334,244,206],[461,365,261,224],[523,415,295,254],[589,453,325,282],
  [647,507,367,310],[721,563,405,338],[795,627,450,382],[861,669,483,406],
  [932,714,512,438],[1006,782,568,464],[1094,860,614,514],[1174,914,664,538],
  [1276,1000,718,596],[1370,1062,754,628],[1468,1128,808,661],[1531,1193,871,701],
  [1631,1267,911,745],[1735,1373,985,793],[1843,1455,1033,845],[1955,1541,1115,901],
  [2071,1631,1171,961],[2191,1725,1231,986],[2306,1812,1286,1054],[2434,1914,1354,1096],
  [2566,1992,1426,1142],[2702,2102,1502,1222],[2812,2216,1582,1276],[2956,2334,1666,1370],
];

/** 每个版本每个 EC 级别的 EC codewords per block */
const EC_CODEWORDS_PER_BLOCK = [
  null,
  [7,10,13,17],[10,16,22,28],[15,26,18,22],[20,18,26,16],
  [26,24,18,22],[18,16,24,28],[20,18,18,24],[24,22,22,18],
  [30,22,20,24],[18,26,24,28],[20,30,28,24],[24,22,22,26],
  [26,22,24,20],[30,24,20,30],[22,24,30,24],[24,28,24,28],
  [28,28,28,28],[30,26,28,28],[28,26,28,28],[28,26,28,28],
  [28,28,28,28],[28,28,28,28],[28,28,28,28],[30,28,28,28],
  [30,28,28,28],[30,28,28,30],[30,28,30,30],[30,28,30,30],
  [30,28,30,30],[30,30,30,30],[30,30,30,30],[30,30,30,30],
  [30,30,30,30],[30,30,30,30],[30,30,30,30],[30,30,30,30],
  [30,30,30,30],[30,30,30,30],[30,30,30,30],[30,30,30,30],
];

/** 每个版本每个 EC 级别的 block 结构: [numBlocks1, dataPerBlock1, numBlocks2, dataPerBlock2] */
const EC_BLOCKS = [
  null,
  [[1,19,0,0],[1,16,0,0],[1,13,0,0],[1,9,0,0]],
  [[1,34,0,0],[1,28,0,0],[1,22,0,0],[1,16,0,0]],
  [[1,55,0,0],[1,44,0,0],[2,17,0,0],[2,13,0,0]],
  [[1,80,0,0],[2,32,0,0],[2,24,0,0],[4,9,0,0]],
  [[1,108,0,0],[2,43,0,0],[2,15,2,16],[2,11,2,12]],
  [[2,68,0,0],[4,27,0,0],[4,19,0,0],[4,15,0,0]],
  [[2,78,0,0],[4,31,0,0],[2,14,4,15],[4,13,1,14]],
  [[2,97,0,0],[2,38,2,39],[4,18,2,19],[4,14,2,15]],
  [[2,116,0,0],[3,36,2,37],[4,16,4,17],[4,12,4,13]],
  [[2,68,2,69],[4,43,1,44],[6,19,2,20],[6,15,2,16]],
  [[4,81,0,0],[1,50,4,51],[4,22,4,23],[3,12,8,13]],
  [[2,92,2,93],[6,36,2,37],[4,20,6,21],[7,14,4,15]],
  [[4,107,0,0],[8,37,1,38],[8,20,4,21],[12,11,4,12]],
  [[3,115,1,116],[4,40,5,41],[11,16,5,17],[11,12,5,13]],
  [[5,87,1,88],[5,41,5,42],[5,24,7,25],[11,12,7,13]],
  [[5,98,1,99],[7,45,3,46],[15,19,2,20],[3,15,13,16]],
  [[1,107,5,108],[10,46,1,47],[1,22,15,23],[2,14,17,15]],
  [[5,120,1,121],[9,43,4,44],[17,22,1,23],[2,14,19,15]],
  [[3,113,4,114],[3,44,11,45],[17,21,4,22],[9,13,16,14]],
  [[3,107,5,108],[3,41,13,42],[15,24,5,25],[15,15,10,16]],
  [[4,116,4,117],[17,42,0,0],[17,22,6,23],[19,16,6,17]],
  [[2,111,7,112],[17,46,0,0],[7,24,16,25],[34,13,0,0]],
  [[4,121,5,122],[4,47,14,48],[11,24,14,25],[16,15,14,16]],
  [[6,117,4,118],[6,45,14,46],[11,24,16,25],[30,16,2,17]],
  [[8,106,4,107],[8,47,13,48],[7,24,22,25],[22,15,13,16]],
  [[10,114,2,115],[19,46,4,47],[28,22,6,23],[33,16,4,17]],
  [[8,122,4,123],[22,45,3,46],[8,23,26,24],[12,15,28,16]],
  [[3,117,10,118],[3,45,23,46],[4,24,31,25],[11,15,31,16]],
  [[7,116,7,117],[21,45,7,46],[1,23,37,24],[19,15,26,16]],
  [[5,115,10,116],[19,47,10,48],[15,24,25,25],[23,15,25,16]],
  [[13,115,3,116],[2,46,29,47],[42,24,1,25],[23,15,28,16]],
  [[17,115,0,0],[10,46,23,47],[10,24,35,25],[19,15,35,16]],
  [[17,115,1,116],[14,46,21,47],[29,24,19,25],[11,15,46,16]],
  [[13,115,6,116],[14,46,23,47],[44,24,7,25],[59,16,1,17]],
  [[12,121,7,122],[12,47,26,48],[39,24,14,25],[22,15,41,16]],
  [[6,121,14,122],[6,47,34,48],[46,24,10,25],[2,15,64,16]],
  [[17,122,4,123],[29,46,14,47],[49,24,10,25],[24,15,46,16]],
  [[4,122,18,123],[13,46,32,47],[48,24,14,25],[42,15,32,16]],
  [[20,117,4,118],[40,47,7,48],[43,24,22,25],[10,15,67,16]],
  [[19,118,6,119],[18,47,31,48],[34,24,34,25],[20,15,61,16]],
];

/** Alignment pattern 坐标（version 2-40） */
const ALIGNMENT_POSITIONS = [
  null, [],[6,18],[6,22],[6,26],[6,30],[6,34],[6,22,38],[6,24,42],[6,26,46],[6,28,50],
  [6,30,54],[6,32,58],[6,34,62],[6,26,46,66],[6,26,48,70],[6,26,50,74],[6,30,54,78],
  [6,30,56,82],[6,30,58,86],[6,34,62,90],[6,28,50,72,94],[6,26,50,74,98],[6,30,54,78,102],
  [6,28,54,80,106],[6,32,58,84,110],[6,30,58,86,114],[6,34,62,90,118],[6,26,50,74,98,122],
  [6,30,54,78,102,126],[6,26,52,78,104,130],[6,30,56,82,108,134],[6,34,60,86,112,138],
  [6,30,58,86,114,142],[6,34,62,90,118,146],[6,30,54,78,102,126,150],[6,24,50,76,102,128,154],
  [6,28,54,80,106,132,158],[6,32,58,84,110,136,162],[6,26,54,82,110,138,166],[6,30,58,86,114,142,170],
];

/* ── GF(256) 运算 ─────────────────────────────────────── */

/** 生成 GF(256) 的 exp 和 log 表 */
function buildGfTables() {
  const exp = new Uint8Array(512);
  const log = new Uint8Array(256);
  let x = 1;
  for (let i = 0; i < 255; i++) {
    exp[i] = x;
    log[x] = i;
    x = (x << 1) ^ (x >= 128 ? 0x11d : 0);
  }
  for (let i = 255; i < 512; i++) exp[i] = exp[i - 255];
  return { exp, log };
}

const GF = buildGfTables();

/** GF(256) 乘法 */
function gfMul(a, b) {
  if (a === 0 || b === 0) return 0;
  return GF.exp[GF.log[a] + GF.log[b]];
}

/** 生成 Reed-Solomon 生成多项式 */
function rsGeneratorPoly(ecCount) {
  let poly = [1];
  for (let i = 0; i < ecCount; i++) {
    const newPoly = new Array(poly.length + 1).fill(0);
    for (let j = 0; j < poly.length; j++) {
      newPoly[j] ^= poly[j];
      newPoly[j + 1] ^= gfMul(poly[j], GF.exp[i]);
    }
    poly = newPoly;
  }
  return poly;
}

/** 计算 Reed-Solomon EC codewords */
function rsEncode(data, ecCount) {
  const gen = rsGeneratorPoly(ecCount);
  const result = new Uint8Array(ecCount);
  for (let i = 0; i < data.length; i++) {
    const coeff = data[i] ^ result[0];
    result.copyWithin(0, 1);
    result[ecCount - 1] = 0;
    if (coeff !== 0) {
      for (let j = 0; j < ecCount; j++) {
        result[j] ^= gfMul(gen[j + 1], coeff);
      }
    }
  }
  return result;
}

/* ── 数据编码（Byte 模式） ────────────────────────────── */

/** UTF-8 编码 */
function utf8Encode(text) {
  return new TextEncoder().encode(text);
}

/** 确定版本 */
function determineVersion(byteLen, ecLevel) {
  const idx = EC_LEVELS.indexOf(ecLevel);
  for (let v = 1; v <= 40; v++) {
    if (byteLen <= DATA_CODEWORDS[v][idx]) return v;
  }
  throw new Error("数据过长，超出 QR Code 最大容量");
}

/** 生成数据位流 */
function encodeData(bytes, version, ecLevel) {
  const idx = EC_LEVELS.indexOf(ecLevel);
  const totalDataCodewords = DATA_CODEWORDS[version][idx];
  const charCountBits = version <= 9 ? 8 : 16;

  // 构建 bit 流
  const bits = [];

  // 模式指示符: Byte = 0100
  bits.push(0, 1, 0, 0);

  // 字符计数
  for (let i = charCountBits - 1; i >= 0; i--) {
    bits.push((bytes.length >> i) & 1);
  }

  // 数据
  for (const byte of bytes) {
    for (let i = 7; i >= 0; i--) {
      bits.push((byte >> i) & 1);
    }
  }

  // 终止符 (最多 4 个 0)
  const terminatorLen = Math.min(4, totalDataCodewords * 8 - bits.length);
  for (let i = 0; i < terminatorLen; i++) bits.push(0);

  // 填充到字节边界
  while (bits.length % 8 !== 0) bits.push(0);

  // 填充字节 0xEC / 0x11
  const padBytes = [0xec, 0x11];
  let padIdx = 0;
  while (bits.length < totalDataCodewords * 8) {
    const pb = padBytes[padIdx % 2];
    for (let i = 7; i >= 0; i--) bits.push((pb >> i) & 1);
    padIdx++;
  }

  // 转为字节数组
  const codewords = new Uint8Array(totalDataCodewords);
  for (let i = 0; i < totalDataCodewords; i++) {
    let val = 0;
    for (let b = 0; b < 8; b++) val = (val << 1) | (bits[i * 8 + b] || 0);
    codewords[i] = val;
  }
  return codewords;
}

/** 生成 EC codewords 并交织 */
function generateCodewords(dataCodewords, version, ecLevel) {
  const idx = EC_LEVELS.indexOf(ecLevel);
  const [nb1, db1, nb2, db2] = EC_BLOCKS[version][idx];
  const ecPerBlock = EC_CODEWORDS_PER_BLOCK[version][idx];

  const dataBlocks = [];
  const ecBlocks = [];
  let offset = 0;

  for (let i = 0; i < nb1; i++) {
    const block = dataCodewords.slice(offset, offset + db1);
    dataBlocks.push(block);
    ecBlocks.push(rsEncode(block, ecPerBlock));
    offset += db1;
  }
  for (let i = 0; i < nb2; i++) {
    const block = dataCodewords.slice(offset, offset + db2);
    dataBlocks.push(block);
    ecBlocks.push(rsEncode(block, ecPerBlock));
    offset += db2;
  }

  // 交织数据 codewords
  const interleaved = [];
  const maxDataLen = Math.max(db1, db2);
  for (let i = 0; i < maxDataLen; i++) {
    for (let j = 0; j < nb1 + nb2; j++) {
      if (i < dataBlocks[j].length) {
        interleaved.push(dataBlocks[j][i]);
      }
    }
  }

  // 交织 EC codewords
  for (let i = 0; i < ecPerBlock; i++) {
    for (let j = 0; j < nb1 + nb2; j++) {
      interleaved.push(ecBlocks[j][i]);
    }
  }

  return interleaved;
}

/* ── 矩阵构建 ────────────────────────────────────────── */

function createMatrix(size) {
  return Array.from({ length: size }, () => new Int8Array(size)); // 0=未设置, 1=黑, -1=白
}

function setModule(modules, isFunction, row, col, isDark) {
  modules[row][col] = isDark ? 1 : -1;
  isFunction[row][col] = 1;
}

/** 放置 finder pattern（三个角） */
function placeFinders(modules, isFunction, size) {
  const positions = [[0, 0], [0, size - 7], [size - 7, 0]];
  for (const [r0, c0] of positions) {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const isEdge = r === 0 || r === 6 || c === 0 || c === 6;
        const isCenter = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        setModule(modules, isFunction, r0 + r, c0 + c, isEdge || isCenter);
      }
    }
    // 分隔符
    for (let i = -1; i <= 7; i++) {
      const rr = r0 + i, cc = c0 + i;
      if (rr >= 0 && rr < size && c0 - 1 >= 0 && isFunction[rr][c0 - 1] === 0) setModule(modules, isFunction, rr, c0 - 1, false);
      if (rr >= 0 && rr < size && c0 + 7 < size && isFunction[rr][c0 + 7] === 0) setModule(modules, isFunction, rr, c0 + 7, false);
      if (cc >= 0 && cc < size && r0 - 1 >= 0 && isFunction[r0 - 1][cc] === 0) setModule(modules, isFunction, r0 - 1, cc, false);
      if (cc >= 0 && cc < size && r0 + 7 < size && isFunction[r0 + 7][cc] === 0) setModule(modules, isFunction, r0 + 7, cc, false);
    }
  }
}

/** 放置 alignment patterns */
function placeAlignments(modules, isFunction, version) {
  if (version < 2) return;
  const positions = ALIGNMENT_POSITIONS[version];
  for (const r of positions) {
    for (const c of positions) {
      // 跳过与 finder 重叠的
      if (isFunction[r][c]) continue;
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const isEdge = Math.abs(dr) === 2 || Math.abs(dc) === 2;
          const isCenter = dr === 0 && dc === 0;
          setModule(modules, isFunction, r + dr, c + dc, isEdge || isCenter);
        }
      }
    }
  }
}

/** 放置 timing patterns */
function placeTiming(modules, isFunction, size) {
  for (let i = 8; i < size - 8; i++) {
    if (isFunction[6][i]) continue;
    setModule(modules, isFunction, 6, i, i % 2 === 0);
    if (isFunction[i][6]) continue;
    setModule(modules, isFunction, i, 6, i % 2 === 0);
  }
}

/** 保留格式和版本信息区域 */
function reserveFormatAndVersion(modules, isFunction, size, version) {
  // 格式信息：围绕 finder patterns
  for (let i = 0; i < 8; i++) {
    // 左上角水平
    if (!isFunction[8][i]) { isFunction[8][i] = 1; modules[8][i] = -1; }
    // 左上角垂直
    if (!isFunction[i][8]) { isFunction[i][8] = 1; modules[i][8] = -1; }
    // 右上角垂直
    if (!isFunction[8][size - 1 - i]) { isFunction[8][size - 1 - i] = 1; modules[8][size - 1 - i] = -1; }
    // 左下角水平
    if (!isFunction[size - 1 - i][8]) { isFunction[size - 1 - i][8] = 1; modules[size - 1 - i][8] = -1; }
  }
  // Dark module
  setModule(modules, isFunction, size - 8, 8, true);

  // 版本信息（version >= 7）
  if (version >= 7) {
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 3; j++) {
        if (!isFunction[i][size - 11 + j]) { isFunction[i][size - 11 + j] = 1; modules[i][size - 11 + j] = -1; }
        if (!isFunction[size - 11 + j][i]) { isFunction[size - 11 + j][i] = 1; modules[size - 11 + j][i] = -1; }
      }
    }
  }
}

/** 放置数据位 */
function placeData(modules, isFunction, dataBits, size) {
  let bitIdx = 0;
  // 从右下角开始，向左上方蛇形扫描
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5; // 跳过 timing pattern 列
    for (let vert = 0; vert < size; vert++) {
      for (let j = 0; j < 2; j++) {
        const col = right - j;
        const upward = ((right + 1) & 2) === 0;
        const row = upward ? size - 1 - vert : vert;
        if (row < 0 || row >= size || col < 0 || col >= size) continue;
        if (isFunction[row][col]) continue;
        modules[row][col] = bitIdx < dataBits.length && dataBits[bitIdx] ? 1 : -1;
        bitIdx++;
      }
    }
  }
}

/* ── 掩码 ─────────────────────────────────────────────── */

const MASK_FUNCTIONS = [
  (r, c) => (r + c) % 2 === 0,
  (r, c) => r % 2 === 0,
  (r, c) => c % 3 === 0,
  (r, c) => (r + c) % 3 === 0,
  (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
  (r, c) => ((r * c) % 2 + (r * c) % 3) === 0,
  (r, c) => ((r * c) % 2 + (r * c) % 3) % 2 === 0,
  (r, c) => ((r + c) % 2 + (r * c) % 3) % 2 === 0,
];

function applyMask(modules, isFunction, size, maskIdx) {
  const result = modules.map((row) => Int8Array.from(row));
  const fn = MASK_FUNCTIONS[maskIdx];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (isFunction[r][c]) continue;
      if (fn(r, c)) result[r][c] = result[r][c] === 1 ? -1 : 1;
    }
  }
  return result;
}

/** 计算掩码评分（越低越好） */
function evaluateMask(modules, size) {
  let score = 0;

  // 规则 1：连续同色模块
  for (let r = 0; r < size; r++) {
    let count = 1;
    for (let c = 1; c < size; c++) {
      if (modules[r][c] === modules[r][c - 1]) {
        count++;
        if (count === 5) score += 3;
        else if (count > 5) score += 1;
      } else {
        count = 1;
      }
    }
  }
  for (let c = 0; c < size; c++) {
    let count = 1;
    for (let r = 1; r < size; r++) {
      if (modules[r][c] === modules[r - 1][c]) {
        count++;
        if (count === 5) score += 3;
        else if (count > 5) score += 1;
      } else {
        count = 1;
      }
    }
  }

  // 规则 2：2x2 同色方块
  for (let r = 0; r < size - 1; r++) {
    for (let c = 0; c < size - 1; c++) {
      const v = modules[r][c];
      if (v === modules[r][c + 1] && v === modules[r + 1][c] && v === modules[r + 1][c + 1]) {
        score += 3;
      }
    }
  }

  // 规则 4：黑白比例
  let dark = 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (modules[r][c] === 1) dark++;
    }
  }
  const total = size * size;
  const percent = (dark / total) * 100;
  const prev5 = Math.floor(percent / 5) * 5;
  const next5 = prev5 + 5;
  score += Math.min(Math.abs(prev5 - 50) / 5, Math.abs(next5 - 50) / 5) * 10;

  return score;
}

/* ── 格式和版本信息 ────────────────────────────────────── */

const FORMAT_INFO_BITS = [
  [0x5412,0x5125,0x5e7c,0x5b4b,0x45f9,0x40ce,0x4f97,0x4aa0],
  [0x77c4,0x72f3,0x7daa,0x789d,0x662f,0x6318,0x6c41,0x6976],
  [0x1689,0x13be,0x1ce7,0x19d0,0x0762,0x0255,0x0d0c,0x083b],
  [0x355f,0x3068,0x3f31,0x3a06,0x24b4,0x2183,0x2eda,0x2bed],
];

const FORMAT_EC_BITS = { L: 1, M: 0, Q: 3, H: 2 };

const VERSION_INFO_BITS = [
  0x07c94,0x085bc,0x09a99,0x0a4d3,0x0bbf6,0x0c762,0x0d847,0x0e60d,
  0x0f928,0x10b78,0x1145d,0x12a17,0x13532,0x149a6,0x15683,0x168c9,
  0x177ec,0x18ec4,0x191e1,0x1afab,0x1b08e,0x1cc1a,0x1d33f,0x1ed75,
  0x1f250,0x209d5,0x216f0,0x228ba,0x2379f,0x24b0b,0x2542e,0x26a64,
  0x27541,0x28c69,
];

function writeFormatInfo(modules, size, ecLevel, maskIdx) {
  const ecBits = FORMAT_EC_BITS[ecLevel];
  const bits = FORMAT_INFO_BITS[ecBits][maskIdx];

  // 位置 0-7: 左上 → 左下
  const positions1 = [
    [8, 0],[8, 1],[8, 2],[8, 3],[8, 4],[8, 5],[8, 7],[8, 8],
    [7, 8],[5, 8],[4, 8],[3, 8],[2, 8],[1, 8],[0, 8],
  ];
  // 位置 0-7: 右上 → 右下
  const positions2 = [
    [size - 1, 8],[size - 2, 8],[size - 3, 8],[size - 4, 8],[size - 5, 8],[size - 6, 8],[size - 7, 8],
    [8, size - 8],[8, size - 7],[8, size - 6],[8, size - 5],[8, size - 4],[8, size - 3],[8, size - 2],[8, size - 1],
  ];

  for (let i = 0; i < 15; i++) {
    const bit = ((bits >> (14 - i)) & 1) ? 1 : -1;
    const [r1, c1] = positions1[i];
    modules[r1][c1] = bit;
    const [r2, c2] = positions2[i];
    modules[r2][c2] = bit;
  }
}

function writeVersionInfo(modules, size, version) {
  if (version < 7) return;
  const bits = VERSION_INFO_BITS[version - 7];
  for (let i = 0; i < 18; i++) {
    const bit = ((bits >> i) & 1) ? 1 : -1;
    const r = Math.floor(i / 3);
    const c = size - 11 + (i % 3);
    modules[r][c] = bit;
    modules[c][r] = bit;
  }
}

/* ── 主函数 ───────────────────────────────────────────── */

/**
 * 编码 QR Code
 * @param {string} text - 要编码的文本
 * @param {{ errorCorrectionLevel?: 'L'|'M'|'Q'|'H' }} [options]
 * @returns {{ modules: number[][], version: number, size: number }}
 */
export function encodeQR(text, options = {}) {
  const ecLevel = options.errorCorrectionLevel || "M";
  if (!EC_LEVELS.includes(ecLevel)) throw new Error(`无效纠错等级: ${ecLevel}`);
  if (text.length === 0) throw new Error("内容不能为空");

  const bytes = utf8Encode(text);
  const version = determineVersion(bytes.length, ecLevel);
  const size = version * 4 + 17;

  // 1. 数据编码
  const dataCodewords = encodeData(bytes, version, ecLevel);

  // 2. 生成交织 codewords
  const allCodewords = generateCodewords(dataCodewords, version, ecLevel);

  // 3. 转为 bit 数组
  const dataBits = [];
  for (const cw of allCodewords) {
    for (let i = 7; i >= 0; i--) dataBits.push((cw >> i) & 1);
  }

  // 4. 创建矩阵并放置功能模式
  const modules = createMatrix(size);
  const isFunction = createMatrix(size);
  placeFinders(modules, isFunction, size);
  placeAlignments(modules, isFunction, version);
  placeTiming(modules, isFunction, size);
  reserveFormatAndVersion(modules, isFunction, size, version);

  // 5. 放置数据
  placeData(modules, isFunction, dataBits, size);

  // 6. 选择最优掩码
  let bestScore = Infinity;
  let bestModules = null;
  for (let i = 0; i < 8; i++) {
    const masked = applyMask(modules, isFunction, size, i);
    writeFormatInfo(masked, size, ecLevel, i);
    writeVersionInfo(masked, size, version);
    const score = evaluateMask(masked, size);
    if (score < bestScore) {
      bestScore = score;
      bestModules = masked;
    }
  }

  // 7. 转换为 boolean[][] (true=黑, false=白)
  const result = [];
  for (let r = 0; r < size; r++) {
    const row = [];
    for (let c = 0; c < size; c++) {
      row.push(bestModules[r][c] === 1);
    }
    result.push(row);
  }

  return { modules: result, version, size };
}
