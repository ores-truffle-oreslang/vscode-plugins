'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCompilerOutputRecords } = require('../lib/compiler-output');

test('legacy diagnostic peers preserve independent origin and deny hostile records', () => {
  const output = [
    'src/peer.atto:2:3: warning: import warning',
    'src/bad.atto:0:3: error: zero row',
    'src/bad.atto:4:10000000: error: overflowing inherited end',
    'src/bad.atto:999999999:3: error: huge row',
    'src/alias.atto\u0000junk:4:3: error: forged owner',
    'src/main.atto:8:5: error[ATTO13]: exact error',
    'Oreslang parse error at 9:2: bad token',
  ].join('\r\n');
  assert.deepEqual(parseCompilerOutputRecords(output), [
    {path:'src/peer.atto',line:2,column:3,endLine:2,endColumn:4,severity:'warning',message:'import warning'},
    {path:'src/main.atto',line:8,column:5,endLine:8,endColumn:6,severity:'error',message:'exact error'},
    {path:null,line:9,column:2,endLine:9,endColumn:3,severity:'error',message:'bad token'},
  ]);
});
