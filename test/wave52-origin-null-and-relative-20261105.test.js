'use strict';
// Host-only editor diagnostic provenance and filesystem path comparison.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const {matchesCompilerDiagnosticPath} = require('../lib/diagnostic-path');

test('absent legacy origin is accepted but explicit forged paths are not', () => {
  const cwd = path.resolve(process.cwd(), 'wave52-boundary');
  const active = path.join(cwd, 'src', 'main.ores');
  assert.equal(matchesCompilerDiagnosticPath(null, active, cwd), true);
  assert.equal(matchesCompilerDiagnosticPath(undefined, active, cwd), true);
  assert.equal(matchesCompilerDiagnosticPath('./src/../src/main.ores', active, cwd), true);
  assert.equal(matchesCompilerDiagnosticPath(active, active, cwd), true);
  for (const foreign of ['src/main.ores.extra', 'src/main.ores\0alias',
    '../wave52-boundary-other/src/main.ores', 0, {}]) {
    assert.equal(matchesCompilerDiagnosticPath(foreign, active, cwd), false);
  }
  assert.equal(matchesCompilerDiagnosticPath('src/main.ores', active, 'relative-cwd'), false);
  assert.equal(matchesCompilerDiagnosticPath('src/main.ores', 'src/main.ores', cwd), false);
});
