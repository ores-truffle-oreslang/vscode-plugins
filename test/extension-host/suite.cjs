'use strict';

// Native VS Code language association and runtime activation, not a TextMate
// scope inspector, compiler/guest test, or Visual Studio/IntelliJ host test.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vscode = require('vscode');

async function run() {
  const root = path.resolve(__dirname, '../..');
  const fixture = path.join(root, 'test', 'fixtures', 'editor-compat.ores');
  const expected = JSON.parse(fs.readFileSync(
    path.join(root, 'test', 'fixtures', 'editor-compat.expected.json'), 'utf8'));
  assert.equal(expected.cases.length, 17);
  const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(fixture));
  assert.equal(doc.languageId, 'oreslang', 'native host must associate .ores files with Oreslang');
  assert.equal(doc.getText(), fs.readFileSync(fixture, 'utf8'), 'host must load source without rewriting it');

  const ext = vscode.extensions.getExtension('ores-truffle-oreslang.oreslang-vscode');
  assert.ok(ext, 'native VS Code must discover the Oreslang extension');
  await ext.activate();
  assert.equal(ext.isActive, true, 'native VS Code must activate the Oreslang extension');
  const commands = await vscode.commands.getCommands(true);
  assert.ok(commands.includes('oreslang.checkCurrentFile'),
    'native extension must register the Oreslang command');
  console.log('PASS native VS Code .ores registration, fixture bytes, extension activation and command');
}

module.exports = { run };
