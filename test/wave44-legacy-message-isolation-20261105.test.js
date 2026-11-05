'use strict';
// Host-only legacy diagnostic parsing regression; no compiler execution claim.
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCompilerOutputRecords } = require('../lib/compiler-output');

const output = [
  'src/alpha.ores:2:4: warning: first warning',
  'compiler progress: assembling',
  'src/beta.ores:9:2: error: second issue'
].join('\n');

test('two legacy diagnostics retain distinct paths and skip unrelated output', () => {
  const records = parseCompilerOutputRecords(output);
  assert.equal(records.length, 2);
  assert.deepEqual(records.map(r => [r.path, r.line, r.column, r.severity, r.message]), [
    ['src/alpha.ores', 2, 4, 'warning', 'first warning'],
    ['src/beta.ores', 9, 2, 'error', 'second issue'],
  ]);
});

test('a caller mutation does not corrupt a subsequent compiler-output parse', () => {
  const first = parseCompilerOutputRecords(output);
  first[0].message = 'forged message';
  first[0].path = 'injected.ores';
  first.push({ path: 'injected.ores', message: 'fake' });
  const second = parseCompilerOutputRecords(output);
  assert.equal(second.length, 2);
  assert.equal(second[0].message, 'first warning');
  assert.equal(second[0].path, 'src/alpha.ores');
});
