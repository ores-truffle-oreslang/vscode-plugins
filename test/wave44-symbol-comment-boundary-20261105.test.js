'use strict';
// Host-only scanner origin and comment-boundary regression.
const test = require('node:test');
const assert = require('node:assert/strict');
const {scanOreslang} = require('../lib/scan');

test('comment-contained symbols and keywords never appear as executable tokens', () => {
  const cases = [
    ['/* #spoofed return */ #ready return', ['#ready', 'return']],
    ['/* outer /* #spoofed return */ nested */ #ready', ['#ready']],
    ['// #spoofed return\n#ready return', ['#ready', 'return']],
  ];
  for (const [source, expected] of cases) {
    const result = scanOreslang(source);
    assert.deepEqual(result.diagnostics, [], source);
    assert.deepEqual(result.tokens.map(token => token.value), expected, source);
  }
});

test('repeated hostile-looking comments leave later real symbols intact', () => {
  const source = '/* #nope return */'.repeat(16) + '#ready return';
  const result = scanOreslang(source);
  assert.deepEqual(result.diagnostics, []);
  assert.deepEqual(result.tokens.map(token => token.value), ['#ready', 'return']);
});
