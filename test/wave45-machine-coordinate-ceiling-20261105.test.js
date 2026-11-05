'use strict';
// Host-side parser regression; does not claim native compiler guest execution.
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCompilerOutputRecords } = require('../lib/compiler-output');

test('machine-coordinate ceiling rejects overflow without losing neighboring records', () => {
  const payload = { version: 1, diagnostics: [
    { path: 'src/ceiling.ores', message: 'valid boundary', severity: 'ERROR',
      range: { start: { line: 10000000, column: 9999999 },
        end: { line: 10000000, column: 10000000 } } },
    { path: 'src/overflow-line.ores', message: 'bad line',
      range: { start: { line: 10000001, column: 1 } } },
    { path: 'src/overflow-column.ores', message: 'bad column',
      range: { start: { line: 4, column: 10000001 } } },
    { path: 'src/survivor.ores', message: 'neighbor survives',
      line: 2, column: 1, severity: 'WARNING' },
  ] };
  assert.deepEqual(parseCompilerOutputRecords(JSON.stringify(payload)), [
    { path: 'src/ceiling.ores', line: 10000000, column: 9999999,
      endLine: 10000000, endColumn: 10000000, severity: 'error',
      message: 'valid boundary' },
    { path: 'src/survivor.ores', line: 2, column: 1,
      endLine: 2, endColumn: 2, severity: 'warning',
      message: 'neighbor survives' },
  ]);
});
