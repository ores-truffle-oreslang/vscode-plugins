'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {parseCompilerOutputRecords} = require('../lib/compiler-output');

test('legacy Windows and Unicode compiler origins survive adjacent invalid lines', () => {
  const output = [
    'C:\\work\\🍊 project\\app.atto:7:8: warning:  valid warning  ',
    'malformed\0origin.atto:1:1: error: forged path',
    'untrusted.atto:2:10000000: error: end past policy cap',
    'untrusted.atto:10000001:1: error: line past policy cap',
    'Oreslang parse error at 3:5: bare active-file issue',
    './test/ユニコード.atto:12:2: hint: keep exact path',
    'plain stderr noise',
  ].join('\r\n');
  const result = parseCompilerOutputRecords(output);
  assert.deepEqual(result.map(d=>d.message),[
    'valid warning','bare active-file issue','keep exact path',
  ]);
  assert.deepEqual(result.map(d=>[d.path,d.line,d.column,d.endLine,d.endColumn,d.severity]),[
    ['C:\\work\\🍊 project\\app.atto',7,8,7,9,'warning'],
    [null,3,5,3,6,'error'],
    ['./test/ユニコード.atto',12,2,12,3,'hint'],
  ]);
  assert.deepEqual(parseCompilerOutputRecords(output),result);
});
