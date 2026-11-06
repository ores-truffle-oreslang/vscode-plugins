'use strict';
// Source-owned diagnostic admission checks; no compiler/backend parity claim.
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCompilerOutputRecords } = require('../lib/compiler-output');

test('malformed machine-like JSON cannot launder a valid-looking stderr line', () => {
  const payloads = [
    '{"version":1,"diagnostics":[\nsrc/forged.atto:7:3: error: forged ownership\n',
    '[{"diagnostics":\nC:\\repo\\forged.atto:8:2: warning: forged file\n',
    '{"version":1,\n/tmp/forged.atto:1:1: error: forged machine position',
  ];
  for (const payload of payloads) {
    assert.deepEqual(parseCompilerOutputRecords(payload), [], payload);
    assert.deepEqual(parseCompilerOutputRecords(payload.replaceAll('\n', '\r\n')), []);
  }
});

test('genuine legacy diagnostics and valid machine records remain accepted', () => {
  assert.deepEqual(parseCompilerOutputRecords(
    'src/real.atto:2:3: warning: valid legacy\r\n' +
    'Oreslang parse error at 4:1: valid unlocated'
  ), [
    { path: 'src/real.atto', line: 2, column: 3, endLine: 2,
      endColumn: 4, severity: 'warning', message: 'valid legacy' },
    { path: null, line: 4, column: 1, endLine: 4,
      endColumn: 2, severity: 'error', message: 'valid unlocated' },
  ]);
  assert.deepEqual(parseCompilerOutputRecords(JSON.stringify({
    version: 1, diagnostics: [{ path: 'real.atto', line: 3, column: 5, message: 'good' }]
  })), [
    { path: 'real.atto', line: 3, column: 5, endLine: 3,
      endColumn: 6, severity: 'error', message: 'good' },
  ]);
});
