'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {scanOreslang} = require('../lib/scan');

test('eq, neq and is are comparison operators, never identifier keywords', () => {
  const source = 'eq neq is';
  const result = scanOreslang(source);
  assert.deepEqual(result.diagnostics, []);
  assert.deepEqual(result.tokens.map(t => [t.kind,t.value]),
    [['operator','eq'],['operator','neq'],['operator','is']]);
  for (const token of result.tokens) {
    assert.equal(source.slice(token.start,token.end),token.value);
  }
});

test('opaque strings, comments and template text never emit comparison operators', () => {
  const tick = String.fromCharCode(96);
  const source = '/* eq neq is /* eq */ neq */ "eq neq is" '
    + "'eq neq is' " + tick + 'eq neq is' + tick
    + ' // eq neq is\r\n' + 'eq neq is';
  const result = scanOreslang(source);
  assert.deepEqual(result.diagnostics, []);
  assert.deepEqual(result.tokens.map(t => [t.kind,t.value]),
    [['operator','eq'],['operator','neq'],['operator','is']]);
  assert.deepEqual(scanOreslang('equal neq_name island is2').tokens, []);
  assert.deepEqual(scanOreslang('is neq eq'), scanOreslang('is neq eq'));
});