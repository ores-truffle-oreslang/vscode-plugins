'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {parseCompilerOutputRecords} = require('../lib/compiler-output');

test('legacy fallback never constructs an out-of-policy end column', () => {
  const plain = [
    'src/bound.ores:2:10000000: error: invalid terminal column',
    'src/bound.ores:2:9999999: warning: final in-bounds range',
  ].join('\n');
  const records = parseCompilerOutputRecords(plain);
  assert.deepEqual(records, [{
    path: 'src/bound.ores',
    line: 2, column: 9999999, endLine: 2, endColumn: 10000000,
    severity: 'warning', message: 'final in-bounds range',
  }]);
});

test('machine JSON and text fallback agree on invalid implicit end ranges', () => {
  const records = parseCompilerOutputRecords(JSON.stringify({
    version: 1, diagnostics: [{ path: 'src/bound.ores', line: 2, column: 10000000,
      message: 'invalid terminal column' }],
  }));
  assert.deepEqual(records, []);
});
