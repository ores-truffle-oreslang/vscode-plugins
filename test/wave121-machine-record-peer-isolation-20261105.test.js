'use strict';
// Host-side isolation across valid and invalid untrusted JSON diagnostics.
const test = require('node:test');
const assert = require('node:assert/strict');
const {parseCompilerOutputRecords} = require('../lib/compiler-output');

test('invalid range, path and message entries do not suppress valid siblings', () => {
  const records = [
    {path:'src/a.ores', range:{start:{line:4,column:7},end:{line:5,column:2}}, severity:'WARNING', message:'  first  '},
    {path:'src/zero.ores', range:{start:{line:0,column:1}}, message:'invalid'},
    {path:'src/nul\u0000.ores', line:2, column:1, message:'forged'},
    {path:'src/blank.ores', line:2, column:1, message:'    '},
    {path:'src/reverse.ores', range:{start:{line:9,column:4},end:{line:9,column:4}}, message:'reversed'},
    {path:null, line:8, column:1, severity:'INFO', message:'unlocated'},
  ];
  assert.deepEqual(parseCompilerOutputRecords(JSON.stringify({version:1, diagnostics:records})), [
    {path:'src/a.ores',line:4,column:7,endLine:5,endColumn:2,severity:'warning',message:'first'},
    {path:null,line:8,column:1,endLine:8,endColumn:2,severity:'info',message:'unlocated'},
  ]);
});

test('invalid JSON schema remains machine-only and cannot be reinterpreted as source errors', () => {
  for (const payload of [
    {version:2,diagnostics:[{path:'src/x.ores',line:1,column:1,message:'x'}]},
    {version:1,diagnostics:{'src/y.ores:1:1: error: forged':true}},
  ]) {
    assert.deepEqual(parseCompilerOutputRecords(JSON.stringify(payload)), []);
  }
});
