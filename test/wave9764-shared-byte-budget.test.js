'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const {setTimeout: sleep} = require('node:timers/promises');
const {launchCompiler} = require('../lib/compiler-process');

// Real Node subprocesses, exercising shipped no-shell compiler adapter.
// This is host-process evidence, not compiler guest execution.
async function runWithBudget(maxBuffer) {
  const source = "process.stdout.write('😀');process.stderr.write('漢');";
  let calls = 0;
  const outcome = await new Promise(resolve => {
    launchCompiler(childProcess, process.execPath, ['-e', source],
      {cwd: process.cwd(), timeout: 8000, maxBuffer},
      (error, stdout, stderr) => {
        calls++;
        resolve({error, stdout, stderr});
      });
  });
  await sleep(25);
  return {...outcome, calls};
}

test('UTF-8 byte-budget admits exactly seven bytes across both pipes', async () => {
  const actual = await runWithBudget(7);
  assert.equal(actual.error, null);
  assert.equal(actual.stdout, '😀');
  assert.equal(actual.stderr, '漢');
  assert.equal(Buffer.byteLength(actual.stdout) + Buffer.byteLength(actual.stderr), 7);
  assert.equal(actual.calls, 1);
});

test('one byte below shared pipe budget rejects and invokes callback once', async () => {
  const actual = await runWithBudget(6);
  assert.match(actual.error?.message || '', /exceeded bounded output budget/);
  assert.equal(actual.calls, 1);
  assert.ok(Buffer.byteLength(actual.stdout) + Buffer.byteLength(actual.stderr) <= 6);
});
