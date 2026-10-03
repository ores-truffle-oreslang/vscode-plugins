'use strict';

function machineRecord(item) {
  if (!item || typeof item !== 'object') return null;
  const start = item.range && item.range.start ? item.range.start : {};
  const end = item.range && item.range.end ? item.range.end : start;
  const line = Math.max(1, Number(start.line || item.line || 1));
  const column = Math.max(1, Number(start.column || item.column || 1));

  return {
    path: item.path || null,
    line,
    column,
    endLine: Math.max(line, Number(end.line || line)),
    endColumn: Math.max(column + 1, Number(end.column || column + 1)),
    severity: String(item.severity || 'error').toLowerCase(),
    message: String(item.message || '').trim()
  };
}

function parseMachineJson(output) {
  const text = String(output || '').trim();
  if (!text) return null;

  try {
    const payload = JSON.parse(text);
    if (!payload || Number(payload.version) !== 1 || !Array.isArray(payload.diagnostics)) {
      return null;
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

    const lineNumber = Math.max(1, Number(match[1]));
    const column = Math.max(1, Number(match[2]));
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
