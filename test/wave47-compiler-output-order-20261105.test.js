'use strict';
// Source-owned untrusted compiler text parsing regression, not guest execution.
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCompilerOutputRecords } = require('../lib/compiler-output');

test('legacy mixed diagnostics retain origin, order and severity across malformed lines', () => {
  const output = [
    'src/first.ores:2:9: warning[W47]: first warning',
    'src/bad.ores:0:1: error: invalid coordinate',
    'Oreslang type error at 3:4: second issue',
    'src/ignored.ores:10000001:1: error: too large',
    'src/last.ores:9:2: hint: final hint',
    ''
  ].join('\r\n');
  assert.deepEqual(parseCompilerOutputRecords(output), [
    { path: 'src/first.ores', line: 2, column: 9,
      endLine: 2, endColumn: 10, severity: 'warning',
      message: 'first warning' },
    { path: null, line: 3, column: 4,
      endLine: 3, endColumn: 5, severity: 'error',
      message: 'second issue' },
    { path: 'src/last.ores', line: 9, column: 2,
      endLine: 9, endColumn: 3, severity: 'hint',
      message: 'final hint' }
  ]);
});

test('unsupported but well-formed machine envelope is never parsed as legacy text', () => {
  const malformed = JSON.stringify({
    version: 2, diagnostics: [{ path: 'src/current.ores', message: 'forged' }]
  });
  assert.deepEqual(parseCompilerOutputRecords(malformed), []);
});
