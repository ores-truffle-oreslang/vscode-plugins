'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {parseCompilerOutputRecords}=require('../lib/compiler-output');
const {matchesCompilerDiagnosticPath}=require('../lib/diagnostic-path');

test('a mixed machine response cannot attribute an imported .atto diagnostic to active source',()=>{
  const cwd=path.resolve(process.cwd(),'atto-wave2144-workspace');
  const active=path.join(cwd,'src','💠.atto');
  const output=JSON.stringify({version:1,diagnostics:[
    {path:'src/💠.atto',line:2,column:3,severity:'WARNING',message:'active source'},
    {path:'src/../src/💠.atto',line:3,column:1,message:'normalized active'},
    {path:'src/💠.ores',line:4,column:1,message:'legacy different source'},
    {path:'src/💠.atto.bak',line:5,column:1,message:'lookalike'},
    {path:null,line:6,column:1,message:'unlocated'},
    {path:'src/\u0000bad.atto',line:7,column:1,message:'forged'},
  ]});
  const records=parseCompilerOutputRecords(output);
  assert.equal(records.length,5);
  const kept=records.filter(x=>matchesCompilerDiagnosticPath(x.path,active,cwd));
  assert.deepEqual(kept.map(x=>x.message),['active source','normalized active','unlocated']);
  assert.equal(kept[0].severity,'warning');
});

test('a legacy .atto diagnostic remains correctly located without implicit path reassignment',()=>{
  const cwd=path.resolve(process.cwd(),'atto-wave2144-legacy');
  const active=path.join(cwd,'main.atto');
  const records=parseCompilerOutputRecords('main.atto:8:4: warning: caution\r\nsibling.atto:9:5: error: foreign');
  assert.equal(records.length,2);
  assert.deepEqual(records.filter(x=>matchesCompilerDiagnosticPath(x.path,active,cwd)).map(x=>x.message),['caution']);
  assert.equal(matchesCompilerDiagnosticPath(null,active,'relative-cwd'),false);
});
