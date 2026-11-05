'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {scanOreslang} = require('../lib/scan');

// Host lexical-preview regressions, not native guest/compiler execution.
test('balanced nested comments suppress nested keywords and delimiter-like text', () => {
  const source = '/* outer { fnc /* inner critical */ end } */ fnc execute() {}';
  const result = scanOreslang(source);
  assert.deepEqual(result.diagnostics, []);
  assert.deepEqual(result.tokens.map(token => token.value), ['fnc']);
  const expectedStart = source.lastIndexOf('fnc');
  assert.equal(result.tokens[0].start, expectedStart);
  assert.equal(result.tokens[0].end, expectedStart + 3);
});

test('NUL or unpaired surrogates inside otherwise opaque source cannot be hidden', () => {
  for (const source of [
    '/* hidden ' + String.fromCharCode(0) + ' */ fnc main() {}',
    '"' + String.fromCharCode(0xD800) + '" fnc main() {}',
    '`' + String.fromCharCode(0xDC00) + '` fnc main() {}',
  ]) {
    const result = scanOreslang(source);
    assert.deepEqual(result.tokens, []);
    assert.equal(result.diagnostics.length, 1);
    assert.match(result.diagnostics[0].message, /NUL|unpaired UTF-16 surrogate/);
    assert.equal(result.diagnostics[0].start, source.search(/[\u0000\uD800\uDC00]/u));
  }
});
