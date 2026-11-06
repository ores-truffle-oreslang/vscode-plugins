'use strict';
// Compiler-output host admission, no live guest compiler or AOT evidence.
const test = require('node:test');
const assert = require('node:assert/strict');
const {parseCompilerOutputRecords} = require('../lib/compiler-output');

test('invalid machine range shapes and origins never convert into default spans or poison valid peers', () => {
  const invalid = [
    {message: 'array range', range: []},
    {message: 'nested array', range: {start: [], end: {line: 1, column: 2}}},
    {message: 'backward end', range: {start: {line: 5, column: 2}, end: {line: 4, column: 8}}},
    {message: 'same-position end', range: {start: {line: 5, column: 2}, end: {line: 5, column: 2}}},
    {message: 'nul path', path: 'src/a\0evil.atto'},
    {message: 'overflow start', range: {start: {line: 10000001, column: 1}}},
    {message: 'overflow inferred end', range: {start: {line: 1, column: 10000000}}},
  ];
  const valid = [
    {message: 'good precise origin', path: 'src/okay.atto', severity: 'WaRnInG',
      range: {start: {line: 2, column: 3}, end: {line: 3, column: 1}}},
    {message: 'good unlocated', path: null, severity: 'INFO', line: 7, column: 9},
  ];
  const expected = [
    {path: 'src/okay.atto', line: 2, column: 3, endLine: 3, endColumn: 1,
      severity: 'warning', message: 'good precise origin'},
    {path: null, line: 7, column: 9, endLine: 7, endColumn: 10,
      severity: 'info', message: 'good unlocated'},
  ];
  for (let offset = 0; offset < invalid.length; offset++) {
    const records = [...invalid.slice(offset), valid[0], ...invalid.slice(0, offset), valid[1]];
    const result = parseCompilerOutputRecords(JSON.stringify({version: 1, diagnostics: records}));
    assert.deepEqual(result, expected, 'invalid-neighbor rotation ' + offset);
  }
  assert.deepEqual(parseCompilerOutputRecords(JSON.stringify({
    version: 1, diagnostics: invalid
  })), []);
});
