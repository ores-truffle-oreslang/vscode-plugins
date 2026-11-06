'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {scanOreslang} = require('../lib/scan');

test('4096 nested delimiters are admitted and preserve following keyword', () => {
  for (const [open, close] of [['(', ')'], ['{', '}'], ['[', ']']]) {
    const source = open.repeat(4096) + close.repeat(4096) + '\r\nreturn';
    const first = scanOreslang(source);
    assert.deepEqual(first.diagnostics, [], open);
    assert.deepEqual(first.tokens, [{
      kind:'keyword', start:8194, end:8200, value:'return',
    }], open);
    for (let i=0; i<4; i++) assert.deepEqual(scanOreslang(source), first);
  }
});

test('the 4097th nested delimiter is rejected at its exact source coordinate', () => {
  for (const open of ['(', '{', '[']) {
    const source = 'if ' + open.repeat(4097) + ' return';
    const first = scanOreslang(source);
    assert.deepEqual(first.tokens, [], open);
    assert.equal(first.diagnostics.length, 1);
    assert.equal(first.diagnostics[0].start, 3 + 4096);
    assert.equal(first.diagnostics[0].end, 3 + 4097);
    assert.match(first.diagnostics[0].message, /Delimiter nesting limit exceeded/);
  }
  const hidden = '/* ' + '('.repeat(4097) + ' */ return';
  assert.deepEqual(scanOreslang(hidden).diagnostics, []);
  assert.deepEqual(scanOreslang(hidden).tokens.map(t=>t.value), ['return']);
});
