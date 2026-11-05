'use strict';
// Machine diagnostic JSON: one unsafe coordinate cannot erase valid peers.
const test=require('node:test');
const assert=require('node:assert/strict');
const {parseCompilerOutputRecords}=require('../lib/compiler-output');

test('maximal admitted same-line range is distinct from overflowed fallback',()=>{
  const diagnostics=[
    {path:'src/boundary.atto',line:10000000,column:9999999,severity:'WARNING',
      message:'  boundary accepted  '},
    {path:'src/overflow.atto',line:10000000,column:10000000,
      message:'must refuse implicit end > bound'},
    {path:'src/explicit.atto',range:{start:{line:9,column:3},
      end:{line:9,column:10000001}},message:'must refuse explicit end'},
    {path:null,range:{start:{line:10,column:2},
      end:{line:11,column:1}},severity:'INFO',message:' unlocated allowed '},
  ];
  assert.deepEqual(parseCompilerOutputRecords(JSON.stringify({
    version:1,diagnostics
  })),[
    {path:'src/boundary.atto',line:10000000,column:9999999,
      endLine:10000000,endColumn:10000000,severity:'warning',
      message:'boundary accepted'},
    {path:null,line:10,column:2,endLine:11,endColumn:1,
      severity:'info',message:'unlocated allowed'},
  ]);
});

test('unsupported envelope does not promote JSON fragments to legacy errors',()=>{
  assert.deepEqual(parseCompilerOutputRecords(JSON.stringify({
    version:2,diagnostics:[
      {path:'src/forged.atto',line:1,column:1,message:'pretend'}
    ]
  })),[]);
});
