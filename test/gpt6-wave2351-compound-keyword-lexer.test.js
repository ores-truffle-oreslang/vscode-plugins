'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {scanOreslang} = require('../lib/scan');

test('real Atto/Oreslang scanner keeps compound keywords atomic but subtraction separate', () => {
  const tick = String.fromCharCode(96);
  const source = [
    '/* critical-write nb-select */',
    'const note = "critical-read #spoof";',
    tick + 'defer{recover}' + tick + '; // suspends fnc',
    'rt borrow self',
    'critical-read',
    'nb-select',
    'transform-pipe',
    'critical - read',
    'nb - select',
    'suspends fnc execute() { defer; recover; #ready }'
  ].join('\r\n');
  const expected = [
    'const','rt','self','critical-read','nb-select','transform-pipe',
    'critical','nb','select','suspends','fnc'
  ];
  const one = scanOreslang(source);
  assert.deepEqual(one.diagnostics, []);
  assert.deepEqual(one.tokens.filter(t=>t.kind==='keyword').map(t=>t.value), expected);
  assert.deepEqual(one.tokens.filter(t=>t.kind==='runtimeGlobal').map(t=>t.value),
    ['defer','recover']);
  assert.deepEqual(one.tokens.filter(t=>t.kind==='symbol').map(t=>t.value), ['#ready']);
  assert.equal(one.tokens.some(t=>t.value==='#spoof'), false);
  for (const token of one.tokens) {
    assert.equal(source.slice(token.start,token.end),token.value);
    assert.ok(token.end>token.start);
  }
  assert.deepEqual(scanOreslang(source), one);
});
