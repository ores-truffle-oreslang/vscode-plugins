'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const contractPath = path.join(root,'contracts/editor-syntax/v1/editor-lexical-contract.json');
const proposalPath = path.join(root,'conformance/oreslang-syntax-v1.json');
const bridgePath = path.join(root,'contracts/editor-syntax/v1/profile-reconciliation.json');
const contract=JSON.parse(fs.readFileSync(contractPath,'utf8'));
const proposal=JSON.parse(fs.readFileSync(proposalPath,'utf8'));
const bridge=JSON.parse(fs.readFileSync(bridgePath,'utf8'));
const gitBlob = file => {
  const raw = fs.readFileSync(file);
  return crypto.createHash('sha1').update('blob '+raw.length+'\0').update(raw).digest('hex');
};
test('compiler-current and language-target are different, exact-pinned source profiles',()=>{
  assert.equal(bridge.schema,'oreslang.editor-syntax-profile-reconciliation/v1');
  assert.equal(bridge.resolution.mergeGate,'BLOCKED_COMPILER_PARITY');
  assert.equal(bridge.resolution.activeStackedEditorProfile,'compiler-current');
  assert.equal(bridge.resolution.explicitlyNotEquivalent,true);
  assert.equal(gitBlob(contractPath),bridge.profiles['compiler-current'].gitBlobSha);
  assert.equal(gitBlob(proposalPath),bridge.profiles['language-target'].gitBlobSha);
  assert.equal(contract.compilerSnapshot.lexerBlobSha,bridge.authority.lexerBlobSha);
  assert.equal(contract.compilerSnapshot.tokenBlobSha,bridge.authority.tokenBlobSha);
  assert.equal(contract.compilerSnapshot.grammarBlobSha,bridge.authority.grammarBlobSha);
  assert.equal(proposal.authority.repo,bridge.authority.repository);
  assert.equal(proposal.cases.length,50);
  assert.equal(bridge.differenceIds.length,6);
  for (const word of bridge.profiles['compiler-current'].reservedComparisonWords) {
    assert.ok(contract.reservedWords.includes(word),word);
    assert.ok(proposal.profiles.editorTarget.contextualIdentifierWords.includes(word),word);
  }
  for (const word of bridge.profiles['compiler-current'].reservedLegacyWords) {
    assert.ok(contract.reservedWords.includes(word),word);
    assert.ok(proposal.profiles.editorTarget.excludedReservedWords.includes(word),word);
  }
  for (const value of bridge.profiles['compiler-current'].operatorTokenCharacters) {
    assert.ok(contract.operatorTokenCharacters.includes(value),value);
    assert.ok(proposal.profiles.editorTarget.excludedArithmeticOperators.includes(value),value);
  }
  assert.ok(proposal.profiles.editorTarget.excludedArithmeticOperators.includes('^^'));
});
