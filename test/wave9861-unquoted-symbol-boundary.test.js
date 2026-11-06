'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {scanOreslang} = require('../lib/scan');

test('unquoted Symbol maximum passes and first overlong unit is denied', () => {
  for (const length of [127, 128, 129, 130]) {
    const symbol = '#' + 'a'.repeat(length);
    const source = symbol + '\r\nreturn';
    const first = scanOreslang(source);
    const accepted = length <= 128;
    assert.deepEqual(first.tokens.map(t => [t.kind, t.value]),
      accepted ? [['symbol', symbol], ['keyword', 'return']]
               : [['keyword', 'return']], String(length));
    assert.equal(first.diagnostics.length, accepted ? 0 : 1);
    if (!accepted) {
      assert.match(first.diagnostics[0].message, /Unquoted Symbol exceeds 128 ASCII bytes/);
      assert.equal(first.diagnostics[0].start, 0);
      assert.equal(first.diagnostics[0].end, symbol.length);
    }
    const last = first.tokens.at(-1);
    assert.equal(last.start, source.lastIndexOf('return'));
    assert.equal(last.end, source.length);
    for (const item of first.tokens) {
      assert.equal(source.slice(item.start, item.end), item.value);
    }
    for (let i = 0; i < 8; i++) assert.deepEqual(scanOreslang(source), first);
  }
});
