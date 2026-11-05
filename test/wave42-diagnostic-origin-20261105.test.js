'use strict';
// Source-only editor origin identity and legacy unlocated-diagnostic contract.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const {matchesCompilerDiagnosticPath} = require('../lib/diagnostic-path');

test('explicit malformed origins are denied rather than treated as unlocated', () => {
  const cwd = path.resolve(process.cwd(), 'wave42-cwd');
  const active = path.join(cwd, 'src', 'main.ores');
  for (const reported of ['', 'src/main.ores\u0000.txt', [], {}, 42]) {
    assert.equal(matchesCompilerDiagnosticPath(reported, active, cwd), false);
  }
  assert.equal(matchesCompilerDiagnosticPath('src/main.ores', active, cwd), true);
  assert.equal(matchesCompilerDiagnosticPath('src/../src/main.ores', active, cwd), true);
  assert.equal(matchesCompilerDiagnosticPath('../wave42-cwd-other/src/main.ores', active, cwd), false);
});

test('legacy absent origin is distinct from a malformed explicit source path', () => {
  const cwd = path.resolve(process.cwd(), 'wave42-cwd');
  const active = path.join(cwd, 'src', 'main.ores');
  assert.equal(matchesCompilerDiagnosticPath(null, active, cwd), true);
  assert.equal(matchesCompilerDiagnosticPath(undefined, active, cwd), true);
  assert.equal(matchesCompilerDiagnosticPath('src/main.ores', 'src/main.ores', cwd), false);
  assert.equal(matchesCompilerDiagnosticPath('src/main.ores', active, 'relative-cwd'), false);
});