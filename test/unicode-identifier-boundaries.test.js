'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {scanOreslang} = require('../lib/scan');

const identities = [
  'éreturn', 'returné', '中eq', 'eq中',
  'πpanic', 'panicπ', 'αgpu', 'gpuα',
  'éreturn_suffix', 'return_中'
];

test('Java BMP Unicode letters shield complete identifier from keyword coloring', () => {
  for (const source of identities) {
    const result = scanOreslang(source);
    assert.deepEqual(result.diagnostics, [], source);
    assert.deepEqual(result.tokens, [], source);
  }
});

test('Unicode identifier does not suppress separate following keyword', () => {
  for (const source of identities) {
    const result = scanOreslang(source + ' return');
    assert.deepEqual(result.diagnostics, [], source);
    assert.deepEqual(result.tokens.map(x=>[x.kind,x.value]),[['keyword','return']], source);
  }
});
