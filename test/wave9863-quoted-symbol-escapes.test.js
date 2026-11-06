'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {scanOreslang} = require('../lib/scan');

const U = String.fromCharCode(92);
test('escaped paired UTF-16 scalars and ordinary Unicode escapes remain one Symbol', () => {
  const accepted = ["#'" + U + "uD83E" + U + "uDD51'",
    '#"' + U + "u0061" + U + 'u0062"',
    "#'" + U + "u00E9'"];
  for (const literal of accepted) {
    const source = literal + '\r\nreturn';
    const result = scanOreslang(source);
    assert.deepEqual(result.diagnostics, [], literal);
    assert.deepEqual(result.tokens.map(t => [t.kind,t.value]), [
      ['symbol', literal], ['keyword', 'return'],
    ]);
    assert.equal(result.tokens[0].start, 0);
    assert.equal(result.tokens[0].end, literal.length);
    assert.equal(result.tokens[1].start, literal.length + 2);
  }
});

test('escaped unpaired surrogates, controls and malformed hex reject to line boundary', () => {
  const invalid = ["#'" + U + "uD83E'", "#'" + U + "uDD51'",
    "#'" + U + "u202E'", "#'" + U + "u12x4'"];
  for (const literal of invalid) {
    const source = literal + '\r\nreturn';
    const first = scanOreslang(source);
    assert.equal(first.diagnostics.length, 1, literal);
    assert.match(first.diagnostics[0].message, /Invalid or unterminated quoted Symbol/);
    assert.equal(first.diagnostics[0].start, 0);
    assert.deepEqual(first.tokens.map(t => [t.kind,t.value]), [['keyword','return']]);
    assert.equal(first.tokens[0].start, literal.length + 2);
    for (let i=0; i<10; i++) assert.deepEqual(scanOreslang(source), first);
  }
});
