const test = require('node:test');
const assert = require('node:assert/strict');
const {parseCompilerOutputRecords} = require('../lib/compiler-output');

// Legacy stderr origin isolation is a host boundary, not compiler execution.
test('legacy CRLF diagnostics preserve Windows origin and reject tainted peer lines', () => {
  const lines = [
    'C:\\workspace\\🍀.atto:12:4: warning: first warning',
    'foreign\0path.atto:2:3: error: must be rejected',
    'bad.atto:9:10000000: error: off-by-one end column',
    'bad.atto:10000001:2: error: overflowed line',
    'Oreslang error at 3:9: unlocated real failure',
    './src/main.atto:6:5: hint:  keep this hint ',
    'uninformative plain log',
  ];
  const records = parseCompilerOutputRecords(lines.join('\r\n'));
  assert.deepEqual(records.map(d => d.message), [
    'first warning', 'unlocated real failure', 'keep this hint',
  ]);
  assert.deepEqual(records.map(d => [d.path, d.line, d.column, d.severity]), [
    ['C:\\workspace\\🍀.atto', 12, 4, 'warning'],
    [null, 3, 9, 'error'],
    ['./src/main.atto', 6, 5, 'hint'],
  ]);
  for (const record of records) {
    assert.equal(record.endLine, record.line);
    assert.equal(record.endColumn, record.column + 1);
    assert.ok(!record.path || !record.path.includes('\0'));
  }
  assert.deepEqual(parseCompilerOutputRecords(lines.join('\r\n')), records);
});
