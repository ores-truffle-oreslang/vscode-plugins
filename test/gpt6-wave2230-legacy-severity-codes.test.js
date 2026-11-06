'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {parseCompilerOutputRecords} = require('../lib/compiler-output');

test('legacy stderr binds severity codes and Windows drive origins without newline spoof', () => {
  const input=[
    'C:\\dev\\atto\\alpha.atto:1:7: WARNING[W21]:  warning text  ',
    'D:\\work\\beta.atto:2:8: hint[H_1]: contextual hint',
    '/tmp/gamma.atto:3:9: info: informational',
    'Oreslang lexer error at 4:6: bad quoted symbol',
    'C:\\dev\\bad.atto:0:1: error: invalid line',
    'C:\\dev\\bad.atto:1:0: error: invalid column',
    'C:\\dev\\bad.atto:1:10000000: error: invalid end span',
  ].join('\r\n');
  const expected=[
    ['C:\\dev\\atto\\alpha.atto','warning','warning text',1,7,8],
    ['D:\\work\\beta.atto','hint','contextual hint',2,8,9],
    ['/tmp/gamma.atto','info','informational',3,9,10],
    [null,'error','bad quoted symbol',4,6,7],
  ];
  for(let i=0;i<8;i++) {
    const actual=parseCompilerOutputRecords(input);
    assert.deepEqual(actual.map(x=>[x.path,x.severity,x.message,x.line,x.column,x.endColumn]),expected);
  }
});

test('a malformed severity-code record never swallows subsequent valid diagnostics', () => {
  const input='alpha.atto:1:2: warning[W]: one\n'
    +'bogus-attempt-not-a-diagnostic\n'
    +'beta.atto:5:6: error[E1]: two';
  assert.deepEqual(parseCompilerOutputRecords(input).map(x=>x.message),['one','two']);
});
