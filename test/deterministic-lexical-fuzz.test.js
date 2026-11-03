'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { scanOreslang } = require('../lib/scan');

function corpus(seed) {
  let state = seed >>> 0;
  return bound => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state % bound;
  };
}

test('cross-editor Unicode Symbol corpus: 384 deterministic inputs', () => {
  const next = corpus(0x5a17c0de);
  const scalars = ['a', 'z', '_', '7', 'é', '中', '😀', 'e', '\u0301'];
  for (let caseNo = 0; caseNo < 384; caseNo++) {
    let name = '';
    const count = 1 + next(32);
    for (let j = 0; j < count; j++) name += scalars[next(scalars.length)];
    const source = '#"' + name + '" return';
    const result = scanOreslang(source);
    assert.deepEqual(result.diagnostics, [], String(caseNo));
    assert.deepEqual(result.tokens.map(t => [t.kind, t.value]),
      [['symbol', '#"' + name + '"'], ['keyword', 'return']], String(caseNo));
  }
});

test('cross-editor comment opacity corpus: 256 deterministic nested cases', () => {
  const next = corpus(0xc011ab1e);
  for (let caseNo = 0; caseNo < 256; caseNo++) {
    const depth = 1 + next(256);
    const source = '/*'.repeat(depth) + ' throw raise #ready "return" ' +
      '*/'.repeat(depth) + ' return';
    const result = scanOreslang(source);
    assert.deepEqual(result.diagnostics, [], String(caseNo));
    assert.deepEqual(result.tokens.map(t => [t.kind, t.value]),
      [['keyword', 'return']], String(caseNo));
  }
});

test('cross-editor malformed UTF-16 corpus: 384 fail-closed cases', () => {
  const next = corpus(0x0badc0de);
  const high = String.fromCharCode(0xd800);
  const low = String.fromCharCode(0xdc00);
  const backtick = String.fromCharCode(96);
  const surrounds = ['', '/*', '//', '"', "'", backtick, '#"', 'return '];
  for (let caseNo = 0; caseNo < 384; caseNo++) {
    const broken = next(2) === 0 ? high : low;
    const source = surrounds[next(surrounds.length)] +
      'a'.repeat(next(24)) + broken + 'b'.repeat(next(24)) + ' return';
    const result = scanOreslang(source);
    assert.deepEqual(result.tokens, [], String(caseNo));
    assert.ok(result.diagnostics.some(d => /UTF-16/.test(d.message)), String(caseNo));
  }
});
