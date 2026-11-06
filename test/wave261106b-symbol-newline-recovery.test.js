'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { scanOreslang } = require('../lib/scan');

test('malformed quoted Symbol cannot consume valid next-line keyword', () => {
  const examples = [
    "#'unfinished throw\nreturn",
    '#"unterminated panic\nreturn',
    "#'bad\\x recover\nreturn",
  ];
  for (const source of examples) {
    const first = scanOreslang(source);
    const repeated = scanOreslang(source);
    assert.deepEqual(first, repeated, source);
    assert.deepEqual(first.tokens.map(item => [item.kind, item.value]),
      [['keyword', 'return']], source);
    assert.equal(first.tokens[0].start, source.lastIndexOf('return'), source);
    assert.equal(first.diagnostics.length, 1, source);
    assert.match(first.diagnostics[0].message, /Invalid or unterminated quoted Symbol literal/);
    assert.equal(first.diagnostics[0].start, 0, source);
    assert.ok(first.diagnostics[0].end <= source.indexOf('\n'), source);
    assert.ok(!first.tokens.some(item => item.kind === 'symbol'), source);
  }
});
