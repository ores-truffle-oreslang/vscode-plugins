'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {parseCompilerOutputRecords} = require('../lib/compiler-output');

test('omitted machine ranges default to a single column, explicit invalid ones are dropped', () => {
  const records = [
    {path:'first.atto',message:' missing all coordinates '},
    {path:'second.atto',message:' explicit null range ',range:null},
    {path:'third.atto',message:' explicit null start ',range:{start:null}},
    {path:'bad-array.atto',message:'bad array',range:[]},
    {path:'bad-end.atto',message:'bad end',range:{end:[1,2]}},
    {path:'bad-start.atto',message:'bad start',range:{start:'1:1'}},
    {path:'bad-zero.atto',message:'bad zero',line:0,column:1},
    {path:'bad-message.atto',message:' \t '},
    {path:'edge.atto',message:'edge',range:{start:{line:9999999,column:9999999}}},
    {path:'overrun.atto',message:'overrun',range:{start:{line:1,column:10000000}}},
  ];
  const input=JSON.stringify({version:1,diagnostics:records});
  const expected=[
    ['first.atto','missing all coordinates',1,1,1,2],
    ['second.atto','explicit null range',1,1,1,2],
    ['third.atto','explicit null start',1,1,1,2],
    ['edge.atto','edge',9999999,9999999,9999999,10000000],
  ];
  for(let i=0;i<8;i++) {
    const actual=parseCompilerOutputRecords(input);
    assert.deepEqual(actual.map(x=>[x.path,x.message,x.line,x.column,x.endLine,x.endColumn]),expected);
  }
});
