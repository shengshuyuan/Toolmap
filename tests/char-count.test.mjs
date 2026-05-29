import assert from "node:assert/strict";
import { analyzeTextStats } from "../src/tools/char-count/stats.js";

{
  const result = analyzeTextStats("");
  assert.deepEqual(result, {
    characters: 0,
    bytesUtf8: 0,
    stringLength: 0,
    lines: 0,
    nonEmptyLines: 0,
    chinese: 0,
    english: 0,
    digits: 0,
    spaces: 0,
  });
}

{
  const result = analyzeTextStats("abc");
  assert.equal(result.characters, 3);
  assert.equal(result.bytesUtf8, 3);
  assert.equal(result.stringLength, 3);
  assert.equal(result.lines, 1);
  assert.equal(result.nonEmptyLines, 1);
  assert.equal(result.english, 3);
}

{
  const result = analyzeTextStats("中文");
  assert.equal(result.characters, 2);
  assert.equal(result.bytesUtf8, 6);
  assert.equal(result.stringLength, 2);
  assert.equal(result.chinese, 2);
}

{
  const result = analyzeTextStats("😀");
  assert.equal(result.characters, 1);
  assert.equal(result.bytesUtf8, 4);
  assert.equal(result.stringLength, 2);
}

{
  const result = analyzeTextStats("A中😀");
  assert.equal(result.characters, 3);
  assert.equal(result.bytesUtf8, 8);
  assert.equal(result.stringLength, 4);
  assert.equal(result.chinese, 1);
  assert.equal(result.english, 1);
}

{
  const result = analyzeTextStats("A1 中\n\nB2");
  assert.equal(result.lines, 3);
  assert.equal(result.nonEmptyLines, 2);
  assert.equal(result.english, 2);
  assert.equal(result.digits, 2);
  assert.equal(result.spaces, 1);
}

{
  const result = analyzeTextStats("A\r\nB\r\n");
  assert.equal(result.lines, 3);
  assert.equal(result.nonEmptyLines, 2);
  assert.equal(result.characters, 6);
  assert.equal(result.bytesUtf8, 6);
  assert.equal(result.stringLength, 6);
}

console.log("char count tests passed");
