'use strict';
// Stress exact host editor lexer nesting admission; not a compiler-run fixture.
const test = require('node:test');
const assert = require('node:assert/strict');
const {scanOreslang} = require('../lib/scan');

test('4096 comment nests are accepted as opaque, 4097 fail closed and scanner recovers', () => {
  const nested = depth => '/*'.repeat(depth) + 'return #hidden ] }' + '*/'.repeat(depth) + '\r\nfnc main() {}';
  const atLimit = scanOreslang(nested(4096));
  assert.deepEqual(atLimit.diagnostics, []);
  assert.deepEqual(atLimit.tokens.map(t => t.value), ['fnc']);
  const overLimit = scanOreslang(nested(4097));
  assert.deepEqual(overLimit.tokens, []);
  assert.equal(overLimit.diagnostics.length, 1);
  assert.match(overLimit.diagnostics[0].message, /Block comment nesting limit exceeded/);
  const recovered = scanOreslang('fnc main() { return; }');
  assert.deepEqual(recovered.diagnostics, []);
  assert.deepEqual(recovered.tokens.map(t => t.value), ['fnc', 'return']);
});

test('delimiters enforce the same limit without leaking state into later scans', () => {
  const valid = scanOreslang('('.repeat(4096) + '#ready' + ')'.repeat(4096));
  assert.deepEqual(valid.diagnostics, []);
  assert.deepEqual(valid.tokens.map(t => t.value), ['#ready']);
  const invalid = scanOreslang('('.repeat(4097) + '#forged');
  assert.deepEqual(invalid.tokens, []);
  assert.equal(invalid.diagnostics.length, 1);
  assert.match(invalid.diagnostics[0].message, /Delimiter nesting limit exceeded/);
  const recovered = scanOreslang('pub fnc safe() { return #ready; }');
  assert.deepEqual(recovered.diagnostics, []);
  assert.deepEqual(recovered.tokens.map(t => t.value), ['pub', 'fnc', 'return', '#ready']);
});
