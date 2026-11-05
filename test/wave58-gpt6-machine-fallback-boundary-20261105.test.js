'use strict';
// Host protocol-v1 and stderr fallback boundaries; not compiler parity.
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCompilerOutputRecords } = require('../lib/compiler-output');

test('recognized but invalid JSON envelopes never become legacy diagnostics', () => {
  assert.deepEqual(parseCompilerOutputRecords(JSON.stringify({
    version: 2,
    diagnostics: [{ message: 'forged', line: 1, column: 2 }],
  })), []);
  assert.deepEqual(parseCompilerOutputRecords(JSON.stringify({
    version: 1, diagnostics: { message: 'not an array' },
  })), []);
});

test('real CRLF stderr messages retain Windows origins and per-record severities', () => {
  const output = [
    'C:\\work\\main.atto:12:2: warning[W123]:  spaced warning  ',
    'progress: unrelated',
    'src/β.ores:5:7: info: ready',
  ].join('\r\n');
  assert.deepEqual(parseCompilerOutputRecords(output), [
    { path: 'C:\\work\\main.atto', line: 12, column: 2,
      endLine: 12, endColumn: 3, severity: 'warning', message: 'spaced warning' },
    { path: 'src/β.ores', line: 5, column: 7,
      endLine: 5, endColumn: 8, severity: 'info', message: 'ready' },
  ]);
});
