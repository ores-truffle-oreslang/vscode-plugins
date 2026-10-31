'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const onig=require('vscode-oniguruma');
const vsctm=require('vscode-textmate');
const source=fs.readFileSync(path.join(__dirname,'../syntaxes/oreslang.tmLanguage.json'),'utf8');
const grammarDef=JSON.parse(source);
const p=JSON.parse(fs.readFileSync(path.join(__dirname,'../contracts/editor-syntax/v1/profile-reconciliation.json'),'utf8'));
const wasm=fs.readFileSync(require.resolve('vscode-oniguruma/release/onig.wasm'));
test('installed TextMate grammar is compiler-current and scopes legacy lexer tokens',async()=>{
  assert.equal(p.resolution.activeStackedEditorProfile,'compiler-current');
  assert.equal(grammarDef.scopeName,'source.oreslang');
  assert.ok(grammarDef.fileTypes.includes('ores'));
  await onig.loadWASM(wasm.buffer.slice(wasm.byteOffset,wasm.byteOffset+wasm.byteLength));
  const registry=new vsctm.Registry({
    onigLib:Promise.resolve({
      createOnigScanner:patterns=>new onig.OnigScanner(patterns),
      createOnigString:s=>new onig.OnigString(s)
    }),
    loadGrammar:scope=>scope==='source.oreslang'
      ?Promise.resolve(vsctm.parseRawGrammar(source,'oreslang.tmLanguage.json')):null
  });
  const grammar=await registry.loadGrammar('source.oreslang');
  assert.ok(grammar);
  const line='isoactor null let eq = 1; a % b ^ c; // return';
  const result=grammar.tokenizeLine(line,vsctm.INITIAL);
  function matching(word,start=0) {
    const pos=line.indexOf(word,start);
    assert.ok(pos>=0);
    const tok=result.tokens.find(t=>t.startIndex<=pos&&t.endIndex>pos);
    assert.ok(tok,'no token for '+word);
    return tok.scopes;
  }
  for(const word of ['isoactor','null']) {
    assert.ok(matching(word).some(s=>s.includes('lexer-reserved')||s.includes('keyword.declaration')),word);
  }
  assert.ok(matching('eq').some(s=>s==='keyword.operator.comparison.oreslang'));
  assert.ok(matching('%').some(s=>s==='keyword.operator.arithmetic.oreslang'));
  assert.ok(matching('^').some(s=>s==='keyword.operator.bitwise.oreslang'));
  assert.ok(matching('return').some(s=>s.startsWith('comment.line.oreslang')||s.startsWith('comment.line.double-slash.oreslang')));
});
