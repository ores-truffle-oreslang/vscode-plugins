'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {scanOreslang} = require('../lib/scan');

test('valid escaped Unicode Symbols remain atomic with source-accurate spans', () => {
  const source = "#'\\u00e9' #\"\\uD83D\\uDE00\" #alpha return";
  const output = scanOreslang(source);
  assert.deepEqual(output.diagnostics, []);
  assert.deepEqual(output.tokens.map(t => [t.kind,t.value]), [
    ['symbol', "#'\\u00e9'"],
    ['symbol', "#\"\\uD83D\\uDE00\""],
    ['symbol', '#alpha'],
    ['keyword', 'return']
  ]);
  for (const token of output.tokens) {
    assert.equal(source.slice(token.start,token.end),token.value);
  }
});

test('invalid escaped controls and unsupported escapes cannot color source or swallow next line', () => {
  const bad = [
    "#'\\u202E'",
    "#\"\\u0001\"",
    "#'bad\\q'",
    "#\"\\uD800\""
  ];
  for (const prefix of bad) {
    const source = prefix + '\r\nreturn';
    const result = scanOreslang(source);
    assert.equal(result.diagnostics.length, 1, prefix);
    assert.match(result.diagnostics[0].message, /Symbol/, prefix);
    assert.deepEqual(result.tokens.map(t=>t.value), ['return'],prefix);
    assert.equal(result.tokens[0].start,source.indexOf('return'),prefix);
  }
});
