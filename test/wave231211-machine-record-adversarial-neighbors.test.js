'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {parseCompilerOutputRecords} = require('../lib/compiler-output');

// Host diagnostic parsing only. A failed peer cannot contaminate valid records.
test('v1 machine records isolate malformed ranges, paths and coordinates', () => {
  const payload = {version: 1, diagnostics: [
    {path: 'src/a.atto', range: {start: {line: 1, column: 1}, end: {line: 1, column: 2}}, severity: 'WARNING', message: '  first  '},
    {path: 'bad\0path.atto', line: 3, column: 1, message: 'embedded NUL path'},
    {path: 14, line: 3, column: 1, message: 'numeric path'},
    {path: 'src/reversed.atto', range: {start: {line: 4, column: 9}, end: {line: 4, column: 9}}, message: 'empty range'},
    {path: 'src/bool.atto', line: true, column: 1, message: 'boolean line'},
    {path: 'src/overflow.atto', line: 2, column: 10000000, message: 'implicit end must overflow'},
    {path: null, range: {start: {line: 2, column: 4}, end: {line: 3, column: 1}}, severity: 'HINT', message: '  second  '},
    {path: 'src/max.atto', line: 10000000, column: 9999999, severity: 'info', message: 'last valid'},
  ]};
  const expected = [
    {path:'src/a.atto', line:1, column:1, endLine:1, endColumn:2, severity:'warning', message:'first'},
    {path:null, line:2, column:4, endLine:3, endColumn:1, severity:'hint', message:'second'},
    {path:'src/max.atto', line:10000000, column:9999999, endLine:10000000, endColumn:10000000, severity:'info', message:'last valid'},
  ];
  for (let n = 0; n < 4; n++) {
    assert.deepEqual(parseCompilerOutputRecords(JSON.stringify(payload)), expected);
  }
  assert.equal(payload.diagnostics[0].message, '  first  ');
});
