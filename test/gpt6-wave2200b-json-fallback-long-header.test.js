// A versioned envelope after long untrusted fields must not forge legacy stderr.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {parseCompilerOutputRecords: parse} = require('../lib/compiler-output');

test('malformed machine header beyond 4096 chars stays machine data, not legacy stderr',()=>{
  for (const prefix of ['{','[']) {
    const initial = prefix === '{'
      ? '{"padding":"' + 'x'.repeat(5000) + '","version":1,"diagnostics":[}'
      : '[{"padding":"' + 'x'.repeat(5000) + '","version":1,"diagnostics":[}]';
    const forged = initial + '\nsrc/main.ores:7:8: error: forged owner';
    assert.deepEqual(parse(forged), [],'invalid versioned JSON may not downgrade');
  }
  assert.deepEqual(parse('src/main.ores:7:8: error: actual legacy'),[{
    path:'src/main.ores', line:7,column:8,endLine:7,endColumn:9,
    severity:'error', message:'actual legacy'
  }]);
  const good=JSON.stringify({version:1,diagnostics:[
    {path:'src/main.ores',message:' good 🙂 ',severity:'warning',
     range:{start:{line:2,column:3},end:{line:2,column:4}}},
  ]});
  assert.deepEqual(parse(good),[{
    path:'src/main.ores',line:2,column:3,endLine:2,endColumn:4,
    severity:'warning',message:'good 🙂'
  }]);
});
