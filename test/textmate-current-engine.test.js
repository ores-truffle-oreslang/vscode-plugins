'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const tm = require('vscode-textmate');
const oniguruma = require('vscode-oniguruma');

const filePath = path.resolve(__dirname, '../syntaxes/oreslang.tmLanguage.json');
const original = fs.readFileSync(filePath, 'utf8');
const source = tm.parseRawGrammar(original, filePath);

let grammarPromise;
function loadGrammar() {
  if (!grammarPromise) {
    const wasm = fs.readFileSync(require.resolve('vscode-oniguruma/release/onig.wasm'));
    const onigLib = oniguruma.loadWASM(wasm).then(() => ({
      createOnigScanner: patterns => new oniguruma.OnigScanner(patterns),
      createOnigString: value => new oniguruma.OnigString(value)
    }));
    const registry = new tm.Registry({
      onigLib,
      loadGrammar: async scopeName => scopeName === 'source.oreslang' ? source : null
    });
    grammarPromise = registry.loadGrammar('source.oreslang').then(result => {
      assert.ok(result, 'real Oniguruma-backed TextMate grammar is loadable');
      return result;
    });
  }
  return grammarPromise;
}

function tokenCovering(tokens, line, word, occurrence = 0) {
  let start = 0;
  let at = -1;
  for (let i = 0; i <= occurrence; i++) {
    at = line.indexOf(word, start);
    assert.notEqual(at, -1, 'missing source span ' + JSON.stringify(word));
    start = at + word.length;
  }
  const token = tokens.find(t => t.startIndex <= at && t.endIndex >= at + word.length);
  assert.ok(token, 'grammar split token ' + JSON.stringify(word) + ': ' +
    JSON.stringify(tokens.map(t => [line.slice(t.startIndex, t.endIndex), t.scopes])));
  return token;
}

function hasScope(token, expected) {
  return token.scopes.includes(expected);
}

test('actual VS Code TextMate engine recognizes quoted and unquoted Symbols atomically', async () => {
  const grammar = await loadGrammar();
  const line = 'return #ready #"quoted value" #\'with spaces\'';
  const result = grammar.tokenizeLine(line, tm.INITIAL);
  for (const literal of ['#ready', '#"quoted value"', "#'with spaces'"]) {
    assert.ok(hasScope(tokenCovering(result.tokens, line, literal),
      'constant.other.symbol.oreslang'), literal);
  }
  assert.ok(tokenCovering(result.tokens, line, 'return').scopes
    .includes('keyword.control.return.oreslang'));
});

test('actual TextMate engine preserves nested comments across physical lines', async () => {
  const grammar = await loadGrammar();
  let stack = tm.INITIAL;
  const lines = ['/* outer', ' /* inner */ raise #ready', ' outer */ return'];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const result = grammar.tokenizeLine(line, stack);
    stack = result.ruleStack;
    if (i === 1) {
      for (const needle of ['raise','#ready']) {
        const token = tokenCovering(result.tokens, line, needle);
        assert.ok(token.scopes.some(x => x.startsWith('comment.block.')), needle);
        assert.ok(!token.scopes.includes('support.function.global.oreslang'));
        assert.ok(!token.scopes.includes('constant.other.symbol.oreslang'));
      }
    }
    if (i === 2) {
      assert.ok(tokenCovering(result.tokens, line, 'return')
        .scopes.includes('keyword.control.return.oreslang'));
    }
  }
});

test('actual TextMate engine does not leak runtime controls or Symbols from strings', async () => {
  const grammar = await loadGrammar();
  const line = '"throw #ready" return';
  const result = grammar.tokenizeLine(line, tm.INITIAL);
  for (const needle of ['throw','#ready']) {
    const token = tokenCovering(result.tokens,line,needle);
    assert.ok(token.scopes.some(s => s.startsWith('string.quoted.')));
    assert.ok(!token.scopes.includes('support.function.global.oreslang'));
    assert.ok(!token.scopes.includes('constant.other.symbol.oreslang'));
  }
  assert.ok(tokenCovering(result.tokens, line, 'return')
    .scopes.includes('keyword.control.return.oreslang'));
});

test('real Oniguruma rules apply operator, compound and runtime-global scopes', async () => {
  const grammar = await loadGrammar();
  const line='critical-read nb-select eq a % b ^ c raise';
  const result=grammar.tokenizeLine(line,tm.INITIAL);
  for(const literal of ['critical-read','nb-select'])
    assert.ok(tokenCovering(result.tokens,line,literal).scopes.includes('keyword.oreslang'));
  for(const literal of ['eq','%','^'])
    assert.ok(tokenCovering(result.tokens,line,literal).scopes.some(s=>s.startsWith('keyword.operator.')),literal);
  assert.ok(tokenCovering(result.tokens,line,'raise').scopes.includes('support.function.global.oreslang'));
});

test('real engine does not scope overlong or invalid Symbol literals as valid', async () => {
  const grammar=await loadGrammar();
  for(const line of [
    '#'+'x'.repeat(129),
    '#""',
    '#"bad\\q"',
    '#"bad\\uZZZZ"',
    '#"unfinished'
  ]) {
    const result=grammar.tokenizeLine(line,tm.INITIAL);
    assert.ok(!result.tokens.some(token=>token.scopes.includes('constant.other.symbol.oreslang')),
      line.slice(0,44)+': '+JSON.stringify(result.tokens.map(t=>t.scopes)));
  }
});
