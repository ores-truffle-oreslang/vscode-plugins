'use strict';
// Host-only fallback CLI diagnostics: paths and code labels are untrusted.
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCompilerOutputRecords } = require('../lib/compiler-output');

test('mixed stdout keeps legacy origin and excludes out-of-range positions', () => {
  const output = [
    'C:\\work\\main.ores:3:11: error[ER_1]: type mismatch',
    '/workspace/imported.ores:5:9: warning: imported issue',
    'Oreslang parse error at 2:6: incomplete declaration',
    'build output: cache ready',
    'main.ores:10000001:1: error: coordinate overflow',
  ].join('\n');
  assert.deepEqual(parseCompilerOutputRecords(output), [
    {
      path: 'C:\\work\\main.ores', line: 3, column: 11,
      endLine: 3, endColumn: 12, severity: 'error', message: 'type mismatch',
    },
    {
      path: '/workspace/imported.ores', line: 5, column: 9,
      endLine: 5, endColumn: 10, severity: 'warning', message: 'imported issue',
    },
    {
      path: null, line: 2, column: 6,
      endLine: 2, endColumn: 7, severity: 'error', message: 'incomplete declaration',
    },
  ]);
});
