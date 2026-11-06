'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {EventEmitter} = require('node:events');
const {launchCompiler} = require('../lib/compiler-process');

function fakeChild() {
  const child = new EventEmitter();
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.kills = [];
  child.kill = signal => { child.kills.push(signal); return true; };
  return child;
}
function runFake(limit) {
  const child = fakeChild();
  const callbacks = [];
  const returned = launchCompiler({
    spawn(command, args, supplied) {
      assert.equal(command, 'atto');
      assert.deepEqual(args, ['check', 'code.ores']);
      assert.equal(supplied.shell, false);
      assert.deepEqual(supplied.stdio, ['ignore', 'pipe', 'pipe']);
      return child;
    },
  }, 'atto', ['check', 'code.ores'],
  {cwd: '/tmp', timeout: 30000, maxBuffer: limit},
  (error, stdout, stderr) => callbacks.push({error, stdout, stderr}));
  assert.equal(returned, child);
  return {child, callbacks};
}
test('UTF-8 byte lengths share an inclusive cap across two stream emitters', () => {
  const {child, callbacks} = runFake(6);
  child.stdout.emit('data', '🙂');
  child.stderr.emit('data', 'é');
  child.emit('close', 0, null);
  assert.equal(callbacks.length, 1);
  assert.equal(callbacks[0].error, null);
  assert.equal(callbacks[0].stdout, '🙂');
  assert.equal(callbacks[0].stderr, 'é');
  assert.deepEqual(child.kills, []);
  child.emit('close', 7, null);
  assert.equal(callbacks.length, 1);
});
test('one byte beyond combined cap stops process and settles once despite late events', () => {
  const {child, callbacks} = runFake(6);
  child.stdout.emit('data', '🙂');
  child.stderr.emit('data', 'é');
  child.stdout.emit('data', Buffer.from('X'));
  assert.equal(callbacks.length, 1);
  assert.match(callbacks[0].error.message, /bounded output budget/);
  assert.deepEqual(child.kills, ['SIGKILL']);
  assert.equal(callbacks[0].stdout, '🙂');
  assert.equal(callbacks[0].stderr, 'é');
  child.stderr.emit('data', 'stale');
  child.emit('error', new Error('late launch error'));
  child.emit('close', 0, null);
  assert.equal(callbacks.length, 1);
});
