'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');
const path = require('node:path');
const {scanOreslang} = require('../lib/scan');

const bytes=fs.readFileSync(path.join(__dirname,'../contracts/editor-syntax/v1/compiler-lexical-differential-v1.tsv'));
const blob=crypto.createHash('sha1')
  .update(Buffer.from('blob '+bytes.length+'\0')).update(bytes).digest('hex');
const hexDecode=hex=>{
  assert.match(hex,/^(?:[a-f0-9]{4})+$/);
  let result='';
  for(let i=0;i<hex.length;i+=4) result+=String.fromCharCode(parseInt(hex.slice(i,i+4),16));
  return result;
};
const records=bytes.toString('utf8').trimEnd().split('\n')
  .filter(s=>s&&!s.startsWith('#'))
  .map(s=>{
    const x=s.split('\t');
    assert.equal(x.length,5,'well-formed synthetic fixture line');
    return {id:x[0],source:hexDecode(x[1]),types:x[2],
      symbolName:x[3]==='-'?null:hexDecode(x[3]),error:x[4]};
  });

test('VS Code uses the exact 34-case compiler differential Git blob',()=>{
  assert.equal(blob,'eeed64b7d33c262b35120662386435575982a9bc');
  assert.equal(records.length,34);
  assert.equal(new Set(records.map(x=>x.id)).size,34);
  assert.equal(records.filter(x=>x.types==='ERROR').length,11);
});

test('Unicode identifiers and valid Symbols match the shared lexical input corpus',()=>{
  for(const entry of records.filter(x=>x.id.startsWith('ident-'))){
    const actual=scanOreslang(entry.source);
    assert.deepEqual(actual.diagnostics,[],entry.id);
    const expected=entry.id==='ident-following-keyword'
      ? [{kind:'keyword',value:'return'}] : [];
    assert.deepEqual(actual.tokens.map(x=>({kind:x.kind,value:x.value})),expected,entry.id);
  }
  for(const entry of records.filter(x=>x.id.startsWith('symbol-'))){
    const actual=scanOreslang(entry.source);
    assert.deepEqual(actual.diagnostics,[],entry.id);
    assert.deepEqual(actual.tokens.filter(x=>x.kind==='symbol').map(x=>x.value),
      [entry.source],entry.id);
  }
});

test('malformed Symbol surrogates and invalid host encodings fail closed',()=>{
  for(const entry of records.filter(x=>x.id.startsWith('bad-symbol-'))){
    const actual=scanOreslang(entry.source);
    assert.equal(actual.tokens.filter(x=>x.kind==='symbol').length,0,entry.id);
  }
  for(const id of ['bad-nul-in-comment','bad-unpaired-in-comment']){
    const entry=records.find(x=>x.id===id);
    const actual=scanOreslang(entry.source);
    assert.deepEqual(actual.tokens,[],id);
    assert.equal(actual.diagnostics.length,1,id);
  }
});
