'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {EventEmitter} = require('node:events');
const {launchCompiler} = require('../lib/compiler-process');

function mockedProcess() {
  const child = new EventEmitter();
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.pid = 0;
  child.kills = 0;
  child.kill = () => { child.kills++; return true; };
  const module = {spawn(command, args, options) {
    assert.equal(options.shell, false);
    assert.equal(options.stdio[0], 'ignore');
    assert.equal(command, 'atto');
    assert.deepEqual(args, ['check']);
    return child;
  }};
  return {module, child};
}

test('error followed by close and late output settles exactly once', () => {
  const {module, child} = mockedProcess();
  const results = [];
  launchCompiler(module, 'atto', ['check'], {
    cwd: process.cwd(), timeout: 5000, maxBuffer: 64
  }, (error, out, err) => results.push({error, out, err}));
  child.stdout.emit('data', Buffer.from('ready'));
  child.emit('error', new Error('child failed'));
  child.stderr.emit('data', Buffer.from('late'));
  child.emit('close', 0, null);
  assert.equal(results.length, 1);
  assert.match(results[0].error.message, /child failed/);
  assert.equal(results[0].out, 'ready');
  assert.equal(results[0].err, '');
});

test('combined stdout and stderr byte-budget closes children without callback replay', () => {
  const {module, child} = mockedProcess();
  const results = [];
  launchCompiler(module, 'atto', ['check'], {
    cwd: process.cwd(), timeout: 5000, maxBuffer: 6
  }, (error, out, err) => results.push({error, out, err}));
  child.stdout.emit('data', Buffer.from('1234'));
  child.stderr.emit('data', Buffer.from('789'));
  child.emit('close', 1, 'SIGKILL');
  child.stdout.emit('data', Buffer.from('ignored'));
  assert.equal(child.kills, 1);
  assert.equal(results.length, 1);
  assert.match(results[0].error.message, /output budget/);
  assert.equal(results[0].out, '1234');
  assert.equal(results[0].err, '');
});

test('nonzero exit preserves bounded diagnostics and reports numeric code once', () => {
  const {module, child} = mockedProcess();
  const results = [];
  launchCompiler(module, 'atto', ['check'], {
    cwd: process.cwd(), timeout: 5000, maxBuffer: 128
  }, (error, out, err) => results.push({error, out, err}));
  child.stderr.emit('data', Buffer.from('parse failure'));
  child.emit('close', 7, null);
  child.emit('close', 0, null);
  assert.equal(results.length, 1);
  assert.equal(results[0].error.code, 7);
  assert.equal(results[0].out, '');
  assert.equal(results[0].err, 'parse failure');
});
