'use strict';
const host = require('node:process');

// Each POSIX compiler child runs in a fresh group, allowing cancellation to
// terminate descendants that inherit stdout/stderr. No shell is involved.
// Windows remains direct-child-only; do not infer process-tree equivalence.
function execFileOptions(cwd, timeout, maxBuffer) {
  return { cwd, timeout, maxBuffer, windowsHide: true,
    detached: host.platform !== 'win32' };
}
function terminateProcessTree(child) {
  if (!child) return false;
  if (host.platform !== 'win32' && Number.isSafeInteger(child.pid) && child.pid > 0) {
    try { host.kill(-child.pid, 'SIGKILL'); return true; }
    catch (error) {
      if (error?.code === 'ESRCH') return true;
    }
  }
  try { child.kill('SIGKILL'); return true; }
  catch { return false; }
}
module.exports = {execFileOptions, terminateProcessTree};
