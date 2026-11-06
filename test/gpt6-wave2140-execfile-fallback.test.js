'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const process = require('node:process');
const {launchCompiler,execFileOptions} = require('../lib/compiler-process');

test('execFile-only compatibility preserves bounded options, literal argv and callback', () => {
  const cwd = process.cwd();
  const args = Object.freeze(['check', '--format=json', '/tmp/dir with spaces/🧪.atto']);
  const child = {pid: 0};
  const expectedOptions = execFileOptions(cwd, 2719, 4097);
  let callbacks=0;
  let calls=0;
  const stub = {
    execFile(command, receivedArgs, options, callback) {
      calls++;
      assert.equal(command, 'atto');
      assert.strictEqual(receivedArgs, args, 'never rewrite literal compiler argv');
      assert.deepEqual(options, expectedOptions);
      assert.equal(options.windowsHide, true);
      assert.equal(options.shell, undefined, 'execFile is the no-shell API');
      callback(null, '🧪 diagnostic\r\n', 'warning: 🛡️');
      return child;
    }
  };
  const returned = launchCompiler(stub, 'atto', args,
    {cwd,timeout:2719,maxBuffer:4097},(error,out,err) => {
      callbacks++;
      assert.equal(error,null);
      assert.equal(out,'🧪 diagnostic\r\n');
      assert.equal(err,'warning: 🛡️');
    });
  assert.strictEqual(returned,child);
  assert.equal(calls,1);
  assert.equal(callbacks,1);
  assert.deepEqual(args,['check','--format=json','/tmp/dir with spaces/🧪.atto']);
});
