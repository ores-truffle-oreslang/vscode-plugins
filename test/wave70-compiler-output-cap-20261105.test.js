'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { launchCompiler } = require('../lib/compiler-process');

// Real library under synthetic child pipes; no compiler guest executed.
test('stdout and stderr share one byte budget and one settlement', () => {
  const child = new EventEmitter();
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.killCount = 0;
  child.kill = () => { child.killCount++; };
  const calls = [];
  let spawnCount = 0;
  const runner = {
    spawn(command, args, opts) {
      spawnCount++;
      assert.equal(command, 'atto');
      assert.deepEqual(args, ['check', 'unit.atto']);
      assert.equal(opts.shell, false);
      return child;
    },
  };

  const launched = launchCompiler(
    runner, 'atto', ['check', 'unit.atto'],
    { cwd: process.cwd(), timeout: 10000, maxBuffer: 5 },
    (error, stdout, stderr) => calls.push({error, stdout, stderr})
  );
  assert.equal(launched, child);
  child.stdout.emit('data', Buffer.from('abc'));
  child.stderr.emit('data', Buffer.from('def'));
  assert.equal(spawnCount, 1);
  assert.equal(child.killCount, 1);
  assert.equal(calls.length, 1);
  assert.match(calls[0].error.message, /bounded output budget/);
  assert.equal(calls[0].stdout, 'abc');
  assert.equal(calls[0].stderr, '');
  child.stderr.emit('data', Buffer.from('late'));
  child.emit('close', 1, 'SIGKILL');
  assert.equal(calls.length, 1, 'late close and data cannot settle twice');
});
