'use strict';
// Host-only scanner comment-scope regression; no compiler guest execution claim.
const test = require('node:test');
const assert = require('node:assert/strict');
const {scanOreslang} = require('../lib/scan');

test('nested comment delimiters and fake symbols do not escape into tokens', () => {
  const source = [
    '/* outer ( [ { #forged return',
    '   /* inner ] } #also-forged critical */',
    '   outer tail ) #hidden */',
    '#ready return',
    '// [ #not-real panic',
    'fnc',
  ].join('\n');
  const result = scanOreslang(source);
  assert.deepEqual(result.diagnostics, []);
  assert.deepEqual(result.tokens.map(t => [t.kind, t.value]), [
    ['symbol','#ready'],
    ['keyword','return'],
    ['keyword','fnc'],
  ]);
});

test('unclosed block comment emits diagnostic without exposing fake keyword tail', () => {
  const source = '/* nested /* #false return */ critical #not-real';
  const result = scanOreslang(source);
  assert.equal(result.diagnostics.length, 1);
  assert.match(result.diagnostics[0].message, /Unterminated block comment/);
  assert.deepEqual(result.tokens, []);
});
