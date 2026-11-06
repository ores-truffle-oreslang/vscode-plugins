'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {scanOreslang} = require('../lib/scan');

test('compound keywords have exact source spans, never leak out of comments or strings', () => {
  const words = ['critical-read','critical-write','nb-select','transform-pipe'];
  const tick = String.fromCharCode(96);
  const source = '// critical-read\n"nb-select" /* transform-pipe */ '
    + tick + 'critical-write' + tick + '\n'
    + words.join(' ') + '\n';
  const result = scanOreslang(source);
  assert.deepEqual(result.diagnostics, []);
  const actual = result.tokens.filter(t => words.includes(t.value));
  assert.deepEqual(actual.map(t => t.value), words);
  for (const token of actual) {
    assert.equal(source.slice(token.start, token.end), token.value);
    assert.equal(token.start, source.lastIndexOf(token.value));
    assert.equal(token.kind, 'keyword');
  }
});
test('spaces around minus never form a compound keyword', () => {
  const result = scanOreslang('critical - read nb - select transform - pipe');
  assert.deepEqual(result.diagnostics, []);
  for (const token of result.tokens) {
    assert.ok(!['critical-read','nb-select','transform-pipe'].includes(token.value));
  }
});
