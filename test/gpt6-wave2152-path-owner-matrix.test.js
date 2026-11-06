'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {matchesCompilerDiagnosticPath}=require('../lib/diagnostic-path');

test('active document owns only its exact normalized compiler diagnostic path',()=>{
  const cwd=path.resolve('wave2152-project');
  const active=path.join(cwd,'src','module.atto');
  const exact=[
    'src/module.atto',
    path.join('src','nested','..','module.atto'),
    active,
  ];
  for(const reported of exact){
    assert.equal(matchesCompilerDiagnosticPath(reported,active,cwd),true,reported);
  }
  const foreign=[
    'src/module.atto.bak',
    'src/module.atto/child',
    path.join('src','other.atto'),
    path.join('..','foreign','src','module.atto'),
    path.join(cwd,'src','module.ores'),
    '',
    'src/mo\0dule.atto',
    {path:'src/module.atto'},
  ];
  for(const reported of foreign){
    assert.equal(matchesCompilerDiagnosticPath(reported,active,cwd),false,String(reported));
  }
});

test('unlocated legacy records cannot bypass invalid active document context',()=>{
  const cwd=path.resolve('wave2152-project');
  const active=path.join(cwd,'src','module.atto');
  assert.equal(matchesCompilerDiagnosticPath(null,active,cwd),true);
  assert.equal(matchesCompilerDiagnosticPath(undefined,active,cwd),true);
  for(const [badActive,badCwd] of [
    ['src/module.atto',cwd],
    [active,'relative-cwd'],
    [active+'\0wrong',cwd],
    [active,cwd+'\0wrong'],
  ]){
    assert.equal(matchesCompilerDiagnosticPath(null,badActive,badCwd),false);
  }
});
