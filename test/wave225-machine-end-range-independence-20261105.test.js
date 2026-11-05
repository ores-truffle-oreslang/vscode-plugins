'use strict';
// Host parser regression; does not execute any compiler guest.
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCompilerOutputRecords } = require('../lib/compiler-output');

test('reversed multiline range cannot remove adjacent valid diagnostic records', () => {
  const payload = { version: 1, diagnostics: [
    { path: 'src/valid.ores', message: ' first ',
      severity: 'WARNING', range: {
        start: { line: 6, column: 7 }, end: { line: 8, column: 2 } } },
    { path: 'src/reversed.ores', message: 'must be refused', range: {
      start: { line: 9, column: 3 }, end: { line: 8, column: 99 } } },
    { path: null, message: ' last ',
      range: { start: { line: 2, column: 1 } }, severity: 'INFO' },
  ] };
  assert.deepEqual(parseCompilerOutputRecords(JSON.stringify(payload)), [
    { path: 'src/valid.ores', line: 6, column: 7, endLine: 8, endColumn: 2,
      severity: 'warning', message: 'first' },
    { path: null, line: 2, column: 1, endLine: 2, endColumn: 2,
      severity: 'info', message: 'last' },
  ]);
});
