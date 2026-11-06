'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {scanOreslang} = require('../lib/scan');

test('NUL and unpaired UTF-16 units reject even inside opaque source regions', () => {
  const quote = String.fromCharCode(96);
  const examples = [
    ['// ignored \u0000 keyword', '\u0000', 'NUL'],
    ['/* ignored \uDC00 */', '\uDC00', 'surrogate'],
    [quote + 'template \uD800' + quote, '\uD800', 'surrogate'],
    ['"string" \uD800', '\uD800', 'surrogate'],
    ['\uD800ordinary', '\uD800', 'surrogate'],
    ['🦊 valid prefix \uDC00', '\uDC00', 'surrogate'],
  ];
  for (const [source, invalid, name] of examples) {
    const result = scanOreslang(source);
    const start = source.indexOf(invalid);
    assert.deepEqual(result.tokens, [], name);
    assert.equal(result.diagnostics.length, 1, name);
    assert.equal(result.diagnostics[0].start, start, name);
    assert.equal(result.diagnostics[0].end, start + 1, name);
    assert.match(result.diagnostics[0].message, new RegExp(name, 'i'));
  }
});
test('a valid astral scalar pair is never rejected as an unpaired surrogate', () => {
  const result = scanOreslang('// 🦊\nfnc main() { return 42; }');
  assert.deepEqual(result.diagnostics, []);
  assert.ok(result.tokens.some(t => t.value === 'fnc' && t.kind === 'keyword'));
});
