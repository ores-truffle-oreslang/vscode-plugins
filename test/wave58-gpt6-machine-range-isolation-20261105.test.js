'use strict';
// Host diagnostic parsing only; no compiler guest execution claim.
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCompilerOutputRecords } = require('../lib/compiler-output');

test('invalid machine ranges and origins cannot contaminate valid records', () => {
  const envelope = {
    version: 1,
    diagnostics: [
      { path: 'src/π.atto', severity: 'WARNING', message: '  retained  ',
        range: { start: { line: 3, column: 9 }, end: { line: 3, column: 11 } } },
      { path: 'src/forged.atto', severity: 'error', message: 'bad end',
        range: { start: { line: 9, column: 3 }, end: { line: 8, column: 4 } } },
      { path: 'src/bad\0.atto', severity: 'error', message: 'forged origin',
        range: { start: { line: 1, column: 1 }, end: { line: 1, column: 2 } } },
      { path: 'src/next.atto', severity: 'hint', message: 'next',
        range: { start: { line: 6, column: 1 }, end: { line: 7, column: 1 } } },
    ],
  };
  assert.deepEqual(parseCompilerOutputRecords(JSON.stringify(envelope)), [
    { path: 'src/π.atto', line: 3, column: 9, endLine: 3, endColumn: 11,
      severity: 'warning', message: 'retained' },
    { path: 'src/next.atto', line: 6, column: 1, endLine: 7, endColumn: 1,
      severity: 'hint', message: 'next' },
  ]);
});
