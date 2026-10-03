'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCompilerOutputRecords } = require('../lib/compiler-output');

test('parses compiler PR 110 check-mode output', () => {
  const records = parseCompilerOutputRecords(
    '/tmp/demo.ores:7:13: error: expected expression'
  );

  assert.deepEqual(records, [{
    line: 7,
    column: 13,
    severity: 'error',
    message: 'expected expression'
  }]);
});

test('parses raw Oreslang positioned diagnostics too', () => {
  const records = parseCompilerOutputRecords(
    'Oreslang parse error at 2:9: expected module or top-level declaration'
  );

  assert.deepEqual(records, [{
    line: 2,
    column: 9,
    severity: 'error',
    message: 'expected module or top-level declaration'
  }]);
});

test('ignores unrelated process output', () => {
  assert.deepEqual(parseCompilerOutputRecords('build cache warm\nall good'), []);
});
