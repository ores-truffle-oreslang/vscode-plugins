'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {createRequire} = require('node:module');
const file = path.resolve(__dirname, '../extension.js');
const realRequire = createRequire(file);

function fixture() {
  const processes = [];
  const published = [];
  const deleted = [];
  const handlers = {};
  const config = new Map();
  const workspace = {
    isTrusted: true,
    textDocuments: [],
    getWorkspaceFolder: () => undefined,
    getConfiguration: scope => ({
      get: (key, fallback) => config.has(scope + '.' + key) ? config.get(scope + '.' + key) : fallback
    }),
    onDidOpenTextDocument: cb => {handlers.open = cb; return {dispose(){}};},
    onDidChangeTextDocument: cb => {handlers.change = cb; return {dispose(){}};},
    onDidSaveTextDocument: cb => {handlers.save = cb; return {dispose(){}};},
    onDidCloseTextDocument: cb => {handlers.close = cb; return {dispose(){}};},
    onDidChangeConfiguration: cb => {handlers.configuration = cb; return {dispose(){}};}
  };
  const vscode = {
    workspace,
    Position: class {constructor(line, character){this.line=line; this.character=character;}},
    Range: class {constructor(a,b){this.start=a; this.end=b;}},
    Diagnostic: class {constructor(range,message,severity){Object.assign(this,{range,message,severity});}},
    DiagnosticSeverity: {Error:0, Warning:1, Information:2, Hint:3},
    languages: {
      createDiagnosticCollection(name) {
        return {
          set(uri, records){published.push({name,uri,records});},
          delete(uri){deleted.push({name,uri});},
          dispose(){}
        };
      }
    },
    commands: {registerCommand:(name,cb)=>{handlers.command=cb; return {dispose(){}};}},
    window: {
      visibleTextEditors: [],
      activeTextEditor: undefined,
      createTextEditorDecorationType:()=>({dispose(){}}),
      onDidChangeVisibleTextEditors:cb=>{handlers.visible=cb;return {dispose(){}};},
      showInformationMessage(){},
      showWarningMessage(){}
    }
  };
  const child = {
    execFile(command, args, options, cb) {
      const proc = {command,args,options,cb,kills:0,kill(){this.kills++;}};
      processes.push(proc);
      return proc;
    }
  };
  const sandbox=vm.createContext({module:{exports:{}},require:id=>id==='vscode'?vscode:id==='child_process'?child:realRequire(id)});
  vm.runInContext(fs.readFileSync(file,'utf8'),sandbox,{filename:file});
  const exports=sandbox.module.exports;
  const subscriptions=[];
  exports.activate({subscriptions});
  const document={
    languageId:'oreslang',version:1,isDirty:false,isClosed:false,
    uri:{scheme:'file',fsPath:'/tmp/integration.ores',toString:()=> 'file:///tmp/integration.ores'},
    getText:()=> 'pub fnc run() { return; }',
    positionAt:n=>new vscode.Position(0,n)
  };
  const complete=(proc,message='bad')=>proc.cb(null,JSON.stringify({version:1,diagnostics:[{message,range:{start:{line:1,column:1}}}]}),'');
  return{workspace,handlers,config,processes,published,deleted,exports,document,complete,subscriptions,_context:sandbox};
}

test('activation registers events and command without starting a CLI', () => {
  const f=fixture();
  assert.equal(f.processes.length,0);
  for(const key of ['open','change','save','close','configuration','visible','command']) {
    assert.equal(typeof f.handlers[key],'function',key);
  }
  assert.ok(f.subscriptions.length>=7);
  f.exports.deactivate();
});
test('superseding the same file terminates old child, settles promise and discards its callback',async()=>{
  const f=fixture();
  const first=f.handlers.command; // registered command is present
  assert.equal(typeof first,'function');
  const pending1=vm.runInContext('runCompilerCheck',getContext(f))(f.document,false);
  const old=f.processes[0];
  const pending2=vm.runInContext('runCompilerCheck',getContext(f))(f.document,false);
  assert.equal(old.kills,1);
  await pending1;
  old.cb(null,JSON.stringify({version:1,diagnostics:[{message:'old'}]}),'');
  f.complete(f.processes[1],'new');
  await pending2;
  assert.deepEqual(f.published.filter(x=>x.name==='oreslang-compiler').map(x=>x.records[0]?.message),['new']);
  f.exports.deactivate();
});
test('file close and deactivation cancel live child and prevent late diagnostics', async()=>{
  const f=fixture();
  const run=vm.runInContext('runCompilerCheck',getContext(f));
  const first=run(f.document,false);
  const p=f.processes[0];
  f.handlers.close(f.document);
  await first;
  assert.equal(p.kills,1);
  f.complete(p,'late');
  assert.equal(f.published.filter(x=>x.name==='oreslang-compiler').length,0);
  const second=run(f.document,false);
  const q=f.processes[1];
  f.exports.deactivate();
  await second;
  assert.equal(q.kills,1);
  f.complete(q,'late deactivation');
  assert.equal(f.published.filter(x=>x.name==='oreslang-compiler').length,0);
});
test('trust revocation and CLI configuration changes prevent publishing a pending result',async()=>{
  const f=fixture();
  const run=vm.runInContext('runCompilerCheck',getContext(f));
  const first=run(f.document,false);
  f.workspace.isTrusted=false;
  f.complete(f.processes[0],'trusted earlier');
  await first;
  assert.equal(f.published.filter(x=>x.name==='oreslang-compiler').length,0);
  f.workspace.isTrusted=true;
  const second=run(f.document,false);
  f.handlers.configuration({affectsConfiguration:scope=>scope==='oreslang.cli'});
  await second;
  assert.equal(f.processes[1].kills,1);
  f.complete(f.processes[1],'changed config');
  assert.equal(f.published.filter(x=>x.name==='oreslang-compiler').length,0);
  f.exports.deactivate();
});
function getContext(f){return f._context;}
