'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {scanOreslang}=require('../lib/scan');

// These are source-owned editor diagnostics, not compiled AttoLang runtime proof.
test('quoted Symbol NFC 256-byte boundary is inclusive and preserves next-line tokens',()=>{
  const allowed='#"'+'é'.repeat(128)+'"';
  const decomposed='#"'+'e\u0301'.repeat(128)+'"';
  for(const symbol of [allowed,decomposed]){
    const source=symbol+'\nreturn';
    const out=scanOreslang(source);
    assert.deepEqual(out.diagnostics,[]);
    assert.ok(out.tokens.some(t=>t.kind==='symbol'&&t.value===symbol));
    assert.ok(out.tokens.some(t=>t.kind==='keyword'&&t.value==='return'));
  }
});
test('over-budget Symbol cannot grant an opaque body keyword authority',()=>{
  const denied='#"'+'é'.repeat(129)+' throw"';
  const source=denied+'\r\nreturn';
  const out=scanOreslang(source);
  assert.equal(out.diagnostics.length,1);
  assert.match(out.diagnostics[0].message,/Symbol/);
  assert.equal(out.tokens.some(t=>t.kind==='symbol'),false);
  assert.equal(out.tokens.some(t=>t.kind==='runtimeGlobal'),false);
  assert.deepEqual(out.tokens.filter(t=>t.kind==='keyword').map(t=>t.value),['return']);
});
