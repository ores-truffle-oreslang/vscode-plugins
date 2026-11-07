'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { scanOreslang } = require('../lib/scan');

test('late invalid UTF-16 or NUL denies all previously scanned code tokens', () => {
  const prefix = 'pub fnc run() { const value = 42; return; }';
  const badCases = [
    prefix + ' // trailing bad high ' + String.fromCharCode(0xd800),
    prefix + ' /* trailing bad low ' + String.fromCharCode(0xdc00) + ' */',
    prefix + ' // hidden NUL ' + String.fromCharCode(0),
  ];
  for (const [i, source] of badCases.entries()) {
    const result = scanOreslang(source);
    assert.deepEqual(result.tokens, [], 'no partial trusted tokens: case ' + i);
    assert.equal(result.diagnostics.length, 1, 'one rejection: case ' + i);
    assert.match(result.diagnostics[0].message,
      /unpaired UTF-16 surrogate|NUL character/);
  }
});

test('legitimate astral scalars and opaque templates remain valid after denial', () => {
  const backtick = String.fromCharCode(96);
  const source = '/* 🦊 */ pub fnc run() { const value = ' +
    backtick + '🦊 braces {' + backtick + '; return; }';
  const result = scanOreslang(source);
  assert.deepEqual(result.diagnostics, []);
  assert.deepEqual(result.tokens.map(t => t.value),
    ['pub', 'fnc', 'const', 'return']);
});
