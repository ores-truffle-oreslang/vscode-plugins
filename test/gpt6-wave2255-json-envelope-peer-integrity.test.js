'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {parseCompilerOutputRecords} = require('../lib/compiler-output');

test('versioned machine envelopes reject incompatible or scalar diagnostics without stderr downgrade', () => {
  for(const envelope of [
    {version:2,diagnostics:[{path:'forged.atto',message:'fake',line:1,column:1}]},
    {version:1,diagnostics:{path:'forged.atto',message:'fake'}},
    {version:1,diagnostics:'forged.atto:1:1: error: fake'},
    {version:1,diagnostics:null},
    {version:'1',diagnostics:[]},
    ['forged.atto:1:1: error: fake'],
  ]) assert.deepEqual(parseCompilerOutputRecords(JSON.stringify(envelope)),[]);
  const partial = '{"version":1,"diagnostics":[\nforeign.atto:9:8: error: forged';
  assert.deepEqual(parseCompilerOutputRecords(partial),[]);
});

test('valid v1 records survive malformed neighboring peers in exact source order',()=>{
  const diagnostics=[
    {path:'first.atto',message:' first ',severity:'warning',
      range:{start:{line:3,column:2},end:{line:4,column:1}}},
    {path:'bad.atto',message:'invalid range',range:{start:[1,2]}},
    {path:'bad.atto',message:'invalid origin',line:1,column:1},
    {path:'third.atto',message:' third ',severity:'HINT',
      range:{start:{line:5,column:6}}},
  ];
  diagnostics[2].path = 'bad' + '\0' + '.atto';
  const input=JSON.stringify({version:1,diagnostics});
  const expected=[
    ['first.atto','first','warning',3,2,4,1],
    ['third.atto','third','hint',5,6,5,7],
  ];
  for(let i=0;i<9;i++)
    assert.deepEqual(parseCompilerOutputRecords(input).map(x=>
      [x.path,x.message,x.severity,x.line,x.column,x.endLine,x.endColumn]),expected);
});
