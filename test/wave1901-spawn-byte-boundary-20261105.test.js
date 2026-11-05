'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {EventEmitter} = require('node:events');
const {launchCompiler} = require('../lib/compiler-process');

function fakeChild() {
  const child = new EventEmitter();
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.killCount = 0;
  child.kill = () => { child.killCount++; };
  return child;
}

test('combined output at exactly the byte limit preserves split multibyte UTF-8', () => {
  const child = fakeChild();
  const callbacks = [];
  const runner = {spawn(command, args, options) {
    assert.equal(command, 'atto');
    assert.deepEqual(args, ['check', 'unicode.atto']);
    assert.equal(options.shell, false);
    assert.deepEqual(options.stdio, ['ignore', 'pipe', 'pipe']);
    assert.equal(options.detached, process.platform !== 'win32');
    return child;
  }};
  const result = launchCompiler(runner, 'atto', ['check', 'unicode.atto'],
    {cwd: process.cwd(), timeout: 5000, maxBuffer: 5},
    (...values) => callbacks.push(values));
  assert.equal(result, child);
  const rocket = Buffer.from('🚀');
  child.stdout.emit('data', rocket.subarray(0, 2));
  child.stdout.emit('data', rocket.subarray(2));
  child.stderr.emit('data', Buffer.from('!'));
  child.emit('close', 0, null);
  assert.deepEqual(callbacks, [[null, '🚀', '!']]);
  assert.equal(child.killCount, 0);
  child.emit('close', 0, null);
  child.stdout.emit('data', Buffer.from('late'));
  assert.equal(callbacks.length, 1);
});

test('nonzero compiler exit keeps full diagnostics and settles once', () => {
  const child = fakeChild();
  const callbacks = [];
  launchCompiler({spawn: () => child}, 'atto', ['check', 'bad.atto'],
    {cwd: process.cwd(), timeout: 5000, maxBuffer: 4096},
    (...values) => callbacks.push(values));
  child.stderr.emit('data', Buffer.from('syntax error\n'));
  child.stdout.emit('data', Buffer.from('partial\n'));
  child.emit('close', 7, null);
  child.emit('error', new Error('late error'));
  assert.equal(callbacks.length, 1);
  assert.match(callbacks[0][0].message, /exited: 7/);
  assert.equal(callbacks[0][0].code, 7);
  assert.equal(callbacks[0][1], 'partial\n');
  assert.equal(callbacks[0][2], 'syntax error\n');
});
