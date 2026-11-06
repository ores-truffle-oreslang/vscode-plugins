'use strict';
// Untrusted machine JSON admission — host-only, not compiler guest validation.
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCompilerOutputRecords } = require('../lib/compiler-output');

test('malformed explicit nested ranges do not become forged fallback coordinates', () => {
  const valid = {
    path: 'src/猫.atto', severity: 'HINT', message: '  legitimate neighbor  ',
    range: { start: { line: 4, column: 5 }, end: { line: 5, column: 1 } },
  };
  const invalid = [
    { path: 'bad-array.atto', message: 'bad range', range: [] },
    { path: 'bad-scalar.atto', message: 'bad range', range: 0 },
    { path: 'bad-start.atto', message: 'bad start', range: { start: [] } },
    { path: 'bad-end.atto', message: 'bad end', range: { end: [] } },
    { path: 'backwards.atto', message: 'backwards', range: { start: { line: 9, column: 2 }, end: { line: 8, column: 9 } } },
    { path: 'empty.atto', message: 'empty span', range: { start: { line: 1, column: 1 }, end: { line: 1, column: 1 } } },
  ];
  const peer = { path: null, message: '  unlocated  ', line: 2, column: 3 };
  const records = parseCompilerOutputRecords(JSON.stringify({
    version: 1, diagnostics: [invalid[0], valid, ...invalid.slice(1), peer],
  }));
  assert.deepEqual(records, [
    { path: 'src/猫.atto', line: 4, column: 5, endLine: 5, endColumn: 1,
      severity: 'hint', message: 'legitimate neighbor' },
    { path: null, line: 2, column: 3, endLine: 2, endColumn: 4,
      severity: 'error', message: 'unlocated' },
  ]);
  assert.deepEqual(parseCompilerOutputRecords(JSON.stringify({ version: '1', diagnostics: [valid] })),
    [], 'unsupported machine envelope cannot fall back to a forged legacy diagnostic');
});
