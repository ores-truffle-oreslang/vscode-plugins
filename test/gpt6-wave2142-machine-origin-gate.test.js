'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const {parseCompilerOutputRecords} = require('../lib/compiler-output');
const {matchesCompilerDiagnosticPath} = require('../lib/diagnostic-path');

test('machine-origin records are validated before active-document ownership', () => {
  const cwd = path.resolve('project');
  const active = path.join(cwd,'src','μ.atto');
  const records = [
    {path:'src/μ.atto',severity:'WARNING',message:'current',range:{start:{line:2,column:3},end:{line:2,column:5}}},
    {path:'src/folder/../μ.atto',message:'normalized same file',line:3,column:2},
    {path:'src-other/μ.atto',message:'foreign same basename',line:4,column:2},
    {path:'../external/μ.atto',message:'outside workspace',line:5,column:1},
    {path:[],message:'invalid path shape',line:6,column:1},
    {path:'src/μ.atto',message:'invalid scalar range',range:[]},
    {path:'src/μ.atto',message:'inverted end range',range:{start:{line:8,column:4},end:{line:8,column:3}}},
    {path:null,message:'unlocated legacy',line:9,column:1},
  ];
  const parsed = parseCompilerOutputRecords(JSON.stringify({version:1,diagnostics:records}));
  assert.deepEqual(parsed.map(x=>x.message), [
    'current','normalized same file','foreign same basename','outside workspace','unlocated legacy',
  ]);
  const accepted = parsed.filter(x=>matchesCompilerDiagnosticPath(x.path,active,cwd));
  assert.deepEqual(accepted.map(x=>x.message),['current','normalized same file','unlocated legacy']);
  assert.equal(accepted[0].severity,'warning');
  assert.deepEqual([accepted[0].line,accepted[0].column,accepted[0].endColumn],[2,3,5]);
});

test('unlocated machine records cannot bypass poisoned active source/cwd', () => {
  const cwd=path.resolve('project'),active=path.join(cwd,'src','μ.atto');
  const parsed=parseCompilerOutputRecords(JSON.stringify({version:1,diagnostics:[{path:null,line:1,column:1,message:'unlocated'}]}));
  assert.equal(parsed.length,1);
  assert.equal(matchesCompilerDiagnosticPath(parsed[0].path,active,cwd),true);
  for(const [badActive,badCwd] of [
    [active+'\0',cwd],['relative/μ.atto',cwd],[active,cwd+'\0'],[active,'relative/workspace']
  ]) assert.equal(matchesCompilerDiagnosticPath(parsed[0].path,badActive,badCwd),false);
});
