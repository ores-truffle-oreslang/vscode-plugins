'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCompilerOutputRecords } = require('../lib/compiler-output');

// Untrusted machine-reported ranges must fail per-record, not poison valid peers.
test('machine diagnostics isolate invalid range endpoints and normalize severity', () => {
  const diagnostics = [
    {path:'a.atto',severity:'CRITICAL',message:'  first  ',
      range:{start:{line:4,column:7},end:{line:5,column:1}}},
    {path:'x.atto',message:'same point',range:{start:{line:2,column:2},end:{line:2,column:2}}},
    {path:'x.atto',message:'reversed line',range:{start:{line:8,column:2},end:{line:7,column:3}}},
    {path:'x.atto',message:'beyond max',range:{start:{line:1,column:1},end:{line:1,column:10000001}}},
    {path:'x.atto',message:'infinite',range:{start:{line:1,column:'Infinity'}}},
    {path:'x.atto',message:'invalid array',range:[]},
    {path:'x.atto',message:'missing end from max column',line:1,column:10000000},
    {path:'b.atto',severity:'HINT',message:'  second  ',
      range:{start:{line:6,column:3}}},
    {path:'c.atto',severity:'info',message:'third',
      range:{start:{line:9,column:6},end:{line:10}}},
  ];
  const json = JSON.stringify({version:1,diagnostics});
  const expected = [
    ['a.atto','first','error',4,7,5,1],
    ['b.atto','second','hint',6,3,6,4],
    ['c.atto','third','info',9,6,10,1],
  ];
  for(let i=0;i<9;i++) {
    const actual=parseCompilerOutputRecords(json);
    assert.deepEqual(actual.map(x=>[x.path,x.message,x.severity,x.line,x.column,x.endLine,x.endColumn]),expected);
  }
});
