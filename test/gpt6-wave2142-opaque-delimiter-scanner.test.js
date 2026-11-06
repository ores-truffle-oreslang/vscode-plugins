'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {scanOreslang}=require('../lib/scan');

test('nested comments, raw templates and quoted Symbol bodies are scanner-opaque',()=>{
  const tick=String.fromCharCode(96);
  const source=[
    '/* outer { if ) /* nested { while ] */ } */',
    tick+'opaque } ] ) { if while '+String.fromCharCode(92)+tick+' still-opaque'+tick,
    '#"escaped \\" if ] ) return"',
    'return;',
  ].join('\n');
  const result=scanOreslang(source);
  assert.deepEqual(result.diagnostics,[]);
  assert.deepEqual(result.tokens.map(t=>t.kind),['symbol','keyword']);
  assert.equal(result.tokens[0].value,'#"escaped \\" if ] ) return"');
  assert.equal(result.tokens[1].value,'return');
  assert.equal(result.tokens[1].start,source.lastIndexOf('return;'));
  for(const token of result.tokens){
    assert.equal(source.slice(token.start,token.end),token.value);
  }
});

test('malformed quoted Symbol stops at newline and never swallows later valid code',()=>{
  const source='#"invalid \\q if return ]"\nlet value = 1;\nreturn;';
  const result=scanOreslang(source);
  assert.equal(result.diagnostics.length,1);
  assert.match(result.diagnostics[0].message,/Invalid or unterminated quoted Symbol/);
  assert.equal(result.diagnostics[0].start,0);
  assert.deepEqual(result.tokens.map(t=>t.value),['let','return']);
  assert.deepEqual(result.tokens.map(t=>t.start),[source.indexOf('let '),source.lastIndexOf('return;')]);
});
