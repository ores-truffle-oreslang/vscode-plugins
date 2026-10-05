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
    'actor', 'isoactor', 'nb', 'select', 'readch', 'writech',
    'pure', 'trap', 'nlex', 'structural', 'loop', 'block'
  ]) {
    assert.match(all, new RegExp('\\b' + word + '\\b'));
  }
});
