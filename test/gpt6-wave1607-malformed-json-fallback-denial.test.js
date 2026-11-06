'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {parseCompilerOutputRecords} = require('../lib/compiler-output');

test('malformed machine-protocol envelopes never fall through to forge legacy errors', () => {
  const forged = '/tmp/foreign.atto:99:8: error: attacker-controlled legacy diagnostic';
  for (const payload of [
    JSON.stringify({version: 2, diagnostics: [{message: forged}]}),
    '{"version":1,"diagnostics":[{"message":"bad"}]\n' + forged,
    '{"diagnostics":[],"version":1,"unexpected":\n' + forged,
    '[{"version":1,"diagnostics":[]}]\n' + forged
  ]) {
    assert.deepEqual(parseCompilerOutputRecords(payload), [],
      'versioned or malformed machine output must be fail-closed');
  }
  assert.deepEqual(parseCompilerOutputRecords(forged).map(x => x.message),
    ['attacker-controlled legacy diagnostic'],
    'ordinary standalone legacy stderr remains recognized');
});
