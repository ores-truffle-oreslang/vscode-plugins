'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {scanOreslang} = require('../lib/scan');

test('case-sensitive keywords, operators and runtime globals ignore opaque peers', () => {
  const source = [
    'return Return RETURN',
    'is Is IS',
    'recover Recover RECOVER',
    '// return is recover',
    '/* RETURN is recover */',
    '"return is recover" \'Return Is Recover\'',
  ].join('\r\n');
  const first = scanOreslang(source);
  assert.deepEqual(first.diagnostics, []);
  assert.deepEqual(first.tokens.map(item => [item.kind, item.value]), [
    ['keyword', 'return'], ['operator', 'is'], ['runtimeGlobal', 'recover'],
  ]);
  for (const item of first.tokens) {
    assert.equal(source.slice(item.start, item.end), item.value);
    assert.ok(item.start >= 0 && item.end <= source.length);
  }
  assert.ok(first.tokens.every(x => !/[A-Z]/.test(x.value)));
  for (let i = 0; i < 20; i++) assert.deepEqual(scanOreslang(source), first);
});
