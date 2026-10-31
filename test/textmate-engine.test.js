'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vsctm = require('vscode-textmate');
const onig = require('vscode-oniguruma');

const raw = fs.readFileSync(path.join(__dirname, '..', 'syntaxes', 'oreslang.tmLanguage.json'), 'utf8');
const wasm = fs.readFileSync(require.resolve('vscode-oniguruma/release/onig.wasm'));
let grammarPromise;
async function grammar() {
  if (!grammarPromise) grammarPromise = (async () => {
    await onig.loadWASM(wasm.buffer.slice(wasm.byteOffset, wasm.byteOffset + wasm.byteLength));
    const registry = new vsctm.Registry({
      onigLib: Promise.resolve({
        createOnigScanner: patterns => new onig.OnigScanner(patterns),
        createOnigString: input => new onig.OnigString(input)
      }),
      loadGrammar: scopeName => scopeName === 'source.oreslang'
        ? Promise.resolve(vsctm.parseRawGrammar(raw, 'oreslang.tmLanguage.json')) : null
    });
    const result = await registry.loadGrammar('source.oreslang');
    assert.ok(result, 'TextMate grammar was not loaded');
    return result;
  })();
  return grammarPromise;
}
async function tokenize(source) {
  const g = await grammar();
  let stack = vsctm.INITIAL;
  return source.split('\n').map(line => {
    const tokens = g.tokenizeLine(line, stack);
    stack = tokens.ruleStack;
    return {line, tokens: tokens.tokens};
  });
}
function scopesAt(record, needle, occurrence = 0) {
  let position = -1;
  for (let i = 0; i <= occurrence; i++) position = record.line.indexOf(needle, position + 1);
  assert.ok(position >= 0, 'missing ' + needle + ' in source');
  const token = record.tokens.find(t => t.startIndex <= position && t.endIndex > position);
  assert.ok(token, 'TextMate lost ' + needle);
  return token.scopes;
}
function has(scopes, scope) {
  return scopes.some(s => s === scope || s.startsWith(scope + '.'));
}
test('real Oniguruma scopes nested block comments without leaking keywords', async () => {
  const [a, b] = await tokenize('/* outer /* return */ recover */ pub fnc run() {}\nreturn;');
  assert.ok(has(scopesAt(a, 'return'), 'comment.block.oreslang'));
  assert.ok(has(scopesAt(a, 'recover'), 'comment.block.oreslang'));
  assert.ok(!has(scopesAt(a, 'recover'), 'support.function.global.oreslang'));
  assert.ok(has(scopesAt(a, 'pub'), 'storage.modifier.oreslang'));
  assert.ok(has(scopesAt(b, 'return'), 'keyword.control.return.oreslang'));
});
test('real Oniguruma scopes runtime controls, quoted string, and symbols', async () => {
  const [a] = await tokenize('const a = "if recover"; defer; const b = #ready; const c = #\'two words\';');
  assert.ok(has(scopesAt(a, 'recover'), 'string.quoted.double.oreslang'));
  assert.ok(!has(scopesAt(a, 'recover'), 'support.function.global.oreslang'));
  assert.ok(has(scopesAt(a, 'defer'), 'support.function.global.oreslang'));
  assert.ok(has(scopesAt(a, '#ready'), 'constant.other.symbol.oreslang'));
  assert.ok(has(scopesAt(a, "#'two words'"), 'constant.other.symbol.oreslang'));
});
test('real Oniguruma matches compound words as atomic keyword tokens', async () => {
  const [a] = await tokenize('critical-read critical-write nb-select transform-pipe');
  for (const word of ['critical-read','critical-write','nb-select','transform-pipe']) {
    const t = a.tokens.find(x => x.startIndex === a.line.indexOf(word));
    assert.ok(t, word + ' missing');
    assert.equal(a.line.slice(t.startIndex, t.endIndex), word);
    assert.ok(has(t.scopes, 'keyword.oreslang'), word);
  }
});
test('real Oniguruma distinguishes contextual eq from declaration names', async () => {
  const [a] = await tokenize('let eq = 1; x eq y;');
  assert.ok(!has(scopesAt(a, 'eq'), 'keyword.operator.comparison.oreslang'));
  assert.ok(has(scopesAt(a, 'eq', 1), 'keyword.operator.comparison.oreslang'));
});
