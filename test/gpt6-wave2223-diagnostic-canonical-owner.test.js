'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { matchesCompilerDiagnosticPath: owns } = require('../lib/diagnostic-path');

// Host editor trust boundary, not native AttoLang compiler diagnostic proof.
test('only the exact normalized source owner receives imported-file diagnostics', () => {
  const cwd = path.join(path.resolve(path.sep, 'workspace'), 'project');
  const active = path.join(cwd, 'src', 'unit.atto');
  const valid = [
    'src/unit.atto',
    'src/nested/../unit.atto',
    path.join(cwd, 'src', 'unit.atto'),
  ];
  for (const origin of valid) {
    assert.equal(owns(origin, active, cwd), true, 'valid origin ' + origin);
  }

  const foreign = [
    'src/unit.atto.bak',
    'src/unit.atto2',
    'src/%2e%2e/unit.atto',
    'src/other/unit.atto',
    '../project-other/src/unit.atto',
    'src/un\u0456t.atto',
  ];
  for (const origin of foreign) {
    assert.equal(owns(origin, active, cwd), false, 'foreign origin ' + origin);
  }

  assert.equal(owns(null, active, cwd), true, 'legacy unlocated diagnostic with valid editor');
  assert.equal(owns(null, 'relative/unit.atto', cwd), false);
  assert.equal(owns(null, active, 'relative/cwd'), false);
  assert.equal(owns('src/unit.atto\0suffix', active, cwd), false);
  assert.equal(owns('src/unit.atto', active + '\0', cwd), false);
  assert.equal(owns('src/unit.atto', active, cwd + '\0'), false);
});
