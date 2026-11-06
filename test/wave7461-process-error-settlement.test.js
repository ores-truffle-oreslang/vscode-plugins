'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {EventEmitter} = require('node:events');
const {launchCompiler} = require('../lib/compiler-process');

function fakeChild() {
  const child = new EventEmitter();
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.kill = () => true;
  return child;
}

// All compiler callbacks are one-shot even if process events arrive out of order.
test('spawn failure retains prior output, prevents late stdout, and settles exactly once', () => {
  const child = fakeChild();
  let opts;
  const callbacks = [];
  launchCompiler({spawn: (_cmd, _argv, o) => {opts=o;return child;}}, 'oreslang',
    ['check', 'literal;&$(not-a-shell).atto'],
    {cwd:process.cwd(),timeout:1200,maxBuffer:128},
    (error,stdout,stderr)=>callbacks.push({error,stdout,stderr}));
  assert.equal(opts.shell,false);
  assert.deepEqual(opts.stdio,['ignore','pipe','pipe']);
  child.stdout.emit('data',Buffer.from('💠'));
  child.stderr.emit('data',Buffer.from('warning'));
  const original = Error('spawn ENOENT');
  child.emit('error',original);
  child.stdout.emit('data',Buffer.from('late'));
  child.stderr.emit('data',Buffer.from('late'));
  child.emit('close',127,'SIGTERM');
  assert.equal(callbacks.length,1);
  assert.equal(callbacks[0].error,original);
  assert.equal(callbacks[0].stdout,'💠');
  assert.equal(callbacks[0].stderr,'warning');
});

test('nonzero exit and subsequent error do not overwrite original failure', () => {
  const child=fakeChild();
  const callbacks=[];
  launchCompiler({spawn:()=>child},'oreslang',['check'],
    {cwd:process.cwd(),timeout:1200,maxBuffer:64},
    (error,stdout,stderr)=>callbacks.push({error,stdout,stderr}));
  child.stderr.emit('data',Buffer.from('invalid\n'));
  child.emit('close',9,null);
  child.emit('error',Error('late'));
  assert.equal(callbacks.length,1);
  assert.equal(callbacks[0].error.code,9);
  assert.match(callbacks[0].error.message,/exited: 9/);
  assert.equal(callbacks[0].stderr,'invalid\n');
});
