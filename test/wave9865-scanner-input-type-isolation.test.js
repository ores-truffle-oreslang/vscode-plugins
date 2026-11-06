'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {scanOreslang} = require('../lib/scan');

test('only primitive strings are accepted without invoking user coercion', () => {
  let coercions=0;
  const hostile={
    toString(){coercions++;throw Error('must not coerce source');},
    [Symbol.toPrimitive](){coercions++;throw Error('must not run');},
  };
  const nonstrings=[null,undefined,0,42,42n,true,[],['return'],
    Buffer.from('return'),new String('return'),hostile,Symbol('return')];
  for(const value of nonstrings) {
    assert.throws(()=>scanOreslang(value),TypeError);
  }
  assert.equal(coercions,0);
});

test('each scan independently owns its token and delimiter diagnostic state', () => {
  const good='(return)';
  const bad='{return';
  const a=scanOreslang(good);
  assert.deepEqual(a.diagnostics,[]);
  assert.deepEqual(a.tokens.map(t=>t.value),['return']);
  const b=scanOreslang(bad);
  assert.deepEqual(b.tokens.map(t=>t.value),['return']);
  assert.equal(b.diagnostics.length,1);
  assert.match(b.diagnostics[0].message,/Unclosed delimiter/);
  for(let round=0;round<25;round++) {
    assert.deepEqual(scanOreslang(good),a);
    assert.deepEqual(scanOreslang(bad),b);
    assert.deepEqual(scanOreslang('return').diagnostics,[]);
  }
  b.tokens[0].value='tampered';
  b.diagnostics[0].message='tampered';
  assert.equal(scanOreslang(bad).tokens[0].value,'return');
  assert.match(scanOreslang(bad).diagnostics[0].message,/Unclosed delimiter/);
});
