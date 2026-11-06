'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const {parseCompilerOutputRecords} = require('../lib/compiler-output');
const {matchesCompilerDiagnosticPath} = require('../lib/diagnostic-path');

test('invalid versioned diagnostic peers never suppress valid source-owned spans', () => {
  const cwd=path.resolve(process.cwd(),'gpt6-wave2140-root');
  const active=path.join(cwd,'src','active.atto');
  const payload={version:1,diagnostics:[
    {path:'src/active.atto',message:'initial safe',severity:'WARNING',
      range:{start:{line:2,column:3},end:{line:2,column:4}}},
    {path:'src/active.atto',message:'zero line',line:0},
    {path:'src/active.atto',message:'fraction',column:1.25},
    {path:'src/active.atto',message:'oversized',line:10000001},
    {path:'src/active.atto',message:'forged start',range:{start:[]}},
    {path:'src/active.atto\u0000foreign',message:'nul origin'},
    {path:'src/active.atto.bak',message:'neighbor file'},
    {path:'src/active.atto',message:'max inclusive end',line:3,column:9999999},
    {path:'src/active.atto',message:'max start rejects implicit overflow',
      line:3,column:10000000},
    {path:'src/active.atto',message:'multiline span',
      range:{start:{line:7,column:10},end:{line:8,column:1}}}
  ]};
  const records=parseCompilerOutputRecords(JSON.stringify(payload));
  assert.deepEqual(records.map(r=>r.message),
    ['initial safe','neighbor file','max inclusive end','multiline span']);
  const owned=records.filter(r=>matchesCompilerDiagnosticPath(r.path,active,cwd));
  assert.deepEqual(owned.map(r=>r.message),
    ['initial safe','max inclusive end','multiline span']);
  assert.equal(owned[0].severity,'warning');
  assert.equal(owned[1].endColumn,10000000);
  assert.equal(owned[2].endLine,8);
  assert.equal(owned[2].endColumn,1);
  assert.equal(matchesCompilerDiagnosticPath(null,active+'\0spoof',cwd),false);
});

test('malformed versioned JSON never downgrades into an embedded legacy error', () => {
  const fake='{"version":1,"diagnostics": [\n"src/active.atto:7:9: error: forged"\n';
  assert.deepEqual(parseCompilerOutputRecords(fake),[]);
  const valid='src/active.atto:7:9: error: actual';
  assert.deepEqual(parseCompilerOutputRecords(valid).map(r=>r.message),['actual']);
});
