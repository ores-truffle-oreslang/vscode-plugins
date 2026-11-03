'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const manifest = require('../contracts/editor-syntax/v1/editor-lexical-contract.json');
const { scanOreslang } = require('../lib/scan');

test('all 93 reserved words remain ordinary identifiers within larger ASCII names', () => {
  assert.equal(manifest.reservedWords.length, 93);
  for (const word of manifest.reservedWords) {
    for (const source of [word + 'x', '_' + word, word + '_suffix']) {
      const result = scanOreslang(source);
      assert.deepEqual(result.diagnostics, [], source);
      assert.deepEqual(result.tokens, [], source);
    }
  }
});

test('quoted Symbol UTF-16 escape pairs are admitted, broken pairs are rejected', () => {
  const valid = ['#"\\uD83D\\uDE00"', "#'\\uD83D\\uDE00'"];
  for (const source of valid) {
    const result = scanOreslang(source);
    assert.deepEqual(result.diagnostics, [], source);
    assert.deepEqual(result.tokens.map(t => t.kind), ['symbol'], source);
    assert.equal(result.tokens[0].value, source);
  }
  for (const source of [
    '#"\\uD83D"', '#"\\uDE00"', '#"\\uDE00\\uD83D"',
    '#"\\uD83D\\u0061"'
  ]) {
    const result = scanOreslang(source);
    assert.ok(result.diagnostics.some(d => /Symbol/.test(d.message)), source);
    assert.equal(result.tokens.filter(t => t.kind === 'symbol').length, 0, source);
  }
});
