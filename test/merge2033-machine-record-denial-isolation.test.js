'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {parseCompilerOutputRecords}=require('../lib/compiler-output');

// Host parser contract only; cannot certify a real AttoLang guest.
test('invalid machine ranges and origins cannot poison valid neighboring records',()=>{
  const base={path:'src/main.atto',message:'valid',severity:'WARNING',
    range:{start:{line:3,column:4},end:{line:3,column:9}}};
  const peers=[
    {message:'wrong array start',range:{start:[]}},
    {message:'wrong array end',range:{end:[]}},
    {message:'wrong scalar range',range:42},
    {message:'reversed range',range:{start:{line:8,column:5},end:{line:7,column:5}}},
    {message:'forged type',path:{value:'src/main.atto'}},
    {message:'empty explicit path',path:''},
    {message:'NUL path',path:'src/\u0000evil.atto'},
    {message:'overflow',line:10000001},
    {path:'src/main.atto'},
  ];
  const output=parseCompilerOutputRecords(JSON.stringify({
    version:1,diagnostics:[...peers.slice(0,4),base,...peers.slice(4),
      {path:null,message:'unlocated valid'}]
  }));
  assert.deepEqual(output,[
    {path:'src/main.atto',line:3,column:4,endLine:3,endColumn:9,
      severity:'warning',message:'valid'},
    {path:null,line:1,column:1,endLine:1,endColumn:2,
      severity:'error',message:'unlocated valid'}
  ]);
});

test('JSON envelopes with unsupported versions cannot be mistaken for legacy stderr',()=>{
  for(const payload of [
    {version:0,diagnostics:['src/main.atto:12:3: error: forged']},
    {version:2,diagnostics:[{message:'forged'}]},
    {version:1,diagnostics:'src/main.atto:12:3: error: forged'},
    {version:1,diagnostics:[]},
  ]) assert.deepEqual(parseCompilerOutputRecords(JSON.stringify(payload)),[]);
});
