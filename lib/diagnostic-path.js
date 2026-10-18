'use strict';
const path = require('node:path');

// The canonical CLI may report diagnostics for imported source files, not only
// the active file. Never attach another file's error to the current document.
function matchesCompilerDiagnosticPath(recordPath, activePath, cwd) {
  if (recordPath === null || recordPath === undefined) return true; // legacy unlocated diagnostic
  if (typeof recordPath !== 'string' || recordPath.length === 0 || recordPath.includes('\0')) return false;
  if (typeof activePath !== 'string' || !path.isAbsolute(activePath)) return false;
  if (typeof cwd !== 'string' || !path.isAbsolute(cwd)) return false;
  const normalize = p => {
    const full = path.normalize(p);
    return process.platform === 'win32' ? full.toLowerCase() : full;
  };
  const reported = path.isAbsolute(recordPath) ? recordPath : path.resolve(cwd, recordPath);
  return normalize(reported) === normalize(activePath);
}
module.exports = { matchesCompilerDiagnosticPath };
