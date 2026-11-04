'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {scanOreslang} = require('../lib/scan-target-preview');

const corpus = JSON.parse(fs.readFileSync(
  path.join(__dirname, '..', 'conformance', 'oreslang-syntax-v1.json'), 'utf8'));
const grammar = JSON.parse(fs.readFileSync(
  path.join(__dirname, '..', 'syntaxes', 'oreslang-target-preview.tmLanguage.json'), 'utf8'));

test('pin the upstream source and separate the editor-target contract', () => {
  assert.equal(corpus.schema, 'oreslang.editor-syntax-conformance/v1');
  assert.equal(corpus.authority.repo, 'ores-truffle-oreslang/oreslang-source.java');
  assert.equal(corpus.authority.files.length, 2);
  assert.equal(corpus.cases.length, 50);
  for (const file of corpus.authority.files) {
    assert.match(file.gitBlobSha, /^[0-9a-f]{40}$/);
  }
  assert.ok(corpus.profiles.compilerMainObservation.reserved.includes('null'));
  assert.ok(corpus.profiles.editorTarget.excludedReservedWords.includes('null'));
  assert.ok(corpus.evidenceBoundary.includes('does not establish'));
  assert.equal(new Set(corpus.cases.map(item => item.id)).size, corpus.cases.length);
});
for (const fixture of corpus.cases) {
  test('shared conformance: ' + fixture.id, () => {
    const result = scanOreslang(fixture.source);
    const actualKeywords = result.tokens.filter(t => t.kind === 'keyword').map(t => t.value);
    const actualGlobals = result.tokens.filter(t => t.kind === 'runtimeGlobal').map(t => t.value);
    for (const word of fixture.keywords) {
      assert.ok(actualKeywords.includes(word), 'missing keyword ' + word);
    }
    for (const word of fixture.notKeywords) {
      assert.ok(!actualKeywords.includes(word), 'false keyword ' + word);
    }
    for (const word of fixture.globals) {
      assert.ok(actualGlobals.includes(word), 'missing global ' + word);
    }
    for (const word of fixture.notGlobals) {
      assert.ok(!actualGlobals.includes(word), 'false global ' + word);
    }
    assert.deepEqual(result.diagnostics, []);
  });
}
test('TextMate grammar pins symbols and compound forms before regular keywords', () => {
  const order = grammar.patterns.map(p => p.include);
  assert.ok(order.indexOf('#symbols') < order.indexOf('#strings') || 
    (order.indexOf('#strings') < order.indexOf('#symbols') &&
     grammar.repository.strings.patterns.every(p => p.begin !== '#')));
  assert.ok(order.indexOf('#compound-keywords') < order.indexOf('#keywords'));
  const symbol = new RegExp(grammar.repository.symbols.patterns[0].match);
  for (const fixture of corpus.cases) {
    for (const literal of fixture.symbols) {
      assert.equal(literal.match(symbol)?.[0], literal, literal);
    }
  }
  const compound = new RegExp(grammar.repository['compound-keywords'].patterns[0].match);
  for (const word of corpus.profiles.editorTarget.compoundForms) {
    assert.equal(word.match(compound)?.[0], word);
  }
});
