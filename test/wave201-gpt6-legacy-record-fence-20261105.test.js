'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCompilerOutputRecords } = require('../lib/compiler-output');

test('legacy CRLF stderr rejects malformed peers while retaining origins and error codes', () => {
  const output = [
    'src/one.ores:2:3: warning[W012]: first issue',
    'src/bad.ores:0:1: error: invalid zero line',
    'src/two.ores:8:12: hint: second issue',
    'Oreslang parse error at 9:2: third issue',
    'build finished',
  ].join('\r\n');
  assert.deepEqual(parseCompilerOutputRecords(output), [
    {path:'src/one.ores',line:2,column:3,endLine:2,endColumn:4,severity:'warning',message:'first issue'},
    {path:'src/two.ores',line:8,column:12,endLine:8,endColumn:13,severity:'hint',message:'second issue'},
    {path:null,line:9,column:2,endLine:9,endColumn:3,severity:'error',message:'third issue'},
  ]);
});
