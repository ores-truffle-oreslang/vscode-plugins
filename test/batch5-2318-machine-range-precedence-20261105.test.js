'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCompilerOutputRecords } = require('../lib/compiler-output');

// Host diagnostic transport policy only; no guest compiler parity claim.
test('machine range.start overrides legacy top-level coordinates without leaking between peers', () => {
  const records = [
    {path:'src/good.atto',line:99,column:99,
      range:{start:{line:3,column:7}},severity:'WARNING',message:'  first  '},
    {path:'src/reversed.atto',line:2,column:4,
      range:{end:{line:1,column:40}},message:'bad reversed end'},
    {path:null,line:3,column:2,
      range:{end:{line:4}},severity:'INFO',message:'  next line  '},
    {path:'src/bad\u0000file.atto',line:1,column:1,message:'bad path'},
    {path:'src/maximum.atto',line:10000000,column:9999999,
      severity:'HINT',message:'boundary'},
    {path:'src/overflow.atto',line:1,column:10000000,
      message:'implicit end exceeds the limit'},
    {path:'src/empty.atto',line:1,column:1,message:'  '},
  ];
  const envelope = JSON.stringify({version:1, diagnostics:records});
  const expected = [
    {path:'src/good.atto',line:3,column:7,endLine:3,endColumn:8,severity:'warning',message:'first'},
    {path:null,line:3,column:2,endLine:4,endColumn:1,severity:'info',message:'next line'},
    {path:'src/maximum.atto',line:10000000,column:9999999,
      endLine:10000000,endColumn:10000000,severity:'hint',message:'boundary'},
  ];
  for (let repeat=0; repeat<6; repeat++) {
    assert.deepEqual(parseCompilerOutputRecords(envelope),expected);
  }
});

test('well-formed but unsupported machine envelopes never turn into legacy diagnostics', () => {
  const unsupported = [
    {version:2, diagnostics:[{path:'x.atto',line:2,column:1,message:'unsupported'}]},
    {version:1, diagnostics:{path:'x.atto',line:2,column:1,message:'not an array'}},
    {version:1, diagnostics:[]},
  ];
  for (const message of unsupported) {
    assert.deepEqual(parseCompilerOutputRecords(JSON.stringify(message)),[]);
  }
});
