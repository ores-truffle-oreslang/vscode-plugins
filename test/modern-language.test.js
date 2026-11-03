'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {scanOreslang} = require('../lib/scan');

const grammar = JSON.parse(fs.readFileSync(
  path.join(__dirname, '..', 'syntaxes', 'oreslang.tmLanguage.json'), 'utf8'
));

test('hash-prefixed Oreslang symbols have an atomic TextMate scope', () => {
  const rule = grammar.repository.symbols.patterns[0];
  assert.equal(rule.name, 'constant.other.symbol.oreslang');
  const pattern = new RegExp(rule.match);
  for (const literal of ['#ready', "#'with spaces'", '#"quoted value"']) {
    assert.equal(literal.match(pattern)?.[0], literal, literal);
  }
  assert.ok(grammar.patterns.some(p => p.include === '#symbols'));
});

test('compound keyword scopes precede regular keyword/operator matching', () => {
  const names = grammar.patterns.map(p => p.include);
  assert.ok(names.indexOf('#compound-keywords') < names.indexOf('#operators'));
  assert.ok(names.indexOf('#compound-keywords') < names.indexOf('#keywords'));
  const pattern = new RegExp(grammar.repository['compound-keywords'].patterns[0].match);
  const source = 'critical-read critical-write nb-select transform-pipe';
  for (const word of source.split(' ')) assert.equal(word.match(pattern)?.[0], word);
  assert.deepEqual(scanOreslang(source).tokens.map(x => x.value), source.split(' '));
  assert.deepEqual(scanOreslang('critical - read').tokens.map(x => x.value), ['critical']);
});

test('all four runtime global controls share one scope', () => {
  const rules = grammar.repository['runtime-globals'].patterns;
  const global = rules.find(p => p.name === 'support.function.global.oreslang');
  assert.ok(global);
  const re = new RegExp(global.match);
  for (const word of ['recover', 'defer', 'throw', 'raise']) {
    assert.equal(word.match(re)?.[0], word);
  }
});
