'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {scanOreslang} = require('../lib/scan');

test('nested block comments hide keywords, delimiters and Symbols until closure', () => {
  const source = 'if /* external { #bad /* inner return } */ is */ return';
  const first = scanOreslang(source);
  assert.deepEqual(first.diagnostics, []);
  assert.deepEqual(first.tokens.map(t => [t.kind, t.value]), [
    ['keyword', 'if'], ['keyword', 'return'],
  ]);
  for (const token of first.tokens) {
    assert.equal(source.slice(token.start, token.end), token.value);
  }
  for (let i = 0; i < 30; i++) assert.deepEqual(scanOreslang(source), first);
});

test('unterminated outer comment does not leak nested lexical contents', () => {
  const source = 'if /* outer /* inner */ still outer\r\nreturn } #bad';
  const first = scanOreslang(source);
  assert.deepEqual(first.tokens.map(t => [t.kind,t.value]), [['keyword', 'if']]);
  assert.equal(first.diagnostics.length, 1);
  assert.match(first.diagnostics[0].message, /Unterminated block comment/);
  assert.equal(first.diagnostics[0].start, source.indexOf('/*'));
  assert.equal(first.diagnostics[0].end, source.length);
  assert.deepEqual(scanOreslang('if /* outer /* inner */ */ return').diagnostics, []);
  assert.deepEqual(scanOreslang('if /* outer /* inner */ */ return').tokens.map(t => t.value),
    ['if', 'return']);
});
