'use strict';
const host = require('node:process');
const {setTimeout: startTimer, clearTimeout: stopTimer} = require('node:timers');

function execFileOptions(cwd, timeout, maxBuffer) {
  return {cwd, timeout, maxBuffer, windowsHide: true,
    detached: host.platform !== 'win32'};
}
function terminateProcessTree(child) {
  if (!child) return false;
  if (host.platform !== 'win32' && Number.isSafeInteger(child.pid) && child.pid > 0) {
    try {host.kill(-child.pid, 'SIGKILL'); return true;}
    catch (error) {
      if (error?.code === 'ESRCH') return false;
    }
  }
  try {child.kill('SIGKILL'); return true;}
  catch {return false;}
}

// execFile does NOT forward its detached option to spawn on some Node builds.
// Spawn a dedicated POSIX group directly and implement bounded, no-shell pipe
// handling. Test harnesses with execFile-only stubs retain the same callback
// interface; production Node always provides spawn.
function launchCompiler(childProcess, command, args, options, callback) {
  if (typeof childProcess.spawn !== 'function') {
    return childProcess.execFile(command, args, execFileOptions(
      options.cwd, options.timeout, options.maxBuffer), callback);
  }
  const {cwd, timeout, maxBuffer} = options;
  const child=childProcess.spawn(command, args, {
    cwd, windowsHide: true, detached: host.platform !== 'win32',
    stdio: ['ignore', 'pipe', 'pipe'], shell: false
  });
  let settled=false, bytes=0, stdout=[], stderr=[];
  let timer;
  const finish=err=>{
    if(settled)return;
    settled=true;
    stopTimer(timer);
    callback(err, Buffer.concat(stdout).toString('utf8'),
      Buffer.concat(stderr).toString('utf8'));
  };
  const capture=(chunk, target)=>{
    if(settled)return;
    // A readable stream can emit UTF-8 text after setEncoding(). Character
    // length is not a byte budget; normalize to owned bytes before admission.
    const packet = Buffer.from(chunk);
    bytes+=packet.length;
    if(bytes>maxBuffer){
      terminateProcessTree(child);
      finish(new Error('Oreslang CLI exceeded bounded output budget'));
    } else target.push(packet);
  };
  child.stdout?.on('data',chunk=>capture(chunk,stdout));
  child.stderr?.on('data',chunk=>capture(chunk,stderr));
  child.on('error',error=>finish(error));
  child.on('close',(code,signal)=>{
    finish(code===0?null:Object.assign(new Error(
      'Oreslang CLI exited: '+(signal||code)),{code,signal}));
  });
  timer=startTimer(()=>{
    terminateProcessTree(child);
    finish(new Error('Oreslang CLI timed out'));
  },timeout);
  timer.unref?.();
  return child;
}
module.exports={execFileOptions,terminateProcessTree,launchCompiler};
