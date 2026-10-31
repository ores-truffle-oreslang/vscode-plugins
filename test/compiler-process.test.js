'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {execFile}=require('node:child_process');
const {setTimeout: sleep}=require('node:timers/promises');
const {execFileOptions,terminateProcessTree}=require('../lib/compiler-process');

test('compiler launch uses no shell and isolates POSIX child process group',()=>{
  const options=execFileOptions('/tmp',5000,1048576);
  assert.equal(options.detached,process.platform!=='win32');
  assert.equal(options.windowsHide,true);
  assert.equal(options.shell,undefined);
  assert.equal(options.maxBuffer,1048576);
  assert.equal(options.timeout,5000);
});
test('cancelling the CLI prevents grandchild continuation on POSIX',async(t)=>{
  if(process.platform==='win32'){t.skip('POSIX process-group semantics; Windows child-only cancellation');return;}
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'oreslang-cli-tree-'));
  const marker=path.join(dir,'grandchild-executed');
  let child;
  try {
    const worker=[
      "const {spawn}=require('node:child_process');",
      "const grandchild=spawn(process.execPath,['-e',",
      "'setTimeout(()=>require(\"node:fs\").writeFileSync(process.argv[1],\"escaped\"),550)',",
      "process.argv[1]],{stdio:'ignore'});",
      "if(!grandchild.pid)process.exit(2);",
      "process.stdout.write('READY\\n');",
      "setInterval(()=>{},1000);"
    ].join('');
    child=execFile(process.execPath,['-e',worker,marker],
      execFileOptions(dir,4000,1024*1024),()=>{});
    await Promise.race([
      new Promise((resolve,reject)=>{
        child.stdout.on('data',buf=>{if(buf.toString().includes('READY'))resolve();});
        child.on('error',reject);
        child.on('exit',code=>reject(new Error('CLI exited before readiness: '+code)));
      }),
      sleep(1500).then(()=>{throw Error('CLI readiness timeout');})
    ]);
    assert.ok(child.pid>0);
    assert.equal(terminateProcessTree(child),true);
    await sleep(750);
    assert.equal(fs.existsSync(marker),false,'grandchild must not run after cancellation');
  } finally {
    if(child)terminateProcessTree(child);
    fs.rmSync(dir,{recursive:true,force:true});
  }
});
