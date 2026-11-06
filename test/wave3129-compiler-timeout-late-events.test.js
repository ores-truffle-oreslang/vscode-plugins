'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {EventEmitter} = require('node:events');
const {launchCompiler} = require('../lib/compiler-process');

test('timeout terminates isolated compiler and ignores late close/error events', {timeout: 2000}, async () => {
  const child = new EventEmitter();
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  let kills = 0;
  child.kill = signal => { assert.equal(signal, 'SIGKILL'); kills++; return true; };
  const results = [];
  await new Promise((resolve, reject) => {
    launchCompiler({spawn: (_cmd, _args, opts) => {
      assert.equal(opts.shell, false);
      assert.equal(opts.detached, process.platform !== 'win32');
      return child;
    }}, 'oreslang', ['check'], {cwd: process.cwd(), timeout: 30, maxBuffer: 64},
    (error, stdout, stderr) => {
      results.push({error, stdout, stderr});
      resolve();
    });
    child.stdout.emit('data', Buffer.from('partial'));
  });
  assert.equal(kills, 1);
  assert.equal(results.length, 1);
  assert.match(results[0].error.message, /timed out/);
  assert.equal(results[0].stdout, 'partial');
  child.stderr.emit('data', Buffer.from('late'));
  child.emit('close', 0, null);
  child.emit('error', Error('late error'));
  child.emit('close', 1, 'SIGKILL');
  assert.equal(results.length, 1);
});
