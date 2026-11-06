'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {parseCompilerOutputRecords}=require('../lib/compiler-output');

test('versioned machine records preserve valid imported-file ranges across bad neighbors',()=>{
  const records=parseCompilerOutputRecords(JSON.stringify({version:1,diagnostics:[
    {message:'array forgery',path:'bad.atto',range:{start:[]}},
    {message:'overflow',path:'bad.atto',range:{start:{line:1,column:10000000}}},
    {message:'NUL origin',path:'bad\u0000path',range:{start:{line:1,column:3}}},
    {message:' imported warning ',path:'src/imported.atto',severity:'WARNING',
      range:{start:{line:9,column:4},end:{line:10,column:2}}},
    {message:'unlocated hint',path:null,severity:'hint',range:{start:{line:5,column:3}}},
    {message:'reverse',range:{start:{line:3,column:4},end:{line:3,column:3}}},
  ]}));
  assert.deepEqual(records,[
    {path:'src/imported.atto',line:9,column:4,endLine:10,endColumn:2,
     severity:'warning',message:'imported warning'},
    {path:null,line:5,column:3,endLine:5,endColumn:4,
     severity:'hint',message:'unlocated hint'},
  ]);
});

test('malformed versioned envelope never downgrades into legacy positioned text',()=>{
  assert.deepEqual(parseCompilerOutputRecords(
    JSON.stringify({version:2,diagnostics:[{message:'forged',path:'secret.atto'}]})),[]);
  assert.deepEqual(parseCompilerOutputRecords(
    JSON.stringify({version:1,diagnostics:{'0':'not-an-array'}})),[]);
  const old=[
    'src/other.atto:3:2: warning: imported change',
    'Oreslang parse error at 6:7: genuinely unlocated issue',
    'file.atto:99999999:1: error: too large',
  ].join('\r\n');
  assert.deepEqual(parseCompilerOutputRecords(old),[
    {path:'src/other.atto',line:3,column:2,endLine:3,endColumn:3,
     severity:'warning',message:'imported change'},
    {path:null,line:6,column:7,endLine:6,endColumn:8,
     severity:'error',message:'genuinely unlocated issue'},
  ]);
});
