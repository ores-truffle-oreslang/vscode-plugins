'use strict';
// Source-owned compiler diagnostic protocol test; not guest compiler execution.
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCompilerOutputRecords } = require('../lib/compiler-output');

test('one hostile machine record cannot contaminate adjacent valid diagnostics', () => {
  const payload = {
    version: 1,
    ok: false,
    diagnostics: [
      { message: ' first issue ', severity: 'INFO', path: 'src/first.ores',
        range: { start: { line: 3, column: 8 } } },
      { message: 'invalid line', path: 'src/forged.ores',
        range: { start: { line: 0, column: 1 } } },
      { message: ' second issue ', severity: 'HINT', path: null,
        range: { start: { line: 12, column: 4 }, end: { line: 13, column: 2 } } },
      { message: '', path: 'src/empty.ores' },
    ],
  };
  assert.deepEqual(parseCompilerOutputRecords(JSON.stringify(payload)), [
    { path: 'src/first.ores', line: 3, column: 8, endLine: 3,
      endColumn: 9, severity: 'info', message: 'first issue' },
    { path: null, line: 12, column: 4, endLine: 13,
      endColumn: 2, severity: 'hint', message: 'second issue' },
  ]);
});
