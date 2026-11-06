'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {scanOreslang} = require('../lib/scan');

test('installed scanner ignores words inside opaque strings/templates/comments but preserves live UTF-16 offsets', () => {
  const source = '/* return #spoofed */ const text = "🚀 return"; `throw [ ]`; // panic\r\nreturn #ready';
  const actual = scanOreslang(source);
  assert.deepEqual(actual.diagnostics, []);
  assert.deepEqual(actual.tokens.map(t => [t.kind, t.value]),
    [['keyword', 'const'], ['keyword', 'return'], ['symbol', '#ready']]);
  for (const token of actual.tokens) {
    assert.equal(source.slice(token.start, token.end), token.value);
    assert.ok(token.end > token.start);
  }
  assert.equal(actual.tokens[1].start, source.lastIndexOf('return'));
  assert.deepEqual(scanOreslang(source), actual);
});

test('malformed surrogate or NUL anywhere in opaque source fails closed with exact location', () => {
  for (const bad of [
    '/* safe */ "😀" /* bad ' + '\uD800' + ' */ return',
    'return `safe' + '\uDC00' + '` #ready',
    '// fake return' + '\0' + '\nreturn'
  ]) {
    const result = scanOreslang(bad);
    assert.deepEqual(result.tokens, [], 'untrusted source must not produce valid tokens');
    assert.equal(result.diagnostics.length, 1);
    const pos = bad.indexOf('\uD800') >= 0 ? bad.indexOf('\uD800') :
      bad.indexOf('\uDC00') >= 0 ? bad.indexOf('\uDC00') : bad.indexOf('\0');
    assert.equal(result.diagnostics[0].start, pos);
    assert.equal(result.diagnostics[0].end, pos + 1);
    assert.match(result.diagnostics[0].message, /UTF-16|NUL/);
  }
  assert.deepEqual(scanOreslang('/*🚀*/ return').tokens.map(t => t.value), ['return']);
});
