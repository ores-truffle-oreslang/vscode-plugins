'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {parseCompilerOutputRecords} = require('../lib/compiler-output');

// Host-only untrusted compiler text parsing; no guest execution claimed.
test('legacy diagnostics retain warning codes, exact origins and line coordinates', () => {
  const output = [
    'src/lib.ores:7:12: warning[W123]:   check borrow boundary  ',
    'src/lib.ores:8:2: info: informational notice',
    'src/lib.ores:9:1: hint: local suggestion',
  ].join('\r\n');
  assert.deepEqual(parseCompilerOutputRecords(output), [
    {path: 'src/lib.ores', line: 7, column: 12, endLine: 7, endColumn: 13, severity: 'warning', message: 'check borrow boundary'},
    {path: 'src/lib.ores', line: 8, column: 2, endLine: 8, endColumn: 3, severity: 'info', message: 'informational notice'},
    {path: 'src/lib.ores', line: 9, column: 1, endLine: 9, endColumn: 2, severity: 'hint', message: 'local suggestion'},
  ]);
});

test('invalid or out-of-range fallback coordinates never produce VS Code positions', () => {
  const output = [
    'src/lib.ores:0:1: error: invalid line',
    'src/lib.ores:1:0: warning: invalid column',
    'src/lib.ores:10000001:1: error: too large',
    'src/lib.ores:6:8: error: valid error',
  ].join('\n');
  assert.deepEqual(parseCompilerOutputRecords(output), [
    {path: 'src/lib.ores', line: 6, column: 8, endLine: 6, endColumn: 9, severity: 'error', message: 'valid error'},
  ]);
});
