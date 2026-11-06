'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {scanOreslang} = require('../lib/scan');

test('mismatched closing delimiter does not discard the current unmatched opener', () => {
  const source = '([)] return';
  const first = scanOreslang(source);
  assert.deepEqual(first.tokens, [{kind:'keyword',start:5,end:11,value:'return'}]);
  assert.equal(first.diagnostics.length, 2);
  assert.equal(first.diagnostics[0].start, 2);
  assert.equal(first.diagnostics[0].end, 3);
  assert.match(first.diagnostics[0].message, /Mismatched delimiter/);
  assert.match(first.diagnostics[0].message, /expected/);
  assert.equal(first.diagnostics[1].start, 0);
  assert.equal(first.diagnostics[1].end, 1);
  assert.match(first.diagnostics[1].message, /Unclosed delimiter/);
  for(let i=0;i<20;i++) assert.deepEqual(scanOreslang(source),first);
});

test('opaque nested delimiters never affect balanced outer stack or later tokens', () => {
  const source = '({ /* [ } ( ] /* [ */ still */ } ) return';
  const result = scanOreslang(source);
  assert.deepEqual(result.diagnostics, []);
  assert.deepEqual(result.tokens.map(t=>[t.kind,t.value]),[['keyword','return']]);
  for(const token of result.tokens) {
    assert.equal(source.slice(token.start,token.end),token.value);
  }
  const unmatched = scanOreslang('] return');
  assert.equal(unmatched.diagnostics.length,1);
  assert.equal(unmatched.diagnostics[0].start,0);
  assert.match(unmatched.diagnostics[0].message,/Unexpected closing delimiter/);
  assert.deepEqual(unmatched.tokens.map(t=>t.value),['return']);
});
