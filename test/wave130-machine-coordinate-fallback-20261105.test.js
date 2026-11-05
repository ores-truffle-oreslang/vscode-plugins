'use strict';
// Host-only machine diagnostic boundary regression, not compiler parity.
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCompilerOutputRecords } = require('../lib/compiler-output');

test('coordinate fallback admits exact maximum and rejects overflow independently', () => {
  const diagnostics = [
    {
      path: 'limit.ores', message: 'valid upper boundary', severity: 'hint',
      range: { start: { line: 10000000, column: 9999999 } },
    },
    {
      path: 'bad.ores', message: 'implicit end-column exceeds bound',
      range: { start: { line: 1, column: 10000000 } },
    },
    {
      path: 'bad.ores', message: 'line overflow',
      range: { start: { line: 10000001, column: 1 } },
    },
    {
      path: 'next.ores', message: 'cross-line max start',
      range: { start: { line: 4, column: 10000000 }, end: { line: 5, column: 1 } },
    },
    { message: 'fallback location', severity: 'warning' },
  ];
  assert.deepEqual(parseCompilerOutputRecords(JSON.stringify({ version: 1, diagnostics })), [
    {
      path: 'limit.ores', line: 10000000, column: 9999999,
      endLine: 10000000, endColumn: 10000000, severity: 'hint',
      message: 'valid upper boundary',
    },
    {
      path: 'next.ores', line: 4, column: 10000000,
      endLine: 5, endColumn: 1, severity: 'error',
      message: 'cross-line max start',
    },
    {
      path: null, line: 1, column: 1,
      endLine: 1, endColumn: 2, severity: 'warning',
      message: 'fallback location',
    },
  ]);
});
