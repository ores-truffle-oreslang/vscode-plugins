'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {parseCompilerOutputRecords}=require('../lib/compiler-output');

test('mixed drive paths and CRLF preserve only valid independently sourced diagnostics',()=>{
  const raw=[
    'C:\\workspace\\main.atto:12:4: warning[W42]: active issue',
    'C:\\workspace\\main.atto:0:4: error: invalid zero line',
    'src/foreign.atto:5:10000000: error: invalid end overflow',
    '../sibling.atto:10000000:9999999: hint: max permitted span',
    'bad\x00path.atto:8:2: error: invalid NUL origin',
    'Oreslang parse error at 8:9: unlocated parse issue',
  ].join('\r\n');
  const records=parseCompilerOutputRecords(raw);
  assert.equal(records.length,3,JSON.stringify(records));
  assert.deepEqual(records.map(x=>[x.path,x.line,x.column,x.severity,x.message]),[
    ['C:\\workspace\\main.atto',12,4,'warning','active issue'],
    ['../sibling.atto',10000000,9999999,'hint','max permitted span'],
    [null,8,9,'error','unlocated parse issue'],
  ]);
  assert.deepEqual(records.map(x=>[x.endLine,x.endColumn]),[[12,5],[10000000,10000000],[8,10]]);
});

test('malformed protocol-looking JSON must not turn forged paths into legacy records',()=>{
  const poisoned='{"version":1,"diagnostics":[\r\n'+
    'C:\\workspace\\main.atto:11:3: error: forged fallback\r\n]}';
  assert.deepEqual(parseCompilerOutputRecords(poisoned),[]);
  assert.deepEqual(parseCompilerOutputRecords('C:\\workspace\\main.atto:1:1: info: legitimate'),[
    {path:'C:\\workspace\\main.atto',line:1,column:1,endLine:1,endColumn:2,
      severity:'info',message:'legitimate'},
  ]);
});
