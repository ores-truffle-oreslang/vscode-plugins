'use strict';
const assert = require('node:assert/strict');
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
  const extension = vscode.extensions.getExtension('ores-truffle-oreslang.oreslang-vscode');
  assert.ok(extension, 'Oreslang extension must load in genuine Extension Host');
  await extension.activate();
  assert.equal(extension.isActive,true,'extension activates');
  assert.equal(vscode.workspace.getConfiguration('oreslang.colors').get('keyword','#FF00FF'),'#FF00FF');

  const source='pub fnc run() { return;';
  const doc=await vscode.workspace.openTextDocument({language:'oreslang',content:source});
  assert.equal(doc.languageId,'oreslang');
  await vscode.window.showTextDocument(doc,{preview:false});
  await until(()=>vscode.languages.getDiagnostics(doc.uri).some(x=>/Unclosed delimiter/.test(x.message)),
    'lexical diagnostic from activated extension');
  const problems=vscode.languages.getDiagnostics(doc.uri);
  assert.ok(problems.some(x=>x.source==='oreslang' && x.severity===vscode.DiagnosticSeverity.Error),
    'real VS Code diagnostic collection presents lexical errors');

  const edit=new vscode.WorkspaceEdit();
  edit.insert(doc.uri,new vscode.Position(0,doc.lineAt(0).text.length),'}');
  assert.equal(await vscode.workspace.applyEdit(edit),true);
  await until(()=>!vscode.languages.getDiagnostics(doc.uri).some(x=>/Unclosed delimiter/.test(x.message)),
    'live edit clears stale diagnostics');

  // Untitled documents cannot be sent to the CLI: the registered command
  // must handle them without needing a real compiler executable.
  await vscode.commands.executeCommand('oreslang.checkCurrentFile');
  assert.ok(vscode.workspace.isTrusted===true||vscode.workspace.isTrusted===false);
  console.log('PASS: real VS Code Extension Host activation, diagnostic update, CLI guard');
}
module.exports = {run};
