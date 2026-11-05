'use strict';
// Parsed diagnostic source-only unit test; no editor-host or compiler parity claim.
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCompilerOutputRecords } = require('../lib/compiler-output');

test('machine range rejection never discards valid neighbors or shifts their origins', () => {
  const payload = { version: 1, diagnostics: [
    { path: 'src/good.atto', range: {
      start: { line: 8, column: 5 }, end: { line: 9, column: 1 }
    }, severity: 'WARNING', message: '\t  first diagnostic  \n' },
    { path: 'src/reversed.atto', range: {
      start: { line: 1, column: 8 }, end: { line: 1, column: 8 }
    }, message: 'reject same-position end' },
    { path: 'src/overflow.atto', range: {
      start: { line: 10000001, column: 1 }
    }, message: 'reject oversized line' },
    { path: 'src/end-overflow.atto', line: 1, column: 10000000,
      message: 'reject overflowing default end' },
    { path: null, line: 1, column: 1, severity: 'HINT', message: 'second' },
  ] };
  const expected = [
    { path: 'src/good.atto', line: 8, column: 5,
      endLine: 9, endColumn: 1, severity: 'warning', message: 'first diagnostic' },
    { path: null, line: 1, column: 1,
      endLine: 1, endColumn: 2, severity: 'hint', message: 'second' },
  ];
  for (let repeat = 0; repeat < 8; repeat++) {
    assert.deepEqual(parseCompilerOutputRecords(JSON.stringify(payload)), expected);
  }
});
