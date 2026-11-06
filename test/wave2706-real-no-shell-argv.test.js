'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {launchCompiler} = require('../lib/compiler-process');

// The executable is Node, not the AttoLang compiler; this is real host process
// isolation evidence, and cannot certify a guest language runtime.
test('real compiler-launch path passes shell metacharacters as literal argv', async () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'wave2706 cli argv space '));
  const injected = path.join(cwd, 'SHOULD_NOT_EXIST');
  const argument = 'literal; touch ' + injected + ' && echo unsafe | $(echo bad) <tag> "quote"';
  const script = 'process.stdout.write(JSON.stringify({argv: process.argv.slice(1), cwd: process.cwd()}))';
  try {
    const output = await new Promise((resolve, reject) => {
      const child = launchCompiler(childProcess, process.execPath, ['-e', script, argument],
        {cwd, timeout: 10000, maxBuffer: 8192},
        (error, stdout, stderr) => error ? reject(error) : resolve({stdout, stderr}));
      assert.ok(child.pid > 0, 'a real subprocess must be launched');
    });
    assert.equal(output.stderr, '');
    assert.deepEqual(JSON.parse(output.stdout), {argv: [argument], cwd});
    assert.equal(fs.existsSync(injected), false, 'argument text must never execute shell commands');
  } finally {
    fs.rmSync(cwd, {recursive: true, force: true});
  }
});
