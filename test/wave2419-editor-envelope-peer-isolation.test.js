'use strict';
// Source-owned untrusted diagnostic protocol isolation; not compiler execution.
const test = require('node:test');
const assert = require('node:assert/strict');
const {parseCompilerOutputRecords} = require('../lib/compiler-output');

test('invalid machine peers cannot poison valid cross-line path-qualified diagnostics', () => {
  const valid = {
    path: 'C:\\repo\\unicode-atto\\main.atto', severity: 'HINT',
    message: '  nested source issue  ',
    range: {start:{line:5,column:9}, end:{line:6,column:1}}
  };
  const invalid = [
    {message:'forged scalar range',range:'5:9'},
    {message:'forged array start',range:{start:[]}},
    {message:'inverted',range:{start:{line:8,column:9},end:{line:7,column:1}}},
    {message:'not an integer',line:'5',column:9},
    {message:'bad path',path:'source\0file.atto'},
    {message:'invalid final coordinate',line:8,column:10000000},
  ];
  const output = JSON.stringify({version:1,diagnostics:[
    ...invalid.slice(0,3), valid, ...invalid.slice(3)
  ]});
  assert.deepEqual(parseCompilerOutputRecords(output), [{
    path:'C:\\repo\\unicode-atto\\main.atto', severity:'hint',
    message:'nested source issue',line:5,column:9,endLine:6,endColumn:1,
  }]);
});

test('malformed JSON declaring diagnostic protocol cannot downgrade to legacy', () => {
  for (const source of [
    '{"version":1,"diagnostics":[}\r\nother.atto:2:3: error: forged',
    '{"diagnostics":{},"version":1}\r\nother.atto:2:3: warning: forged',
    '{"version":2,"diagnostics":[{"message":"forged","line":1}]}\r\n',
  ]) {
    assert.deepEqual(parseCompilerOutputRecords(source), []);
  }
});

test('legacy records survive malformed coordinates and preserve drive origins', () => {
  const input = [
    'C:\\repo\\main.atto:7:3: warning: valid warning',
    'C:\\repo\\main.atto:0:4: error: invalid zero row',
    'C:\\repo\\main.atto:8:10000000: error: invalid end overflow',
    'D:\\other\\lib.atto:9:2: hint: valid other file',
  ].join('\r\n');
  assert.deepEqual(parseCompilerOutputRecords(input), [
    {path:'C:\\repo\\main.atto',line:7,column:3,endLine:7,endColumn:4,severity:'warning',message:'valid warning'},
    {path:'D:\\other\\lib.atto',line:9,column:2,endLine:9,endColumn:3,severity:'hint',message:'valid other file'},
  ]);
});
