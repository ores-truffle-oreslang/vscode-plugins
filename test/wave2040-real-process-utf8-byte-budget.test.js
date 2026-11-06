'use strict';
// Native host subprocess integration, not an AttoLang guest compiler test.
const test = require('node:test');
const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const {launchCompiler} = require('../lib/compiler-process');

// Both streams count toward one cap. UTF-8 byte lengths (not JS character
// counts) make the 6-byte stdout + 4-byte stderr boundary meaningful.
function run(maxBuffer) {
  return new Promise((resolve, reject) => {
    let calls = 0;
    const watchdog = setTimeout(() => reject(new Error('subprocess watchdog expired')), 10000);
    const script = 'process.stdout.write("ééé");process.stderr.write("🔥");';
    try {
      launchCompiler(childProcess, process.execPath, ['-e', script],
        {cwd: process.cwd(), timeout: 5000, maxBuffer},
        (error, stdout, stderr) => {
          calls++;
          clearTimeout(watchdog);
          resolve({error, stdout, stderr, calls});
        });
    } catch (error) {
      clearTimeout(watchdog);
      reject(error);
    }
  });
}

test('real no-shell child preserves both streams at exact combined UTF-8 byte cap', async () => {
  const {error, stdout, stderr, calls} = await run(10);
  assert.equal(error, null);
  assert.equal(stdout, 'ééé');
  assert.equal(stderr, '🔥');
  assert.equal(Buffer.byteLength(stdout) + Buffer.byteLength(stderr), 10);
  assert.equal(calls, 1);
});

test('real no-shell child rejects one byte below cap without accepting split streams', async () => {
  const {error, stdout, stderr, calls} = await run(9);
  assert.match(error?.message || '', /bounded output budget/);
  assert.ok(Buffer.byteLength(stdout) + Buffer.byteLength(stderr) <= 9);
  assert.equal(calls, 1);
});
