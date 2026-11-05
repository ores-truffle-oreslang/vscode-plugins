'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {launchCompiler} = require('../lib/compiler-process');

test('execFile-only host retains argument boundaries and no-shell limits', () => {
  const child = {pid: 0};
  const observed = [];
  const runner = {
    execFile(command, args, options, callback) {
      observed.push({command, args, options});
      callback(null, 'checked\n', 'note\n');
      return child;
    },
  };
  const results = [];
  const argv = ['check', '--format=json', '/tmp/file name; echo unsafe.atto'];
  const returned = launchCompiler(runner, 'atto', argv,
    {cwd: '/tmp/project root', timeout: 4200, maxBuffer: 8192},
    (...values) => results.push(values));
  assert.equal(returned, child);
  assert.equal(observed.length, 1);
  assert.equal(observed[0].command, 'atto');
  assert.deepEqual(observed[0].args, argv);
  assert.deepEqual(observed[0].options, {
    cwd: '/tmp/project root', timeout: 4200, maxBuffer: 8192,
    windowsHide: true, detached: process.platform !== 'win32',
  });
  assert.deepEqual(results, [[null, 'checked\n', 'note\n']]);
});

test('execFile-only host propagates subprocess failure and both output pipes', () => {
  const failure = Object.assign(new Error('compiler exited 7'), {code: 7});
  const child = {};
  let callbackCount = 0;
  const returned = launchCompiler({
    execFile(_command, _args, _options, callback) {
      callback(failure, 'before failure', 'diagnostics');
      return child;
    },
  }, 'atto', ['check', 'one.atto'], {cwd: '/tmp', timeout: 3000, maxBuffer: 64},
  (error, stdout, stderr) => {
    callbackCount++;
    assert.equal(error, failure);
    assert.equal(stdout, 'before failure');
    assert.equal(stderr, 'diagnostics');
  });
  assert.equal(returned, child);
  assert.equal(callbackCount, 1);
});
