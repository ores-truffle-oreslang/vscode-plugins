'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { scanOreslang } = require('../lib/scan');

test('lone high and low UTF-16 surrogates fail at their exact code-unit offset', () => {
  const grave = String.fromCharCode(96);
  const sources = [
    '😀 /* protected \uD800 */ return',
    '😀 ' + grave + 'opaque \uDC00 template' + grave + ' return',
    '/* hidden */ 😀 \uD800 return',
  ];
  for (const source of sources) {
    const pos = source.indexOf('\uD800') >= 0
      ? source.indexOf('\uD800') : source.indexOf('\uDC00');
    assert.ok(pos >= 2, source);
    const result = scanOreslang(source);
    assert.deepEqual(result.tokens, [], source);
    assert.equal(result.diagnostics.length, 1, source);
    assert.match(result.diagnostics[0].message, /unpaired UTF-16 surrogate/);
    assert.equal(result.diagnostics[0].start, pos, source);
    assert.equal(result.diagnostics[0].end, pos + 1, source);
  }
});

test('valid astral code points do not trigger a false source admission denial', () => {
  const source = '😀 /* Unicode 😀 opaque */ return';
  const result = scanOreslang(source);
  assert.deepEqual(result.diagnostics, []);
  assert.deepEqual(result.tokens.map(item => [item.kind, item.value]),
    [['keyword', 'return']]);
  assert.equal(result.tokens[0].start, source.lastIndexOf('return'));
});
