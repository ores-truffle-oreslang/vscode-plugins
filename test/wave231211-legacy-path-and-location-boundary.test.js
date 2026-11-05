'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {parseCompilerOutputRecords} = require('../lib/compiler-output');

test('legacy compiler stderr retains drive paths and message colons without accepting invalid coordinates', () => {
  const output = [
    'C:\\work\\engine\\main.atto:9:3: warning[W42]: keep: first: second  ',
    'src/sub:dir/example.atto:14:8: info:  nested:path ',
    'src/bad.atto:0:4: error: zero line',
    'src/bad.atto:2:10000000: warning: end beyond limit',
    'src/bad.atto:10000001:1: error: excessive line',
    'Oreslang parse error at 4:7: source token: <&> ',
    'src/final.atto:10000000:9999999: hint: last valid coordinate',
  ].join('\r\n');
  const expected = [
    {path:'C:\\work\\engine\\main.atto',line:9,column:3,endLine:9,endColumn:4,severity:'warning',message:'keep: first: second'},
    {path:'src/sub:dir/example.atto',line:14,column:8,endLine:14,endColumn:9,severity:'info',message:'nested:path'},
    {path:null,line:4,column:7,endLine:4,endColumn:8,severity:'error',message:'source token: <&>'},
    {path:'src/final.atto',line:10000000,column:9999999,endLine:10000000,endColumn:10000000,severity:'hint',message:'last valid coordinate'},
  ];
  assert.deepEqual(parseCompilerOutputRecords(output), expected);
  assert.deepEqual(parseCompilerOutputRecords(output.replace(/\r\n/g, '\n')), expected);
});
