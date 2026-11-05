'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCompilerOutputRecords } = require('../lib/compiler-output');

test('only protocol-v1 diagnostic arrays may yield machine diagnostics', () => {
  for (const payload of [
    { version: 2, diagnostics: [{ message: 'wrong version' }] },
    { version: 1, diagnostics: { message: 'not an array' } },
    [{ message: 'top-level array' }],
    { version: true, diagnostics: [{ message: 'wrong type' }] },
  ]) {
    assert.deepEqual(parseCompilerOutputRecords(JSON.stringify(payload)), []);
  }
});

test('malformed siblings are dropped without displacing valid exact-boundary diagnostics', () => {
  const payload = { version: 1, diagnostics: [
    null, [], 100, false,
    { message: 'zero line', line: 0, column: 1 },
    { message: 'excessive line', line: 10000001, column: 1 },
    { message: 'boundary', path: 'src/main.ores', line: 10000000, column: 1,
      severity: 'WARNING' },
  ] };
  assert.deepEqual(parseCompilerOutputRecords(JSON.stringify(payload)), [{
    path: 'src/main.ores', line: 10000000, column: 1, endLine: 10000000,
    endColumn: 2, severity: 'warning', message: 'boundary',
  }]);
});