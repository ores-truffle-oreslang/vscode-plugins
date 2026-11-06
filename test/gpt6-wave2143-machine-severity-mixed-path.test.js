'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {parseCompilerOutputRecords}=require('../lib/compiler-output');

test('machine severity normalization keeps correct path and range for trusted peers',()=>{
  const items=[
    {path:'src/💠.atto',severity:'WARNING',message:'  Unicode warning  ',
      range:{start:{line:2,column:3},end:{line:3,column:2}}},
    {path:'',severity:'error',message:'empty origin'},
    {path:['src/💠.atto'],message:'array origin'},
    {path:'src/\u0000x.atto',message:'embedded NUL'},
    {path:null,severity:'mystery',message:'severity fallback',line:7,column:9},
    {path:'src/source.atto',severity:'HINT',message:'hint range',
      range:{start:{line:10000000,column:1},end:{line:10000000,column:2}}},
    {path:23,severity:'error',message:'numeric path'},
  ];
  assert.deepEqual(parseCompilerOutputRecords(JSON.stringify({version:1,diagnostics:items})),[
    {path:'src/💠.atto',severity:'warning',message:'Unicode warning',
      line:2,column:3,endLine:3,endColumn:2},
    {path:null,severity:'error',message:'severity fallback',
      line:7,column:9,endLine:7,endColumn:10},
    {path:'src/source.atto',severity:'hint',message:'hint range',
      line:10000000,column:1,endLine:10000000,endColumn:2},
  ]);
});

test('versioned JSON diagnostics do not degrade to forged legacy records',()=>{
  for(const json of [
    JSON.stringify({version:2,diagnostics:['src/x.atto:1:2: error: fabricated']}),
    JSON.stringify({version:1,diagnostics:{path:'src/x.atto:1:2: error: fabricated'}})
  ]) assert.deepEqual(parseCompilerOutputRecords(json),[]);
});
