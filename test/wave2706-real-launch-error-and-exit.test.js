'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {setTimeout: sleep} = require('node:timers/promises');
const {launchCompiler} = require('../lib/compiler-process');

// Exercise the shipped compiler subprocess adapter with genuine OS processes.
// The executable is Node, not an AttoLang compiler, so this is host evidence.
test('missing compiler executable reports ENOENT exactly once', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'wave2706-missing-'));
  try {
    const missing = path.join(directory, 'nonexistent-compiler-2706');
    assert.equal(fs.existsSync(missing), false);
    let callCount = 0;
    const outcome = await new Promise((resolve) => {
      launchCompiler(childProcess, missing, ['check', 'source.atto'],
        {cwd: directory, timeout: 10000, maxBuffer: 8192},
        (error, stdout, stderr) => {
          callCount++;
          resolve({error, stdout, stderr});
        });
    });
    assert.equal(outcome.error?.code, 'ENOENT');
    assert.equal(outcome.stdout, '');
    assert.equal(outcome.stderr, '');
    await sleep(25);
    assert.equal(callCount, 1, 'later close must not repeat an error callback');
  } finally {
    fs.rmSync(directory, {recursive: true, force: true});
  }
});

test('real failed compiler process preserves both Unicode diagnostic pipes', async () => {
  const program = "process.stdout.write('partial 🚀');" +
    "process.stderr.write('error 漢\\n');process.exitCode=7;";
  let calls = 0;
  const result = await new Promise((resolve) => {
    launchCompiler(childProcess, process.execPath, ['-e', program],
      {cwd: process.cwd(), timeout: 10000, maxBuffer: 8192},
      (error, stdout, stderr) => {
        calls++;
        resolve({error, stdout, stderr});
      });
  });
  assert.equal(result.error?.code, 7);
  assert.match(result.error?.message || '', /exited: 7/);
  assert.equal(result.stdout, 'partial 🚀');
  assert.equal(result.stderr, 'error 漢\n');
  await sleep(25);
  assert.equal(calls, 1);
});
