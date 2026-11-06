'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {scanOreslang} = require('../lib/scan');

test('UTF-16 source offsets remain exact after astral text and opaque nested comments', () => {
  const source = '🙂/* outer /* defer */ raise */\r\nconst 名稱 = #ready; return';
  const result = scanOreslang(source);
  assert.deepEqual(result.diagnostics, []);
  assert.deepEqual(result.tokens.map(t=>[t.kind,t.value]), [
    ['keyword','const'],['symbol','#ready'],['keyword','return']
  ]);
  for (const token of result.tokens) {
    assert.equal(source.slice(token.start,token.end),token.value);
    assert.equal(token.start,source.indexOf(token.value));
  }
  const other = scanOreslang('🙂[return]');
  assert.deepEqual(other.diagnostics, []);
  assert.deepEqual(other.tokens.map(t=>t.value),['return']);
  assert.equal(other.tokens[0].start,3);
});

test('mismatched bracket diagnostics do not pollute later independent scans', () => {
  const broken = scanOreslang('🙂([)] return');
  assert.ok(broken.diagnostics.some(d=>/Mismatched delimiter/.test(d.message)));
  assert.ok(broken.tokens.some(t=>t.value==='return'));
  const good = scanOreslang('🙂([#ready]) return');
  assert.deepEqual(good.diagnostics, []);
  assert.deepEqual(good.tokens.map(t=>t.value),['#ready','return']);
  for (const token of good.tokens) {
    assert.equal(good.tokens.filter(t=>t.value===token.value).length,1);
  }
});
