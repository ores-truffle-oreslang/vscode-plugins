'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { scanOreslang } = require('../lib/scan');

test('quoted Symbol NFC and escaped surrogate pairs are accepted, not source-coerced', () => {
  const source = "#'e\u0301' #\"\\uD83D\\uDE00\" #ready";
  const result = scanOreslang(source);
  assert.deepEqual(result.diagnostics, []);
  assert.deepEqual(result.tokens.map(token => token.kind), ['symbol','symbol','symbol']);
  assert.deepEqual(result.tokens.map(token => source.slice(token.start, token.end)),
    source.split(' '));
});

test('invalid symbol format characters do not leak runtime globals through line recovery', () => {
  const source = "#'\u200B' panic\n#ok";
  const result = scanOreslang(source);
  assert.equal(result.diagnostics.length, 1);
  assert.match(result.diagnostics[0].message, /Invalid or unterminated quoted Symbol/);
  assert.deepEqual(result.tokens.map(token => [token.kind, token.value]), [['symbol','#ok']]);
});

test('quoted Symbol UTF-8 budget admits 256 bytes but rejects 257', () => {
  for (const [length, valid] of [[256,true],[257,false]]) {
    const result = scanOreslang("#'" + 'a'.repeat(length) + "'");
    assert.equal(result.diagnostics.length, valid ? 0 : 1);
    assert.equal(result.tokens.length, valid ? 1 : 0);
    if (!valid) assert.match(result.diagnostics[0].message, /Symbol literal/);
  }
});