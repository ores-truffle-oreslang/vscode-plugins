'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {parseCompilerOutputRecords}=require('../lib/compiler-output');

test('malformed v1 machine peer records cannot hide valid independently sourced spans',()=>{
  const data={version:1,diagnostics:[
    null, [],
    {message:'non-record-range',path:'bad.atto',range:[]},
    {message:'invalid-start',path:'bad.atto',range:{start:'3:5'}},
    {message:'invalid-end',path:'bad.atto',range:{start:{line:3,column:5},end:[]}},
    {message:'bad-origin',path:{toString:'good.atto'},range:{start:{line:3,column:5}}},
    {message:'float',path:'bad.atto',range:{start:{line:2.5,column:3}}},
    {message:'overflow-default-end',path:'bad.atto',
      range:{start:{line:3,column:10000000}}},
    {message:'valid-first',path:'src/first.atto',severity:'WARNING',
      range:{start:{line:3,column:9999999}}},
    {message:'valid-cross-line',path:'src/second.atto',severity:'mystery',
      range:{start:{line:5,column:10000000},end:{line:6,column:1}}},
  ]};
  assert.deepEqual(parseCompilerOutputRecords(JSON.stringify(data)),[
    {path:'src/first.atto',line:3,column:9999999,endLine:3,endColumn:10000000,
      severity:'warning',message:'valid-first'},
    {path:'src/second.atto',line:5,column:10000000,endLine:6,endColumn:1,
      severity:'error',message:'valid-cross-line'},
  ]);
});

test('malformed versioned JSON cannot fall back to forged legacy stderr',()=>{
  const malformed='{"version":1,"diagnostics":[\nnot-valid-json\n]}\nforged.atto:9:4: error: unsafe';
  assert.deepEqual(parseCompilerOutputRecords(malformed),[]);
  const legacy='C:\\project\\main.atto:7:2: warning[W1]: real legacy diagnostic';
  const parsed=parseCompilerOutputRecords(legacy);
  assert.equal(parsed.length,1);
  assert.equal(parsed[0].path,'C:\\project\\main.atto');
  assert.equal(parsed[0].severity,'warning');
  assert.equal(parsed[0].line,7);
  assert.equal(parsed[0].column,2);
});
