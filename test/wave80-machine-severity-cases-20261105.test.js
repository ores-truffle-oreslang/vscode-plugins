'use strict';
// Host-side diagnostic parser protocol only; no native compiler guest claim.
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCompilerOutputRecords } = require('../lib/compiler-output');

test('independent machine records normalize allowed severities and reject unknown severity labels', () => {
  const payload = { version: 1, diagnostics: [
    { path: 'src/one.ores', line: 2, column: 3, severity: 'WaRnInG', message: ' first ' },
    { path: 'src/two.ores', line: 4, column: 5, severity: 'HiNt', message: ' second ' },
    { path: 'src/three.ores', line: 6, column: 7, severity: 'INFO', message: ' third ' },
    { path: 'src/four.ores', line: 8, column: 9, severity: 'UNTRUSTED', message: ' fourth ' },
  ] };
  assert.deepEqual(parseCompilerOutputRecords(JSON.stringify(payload)), [
    { path: 'src/one.ores', line: 2, column: 3, endLine: 2, endColumn: 4, severity: 'warning', message: 'first' },
    { path: 'src/two.ores', line: 4, column: 5, endLine: 4, endColumn: 6, severity: 'hint', message: 'second' },
    { path: 'src/three.ores', line: 6, column: 7, endLine: 6, endColumn: 8, severity: 'info', message: 'third' },
    { path: 'src/four.ores', line: 8, column: 9, endLine: 8, endColumn: 10, severity: 'error', message: 'fourth' },
  ]);
});
