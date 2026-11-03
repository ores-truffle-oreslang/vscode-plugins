'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { exportPortableTextmate, GRAMMAR_PATH } = require('../tools/export-portable-textmate');

test('exports byte-identical Oreslang TextMate grammars for Visual Studio and IntelliJ', (t) => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'oreslang-textmate-'));
  t.after(() => fs.rmSync(temporary, { recursive: true, force: true }));
  const result = exportPortableTextmate(temporary);
  const source = fs.readFileSync(GRAMMAR_PATH, 'utf8');
  assert.equal(fs.readFileSync(result.visualStudio, 'utf8'), source);
  assert.equal(fs.readFileSync(result.intelliJGrammar, 'utf8'), source);
  assert.equal(result.visualStudio, path.join(temporary, 'visual-studio', 'Oreslang', 'Syntaxes', 'oreslang.tmLanguage.json'));
  assert.equal(result.intelliJBundle, path.join(temporary, 'intellij', 'Oreslang-vscode-bundle'));

  const grammar = JSON.parse(source);
  assert.equal(grammar.scopeName, 'source.oreslang');
  assert.ok(grammar.fileTypes.includes('ores'));

  const pkg = JSON.parse(fs.readFileSync(path.join(result.intelliJBundle, 'package.json'), 'utf8'));
  assert.deepEqual(pkg.contributes.languages[0].extensions, ['.ores']);
  assert.equal(pkg.contributes.grammars[0].scopeName, grammar.scopeName);
  assert.equal(pkg.contributes.grammars[0].path, './syntaxes/oreslang.tmLanguage.json');
  assert.equal(pkg.main, undefined, 'IntelliJ bundle must not load executable VS Code extension code');
});

test('editor export is deterministic and does not modify the canonical grammar', (t) => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'oreslang-textmate-repeat-'));
  t.after(() => fs.rmSync(temporary, { recursive: true, force: true }));
  const sourceBefore = fs.readFileSync(GRAMMAR_PATH, 'utf8');
  const first = exportPortableTextmate(temporary);
  const firstBundle = fs.readFileSync(path.join(first.intelliJBundle, 'package.json'), 'utf8');
  const second = exportPortableTextmate(temporary);
  assert.equal(first.sourceSha256, second.sourceSha256);
  assert.equal(fs.readFileSync(path.join(second.intelliJBundle, 'package.json'), 'utf8'), firstBundle);
  assert.equal(fs.readFileSync(GRAMMAR_PATH, 'utf8'), sourceBefore);
});
