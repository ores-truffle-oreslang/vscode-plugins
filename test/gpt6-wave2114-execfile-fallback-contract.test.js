'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {launchCompiler} = require('../lib/compiler-process');
const {parseCompilerOutputRecords} = require('../lib/compiler-output');

test('execFile-only fallback passes literal hostile argv with bounded no-shell options', async () => {
  const fakeChild = {tag: 'compat-child'};
  const inputPath = 'src/δ;$(printf injected) "file".atto';
  const invocation = [];
  let done;
  const finished = new Promise(resolve => { done = resolve; });
  const machine = JSON.stringify({version:1,diagnostics:[{
    path:inputPath,severity:'info',message:'  测试 🚀  ',
    range:{start:{line:4,column:2},end:{line:4,column:5}}
  }]});
  const compat = {execFile(command,args,options,cb) {
    invocation.push({command,args,options});
    queueMicrotask(() => cb(null,machine,''));
    return fakeChild;
  }};
  const child = launchCompiler(compat,'atto',['check',inputPath],
    {cwd:'/tmp/project with spaces',timeout:1500,maxBuffer:8192},
    (...args) => done(args));
  assert.equal(child, fakeChild);
  assert.equal(invocation.length,1);
  assert.equal(invocation[0].command,'atto');
  assert.deepEqual(invocation[0].args,['check',inputPath]);
  assert.equal(invocation[0].options.cwd,'/tmp/project with spaces');
  assert.equal(invocation[0].options.timeout,1500);
  assert.equal(invocation[0].options.maxBuffer,8192);
  assert.equal(invocation[0].options.windowsHide,true);
  assert.equal(invocation[0].options.detached,process.platform!=='win32');
  assert.equal(invocation[0].options.shell,undefined);
  const [err,stdout,stderr] = await finished;
  assert.equal(err,null);
  assert.equal(stdout,machine);
  assert.equal(stderr,'');
  assert.deepEqual(parseCompilerOutputRecords(stdout), [{
    path:inputPath,line:4,column:2,endLine:4,endColumn:5,
    severity:'info',message:'测试 🚀'
  }]);
});

test('execFile-only fallback keeps the original failure and does not forge diagnostics', async () => {
  const failure = Object.assign(new Error('ENOENT: tool unavailable'),{code:'ENOENT'});
  let done;
  const result = new Promise(resolve => { done = resolve; });
  const compat = {execFile(cmd,args,opts,cb) {
    assert.equal(cmd,'missing-atto');
    assert.deepEqual(args,['check','src/a.atto']);
    queueMicrotask(() => cb(failure,'',''));
    return {tag:'missing-child'};
  }};
  launchCompiler(compat,'missing-atto',['check','src/a.atto'],
    {cwd:'/tmp',timeout:2000,maxBuffer:1024},(...args)=>done(args));
  const [error,out,stderr]=await result;
  assert.equal(error, failure);
  assert.equal(out,'');
  assert.equal(stderr,'');
  assert.deepEqual(parseCompilerOutputRecords(out),[]);
});
