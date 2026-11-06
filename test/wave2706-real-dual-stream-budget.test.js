'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const {setTimeout: sleep} = require('node:timers/promises');
const {launchCompiler} = require('../lib/compiler-process');

// Real Node child process, no compiler guest execution claim.
const source = "process.stdout.write('🚀'.repeat(40));process.stderr.write('漢'.repeat(30))";
const exactBytes = Buffer.byteLength('🚀'.repeat(40)) + Buffer.byteLength('漢'.repeat(30));

function run(maxBuffer) {
  let callbackCount = 0;
  return new Promise((resolve, reject) => {
    const child = launchCompiler(childProcess, process.execPath, ['-e', source],
      {cwd: process.cwd(), timeout: 10000, maxBuffer},
      (error, stdout, stderr) => {
        callbackCount++;
        resolve({error, stdout, stderr, child, getCallbackCount: () => callbackCount});
      });
    if (!child.pid) reject(new Error('real child process did not launch'));
  });
}

test('real stdout/stderr sum equal to byte cap is lossless', async () => {
  const result = await run(exactBytes);
  assert.equal(result.error, null);
  assert.equal(result.stdout, '🚀'.repeat(40));
  assert.equal(result.stderr, '漢'.repeat(30));
  assert.equal(Buffer.byteLength(result.stdout) + Buffer.byteLength(result.stderr), exactBytes);
  await sleep(15);
  assert.equal(result.getCallbackCount(), 1);
});

test('real stdout/stderr one byte past shared cap fails once', async () => {
  const result = await run(exactBytes - 1);
  assert.match(result.error?.message || '', /bounded output budget/);
  assert.ok(Buffer.byteLength(result.stdout) + Buffer.byteLength(result.stderr) <= exactBytes - 1);
  await sleep(15);
  assert.equal(result.getCallbackCount(), 1);
});
