'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {parseCompilerOutputRecords}=require('../lib/compiler-output');

test('machine v1 boundary matrix isolates malformed endpoints from valid peer locations',()=>{
  const max=10_000_000;
  const payload={version:1, diagnostics:[
    {path:'other.atto',message:'beyond-end',range:{start:{line:1,column:max}}},
    {path:'other.atto',message:'unsafe-int',range:{start:{line:Number.MAX_SAFE_INTEGER+1,column:1}}},
    {path:'other.atto',message:'boolean',range:{start:{line:true,column:1}}},
    {path:'other.atto',message:'reversed-lines',range:{start:{line:9,column:2},end:{line:8,column:3}}},
    {path:'good.atto',message:'跨行',severity:'WARNING',
      range:{start:{line:1,column:max},end:{line:2,column:1}}},
    {path:'good.atto',message:'last-safe',range:{start:{line:10,column:max-1}}},
  ]};
  const records=parseCompilerOutputRecords(JSON.stringify(payload));
  assert.deepEqual(records.map(r=>r.message),['跨行','last-safe']);
  assert.deepEqual(records.map(r=>r.path),['good.atto','good.atto']);
  assert.deepEqual(records.map(r=>[r.line,r.column,r.endLine,r.endColumn]),
    [[1,max,2,1],[10,max-1,10,max]]);
  assert.deepEqual(records.map(r=>r.severity),['warning','error']);
});

test('machine protocol shape failure does not interpret console output as a forged path',()=>{
  const payload=JSON.stringify({version:1,diagnostics:[
    {path:'valid.atto',message:'control',range:{start:{line:3,column:5}}},
  ]});
  const parsed=parseCompilerOutputRecords(payload);
  assert.equal(parsed.length,1);
  assert.equal(parsed[0].path,'valid.atto');
  assert.deepEqual(parseCompilerOutputRecords(JSON.stringify({version:2,diagnostics:[
    {path:'untrusted.atto',message:'forged'},
  ]})),[]);
});
