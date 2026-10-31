'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vscode = require('vscode');
const {setTimeout: sleep} = require('node:timers/promises');

async function until(predicate, label, timeoutMs=10000) {
  const deadline=Date.now()+timeoutMs;
  while(Date.now()<deadline) {
    if(predicate()) return;
    await sleep(80);
  }
  throw new Error('VS Code Extension Host timed out: '+label);
}
async function run() {
  const mode=process.env.ORESLANG_TEST_MODE==='untrusted'?'untrusted':'trusted';
  const expectedTrust=mode==='trusted';
  assert.equal(vscode.workspace.isTrusted,expectedTrust,
    'actual workspace trust state must match the independent test launch');
  const extension=vscode.extensions.getExtension('ores-truffle-oreslang.oreslang-vscode');
  assert.ok(extension,'Oreslang extension must be enabled in both trust modes');
  await extension.activate();
  assert.equal(extension.isActive,true);
  assert.equal(vscode.workspace.getConfiguration('oreslang.colors').get('keyword','#FF00FF'),'#FF00FF');

  const source='pub fnc run() { return;';
  const doc=await vscode.workspace.openTextDocument({language:'oreslang',content:source});
  await vscode.window.showTextDocument(doc,{preview:false});
  await until(()=>vscode.languages.getDiagnostics(doc.uri).some(x=>/Unclosed delimiter/.test(x.message)),
    'live lexical diagnostics in '+mode);
  assert.ok(vscode.languages.getDiagnostics(doc.uri).some(x=>
    x.source==='oreslang' && x.severity===vscode.DiagnosticSeverity.Error));
  const edit=new vscode.WorkspaceEdit();
  edit.insert(doc.uri,new vscode.Position(0,doc.lineAt(0).text.length),'}');
  assert.equal(await vscode.workspace.applyEdit(edit),true);
  await until(()=>!vscode.languages.getDiagnostics(doc.uri).some(x=>/Unclosed delimiter/.test(x.message)),
    'live edit clears stale diagnostics');

  const dir=mode==='untrusted' ? vscode.workspace.workspaceFolders?.[0]?.uri.fsPath :
    fs.mkdtempSync(path.join(os.tmpdir(),'oreslang-checked-file-'));
  assert.ok(dir,'untrusted run must use a real workspace folder');
  const filename=path.join(dir,'trust-check.ores');
  const marker=path.join(dir,'cli-invoked');
  fs.writeFileSync(filename,'pub fnc ok() { return; }\n','utf8');
  const cfg=vscode.workspace.getConfiguration('oreslang.cli');
  await cfg.update('command','node',vscode.ConfigurationTarget.Global);
  await cfg.update('args',[path.join(__dirname,'fake-cli.cjs'),marker],
    vscode.ConfigurationTarget.Global);
  await cfg.update('runOnSave',false,vscode.ConfigurationTarget.Global);
  try {
    const fileDoc=await vscode.workspace.openTextDocument(vscode.Uri.file(filename));
    await vscode.window.showTextDocument(fileDoc,{preview:false});
    await vscode.commands.executeCommand('oreslang.checkCurrentFile');
    if(expectedTrust){
      await until(()=>fs.existsSync(marker),'trusted CLI must run');
    }else{
      await sleep(350);
      assert.equal(fs.existsSync(marker),false,'untrusted folder cannot launch configured CLI');
    }
    console.log('PASS real VS Code '+mode+' extension activation, lexical diagnostics, CLI trust fence');
  } finally {
    await cfg.update('args',undefined,vscode.ConfigurationTarget.Global);
    await cfg.update('command',undefined,vscode.ConfigurationTarget.Global);
    await cfg.update('runOnSave',undefined,vscode.ConfigurationTarget.Global);
    if(expectedTrust)fs.rmSync(dir,{recursive:true,force:true});
  }
}
module.exports={run};
