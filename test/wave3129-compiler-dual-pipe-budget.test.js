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
  child.kill = signal => {child.kills.push(signal); return true;};
  return child;
}
test('combined UTF-8 byte budget is enforced across both untrusted compiler pipes', () => {
  const child = fakeChild();
  let spawned;
  const results = [];
  launchCompiler({spawn: (command, args, opts) => {
    spawned = {command, args, opts}; return child;
  }}, 'oreslang', ['check', '--format=json', 'src/a.atto'],
  {cwd: process.cwd(), timeout: 1500, maxBuffer: 4},
  (error, stdout, stderr) => results.push({error, stdout, stderr}));
  assert.equal(spawned.opts.shell, false);
  assert.equal(spawned.opts.stdio[0], 'ignore');
  child.stdout.emit('data', Buffer.from('💠')); // exactly four UTF-8 bytes
  child.stderr.emit('data', Buffer.from('x')); // fifth byte from second pipe
  assert.equal(results.length, 1);
  assert.match(results[0].error.message, /bounded output budget/);
  assert.equal(results[0].stdout, '💠');
  assert.equal(results[0].stderr, '');
  assert.deepEqual(child.kills, ['SIGKILL']);
  child.stdout.emit('data', Buffer.from('hidden'));
  child.emit('error', Error('late error'));
  child.emit('close', 0, null);
  assert.equal(results.length, 1, 'late events must not publish duplicate results');
});

test('exact combined byte limit is accepted with separate stdout and stderr', () => {
  const child = fakeChild();
  const results = [];
  launchCompiler({spawn: () => child}, 'oreslang', ['check'],
    {cwd: process.cwd(), timeout: 1500, maxBuffer: 5},
    (error, stdout, stderr) => results.push({error, stdout, stderr}));
  child.stdout.emit('data', Buffer.from('a'));
  child.stderr.emit('data', Buffer.from('💠'));
  child.emit('close', 0, null);
  assert.equal(results.length, 1);
  assert.equal(results[0].error, null);
  assert.equal(results[0].stdout, 'a');
  assert.equal(results[0].stderr, '💠');
  assert.deepEqual(child.kills, []);
});
