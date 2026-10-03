'use strict';

function parseCompilerOutputRecords(output) {
  const diagnostics = [];
  const lines = String(output || '').split(/\r?\n/);

  const oresPattern = /Oreslang(?:\s+\w+)?\s+error\s+at\s+(\d+):(\d+):\s*(.+)$/i;
  const genericPattern = /(?:^|.*?:)(\d+):(\d+):\s*(?:(error|warning|hint)\s*:?\s*)?(.+)$/i;

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

    diagnostics.push({
      line: Math.max(1, Number(match[1])),
      column: Math.max(1, Number(match[2])),
      severity,
      message: message.trim()
    });
  }

  return diagnostics;
}

module.exports = { parseCompilerOutputRecords };
