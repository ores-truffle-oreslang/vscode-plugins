'use strict';
// Host-side origin attribution only; not native AttoLang execution.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { matchesCompilerDiagnosticPath } = require('../lib/diagnostic-path');

test('only canonical aliases of the active document can claim its diagnostics', () => {
  const cwd = path.resolve('wave47-workspace-root');
  const active = path.join(cwd, 'src', 'current.ores');
  for (const alias of ['src/current.ores', 'src/./current.ores',
    'src/nested/../current.ores', active]) {
    assert.equal(matchesCompilerDiagnosticPath(alias, active, cwd), true, alias);
  }
  for (const foreign of ['src/current.ores.bak', 'src/current.ores2',
    'src/other.ores', '../outside.ores', 'src/current.ores\0evil', '',
    42, { toString: () => 'src/current.ores' }]) {
    assert.equal(matchesCompilerDiagnosticPath(foreign, active, cwd), false,
      String(foreign));
  }
  assert.equal(matchesCompilerDiagnosticPath(null, active, cwd), true);
  assert.equal(matchesCompilerDiagnosticPath(undefined, active, cwd), true);
});
