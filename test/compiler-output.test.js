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

test('rejects malformed and hostile JSON diagnostic coordinates', () => {
  const diagnostics = [
    { message: 'NaN', range: { start: { line: 'NaN', column: 1 } } },
    { message: 'huge', range: { start: { line: 999999999999999, column: 1 } } },
    { message: 'fraction', range: { start: { line: 1.5, column: 1 } } },
    { message: 'negative', range: { start: { line: 1, column: -3 } } },
    { message: 'reversed', range: { start: { line: 3, column: 5 }, end: { line: 2, column: 1 } } },
    { message: 'empty', range: { start: { line: 3, column: 5 }, end: { line: 3, column: 5 } } },
    { message: 'valid', range: { start: { line: 2, column: 7 } } }
  ];
  const records = parseCompilerOutputRecords(JSON.stringify({ version: 1, diagnostics }));
  assert.deepEqual(records.map(record => record.message), ['valid']);
  assert.equal(records[0].line, 2);
  assert.equal(records[0].endColumn, 8);
  assert.deepEqual(parseCompilerOutputRecords('file.ores:99999999999999999999999:2: error: corrupted'), []);
});

test('preserves cross-line ranges and normalizes untrusted severities', () => {
  const records = parseCompilerOutputRecords(JSON.stringify({
    version: 1,
    diagnostics: [{
      message: 'multiline',
      path: { bad: true },
      severity: 'fatal-internal-code',
      range: { start: { line: 4, column: 50 }, end: { line: 5, column: 2 } }
    }]
  }));
  assert.deepEqual(records, [{
    path: null, line: 4, column: 50, endLine: 5, endColumn: 2,
    severity: 'error', message: 'multiline'
  }]);
});
