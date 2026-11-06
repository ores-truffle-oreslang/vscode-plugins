// Only the active editor file may receive compiler diagnostics for imports.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const {matchesCompilerDiagnosticPath: matches} = require('../lib/diagnostic-path.js');

test('relative and absolute import paths are resolved against a pinned editor owner', () => {
  const cwd = path.resolve(process.cwd(), 'wave2030-workspace');
  const active = path.join(cwd, 'src', 'main.ores');
  const foreign = path.join(cwd, 'src', 'imported.ores');
  assert.equal(matches('src/main.ores', active, cwd), true);
  assert.equal(matches('./src/../src/main.ores', active, cwd), true);
  assert.equal(matches(active, active, cwd), true);
  assert.equal(matches('src/imported.ores', active, cwd), false);
  assert.equal(matches(foreign, active, cwd), false);
  assert.equal(matches('../other-workspace/main.ores', active, cwd), false);
  assert.equal(matches('', active, cwd), false);
  assert.equal(matches({path: active}, active, cwd), false);
});
