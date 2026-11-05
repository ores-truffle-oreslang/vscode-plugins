'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { matchesCompilerDiagnosticPath } = require('../lib/diagnostic-path');

test('Unicode source paths require exact normalized origin, not path-prefix matches', () => {
  const cwd = path.resolve(process.cwd(), 'wave46-project');
  const active = path.join(cwd, 'src', 'Ω.ores');
  assert.equal(matchesCompilerDiagnosticPath('src/Ω.ores', active, cwd), true);
  assert.equal(matchesCompilerDiagnosticPath('./src/../src/Ω.ores', active, cwd), true);
  for (const reported of [
    'src/Ω.ores.bak',
    'src/Ω.ores/child',
    '../wave46-project-extra/src/Ω.ores',
    'src/Ω.ores\u0000suffix',
    ['src/Ω.ores'],
    new String('src/Ω.ores'),
  ]) {
    assert.equal(matchesCompilerDiagnosticPath(reported, active, cwd), false);
  }
});
