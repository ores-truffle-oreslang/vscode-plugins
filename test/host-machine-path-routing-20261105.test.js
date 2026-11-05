'use strict';
// Host machine protocol admission and editor path ownership; not compiler-guest execution.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { parseCompilerOutputRecords } = require('../lib/compiler-output');
const { matchesCompilerDiagnosticPath } = require('../lib/diagnostic-path');

test('valid compiler records for imported files are not attached to active editor', () => {
  const workspace = path.resolve(process.cwd(), 'host-machine-routing-fixture');
  const active = path.join(workspace, 'src', 'entry.ores');
  const records = parseCompilerOutputRecords(JSON.stringify({
    version: 1,
    diagnostics: [
      { path: 'src/entry.ores', message: 'active diagnostic', severity: 'ERROR' },
      { path: 'src/other.ores', message: 'imported diagnostic', severity: 'WARNING' },
      { path: 'src/entry.ores\0forged', message: 'malicious origin' },
      { path: null, message: 'unlocated compatibility diagnostic' },
    ],
  }));
  assert.deepEqual(records.map(record => record.message), [
    'active diagnostic', 'imported diagnostic', 'unlocated compatibility diagnostic',
  ]);
  const attached = records.filter(record =>
    matchesCompilerDiagnosticPath(record.path, active, workspace));
  assert.deepEqual(attached.map(record => record.message), [
    'active diagnostic', 'unlocated compatibility diagnostic',
  ]);
  assert.equal(attached[0].path, 'src/entry.ores');
  assert.equal(attached[1].path, null);
});
