'use strict';

// Real TextMate/Oniguruma tokenization of the canonical grammar and derived
// exports. This does NOT execute VS Code, Visual Studio or IntelliJ GUI hosts.
// Scope tests use PR #14's exact hardened canonical grammar as integrated here.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const tm = require('vscode-textmate');
const oniguruma = require('vscode-oniguruma');
const { exportPortableTextmate, GRAMMAR_PATH } = require('../tools/export-portable-textmate');

const fixtureRoot = path.join(__dirname, 'fixtures');
const expected = JSON.parse(fs.readFileSync(path.join(fixtureRoot, 'editor-compat.expected.json'), 'utf8'));
const lines = fs.readFileSync(path.join(fixtureRoot, expected.source), 'utf8').split('\n');

// The integrated PR #14 grammar now makes all 17 lexical cases mandatory.
const enforced = new Map([
  ['actor-declaration', 'keyword.declaration.oreslang'],
  ['actor-type', 'entity.name.type.oreslang'],
  ['outer-comment-keyword', 'comment.block.oreslang'],
  ['nested-comment-control', 'comment.block.oreslang'],
  ['nested-comment-symbol', 'comment.block.oreslang'],
  ['outer-comment-after-inner', 'comment.block.oreslang'],
  ['keyword-after-outer-close', 'keyword.control.return.oreslang'],
  ['unquoted-symbol', 'constant.other.symbol.oreslang'],
  ['quoted-symbol', 'constant.other.symbol.oreslang'],
  ['string-with-control-and-symbol', 'string.quoted.double.oreslang'],
  ['contextual-equality', 'keyword.operator.comparison.oreslang'],
  ['symbol-in-comparison', 'constant.other.symbol.oreslang'],
  ['runtime-call', 'support.function.builtin.runtime.oreslang'],
  ['line-comment-keyword', 'comment.line.double-slash.oreslang'],
  ['unicode-prefixed-identifier', null],
  ['compound-critical', 'keyword.oreslang'],
  ['compound-nb', 'keyword.oreslang']
]);

let onigPromise;
async function tokenize(grammarPath) {
  if (!onigPromise) {
    const wasm = fs.readFileSync(require.resolve('vscode-oniguruma/release/onig.wasm'));
    onigPromise = oniguruma.loadWASM(wasm);
  }
  await onigPromise;
  const rawGrammar = tm.parseRawGrammar(fs.readFileSync(grammarPath, 'utf8'), grammarPath);
  const registry = new tm.Registry({
    onigLib: Promise.resolve({
      createOnigScanner: patterns => new oniguruma.OnigScanner(patterns),
      createOnigString: value => new oniguruma.OnigString(value)
    }),
    loadGrammar: async scope => scope === 'source.oreslang' ? rawGrammar : null
  });
  const grammar = await registry.loadGrammar('source.oreslang');
  assert.ok(grammar, 'Oniguruma-backed TextMate grammar failed to load');
  let stack = tm.INITIAL;
  return lines.map(line => {
    const result = grammar.tokenizeLine(line, stack);
    stack = result.ruleStack;
    return result.tokens.map(token => ({
      startIndex: token.startIndex,
      endIndex: token.endIndex,
      scopes: token.scopes
    }));
  });
}

function tokensForSpan(allTokens, spec) {
  const line = lines[spec.line - 1];
  const start = line.indexOf(spec.needle);
  assert.ok(start >= 0, 'missing span ' + spec.id);
  const end = start + spec.needle.length;
  const intersecting = allTokens[spec.line - 1].filter(token =>
    token.startIndex < end && token.endIndex > start);
  assert.ok(intersecting.length, 'no grammar tokens cover ' + spec.id);
  let covered = start;
  for (const token of intersecting) {
    assert.ok(token.startIndex <= covered, 'gap in TextMate coverage for ' + spec.id);
    covered = Math.max(covered, Math.min(end, token.endIndex));
  }
  assert.equal(covered, end, 'partial grammar token coverage for ' + spec.id);
  return intersecting;
}

test('the real TextMate engine enforces all 17 cross-editor lexical scope cases', async () => {
  const ids = new Set(expected.cases.map(x => x.id));
  assert.equal(expected.cases.length, 17);
  assert.equal(enforced.size, expected.cases.length);
  for (const name of enforced.keys()) {
    assert.ok(ids.has(name), 'fixture category unexpectedly absent: ' + name);
  }
  const tokens = await tokenize(GRAMMAR_PATH);
  for (const scenario of expected.cases) {
    const scope = enforced.get(scenario.id);
    for (const token of tokensForSpan(tokens, scenario)) {
      if (scope === null) {
        assert.ok(!token.scopes.some(s => s.startsWith('keyword.') || s.startsWith('constant.other.symbol.')),
          scenario.id + ' must remain a plain identifier, got ' + JSON.stringify(token.scopes));
      } else {
        assert.ok(token.scopes.includes(scope),
          scenario.id + ' should carry ' + scope + ', got ' + JSON.stringify(token.scopes));
      }
    }
  }
});

test('comments and strings do not leak semantic keyword or Symbol scopes', async () => {
  const tokens = await tokenize(GRAMMAR_PATH);
  for (const name of [
    'outer-comment-keyword',
    'nested-comment-control',
    'nested-comment-symbol',
    'outer-comment-after-inner',
    'string-with-control-and-symbol',
    'line-comment-keyword'
  ]) {
    const scenario = expected.cases.find(x => x.id === name);
    assert.ok(scenario);
    for (const token of tokensForSpan(tokens, scenario)) {
      assert.ok(token.scopes.some(s => s.startsWith('comment.') || s.startsWith('string.')));
      assert.ok(!token.scopes.some(s => s.startsWith('keyword.') || s.startsWith('constant.other.symbol.')),
        'nested lexical contents leaked keyword/Symbol scope: ' + name);
    }
  }
});

test('both exported editor grammars tokenize the fixture exactly as the canonical source', async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'oreslang-oniguruma-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const exported = exportPortableTextmate(dir);
  const input = await tokenize(GRAMMAR_PATH);
  for (const target of [exported.visualStudio, exported.intelliJGrammar]) {
    assert.deepEqual(await tokenize(target), input, 'semantic token drift in ' + target);
  }
});
