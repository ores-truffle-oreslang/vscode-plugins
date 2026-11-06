'use strict';

// Compiler output is untrusted: Infinity, floats and oversized coordinates
// must not become VS Code Position values or trigger unexpected exceptions.
function coordinate(value, fallback) {
  if (value === undefined || value === null) return fallback;
  return typeof value === 'number' && Number.isSafeInteger(value)
    && value > 0 && value <= 10000000 ? value : null;
}

function machineRecord(item) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
  // A malformed explicit range is not the same as an omitted range.
  // Never convert attacker-supplied arrays/scalars into default (1,1) spans.
  if (item.range != null && (typeof item.range !== 'object' || Array.isArray(item.range))) return null;
  const range = item.range ?? {};
  if (range.start != null && (typeof range.start !== 'object' || Array.isArray(range.start))) return null;
  if (range.end != null && (typeof range.end !== 'object' || Array.isArray(range.end))) return null;
  const start = range.start ?? {};
  const end = range.end ?? {};
  const line = coordinate(start.line ?? item.line, 1);
  const column = coordinate(start.column ?? item.column, 1);
  if (line === null || column === null) return null;

  const endLine = coordinate(end.line, line);
  const endColumn = coordinate(end.column, endLine === line ? column + 1 : 1);
  // An omitted machine end column inherits start+1; validate that fallback
  // against the same coordinate cap as explicit end columns.
  if (endLine === null || endColumn === null || endColumn > 10000000 || endLine < line
      || (endLine === line && endColumn <= column)) return null;
  const message = typeof item.message === 'string' ? item.message.trim() : '';
  if (!message) return null;
  // Explicit malformed paths must never be silently treated as unlocated.
  if (item.path !== undefined && item.path !== null &&
      (typeof item.path !== 'string' || !item.path || item.path.includes(String.fromCharCode(0)))) return null;
  const severity = typeof item.severity === 'string' ? item.severity.toLowerCase() : 'error';

  return {
    path: typeof item.path === 'string' && item.path ? item.path : null,
    line,
    column,
    endLine,
    endColumn,
    severity: ['error', 'warning', 'info', 'hint'].includes(severity) ? severity : 'error',
    message
  };
}

function parseMachineJson(output) {
  const text = String(output || '').trim();
  if (!text) return null;

  try {
    const payload = JSON.parse(text);
    if (!payload || payload.version !== 1 || !Array.isArray(payload.diagnostics)) {
      return [];
    }
    return payload.diagnostics.map(machineRecord).filter(item => item && item.message);
  } catch {
    return null;
  }
}

function parseCompilerOutputRecords(output) {
  const machine = parseMachineJson(output);
  if (machine) return machine;

  // Malformed versioned JSON must never be parsed again as untrusted legacy
  // stderr. Its embedded lines could otherwise forge file/position records.
  const candidate = String(output || '').trimStart();
  if ((candidate.startsWith('{') || candidate.startsWith('[')) &&
      /"(?:version|diagnostics)"\s*:/.test(candidate)) return [];

  const diagnostics = [];
  const lines = String(output || '').split(/\r?\n/);

  // Bare compiler messages may bind to the active file. Never match a
  // substring of a path-qualified foreign diagnostic as an unlocated issue.
  const oresPattern = /^Oreslang(?:\s+\w+)?\s+error\s+at\s+(\d{1,8}):(\d{1,8}):\s*(.+)$/i;
  // Preserve origin paths even in fallback diagnostics (including C: drives).
  const genericPattern = /^(.+):(\d{1,8}):(\d{1,8}):\s*(?:(error|warning|info|hint)(?:\[[^\]\r\n]{1,64}\])?\s*:\s*)?(.+)$/i;

  for (const line of lines) {
    let match = line.match(oresPattern);
    let severity = 'error';
    let message;

    let reportedPath = null;
    let lineText;
    let columnText;
    if (match) {
      lineText = match[1];
      columnText = match[2];
      message = match[3];
    } else {
      match = line.match(genericPattern);
      if (!match) continue;
      reportedPath = match[1];
      lineText = match[2];
      columnText = match[3];
      severity = (match[4] || 'error').toLowerCase();
      message = match[5];
    }

    const lineNumber = coordinate(Number(lineText), null);
    const column = coordinate(Number(columnText), null);
    // Legacy stderr has no explicit end range: reject a start at the final
    // permitted column rather than emit an end column beyond the policy cap.
    if (column === 10000000) continue;
    // Match machine-JSON path admission: NUL cannot be a filesystem origin.
    // Drop only the malformed record so valid neighboring diagnostics survive.
    if (reportedPath !== null && reportedPath.includes(String.fromCharCode(0))) continue;
    if (lineNumber === null || column === null || !message.trim()) continue;
    diagnostics.push({
      path: reportedPath,
      line: lineNumber,
      column,
      endLine: lineNumber,
      endColumn: column + 1,
      severity,
      message: message.trim()
    });
  }

  return diagnostics;
}

module.exports = { parseCompilerOutputRecords };
