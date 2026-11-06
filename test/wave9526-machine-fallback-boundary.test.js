'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {parseCompilerOutputRecords} = require('../lib/compiler-output');

test('machine range defaults are bounded; invalid explicit peers are dropped independently', () => {
  const diagnostics = [
    {message: 'default end', line: 10, column: 2, severity: 'WARNING'},
    {message: 'cross-line omitted end column', range: {start: {line: 8, column: 9}, end: {line: 9}}},
    {message: 'invalid explicit zero-length', range: {start: {line: 4, column: 4}, end: {line: 4, column: 4}}},
    {message: 'invalid scalar start', range: {start: 8}},
    {message: 'end would exceed upper bound', line: 10, column: 10000000},
    {message: 'highest valid explicit range', range: {
      start: {line: 10000000, column: 9999999},
      end: {line: 10000000, column: 10000000},
    }, severity: 'HINT'},
    {message: 'overlarge line', line: 10000001, column: 3},
  ];
  const output = JSON.stringify({version: 1, diagnostics});
  const expected = [
    ['default end', 10, 2, 10, 3, 'warning'],
    ['cross-line omitted end column', 8, 9, 9, 1, 'error'],
    ['highest valid explicit range', 10000000, 9999999, 10000000, 10000000, 'hint'],
  ];
  for (let trial = 0; trial < 20; trial++) {
    assert.deepEqual(parseCompilerOutputRecords(output).map(r => [
      r.message, r.line, r.column, r.endLine, r.endColumn, r.severity,
    ]), expected);
  }
  assert.deepEqual(parseCompilerOutputRecords(JSON.stringify({version: 2, diagnostics})), []);
  assert.deepEqual(parseCompilerOutputRecords('{"version":1,"diagnostics": [broken valid.atto:1:1: error: forged'), []);
});
