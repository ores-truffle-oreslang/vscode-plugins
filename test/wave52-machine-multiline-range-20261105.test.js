'use strict';
// Host-only machine JSON position admission and malformed sibling denial.
const test = require('node:test');
const assert = require('node:assert/strict');
const {parseCompilerOutputRecords} = require('../lib/compiler-output');

test('cross-line ranges default their end column to one without altering siblings', () => {
  const output = JSON.stringify({version: 1, diagnostics: [
    {path: 'src/cross.ores', range: {start: {line: 5, column: 9}, end: {line: 6}},
      severity: 'INFO', message: 'cross-line'},
    {path: 'src/same.ores', line: 2, column: 3, range: {end: {line: 2, column: 9}},
      severity: 'hint', message: 'same-line'},
    {path: 'src/backward.ores', line: 3, column: 8,
      range: {end: {line: 2, column: 1}}, message: 'bad-backward'},
    {path: 'src/empty.ores', line: 3, column: 8,
      range: {end: {line: 3, column: 8}}, message: 'bad-empty'},
  ]});
  assert.deepEqual(parseCompilerOutputRecords(output), [
    {path: 'src/cross.ores', line: 5, column: 9, endLine: 6, endColumn: 1,
      severity: 'info', message: 'cross-line'},
    {path: 'src/same.ores', line: 2, column: 3, endLine: 2, endColumn: 9,
      severity: 'hint', message: 'same-line'},
  ]);
});
