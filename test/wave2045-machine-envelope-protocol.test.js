'use strict';
// Versioned diagnostic output never downgrades to forged legacy stderr.
const test=require('node:test');
const assert=require('node:assert/strict');
const {parseCompilerOutputRecords}=require('../lib/compiler-output');

test('wrong or malformed versioned machine envelope cannot forge legacy records', () => {
  for(const payload of [
    {version:2,diagnostics:[{message:'forged',path:'other.atto',line:1,column:1}]},
    {version:1,diagnostics:'src/foo.atto:8:3: error: forged'},
    {version:1,diagnostics:null},
    {version:1,diagnostics:[]},
    {version:1,diagnostics:[12,null,'string']},
  ]) {
    assert.deepEqual(parseCompilerOutputRecords(JSON.stringify(payload)),[]);
  }
  assert.deepEqual(
    parseCompilerOutputRecords('{"version":1,"diagnostics": [}\nsrc/foo.atto:8:3: error: forged'),
    [],
    'malformed machine JSON must never fall through to legacy path parsing'
  );
});

test('invalid peer records fail closed without poisoning a valid machine range', () => {
  const valid={path:'src/main.atto',message:'  precise issue  ',severity:'WARNING',
    range:{start:{line:4,column:3},end:{line:4,column:9}}};
  const invalid=[
    {message:'array range',range:[]},
    {message:'array start',range:{start:[]}},
    {message:'backwards',range:{start:{line:9,column:3},end:{line:8,column:1}}},
    {message:'zero column',column:0},
    {message:'explicit bad path',path:['src/main.atto']},
    {message:'invalid NUL',path:'src/\0main.atto'},
    {message:'   '},
  ];
  const input=JSON.stringify({version:1,diagnostics:[...invalid.slice(0,3),valid,...invalid.slice(3)]});
  assert.deepEqual(parseCompilerOutputRecords(input),[{
    path:'src/main.atto',message:'precise issue',severity:'warning',
    line:4,column:3,endLine:4,endColumn:9,
  }]);
});

test('inclusive terminal coordinate is accepted only with a valid end coordinate', () => {
  const atBoundary={version:1,diagnostics:[
    {message:'valid boundary',range:{
      start:{line:10000000,column:9999999},
      end:{line:10000000,column:10000000}
    }},
    {message:'invalid implicit overflow',line:5,column:10000000},
    {message:'invalid explicit overflow',line:1,column:2,
      range:{end:{line:1,column:10000001}}},
  ]};
  const records=parseCompilerOutputRecords(JSON.stringify(atBoundary));
  assert.equal(records.length,1);
  assert.equal(records[0].line,10000000);
  assert.equal(records[0].column,9999999);
  assert.equal(records[0].endColumn,10000000);
});
