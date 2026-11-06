'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {parseCompilerOutputRecords} = require('../lib/compiler-output');

test('mixed CRLF legacy compiler diagnostics retain full origins, severities and Unicode messages',()=>{
  const output = [
    'C:\\work dir\\src\\main.atto:7:13: warning[WX12]:  🚀 noncanonical identifier  ',
    '/srv/src/test.atto:9999999:9999999: hint: boundary ✓',
    'Oreslang parse error at 2:4: expected expression 漢',
    '/srv/src/foreign.atto:99999999:2: error: cap exceeded',
    'Oreslang parse error at 0:2: spoof zero',
    '/srv/src/foreign.atto:1:10000000: error: end overflow',
    '/srv/src/foreign.atto:1:2: error: valid neighbor'
  ].join('\r\n');
  const records = parseCompilerOutputRecords(output);
  assert.deepEqual(records.map(x=>x.message),[
    '🚀 noncanonical identifier', 'boundary ✓', 'expected expression 漢',
    'valid neighbor'
  ]);
  assert.deepEqual(records.map(x=>x.path),[
    'C:\\work dir\\src\\main.atto','/srv/src/test.atto',null,
    '/srv/src/foreign.atto'
  ]);
  assert.deepEqual(records.map(x=>[x.line,x.column,x.endLine,x.endColumn]),[
    [7,13,7,14],[9999999,9999999,9999999,10000000],[2,4,2,5],[1,2,1,3]
  ]);
  assert.deepEqual(records.map(x=>x.severity),['warning','hint','error','error']);
});
