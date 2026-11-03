'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {scanOreslang} = require('../lib/scan');

function symbols(source) {
  return scanOreslang(source).tokens.filter(t => t.kind === 'symbol').map(t => t.value);
}

test('quoted Symbol escapes are validated but remain source-preserving', () => {
  for (const source of [
    '#ready', "#'with spaces'", '#"quoted value"',
    String.raw`#"\u0061"`,
    String.raw`#"escaped \" quote"`
  ]) {
    const actual = scanOreslang(source);
    assert.deepEqual(actual.diagnostics, [],source);
    assert.deepEqual(symbols(source), [source],source);
  }
});

test('compiler-reserved invalid quoted Symbol escapes never look valid', () => {
  const invalid = [
    String.raw`#"bad\q"`,
    String.raw`#"bad\uZZZZ"`,
    String.raw`#"\uD800"`,
    String.raw`#"\n"`,
    String.raw`#"\u202e"`,
    '#""', "#''",
    '#"' + 'e'.repeat(1025) + '"',
    '#"' + 'é'.repeat(129) + '"',
    '#' + 'a'.repeat(129),
    '#"unterminated\nreturn',
    '#"raw\nreturn'
  ];
  for (const source of invalid) {
    const actual = scanOreslang(source);
    assert.deepEqual(symbols(source), [],source.slice(0,48));
    assert.ok(actual.diagnostics.some(x => /Symbol/.test(x.message)),source.slice(0,48));
  }
});

test('line boundary after invalid quoted Symbol remains independently tokenized', () => {
  for (const source of [
    '#"raw\nreturn', "#'raw\r\nreturn", String.raw`#"\q return"`+'\nreturn'
  ]) {
    const actual = scanOreslang(source);
    assert.ok(actual.diagnostics.some(x=>/Symbol/.test(x.message)),source);
    assert.deepEqual(actual.tokens.filter(x=>x.kind==='keyword').map(x=>x.value), ['return']);
  }
});

test('the editor never treats nested hostile comment content as Symbol input', () => {
  const source='/*'.repeat(1000)+'#"bad\\q" throw return'+'*/'.repeat(1000)+' #ready';
  const actual=scanOreslang(source);
  assert.deepEqual(actual.diagnostics,[]);
  assert.deepEqual(symbols(source),['#ready']);
});
