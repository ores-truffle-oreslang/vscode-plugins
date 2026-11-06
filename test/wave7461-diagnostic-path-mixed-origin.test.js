'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {parseCompilerOutputRecords}=require('../lib/compiler-output');
const {matchesCompilerDiagnosticPath}=require('../lib/diagnostic-path');

// Combined machine-output parser + active-file ownership gate.
test('Unicode and traversal neighbors never acquire active-file diagnostics',()=>{
  const cwd=path.resolve(process.cwd(),'wave7461-workspace');
  const active=path.join(cwd,'src','main.atto');
  const diagnostics=[
    {path:'src/main.atto',line:2,column:2,message:'canonical'},
    {path:'src/../src/main.atto',line:3,column:3,message:'normalized owner'},
    {path:path.join(cwd,'src','main.atto'),line:4,column:4,message:'absolute owner'},
    {path:'src/main.atto.bak',line:5,column:5,message:'extension suffix'},
    {path:'src/💠main.atto',line:6,column:6,message:'unicode neighbor'},
    {path:'src/../../other/main.atto',line:7,column:7,message:'escaped workspace'},
    {path:'src/main.atto\u0000shadow',line:8,column:8,message:'NUL forged path'},
    {path:null,line:9,column:9,message:'unlocated legacy'},
    {path:[],line:10,column:10,message:'array forged origin'}
  ];
  const parsed=parseCompilerOutputRecords(JSON.stringify({version:1,diagnostics}));
  assert.equal(parsed.length,7); // malformed NUL and array origins rejected
  const owned=parsed.filter(x=>matchesCompilerDiagnosticPath(x.path,active,cwd));
  assert.deepEqual(owned.map(x=>x.message),
    ['canonical','normalized owner','absolute owner','unlocated legacy']);
  assert.equal(matchesCompilerDiagnosticPath(null,'src/main.atto',cwd),false);
  assert.equal(matchesCompilerDiagnosticPath(null,active,'relative-cwd'),false);
  assert.equal(matchesCompilerDiagnosticPath('src/main.atto.bak',active,cwd),false);
  assert.equal(matchesCompilerDiagnosticPath('src/main.atto\u0000tail',active,cwd),false);
});
