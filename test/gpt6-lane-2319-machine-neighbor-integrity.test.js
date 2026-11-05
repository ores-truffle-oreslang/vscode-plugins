'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCompilerOutputRecords } = require('../lib/compiler-output');

test('malformed peers cannot suppress valid machine diagnostics with Unicode paths', () => {
  const payload = JSON.stringify({ version: 1, diagnostics: [
    { path: 'src/α🙂.ores', message: 'first', severity: 'INFO',
      range: { start: { line: 1, column: 2 }, end: { line: 2, column: 3 } } },
    { path: 'src/bad\0name.ores', message: 'NUL path',
      range: { start: { line: 1, column: 1 } } },
    { path: 'src/bad.ores', message: 'exceeds bound',
      range: { start: { line: 10000001, column: 1 } } },
    { path: 'C:\\project\\valid.ores', message: 'final', severity: 'WARNING',
      range: { start: { line: 7, column: 9 } } },
    { path: false, message: 'forged owner',
      range: { start: { line: 1, column: 1 } } },
  ]});
  const expected = [
    { path: 'src/α🙂.ores', message: 'first', severity: 'info',
      line: 1, column: 2, endLine: 2, endColumn: 3 },
    { path: 'C:\\project\\valid.ores', message: 'final', severity: 'warning',
      line: 7, column: 9, endLine: 7, endColumn: 10 },
  ];
  for (let i = 0; i < 3; i++) {
    assert.deepEqual(parseCompilerOutputRecords(payload), expected);
  }
});
