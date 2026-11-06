'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { matchesCompilerDiagnosticPath } = require('../lib/diagnostic-path');

test('unlocated and source-located diagnostics refuse NUL-bearing active context', () => {
  const cwd = path.resolve(process.cwd(), 'wave3011-workspace');
  const active = path.join(cwd, 'src', 'main.ores');

  for (const origin of [null, undefined, 'src/main.ores']) {
    assert.equal(matchesCompilerDiagnosticPath(origin, active, cwd), true);
    assert.equal(matchesCompilerDiagnosticPath(origin, active + '\0forged', cwd), false);
    assert.equal(matchesCompilerDiagnosticPath(origin, active, cwd + '\0forged'), false);
  }
  assert.equal(matchesCompilerDiagnosticPath('src/other.ores', active, cwd), false);
  assert.equal(matchesCompilerDiagnosticPath('src/main.ores\0ignored', active, cwd), false);
});
