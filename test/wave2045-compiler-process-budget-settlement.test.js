'use strict';
// Host child-process seam; no actual compiler or AttoLang guest execution.
const test=require('node:test');
const assert=require('node:assert/strict');
const {EventEmitter}=require('node:events');
const {launchCompiler}=require('../lib/compiler-process');

function fakeFactory() {
  const child=new EventEmitter();
  child.pid=0; // Never signal a real OS process group in this stub.
  child.stdout=new EventEmitter();
  child.stderr=new EventEmitter();
  child.killCalls=[];
  child.kill=(signal)=>{ child.killCalls.push(signal); return true; };
  const calls=[];
  const process={
    spawn(command,args,options) {
      calls.push({command,args,options});
      return child;
    }
  };
  return {child,process,calls};
}

test('exact aggregate stdout/stderr byte cap preserves split UTF-8 and one argv token', () => {
  const fixture=fakeFactory();
  const results=[];
  const argv=['literal $(touch /tmp/never)', 'name with spaces'];
  launchCompiler(fixture.process,'compiler-literal',argv,
    {cwd:'/tmp',timeout:4000,maxBuffer:9},
    (error,stdout,stderr)=>results.push({error,stdout,stderr}));
  assert.equal(fixture.calls.length,1);
  assert.equal(fixture.calls[0].command,'compiler-literal');
  assert.deepEqual(fixture.calls[0].args,argv);
  assert.equal(fixture.calls[0].options.shell,false);
  assert.deepEqual(fixture.calls[0].options.stdio,['ignore','pipe','pipe']);
  const emoji=Buffer.from('💠');
  fixture.child.stdout.emit('data',emoji.subarray(0,2));
  fixture.child.stderr.emit('data',Buffer.from('hello'));
  fixture.child.stdout.emit('data',emoji.subarray(2));
  fixture.child.emit('close',0,null);
  assert.equal(results.length,1);
  assert.equal(results[0].error,null);
  assert.equal(results[0].stdout,'💠');
  assert.equal(results[0].stderr,'hello');
  assert.equal(fixture.child.killCalls.length,0);
  fixture.child.stdout.emit('data',Buffer.from('late'));
  fixture.child.emit('close',9,'SIGKILL');
  assert.equal(results.length,1);
});

test('one extra byte from the other pipe kills and settles once despite late errors', () => {
  const fixture=fakeFactory();
  const results=[];
  launchCompiler(fixture.process,'compiler',['--check'],
    {cwd:'/tmp',timeout:4000,maxBuffer:5},
    (error,stdout,stderr)=>results.push({error,stdout,stderr}));
  fixture.child.stdout.emit('data',Buffer.from('a'));
  fixture.child.stderr.emit('data',Buffer.from('💠'));
  fixture.child.stdout.emit('data',Buffer.from('x')); // aggregate 6 > 5
  assert.equal(fixture.child.killCalls.length,1);
  assert.equal(results.length,1);
  assert.match(results[0].error.message,/bounded output budget/);
  assert.equal(results[0].stdout,'a');
  assert.equal(results[0].stderr,'💠');
  fixture.child.emit('error',new Error('late error'));
  fixture.child.emit('close',0,null);
  fixture.child.stderr.emit('data',Buffer.from('later'));
  assert.equal(results.length,1);
});

test('spawn failure settles once even if close races with error', () => {
  const fixture=fakeFactory();
  const results=[];
  launchCompiler(fixture.process,'missing',[],
    {cwd:'/tmp',timeout:4000,maxBuffer:20},
    (error,stdout,stderr)=>results.push({error,stdout,stderr}));
  fixture.child.emit('error',Object.assign(new Error('ENOENT'),{code:'ENOENT'}));
  fixture.child.emit('close',127,null);
  assert.equal(results.length,1);
  assert.equal(results[0].error.code,'ENOENT');
  assert.equal(results[0].stdout,'');
  assert.equal(results[0].stderr,'');
});
