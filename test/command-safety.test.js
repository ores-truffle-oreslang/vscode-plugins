'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {createRequire} = require('node:module');
const filename = path.resolve(__dirname, '../extension.js');
const realRequire = createRequire(filename);

function fixture({trusted=true, args=['check', '{file}'], onExec=()=>{}}={}) {
  const messages=[];
  const vscode={
    workspace:{
      isTrusted: trusted,
      getWorkspaceFolder:()=>undefined,
      getConfiguration:()=>({get:(name, fallback)=>name==='args'?args:fallback})
    },
    window:{showWarningMessage:msg=>messages.push(msg)},
    DiagnosticSeverity:{Error:0,Warning:1,Information:2,Hint:3}
  };
  const context=vm.createContext({
    require:id=>id==='vscode'?vscode:id==='child_process'?{execFile:onExec}:realRequire(id),
    module:{exports:{}},
    mockDiagnostics:{delete:()=>{}}
  });
  vm.runInContext(fs.readFileSync(filename,'utf8'),context,{filename});
  vm.runInContext('compilerDiagnostics = mockDiagnostics', context);
  const document={languageId:'oreslang',version:1,isDirty:false,isClosed:false,
    uri:{scheme:'file',fsPath:'/tmp/name{workspaceFolder}.ores',toString:()=> 'file:///tmp/name.ores'}};
  return {context,document,messages};
}

test('untrusted workspaces cannot run an Oreslang executable', async()=>{
  let invoked=false;
  const f=fixture({trusted:false,onExec:()=>{invoked=true}});
  await f.context.runCompilerCheck(f.document,true);
  assert.equal(invoked,false);
  assert.match(f.messages.join(' '),/Trust this workspace/);
});
test('argument placeholders expand exactly once, including hostile-looking filenames',()=>{
  const f=fixture({args:['check','{file}','{workspaceFolder}','literal-{file}']});
  const result=Array.from(f.context.expandCompilerArgs(f.document));
  assert.equal(result[1],'/tmp/name{workspaceFolder}.ores');
  assert.equal(result[2],'/tmp');
  assert.equal(result[3],'literal-/tmp/name{workspaceFolder}.ores');
});
test('malformed argument configuration fails closed before process launch',async()=>{
  let invoked=false;
  const f=fixture({args:[null],onExec:()=>{invoked=true}});
  await f.context.runCompilerCheck(f.document,true);
  assert.equal(invoked,false);
  assert.match(f.messages.join(' '),/array of up to 64 bounded strings/);
});
