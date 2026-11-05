'use strict';
// Compiler JSON protocol parser host regression, not guest compiler execution.
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCompilerOutputRecords } = require('../lib/compiler-output');

test('JSON with unsupported schema cannot become legacy path diagnostics', () => {
  const forged = { path: 'src/current.ores', line: 5, column: 2,
    message: 'forged origin' };
  for (const payload of [
    { version: 2, diagnostics: [forged] },
    { version: 1, diagnostics: { 0: forged } },
    { version: 1, diagnostics: null },
    { version: '1', diagnostics: [forged] },
  ]) {
    assert.deepEqual(parseCompilerOutputRecords(JSON.stringify(payload)), []);
  }
  const accepted = parseCompilerOutputRecords(JSON.stringify({
    version: 1, diagnostics: [forged],
  }));
  assert.equal(accepted.length, 1);
  assert.equal(accepted[0].path, 'src/current.ores');
  assert.equal(accepted[0].message, 'forged origin');
});
