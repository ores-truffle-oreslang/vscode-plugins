'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {parseCompilerOutputRecords} = require('../lib/compiler-output');

test('malformed machine-v1 records never suppress valid neighbors or forge active-origin diagnostics', () => {
  const valid = [
    {path: 'src/main.atto', line: 1, column: 1, message: ' start ', severity: 'WARNING'},
    {path: null, range: {start: {line: 9, column: 5}, end: {line: 10, column: 1}},
      message: ' multi-line ', severity: 'HINT'},
    {path: 'src/max.atto', line: 10000000, column: 9999999, message: 'max valid', severity: 'INFO'},
  ];
  const invalid = [
    {path: 17, line: 3, column: 4, message: 'numeric path'},
    {path: '', line: 3, column: 4, message: 'empty path'},
    {path: 'bad\0path.atto', line: 3, column: 4, message: 'NUL path'},
    {path: 'src/array.atto', range: [], message: 'array range'},
    {path: 'src/number.atto', range: 12, message: 'scalar range'},
    {path: 'src/start-array.atto', range: {start: []}, message: 'array start'},
    {path: 'src/end-array.atto', range: {end: []}, message: 'array end'},
    {path: 'src/bool.atto', line: true, column: 4, message: 'bool line'},
    {path: 'src/fraction.atto', line: 1.2, column: 2, message: 'float line'},
    {path: 'src/overflow.atto', line: 2, column: 10000000, message: 'default end exceeds cap'},
    {path: 'src/reversed.atto', range: {start: {line: 3, column: 9}, end: {line: 3, column: 8}}, message: 'reversed'},
  ];
  const expected = [
    {path: 'src/main.atto', line: 1, column: 1, endLine: 1, endColumn: 2, severity: 'warning', message: 'start'},
    {path: null, line: 9, column: 5, endLine: 10, endColumn: 1, severity: 'hint', message: 'multi-line'},
    {path: 'src/max.atto', line: 10000000, column: 9999999, endLine: 10000000,
      endColumn: 10000000, severity: 'info', message: 'max valid'},
  ];
  const records = [invalid[0], valid[0], ...invalid.slice(1, 5), valid[1], ...invalid.slice(5), valid[2]];
  for (let i = 0; i < 4; i++) {
    const actual = parseCompilerOutputRecords(JSON.stringify({version: 1, diagnostics: records}));
    assert.deepEqual(actual, expected);
  }
  for (const version of [true, false, 0, 2, '1', null]) {
    assert.deepEqual(parseCompilerOutputRecords(JSON.stringify({version, diagnostics: valid})), []);
  }
});
