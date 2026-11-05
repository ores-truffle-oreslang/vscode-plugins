'use strict';
// Host-only machine diagnostic range validation, not an AttoLang guest test.
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCompilerOutputRecords } = require('../lib/compiler-output');

test('valid cross-line ranges survive nearby backwards and empty end positions', () => {
  const input = JSON.stringify({version: 1, diagnostics: [
    {path: 'src/valid.ores', range: {start: {line: 9, column: 4}, end: {line: 10, column: null}},
      severity: 'HINT', message: '  crosses line  '},
    {path: 'src/backwards.ores', range: {start: {line: 5, column: 8}, end: {line: 4, column: 12}},
      message: 'reverse'},
    {path: 'src/empty.ores', range: {start: {line: 2, column: 4}, end: {line: 2, column: 4}},
      message: 'empty'},
    {path: 'src/same.ores', line: 3, column: 5, message: 'plain'},
  ]});
  assert.deepEqual(parseCompilerOutputRecords(input), [
    {path: 'src/valid.ores', line: 9, column: 4, endLine: 10, endColumn: 1,
      severity: 'hint', message: 'crosses line'},
    {path: 'src/same.ores', line: 3, column: 5, endLine: 3, endColumn: 6,
      severity: 'error', message: 'plain'},
  ]);
});
