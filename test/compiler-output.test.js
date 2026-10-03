'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCompilerOutputRecords } = require('../lib/compiler-output');

test('parses oreslang CLI protocol v1 JSON', () => {
  const records = parseCompilerOutputRecords(JSON.stringify({
    version: 1,
    ok: false,
    diagnostics: [{
      version: 1,
      path: '/tmp/demo.ores',
      range: {
        start: { line: 7, column: 13 },
        end: { line: 7, column: 14 }
      },
      severity: 'error',
      message: 'expected expression'
    }]
  }));

  assert.deepEqual(records, [{
    path: '/tmp/demo.ores',
    line: 7,
    column: 13,
    endLine: 7,
    endColumn: 14,
    severity: 'error',
    message: 'expected expression'
  }]);
});

test('keeps plain compiler diagnostics as a compatibility fallback', () => {
  const records = parseCompilerOutputRecords(
    '/tmp/demo.ores:7:13: error: expected expression'
  );

  assert.deepEqual(records, [{
    path: null,
    line: 7,
    column: 13,
    endLine: 7,
    endColumn: 14,
    severity: 'error',
    message: 'expected expression'
  }]);
});

test('parses raw Oreslang positioned diagnostics too', () => {
  const records = parseCompilerOutputRecords(
    'Oreslang parse error at 2:9: expected module or top-level declaration'
  );

  assert.equal(records[0].line, 2);
  assert.equal(records[0].column, 9);
  assert.equal(records[0].message, 'expected module or top-level declaration');
});

test('ignores unrelated process output', () => {
  assert.deepEqual(parseCompilerOutputRecords('build cache warm\nall good'), []);
});
