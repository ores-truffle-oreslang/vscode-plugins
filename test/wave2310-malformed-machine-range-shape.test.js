'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {parseCompilerOutputRecords} = require('../lib/compiler-output');

test('explicit malformed machine range shapes never fabricate source coordinates', () => {
  const payload = {
    version: 1,
    diagnostics: [
      {message:'array-range', range: []},
      {message:'scalar-range', range: '2:3'},
      {message:'array-start', range: {start: []}},
      {message:'string-start', range: {start:'2:3'}},
      {message:'array-end', range: {start:{line:4,column:7},end:[]}},
      {message:'string-end', range: {start:{line:4,column:7},end:'4:8'}},
      {message:'valid-located', range:{start:{line:4,column:7},end:{line:4,column:9}}},
      {message:'valid-unlocated'},
    ],
  };
  const records = parseCompilerOutputRecords(JSON.stringify(payload));
  assert.deepEqual(records.map(record => record.message), ['valid-located', 'valid-unlocated']);
  assert.deepEqual(records.map(record => [record.line,record.column,record.endLine,record.endColumn]),
    [[4,7,4,9],[1,1,1,2]]);
});

test('invalid JSON range cannot poison later real positioned and path-owned records', () => {
  const payload={version:1,diagnostics:[
    {path:'foreign.atto',message:'forged',range:{start:[],end:{line:9,column:2}}},
    {path:'source.atto',message:'real',range:{start:{line:7,column:11}}},
  ]};
  assert.deepEqual(parseCompilerOutputRecords(JSON.stringify(payload)), [{
    path:'source.atto', line:7,column:11,endLine:7,endColumn:12,
    severity:'error',message:'real',
  }]);
});
