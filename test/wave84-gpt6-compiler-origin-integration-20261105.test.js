'use strict';
// Source-owned compiler JSON and active-editor origin trust boundary regression.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { parseCompilerOutputRecords } = require('../lib/compiler-output');
const { matchesCompilerDiagnosticPath } = require('../lib/diagnostic-path');

test('untrusted machine origin cannot launder imported diagnostics onto active file', () => {
  const cwd = path.resolve(process.cwd(), 'wave84-gpt6');
  const active = path.join(cwd, 'src', 'main.ores');
  const payload = {
    version: 1,
    diagnostics: [
      { path: 'src/main.ores', message: ' owned ', severity: 'WARNING', line: 2, column: 3 },
      { path: 'src/other.ores', message: ' imported ', line: 4, column: 5 },
      { path: 'src/main.ores.bak', message: ' forged ', line: 6, column: 7 },
      { path: 'src/main.ores\u0000tail', message: ' bad-nul ', line: 9, column: 1 },
      { path: null, message: ' legacy-unlocated ', line: 8, column: 2 },
    ],
  };
  const parsed = parseCompilerOutputRecords(JSON.stringify(payload));
  assert.deepEqual(parsed.map(record => record.message),
    ['owned', 'imported', 'forged', 'legacy-unlocated']);
  assert.deepEqual(parsed.filter(record =>
    matchesCompilerDiagnosticPath(record.path, active, cwd)
  ).map(record => ({ path: record.path, line: record.line, severity: record.severity })), [
    { path: 'src/main.ores', line: 2, severity: 'warning' },
    { path: null, line: 8, severity: 'error' },
  ]);
});
