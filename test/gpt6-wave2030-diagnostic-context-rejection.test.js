// A legacy unlocated diagnostic may attach only with a valid active document.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const {matchesCompilerDiagnosticPath: matches} = require('../lib/diagnostic-path.js');

test('null-origin legacy records cannot bypass editor and workspace validation', () => {
  const cwd = path.resolve(process.cwd(), 'wave2030-workspace');
  const active = path.join(cwd, 'main.ores');
  for (const unlocated of [null, undefined]) {
    assert.equal(matches(unlocated, active, cwd), true);
    for (const badActive of [null, '', 'relative.ores', active + '\0x']) {
      assert.equal(matches(unlocated, badActive, cwd), false);
    }
    for (const badCwd of [null, '', 'relative-root', cwd + '\0x']) {
      assert.equal(matches(unlocated, active, badCwd), false);
    }
  }
  assert.equal(matches('main.ores', active, cwd), true);
  assert.equal(matches('main.ores\0forged', active, cwd), false);
});
