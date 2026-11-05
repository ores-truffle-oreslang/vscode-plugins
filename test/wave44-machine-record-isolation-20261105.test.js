'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCompilerOutputRecords } = require('../lib/compiler-output');

test('per-record machine validation preserves independent valid ranges', () => {
  const envelope = { version: 1, diagnostics: [
    { path: 42, message: 'reject wrong path', line: 1, column: 1 },
    { path: 'src/a.atto', message: '  first  ', severity: 'WARNING',
      range: { start: { line: 2, column: 3 }, end: { line: 3, column: 1 } } },
    { message: '  ', line: 2, column: 1 },
    { message: 'second', line: 4, column: 8, severity: 'UNTRUSTED' },
    { message: 'bad end', range: { start: { line: 7, column: 2 },
      end: { line: 6, column: 2 } } },
  ] };
  assert.deepEqual(parseCompilerOutputRecords(JSON.stringify(envelope)), [
    { path: 'src/a.atto', line: 2, column: 3,
      endLine: 3, endColumn: 1, severity: 'warning', message: 'first' },
    { path: null, line: 4, column: 8,
      endLine: 4, endColumn: 9, severity: 'error', message: 'second' },
  ]);
});
