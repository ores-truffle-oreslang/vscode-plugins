'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {scanOreslang} = require('../lib/scan');

test('eq, neq and is are operators only as standalone lexical words', () => {
  const source = [
    'eq neq is',
    '/* eq neq is */',
    '"eq neq is" \'eq neq is\'',
    'not_eq foois neq1 is_',
    'defer recover throw raise',
  ].join('\n');
  const first = scanOreslang(source);
  assert.deepEqual(first.diagnostics, []);
  assert.deepEqual(first.tokens.map(t => [t.kind, t.value]), [
    ['operator', 'eq'], ['operator', 'neq'], ['operator', 'is'],
    ['runtimeGlobal', 'defer'], ['runtimeGlobal', 'recover'],
    ['runtimeGlobal', 'throw'], ['runtimeGlobal', 'raise'],
  ]);
  for (const token of first.tokens) {
    assert.equal(source.slice(token.start, token.end), token.value);
    assert.ok(token.start >= 0 && token.end <= source.length);
  }
  for (let i=0; i<20; i++) assert.deepEqual(scanOreslang(source), first);
});
