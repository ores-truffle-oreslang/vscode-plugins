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
  const range = item.range && typeof item.range === 'object' && !Array.isArray(item.range)
    ? item.range : {};
  const start = range.start && typeof range.start === 'object' ? range.start : {};
  const end = range.end && typeof range.end === 'object' ? range.end : {};
  const line = coordinate(start.line ?? item.line, 1);
  const column = coordinate(start.column ?? item.column, 1);
  if (line === null || column === null) return null;

  const endLine = coordinate(end.line, line);
  const endColumn = coordinate(end.column, endLine === line ? column + 1 : 1);
  if (endLine === null || endColumn === null || endLine < line
      || (endLine === line && endColumn <= column)) return null;
  const message = typeof item.message === 'string' ? item.message.trim() : '';
  if (!message) return null;
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

  const diagnostics = [];
  const lines = String(output || '').split(/\r?\n/);

  const oresPattern = /Oreslang(?:\s+\w+)?\s+error\s+at\s+(\d+):(\d+):\s*(.+)$/i;
  const genericPattern = /(?:^|.*?:)(\d+):(\d+):\s*(?:(error|warning|info|hint)\s*:?\s*)?(.+)$/i;

  for (const line of lines) {
    let match = line.match(oresPattern);
    let severity = 'error';
    let message;

    if (match) {
      message = match[3];
    } else {
      match = line.match(genericPattern);
      if (!match) continue;
      severity = (match[3] || 'error').toLowerCase();
      message = match[4];
    }

    const lineNumber = coordinate(Number(match[1]), null);
    const column = coordinate(Number(match[2]), null);
    if (lineNumber === null || column === null) continue;
    diagnostics.push({
      path: null,
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
