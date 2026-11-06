'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { matchesCompilerDiagnosticPath } = require('../lib/diagnostic-path');

test('current-file diagnostic attribution is exact after safe lexical normalization', () => {
  const cwd = path.resolve(process.cwd(), 'gpt6-owned-project');
  const active = path.join(cwd, 'src', 'current.ores');
  const positive = [
    active, 'src/current.ores', 'src/./current.ores', 'src/pkg/../current.ores',
    './src/current.ores'
  ];
  for (const origin of positive) {
    assert.equal(matchesCompilerDiagnosticPath(origin, active, cwd), true, origin);
  }
  const foreign = [
    'src/current.ores.bak', 'src/current.ores/..', 'src/not-current.ores',
    '../another-project/src/current.ores', '../../src/current.ores',
    'src/current.ores\0evil', '', 1, [], {}, false,
  ];
  for (const origin of foreign) {
    assert.equal(matchesCompilerDiagnosticPath(origin, active, cwd), false, String(origin));
  }
  assert.equal(matchesCompilerDiagnosticPath(null, active, cwd), true);
  for (const invalid of ['current.ores', active + '\0alias', '']) {
    assert.equal(matchesCompilerDiagnosticPath(null, invalid, cwd), false);
  }
  for (const invalidCwd of ['relative', cwd + '\0untrusted', '']) {
    assert.equal(matchesCompilerDiagnosticPath(undefined, active, invalidCwd), false);
  }
});
