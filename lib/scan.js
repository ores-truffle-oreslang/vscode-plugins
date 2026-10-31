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
// Comparison words (is/eq/neq) are reserved by the pinned compiler lexer.
// Classify them as operators, never as ordinary identifier names.
const KEYWORDS = new Set([
  'define', 'class', 'module', 'namespace', 'import', 'export', 'entry', 'from', 'as',
  'extends', 'implements', 'impl', 'try', 'catch', 'finally',
  'end', 'fi', 'if', 'do', 'else', 'elif', 'elseif', 'then', 'new', 'constructor', 'stop', 'done',
  'await', 'spawn', 'async', 'generator', 'nlex', 'pure', 'trap', 'actor', 'isolated', 'untrusted', 'shared', 'critical', 'suspends', 'gen',
  'nb', 'select', 'readch', 'writech',
  'def', 'fnc', 'routine', 'for', 'of', 'while', 'loop', 'block', 'break', 'continue',
  'yield', 'super', 'switch', 'match', 'matches', 'over', 'when', 'case', 'default',
  'type', 'types', 'typeof', 'interface', 'trait', 'abstract', 'struct',
  'structural', 'singleton', 'rt', 'with', 'init', 'first',
  'void', 'static', 'pub', 'private',
  'return', 'val', 'const', 'let', 'mut', 'self',
  'true', 'false', 'obj', 'arr', 'isoactor', 'null', 'panic', 'cpu', 'gpu', 'conforms', 'contract', 'quantum', 'cb'
]);

const COMPOUND_KEYWORDS = new Set([
  'critical-read', 'critical-write', 'nb-select', 'transform-pipe'
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

const MAX_UNQUOTED_SYMBOL_ASCII = 128;
const MAX_QUOTED_SYMBOL_SOURCE_UNITS = 1024;
const MAX_SYMBOL_UTF8_BYTES = 256;

function validSymbolName(value) {
  if (!value || value.length > MAX_QUOTED_SYMBOL_SOURCE_UNITS) return false;
  // Decoded escapes can themselves produce malformed surrogate sequences.
  for (let pos = 0; pos < value.length; pos++) {
    const unit = value.charCodeAt(pos);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = value.charCodeAt(pos + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return false;
      pos++;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) return false;
  }
  const canonical = value.normalize('NFC');
  if (Buffer.byteLength(canonical, 'utf8') > MAX_SYMBOL_UTF8_BYTES) return false;
  for (const scalar of canonical) {
    const point = scalar.codePointAt(0);
    if (point < 0x20 || (point >= 0x7f && point <= 0x9f) ||
        /[\p{Cf}\p{Zl}\p{Zp}]/u.test(scalar)) return false;
  }
  return true;
}

const MAX_NESTING = 4096;

function scanOreslang(text) {
  if (typeof text !== 'string') throw new TypeError('Oreslang source must be a string');
  const tokens = [];
  const diagnostics = [];
  const delimiters = [];
  let i = 0;

  // Fail closed on malformed host strings, including inside otherwise opaque
  // comments/templates. The compiler lexer already rejects NUL and unpaired
  // UTF-16 surrogates, and the editor should not silently color them as valid.
  for (let pos = 0; pos < text.length; pos++) {
    const unit = text.charCodeAt(pos);
    if (unit === 0) {
      return {tokens: [], diagnostics: [makeDiagnostic(pos, pos + 1, 'Source contains a NUL character.')]};
    }
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = text.charCodeAt(pos + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) {
        return {tokens: [], diagnostics: [makeDiagnostic(pos, pos + 1, 'Source contains an unpaired UTF-16 surrogate.')]};
      }
      pos++;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) {
      return {tokens: [], diagnostics: [makeDiagnostic(pos, pos + 1, 'Source contains an unpaired UTF-16 surrogate.')]};
    }
  }

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
          if (depth > MAX_NESTING) {
            return {tokens: [], diagnostics: [
              makeDiagnostic(start, i + 2, 'Block comment nesting limit exceeded.')
            ]};
          }
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

    // Raw template bodies may contain brace-like text and keyword-looking
    // substrings. Leave interpolation analysis to the authoritative compiler.
    if (ch === '`') {
      const start = i;
      i += 1;
      let closed = false;
      while (i < text.length) {
        if (text[i] === '\\') {
          i += Math.min(2, text.length - i);
          continue;
        }
        if (text[i] === '`') {
          i += 1;
          closed = true;
          break;
        }
        i += 1;
      }
      if (!closed) diagnostics.push(makeDiagnostic(start, text.length, 'Unterminated template literal.'));
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
      if (delimiters.length >= MAX_NESTING) {
        return {tokens: [], diagnostics: [
          makeDiagnostic(i, i + 1, 'Delimiter nesting limit exceeded.')
        ]};
      }
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

    if (ch === '#') {
      const start = i++;
      if (text[i] === '"' || text[i] === "'") {
        const quote = text[i++];
        let decoded = '';
        let invalid = false;
        let closed = false;
        while (i < text.length) {
          if (text[i] === '\n' || text[i] === '\r') break;
          const ch = text[i++];
          if (ch === quote) { closed = true; break; }
          if (ch !== '\\') {
            decoded += ch;
          } else {
            if (i >= text.length || text[i] === '\n' || text[i] === '\r') {
              invalid = true;
              break;
            }
            const escape = text[i++];
            if (escape === 'u') {
              const digits = text.slice(i, i + 4);
              if (!/^[0-9A-Fa-f]{4}$/.test(digits)) {
                invalid = true;
                break;
              }
              decoded += String.fromCharCode(parseInt(digits, 16));
              i += 4;
            } else if (escape === 'n') decoded += '\n';
            else if (escape === 'r') decoded += '\r';
            else if (escape === 't') decoded += '\t';
            else if (escape === '"' || escape === "'" || escape === '\\') decoded += escape;
            else {
              invalid = true;
              break;
            }
          }
          if (decoded.length > MAX_QUOTED_SYMBOL_SOURCE_UNITS) {
            invalid = true;
            break;
          }
        }
        if (!closed || invalid || !validSymbolName(decoded)) {
          // Ignore the malformed quoted body until its line boundary. Never
          // turn its tail into runtime globals, bracket diagnostics or symbols.
          while (i < text.length && text[i] !== '\n' && text[i] !== '\r') i++;
          diagnostics.push(makeDiagnostic(start, i, 'Invalid or unterminated quoted Symbol literal.'));
          continue;
        }
      } else if (isIdentStart(text[i])) {
        i++;
        while (i < text.length && isIdentPart(text[i])) i++;
        if (i - start - 1 > MAX_UNQUOTED_SYMBOL_ASCII) {
          diagnostics.push(makeDiagnostic(start, i, 'Unquoted Symbol exceeds 128 ASCII bytes.'));
          continue;
        }
      } else {
        diagnostics.push(makeDiagnostic(start, i, 'Malformed Symbol literal.'));
        continue;
      }
      tokens.push({kind: 'symbol', start, end: i, value: text.slice(start, i)});
      continue;
    }

    if (ch === '%' || ch === '^') {
      tokens.push({kind:'operator', start:i, end:i+1, value:ch});
      i++;
      continue;
    }

    if (isIdentStart(ch)) {
      const start = i;
      i += 1;
      while (i < text.length && isIdentPart(text[i])) i += 1;
      const value = text.slice(start, i);
      // A small number of source-language keywords contain a hyphen. Consume
      // them atomically without making subtraction expressions into keywords.
      if (text[i] === '-') {
        let end = i + 1;
        while (end < text.length && isIdentPart(text[end])) end += 1;
        const compound = text.slice(start, end);
        if (COMPOUND_KEYWORDS.has(compound)) {
          tokens.push({kind: 'keyword', start, end, value: compound});
          i = end;
          continue;
        }
      }
      if (RUNTIME_GLOBALS.has(value)) {
        tokens.push({ kind: 'runtimeGlobal', start, end: i, value });
      } else if (value === 'eq' || value === 'neq' || value === 'is') {
        tokens.push({kind:'operator', start, end:i, value});
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
