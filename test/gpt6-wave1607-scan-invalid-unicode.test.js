'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { scanOreslang } = require('../lib/scan');

test('scanner refuses malformed host strings even in opaque source regions', () => {
  const badHigh = String.fromCharCode(0xd800);
  const badLow = String.fromCharCode(0xdc00);
  const fixtures = [
    '// ignored comment: ' + badHigh,
    '/* nested /* comment */ ' + badLow + ' */',
    'const s = "' + badHigh + '";',
    'const template = ' + String.fromCharCode(96) + 'data' + badLow + String.fromCharCode(96) + ';',
    'pub fnc ok() { /* null: ' + String.fromCharCode(0) + ' */ return; }'
  ];
  for (const [index, source] of fixtures.entries()) {
    const outcome = scanOreslang(source);
    assert.deepEqual(outcome.tokens, [], 'no partial colored source for fixture ' + index);
    assert.equal(outcome.diagnostics.length, 1, 'single fail-closed diagnostic ' + index);
    assert.match(outcome.diagnostics[0].message,
      /unpaired UTF-16 surrogate|NUL character/, 'malformed source ' + index);
  }
});

test('valid astral scalars remain opaque in comments and templates', () => {
  const tick = String.fromCharCode(96);
  const source = '/* 🦊 */ pub fnc run() { const s = ' +
    tick + '🦊 braces {' + tick + '; return; }';
  const outcome = scanOreslang(source);
  assert.deepEqual(outcome.tokens.map(t => t.value), ['pub', 'fnc', 'const', 'return']);
  assert.deepEqual(outcome.diagnostics, []);
});
