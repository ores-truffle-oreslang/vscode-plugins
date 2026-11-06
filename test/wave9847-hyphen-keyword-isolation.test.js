'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {scanOreslang} = require('../lib/scan');

test('hyphenated keywords are admitted exactly, without swallowing prefix extensions', () => {
  const source = 'critical-read critical-write nb-select transform-pipe\n' +
    'critical-reader nb-selecting transform-pipeline critical-read_';
  const first = scanOreslang(source);
  assert.deepEqual(first.diagnostics, []);
  assert.deepEqual(first.tokens.map(t => [t.kind, t.value]), [
    ['keyword', 'critical-read'],
    ['keyword', 'critical-write'],
    ['keyword', 'nb-select'],
    ['keyword', 'transform-pipe'],
    ['keyword', 'critical'],
    ['keyword', 'nb'],
    ['keyword', 'critical'],
  ]);
  for (const t of first.tokens) {
    assert.equal(source.slice(t.start, t.end), t.value);
    assert.ok(t.end > t.start);
  }
  assert.ok(!first.tokens.some(t => ['critical-reader', 'nb-selecting',
    'transform-pipeline', 'critical-read_'].includes(t.value)));
  for (let i=0; i<25; i++) assert.deepEqual(scanOreslang(source), first);
});
