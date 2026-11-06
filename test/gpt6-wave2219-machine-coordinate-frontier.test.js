'use strict';
// Exact host parser ranges; source-only, not compiler guest parity.
const test=require('node:test');
const assert=require('node:assert/strict');
const {parseCompilerOutputRecords}=require('../lib/compiler-output');

test('versioned machine envelope isolates invalid coordinate peers at the hard cap',()=>{
  const data=[
    {message:'last valid same-line span',path:'src/a.atto',
      range:{start:{line:10000000,column:9999999},end:{line:10000000,column:10000000}}},
    {message:'last valid cross-line span',path:'src/b.atto',severity:'INFO',
      range:{start:{line:9999999,column:10000000},end:{line:10000000,column:1}}},
    {message:'invalid omitted end overflow',range:{start:{line:1,column:10000000}}},
    {message:'invalid explicit endpoint',range:{start:{line:1,column:1},end:{line:1,column:10000001}}},
    {message:'invalid reversed cross-line',range:{start:{line:10000000,column:4},end:{line:9999999,column:8}}},
    {message:'invalid float',range:{start:{line:1,column:2.5}}},
    {message:'defaulted safe',severity:'WARNING',path:null}
  ];
  const actual=parseCompilerOutputRecords(JSON.stringify({version:1, diagnostics:data}));
  assert.deepEqual(actual.map(x=>x.message),[
    'last valid same-line span','last valid cross-line span','defaulted safe'
  ]);
  assert.deepEqual(actual.map(x=>[x.line,x.column,x.endLine,x.endColumn]),[
    [10000000,9999999,10000000,10000000],
    [9999999,10000000,10000000,1],
    [1,1,1,2]
  ]);
  assert.deepEqual(actual.map(x=>x.severity),['error','info','warning']);
  assert.deepEqual(parseCompilerOutputRecords(JSON.stringify({version:2, diagnostics:data})),[],
    'unsupported protocol version must not fall back to hostile legacy stdout');
  assert.deepEqual(parseCompilerOutputRecords('{"version":1,"diagnostics":['),[],
    'incomplete machine JSON must not be parsed as forged legacy diagnostics');
});
