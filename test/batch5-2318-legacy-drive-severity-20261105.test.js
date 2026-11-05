'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCompilerOutputRecords } = require('../lib/compiler-output');

// Legacy stderr is independent of the machine JSON wire format.
test('CRLF legacy output preserves paths with colons and ordered severity records', () => {
  const output = [
    'C:\\project\\src\\hello.atto:5:6: warning[W012]: message: with: colons',
    '../src/multi💠.atto:7:8: hint: Unicode origin',
    'src/malformed.atto:0:1: error: invalid zero line',
    'src/overflow.atto:12:10000000: error: cannot represent end column',
    'Oreslang type error at 2:3: a standalone compiler issue',
    'src/valid.atto:9999999:9999999: info: last accepted coordinate',
    'unrelated compiler status line',
  ].join('\r\n');
  const expected = [
    {path:'C:\\project\\src\\hello.atto',line:5,column:6,endLine:5,endColumn:7,
      severity:'warning',message:'message: with: colons'},
    {path:'../src/multi💠.atto',line:7,column:8,endLine:7,endColumn:9,
      severity:'hint',message:'Unicode origin'},
    {path:null,line:2,column:3,endLine:2,endColumn:4,
      severity:'error',message:'a standalone compiler issue'},
    {path:'src/valid.atto',line:9999999,column:9999999,endLine:9999999,endColumn:10000000,
      severity:'info',message:'last accepted coordinate'},
  ];
  for(let iteration=0; iteration<5; iteration++) {
    assert.deepEqual(parseCompilerOutputRecords(output),expected);
  }
});

test('a machine JSON document is not reinterpreted as legacy path diagnostics', () => {
  const report={version:1,diagnostics:[{path:'C:\\project\\a.atto',line:4,column:2,
    severity:'INFO',message:'actual structured message'}]};
  assert.deepEqual(parseCompilerOutputRecords(JSON.stringify(report)),[
    {path:'C:\\project\\a.atto',line:4,column:2,endLine:4,endColumn:3,
      severity:'info',message:'actual structured message'},
  ]);
});
