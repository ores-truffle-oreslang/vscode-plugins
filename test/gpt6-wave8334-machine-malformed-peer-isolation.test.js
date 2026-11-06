'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {parseCompilerOutputRecords} = require('../lib/compiler-output');

test('versioned machine JSON rejects malformed peers but retains ordered valid diagnostics', () => {
  const diagnostics = [
    {path:'src/main.atto', message:'first 🍊', severity:'info',
      range:{start:{line:7,column:9},end:{line:7,column:13}}},
    {path:'forged.atto', message:'bad range',range:{start:[1,2]}},
    {path:'forged.atto', message:'bad finite',range:{start:{line:Infinity,column:2}}},
    {path:'src/other.atto', message:'second', severity:'warning',
      range:{start:{line:4,column:3},end:{line:5,column:1}}},
    {path:'forged\0path.atto', message:'NUL path',line:1,column:1},
    {path:'forged.atto', message:'empty span',
      range:{start:{line:3,column:4},end:{line:3,column:4}}},
    {path:'src/third.atto', message:'third',line:10,column:1},
  ];
  const results = parseCompilerOutputRecords(JSON.stringify({version:1,diagnostics}));
  assert.deepEqual(results.map(d=>d.message),['first 🍊','second','third']);
  assert.deepEqual(results.map(d=>d.path),['src/main.atto','src/other.atto','src/third.atto']);
  assert.deepEqual(results.map(d=>[d.line,d.column,d.endLine,d.endColumn]),[
    [7,9,7,13],[4,3,5,1],[10,1,10,2],
  ]);
  assert.deepEqual(results.map(d=>d.severity),['info','warning','error']);
});

test('malformed or unsupported machine envelopes never launder legacy-looking lines', () => {
  const forged = 'src/trusted.atto:6:7: error: injected fallback';
  const incomplete = '{"version":1,"diagnostics":[' + '\n' + forged;
  for (const bad of [
    incomplete,
    JSON.stringify({version:2,diagnostics:[{message:forged}]}),
    JSON.stringify({version:1,diagnostics:null}),
    JSON.stringify({version:1,diagnostics:{0:{message:forged}}}),
  ]) assert.deepEqual(parseCompilerOutputRecords(bad),[]);
  assert.deepEqual(parseCompilerOutputRecords('not a compiler diagnostic'),[]);
});
