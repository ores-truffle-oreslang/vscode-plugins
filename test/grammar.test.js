'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const grammarPath = path.join(__dirname, '..', 'syntaxes', 'oreslang.tmLanguage.json');
const grammar = JSON.parse(fs.readFileSync(grammarPath, 'utf8'));

test('exports the Linguist-compatible Oreslang TextMate scope and extension', () => {
  assert.equal(grammar.scopeName, 'source.oreslang');
  assert.deepEqual(grammar.fileTypes, ['ores']);
});

test('keeps contextual equality words out of the global keyword matcher', () => {
  const keywordPatterns = grammar.repository.keywords.patterns
    .map(pattern => pattern.match || '')
    .join('\n');

  assert.doesNotMatch(keywordPatterns, /\bis\b/);
  assert.doesNotMatch(keywordPatterns, /\beq\b/);
  assert.doesNotMatch(keywordPatterns, /\bneq\b/);
});

test('has explicit contextual comparison and type-test rules', () => {
  const patterns = grammar.repository['contextual-operators'].patterns;
  const serialized = JSON.stringify(patterns);

  assert.match(serialized, /eq/);
  assert.match(serialized, /neq/);
  assert.match(serialized, /is/);
  assert.match(serialized, /type/);
  assert.match(serialized, /!eq/);
});

test('covers current actor, channel, callable, and structural syntax', () => {
  const all = JSON.stringify(grammar);

  for (const word of [
    'actor', 'isoactor', 'untrusted', 'spawn', 'nb', 'select', 'readch', 'writech',
    'pure', 'trap', 'nlex', 'structural', 'loop', 'block', 'constructor', 'export', 'entry', 'singleton'
  ]) {
    assert.match(all, new RegExp('\\b' + word + '\\b'));
  }
});

test('covers all current typed import kinds', () => {
  const imports = JSON.stringify(grammar.repository.imports.patterns);
  for (const word of ['actor', 'module', 'class', 'interface', 'trait', 'struct', 'type', 'types', 'fnc']) {
    assert.match(imports, new RegExp('\\\\b' + word + '\\b|' + word));
  }
});

test('scopes namespaces, qualified actors/classes, and hot-load entries', () => {
  const declarations = JSON.stringify(grammar.repository.declarations.patterns);
  const imports = JSON.stringify(grammar.repository.imports.patterns);

  assert.match(declarations, /namespace/);
  assert.match(declarations, /constructor/);
  assert.match(declarations, /untrusted/);
  assert.match(declarations, /singleton/);
  assert.match(imports, /export/);
  assert.match(imports, /entry/);
});

test('covers explicit rt ownership and pointer bridge operations', () => {
  const runtime = JSON.stringify(grammar.repository['runtime-globals'].patterns);
  for (const word of ['borrow', 'take', 'copy', 'share', 'ref', 'deref', 'ptr']) {
    assert.match(runtime, new RegExp(word));
  }
});

test('recognizes upstream do-match, do-select and new rt proxy/cooperate vocabulary', () => {
  const controls = grammar.repository.keywords.patterns.find(p => p.name === 'keyword.control.oreslang');
  const runtime = JSON.stringify(grammar.repository['runtime-globals'].patterns);
  for (const word of ['do', 'match', 'over', 'while', 'select', 'nb', 'default', 'readch', 'writech']) {
    assert.match(word, new RegExp(controls.match));
  }
  for (const word of ['proxy', 'cooperate', 'unref']) {
    assert.match(runtime, new RegExp(word));
  }
});
