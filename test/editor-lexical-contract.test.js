'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {scanOreslang} = require('../lib/scan');

const raw = fs.readFileSync(path.join(__dirname,'../contracts/editor-syntax/v1/editor-lexical-contract.json'));
const contract = JSON.parse(raw.toString('utf8'));
const PIN = 'e9dbf3b6fad5562b7ca6df631ab3c45f478480ba';
const gitBlob = crypto.createHash('sha1').update('blob '+raw.length+'\0').update(raw).digest('hex');

test('pins exact shared Oreslang editor lexical fixture Git blob',()=>{
  assert.equal(gitBlob,PIN);
  assert.equal(contract.version,1);
  assert.equal(contract.compilerSnapshot.lexerBlobSha,'bba9e091c0ad1c9b75e0c61e9dd173fcc18a236a');
  assert.match(contract.status,/NOT parser or backend acceptance/);
});

for(const fixture of contract.fixtures) {
  test('shared lexer fixture: '+fixture.id,()=>{
    const actual = scanOreslang(fixture.source).tokens;
    const has = t=>actual.some(x=>x.kind===t.kind && x.value===t.value);
    for(const expected of fixture.expected) {
      if(expected.kind==='plain') {
        assert.ok(!actual.some(x=>x.value===expected.value),fixture.id+': '+expected.value);
      } else {
        assert.ok(has(expected),fixture.id+': '+expected.kind+' '+expected.value);
      }
    }
    for(const forbidden of fixture.forbidden||[]) {
      assert.ok(!has(forbidden),fixture.id+': leaked '+forbidden.value);
    }
  });
}

test('every reserved word from the pinned Java lexer is recognized by the scanner',()=>{
  for(const word of contract.reservedWords) {
    const expected=contract.runtimeControlWords.includes(word)?'runtimeGlobal':
      contract.comparisonOperatorWords.includes(word)?'operator':'keyword';
    const actual=scanOreslang(word).tokens;
    assert.ok(actual.some(t=>t.value===word && t.kind===expected),
      'missing reserved '+expected+': '+word);
  }
});
