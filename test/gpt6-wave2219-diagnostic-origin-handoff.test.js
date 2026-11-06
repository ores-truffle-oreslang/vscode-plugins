'use strict';
// Real parser-to-file-admission host path; not guest language execution.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const {parseCompilerOutputRecords} = require('../lib/compiler-output');
const {matchesCompilerDiagnosticPath} = require('../lib/diagnostic-path');

test('mixed imported, spoofed, relative and unlocated diagnostic origins retain only active-file issues', () => {
  const cwd=path.resolve(process.cwd(),'fixture workspace');
  const active=path.join(cwd,'src','current.atto');
  const cases=[
    {path:'src/current.atto',message:'current relative',severity:'warning'},
    {path:path.join(cwd,'src','current.atto'),message:'current absolute',severity:'error'},
    {path:'src/../src/current.atto',message:'canonical current',severity:'info'},
    {path:'src/current.atto.bak',message:'prefix spoof'},
    {path:'src/other.atto',message:'imported issue'},
    {path:'../outside/current.atto',message:'foreign ancestor'},
    {path:'src/current.atto\0spoof',message:'poisoned origin'},
    {path:null,message:'unlocated legacy context'}
  ];
  const output=JSON.stringify({version:1,diagnostics:cases.map(
    (item)=>({...item,range:{start:{line:3,column:7},end:{line:3,column:8}}})
  )});
  const parsed=parseCompilerOutputRecords(output);
  assert.deepEqual(parsed.map(item=>item.message),[
    'current relative','current absolute','canonical current',
    'prefix spoof','imported issue','foreign ancestor','unlocated legacy context'
  ]);
  const activeOnly=parsed.filter(item=>
    matchesCompilerDiagnosticPath(item.path,active,cwd));
  assert.deepEqual(activeOnly.map(item=>item.message),[
    'current relative','current absolute','canonical current','unlocated legacy context'
  ]);
  assert.equal(activeOnly.every(item=>item.line===3&&item.column===7),true);
  assert.equal(matchesCompilerDiagnosticPath(null,'src/current.atto',cwd),false,
    'unlocated record cannot bypass malformed active-file context');
  assert.equal(matchesCompilerDiagnosticPath('src/current.atto',active,'relative cwd'),false);
});
