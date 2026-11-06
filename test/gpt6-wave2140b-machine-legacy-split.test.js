// A malformed machine envelope must never reenter the legacy stderr parser.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {parseCompilerOutputRecords} = require('../lib/compiler-output.js');

test('malformed versioned JSON cannot forge legacy records; valid peers survive', () => {
  const broken = '{"version":1,"diagnostics":[{"message":"noise"}]}\nsrc/main.ores:7:8: error: forged';
  assert.deepEqual(parseCompilerOutputRecords(broken), []);
  assert.deepEqual(parseCompilerOutputRecords('{"version":2,"diagnostics":[{"message":"forged"}]}'), []);
  const machine = JSON.stringify({version:1,diagnostics:[
    {message:'  valid 🙂  ',path:'src/main.ores',severity:'WARNING',
     range:{start:{line:5,column:2},end:{line:5,column:3}}},
    {message:'reject zero line',range:{start:{line:0,column:2}}},
    {message:'reject NUL origin',path:'src/main.ores\u0000wrong'},
    {message:'reject inverted end',range:{start:{line:3,column:5},end:{line:3,column:4}}},
  ]});
  assert.deepEqual(parseCompilerOutputRecords(machine), [
    {path:'src/main.ores',line:5,column:2,endLine:5,endColumn:3,severity:'warning',message:'valid 🙂'},
  ]);
  const legacy = 'src/main.ores:2:3: error: keep me\nsrc/main.ores:0:1: error: reject\nsrc/main.ores:4:5: warning: keep 🙂';
  const records = parseCompilerOutputRecords(legacy);
  assert.deepEqual(records.map(r => [r.line,r.column,r.severity,r.message]), [
    [2,3,'error','keep me'],[4,5,'warning','keep 🙂'],
  ]);
});
