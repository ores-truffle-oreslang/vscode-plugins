'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { launchCompiler } = require('../lib/compiler-process');

// Host-side bounded process-pipe check; does not run a compiler.
test('a complete Unicode scalar plus stderr at exact byte limit is admitted', () => {
  const child = new EventEmitter();
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  let killed = 0, settled = 0;
  child.kill = () => { killed++; };
  const output = [];
  const runner = {
    spawn(command, args, opts) {
      assert.equal(command, 'atto');
      assert.deepEqual(args, ['check']);
      assert.equal(opts.stdio[1], 'pipe');
      assert.equal(opts.stdio[2], 'pipe');
      return child;
    },
  };
  const returned = launchCompiler(runner, 'atto', ['check'], {
    cwd: process.cwd(), timeout: 10000, maxBuffer: 5,
  }, (error, stdout, stderr) => {
    settled++;
    output.push({error, stdout, stderr});
  });
  assert.equal(returned, child);
  child.stdout.emit('data', Buffer.from('🙂'));
  child.stderr.emit('data', Buffer.from('x'));
  assert.equal(settled, 0);
  child.emit('close', 0, null);
  assert.equal(settled, 1);
  assert.equal(killed, 0);
  assert.equal(output[0].error, null);
  assert.equal(output[0].stdout, '🙂');
  assert.equal(output[0].stderr, 'x');
  child.emit('error', new Error('too late'));
  child.emit('close', 3, null);
  assert.equal(settled, 1);
});
