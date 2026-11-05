'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCompilerOutputRecords } = require('../lib/compiler-output');

test('machine diagnostic range boundary and malformed peers are independent', () => {
  const envelope = { version: 1, diagnostics: [
    { path: 'src/good.atto', range: { start: { line: 10000000, column: 1 },
      end: { line: 10000000, column: 2 } }, message: '  boundary  ', severity: 'HINT' },
    { path: 'src/reversed.atto', line: 3, column: 6,
      range: { end: { line: 3, column: 5 } }, message: 'bad reversed range' },
    { path: 'src/overflow.atto', line: 3, column: 10000000,
      message: 'implicit end coordinate exceeds limit' },
    { path: 123, line: 1, column: 1, message: 'invalid path type' },
    { path: null, line: 9, column: 2,
      range: { end: { line: 10, column: 1 } }, message: 'peer', severity: 'INFO' },
  ] };
  assert.deepEqual(parseCompilerOutputRecords(JSON.stringify(envelope)), [
    { path: 'src/good.atto', line: 10000000, column: 1,
      endLine: 10000000, endColumn: 2, message: 'boundary', severity: 'hint' },
    { path: null, line: 9, column: 2,
      endLine: 10, endColumn: 1, message: 'peer', severity: 'info' },
  ]);
});
