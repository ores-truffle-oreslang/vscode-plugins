'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {parseCompilerOutputRecords} = require('../lib/compiler-output');

test('malformed machine diagnostic peers cannot erase valid bounded ranges and origins', () => {
  const valid = [
    {path: 'src/first.atto', line: 1, column: 1, severity: 'WARNING', message: ' first '},
    {path: null, range: {start: {line: 2, column: 5}, end: {line: 3, column: 1}},
      severity: 'HINT', message: ' second '},
    {path: 'src/last.atto', line: 10000000, column: 9999999,
      severity: 'INFO', message: ' last '},
  ];
  const invalid = [
    {path: '', message: 'empty path'},
    {path: ['src/first.atto'], message: 'array path'},
    {path: 'src/first.atto\u0000forged', message: 'nul path'},
    {path: 'src/first.atto', line: -1, column: 1, message: 'bad line'},
    {path: 'src/first.atto', line: 2, column: 10000000, message: 'implicit end overflow'},
    {path: 'src/first.atto', range: {start: {line: 8, column: 4},
      end: {line: 8, column: 4}}, message: 'empty span'},
    {path: 'src/first.atto', message: 7},
  ];
  const expected = [
    {path: 'src/first.atto', line: 1, column: 1, endLine: 1, endColumn: 2,
      severity: 'warning', message: 'first'},
    {path: null, line: 2, column: 5, endLine: 3, endColumn: 1,
      severity: 'hint', message: 'second'},
    {path: 'src/last.atto', line: 10000000, column: 9999999,
      endLine: 10000000, endColumn: 10000000, severity: 'info', message: 'last'},
  ];
  for (let offset = 0; offset < invalid.length; offset++) {
    const interleaved = [];
    for (const record of valid) interleaved.push(invalid[offset], record);
    assert.deepEqual(parseCompilerOutputRecords(JSON.stringify({
      version: 1, diagnostics: interleaved
    })), expected, 'malformed record index ' + offset);
  }
  assert.deepEqual(parseCompilerOutputRecords(JSON.stringify({
    version: 2, diagnostics: valid
  })), []);
});
