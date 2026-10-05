'use strict';

const RUNTIME_GLOBALS = new Set([
  'recover',
  'defer',
  'throw',
  'raise'
]);

// Covers the current compiler lexer plus active Oreslang syntax already
// specified in compiler branches that feed the editor grammar.
//
// Contextual comparison words (is/eq/neq) are intentionally excluded: they are
// valid identifiers and are highlighted as operators only when grammar context
// makes them operators.
const KEYWORDS = new Set([
  'define', 'class', 'module', 'namespace', 'import', 'from', 'as',
  'extends', 'implements', 'impl', 'try', 'catch', 'finally',
  'end', 'fi', 'if', 'do', 'else', 'elif', 'elseif', 'then', 'new', 'stop', 'done',
  'await', 'async', 'nlex', 'pure', 'trap', 'actor', 'isoactor', 'shared',
  'nb', 'select', 'readch', 'writech',
  'def', 'fnc', 'routine', 'for', 'of', 'loop', 'block', 'break', 'continue',
  'yield', 'super', 'switch', 'match', 'matches', 'when', 'case', 'default',
  'type', 'types', 'typeof', 'interface', 'trait', 'abstract', 'struct',
  'structural', 'singleton', 'rt', 'with', 'init', 'first',
  'void', 'static', 'pub', 'private',
  'return', 'val', 'const', 'let', 'mut', 'self',
  'true', 'false', 'null', 'obj', 'arr'
]);

const OPEN_TO_CLOSE = new Map([
  ['(', ')'],
  ['[', ']'],
  ['{', '}']
]);

const CLOSE_TO_OPEN = new Map([
  [')', '('],
  [']', '['],
  ['}', '{']
]);

function isIdentStart(ch) {
  return typeof ch === 'string' && ch.length === 1 && /[A-Za-z_]/.test(ch);
}

function isIdentPart(ch) {
  return typeof ch === 'string' && ch.length === 1 && /[A-Za-z0-9_]/.test(ch);
}

function makeDiagnostic(start, end, message, severity = 'error') {
  return { start, end: Math.max(end, start + 1), message, severity };
}

function scanOreslang(text) {
  const tokens = [];
  const diagnostics = [];
  const delimiters = [];
  let i = 0;

  while (i < text.length) {
    const ch = text[i];
    const next = text[i + 1];

    if (ch === '/' && next === '/') {
      i += 2;
      while (i < text.length && text[i] !== '\n') i += 1;
      continue;
    }

    if (ch === '/' && next === '*') {
      const start = i;
      let depth = 1;
      i += 2;
      while (i < text.length && depth > 0) {
        if (text[i] === '/' && text[i + 1] === '*') {
          depth += 1;
          i += 2;
        } else if (text[i] === '*' && text[i + 1] === '/') {
          depth -= 1;
          i += 2;
        } else {
          i += 1;
        }
      }
      if (depth > 0) {
        diagnostics.push(makeDiagnostic(start, text.length, 'Unterminated block comment.'));
      }
      continue;
    }

    if (ch === '"' || ch === "'") {
      const quote = ch;
      const start = i;
      i += 1;
      let closed = false;
      while (i < text.length) {
        if (text[i] === '\\') {
          i += Math.min(2, text.length - i);
          continue;
        }
        if (text[i] === quote) {
          i += 1;
          closed = true;
          break;
        }
        i += 1;
      }
      if (!closed) {
        diagnostics.push(makeDiagnostic(start, text.length, 'Unterminated string literal.'));
      }
      continue;
    }

    if (OPEN_TO_CLOSE.has(ch)) {
      delimiters.push({ ch, index: i });
      i += 1;
      continue;
    }

    if (CLOSE_TO_OPEN.has(ch)) {
      const expectedOpen = CLOSE_TO_OPEN.get(ch);
      const top = delimiters[delimiters.length - 1];
      if (!top) {
        diagnostics.push(makeDiagnostic(
          i,
          i + 1,
          "Unexpected closing delimiter '" + ch + "'."
        ));
      } else if (top.ch !== expectedOpen) {
        diagnostics.push(makeDiagnostic(
          i,
          i + 1,
          "Mismatched delimiter '" + ch + "'; expected '" + OPEN_TO_CLOSE.get(top.ch) + "'."
        ));
      } else {
        delimiters.pop();
      }
      i += 1;
      continue;
    }

    if (isIdentStart(ch)) {
      const start = i;
      i += 1;
      while (i < text.length && isIdentPart(text[i])) i += 1;
      const value = text.slice(start, i);
      if (RUNTIME_GLOBALS.has(value)) {
        tokens.push({ kind: 'runtimeGlobal', start, end: i, value });
      } else if (KEYWORDS.has(value)) {
        tokens.push({ kind: 'keyword', start, end: i, value });
      }
      continue;
    }

    i += 1;
  }

  for (const item of delimiters) {
    diagnostics.push(makeDiagnostic(
      item.index,
      item.index + 1,
      "Unclosed delimiter '" + item.ch + "'; expected '" + OPEN_TO_CLOSE.get(item.ch) + "'."
    ));
  }

  return { tokens, diagnostics };
}

module.exports = {
  KEYWORDS,
  RUNTIME_GLOBALS,
  scanOreslang
};
