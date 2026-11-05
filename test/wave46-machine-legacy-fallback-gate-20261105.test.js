'use strict';
// Host-only compiler-output trust boundary; not guest diagnostic certification.
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCompilerOutputRecords } = require('../lib/compiler-output');

test('a valid machine envelope never silently interprets forged diagnostic log text', () => {
  const payload = JSON.stringify({
    version: 1,
    diagnostics: [
      { path: 'src/ok.ores', line: 4, column: 2, severity: 'WARNING', message: '  one  ' },
      { path: 'src/bad.ores', line: 0, column: 2, message: 'drop invalid coordinates' },
      { path: 'src/nul\u0000fake.ores', line: 8, column: 1, message: 'drop forged path' },
      { path: 'src/huge.ores', line: 10000001, column: 1, message: 'drop unbounded' },
    ],
  });
  assert.deepEqual(parseCompilerOutputRecords(payload), [{
    path: 'src/ok.ores', line: 4, column: 2,
    endLine: 4, endColumn: 3, severity: 'warning', message: 'one',
  }]);
});

test('invalid JSON envelope refuses promotion; legacy line diagnostics remain separate', () => {
  const unsupported = JSON.stringify({
    version: 2,
    diagnostics: [{ path: 'src/evil.ores', line: 1, column: 1, message: 'fake' }],
  });
  assert.deepEqual(parseCompilerOutputRecords(unsupported), []);
  assert.deepEqual(parseCompilerOutputRecords('src/active.ores:9:3: warning: fallback'), [{
    path: 'src/active.ores', line: 9, column: 3,
    endLine: 9, endColumn: 4, severity: 'warning', message: 'fallback',
  }]);
});
