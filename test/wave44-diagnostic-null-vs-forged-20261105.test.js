'use strict';
// Host-only diagnostic-origin trust boundary; no compiler guest execution.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const {matchesCompilerDiagnosticPath} = require('../lib/diagnostic-path');

const cwd = path.resolve(process.cwd(), 'wave44-fixture');
const active = path.join(cwd, 'src', 'main.ores');

test('legacy absent origin is distinct from an explicit malformed origin', () => {
  assert.equal(matchesCompilerDiagnosticPath(null, active, cwd), true);
  assert.equal(matchesCompilerDiagnosticPath(undefined, active, cwd), true);
  for (const forged of ['', 0, false, {}, [], 'src/main.ores\0evil']) {
    assert.equal(matchesCompilerDiagnosticPath(forged, active, cwd), false,
      'explicit malformed origin must not inherit active-file authority');
  }
});

test('canonical aliases match; prefix neighbors and parent escapes do not', () => {
  assert.equal(matchesCompilerDiagnosticPath('./src/../src/main.ores', active, cwd), true);
  assert.equal(matchesCompilerDiagnosticPath(active, active, cwd), true);
  for (const reported of [
    'src/main.ores.bak',
    '../wave44-fixture-evil/src/main.ores',
    path.resolve(cwd, '..', 'wave44-fixture-evil', 'src', 'main.ores'),
    'src/other.ores',
  ]) {
    assert.equal(matchesCompilerDiagnosticPath(reported, active, cwd), false, reported);
  }
});
