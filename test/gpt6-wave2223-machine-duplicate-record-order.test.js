'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCompilerOutputRecords } = require('../lib/compiler-output');

// Host parser test only: records from distinct source files must remain
// separately attributable, even with identical messages and coordinates.
test('versioned machine protocol preserves ordered duplicate valid records across malformed peers', () => {
  const first = {
    path: 'src/alpha.atto', message: '  same failure  ', severity: 'WARNING',
    range: { start: { line: 2, column: 3 }, end: { line: 2, column: 4 } },
  };
  const second = {
    path: 'src/beta.atto', message: 'same failure', severity: 'INFO',
    line: 7, column: 9,
  };
  const malformed = {
    path: 'src/forged.atto', message: 'malformed span',
    range: { start: [1, 2], end: { line: 3, column: 2 } },
  };
  const payload = JSON.stringify({
    version: 1, diagnostics: [first, malformed, second, { ...first }],
  });
  const expected = [
    { path: 'src/alpha.atto', line: 2, column: 3, endLine: 2, endColumn: 4,
      severity: 'warning', message: 'same failure' },
    { path: 'src/beta.atto', line: 7, column: 9, endLine: 7, endColumn: 10,
      severity: 'info', message: 'same failure' },
    { path: 'src/alpha.atto', line: 2, column: 3, endLine: 2, endColumn: 4,
      severity: 'warning', message: 'same failure' },
  ];

  for (let run = 0; run < 3; run++) {
    assert.deepEqual(parseCompilerOutputRecords(payload), expected);
  }
  assert.deepEqual(parseCompilerOutputRecords(JSON.stringify({
    version: 2, diagnostics: [first],
  })), [], 'unknown machine envelopes cannot downgrade to legacy stderr');
  assert.deepEqual(parseCompilerOutputRecords(JSON.stringify({
    version: 1, diagnostics: [malformed, { ...second, message: '  ' }, first],
  })), [expected[0]], 'malformed records must not suppress a valid neighbor');
});
