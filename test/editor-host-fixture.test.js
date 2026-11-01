'use strict';

// This validates the shared test *data*, not editor-host execution or syntax
// admission. Each IDE adapter must still run the golden assertions in-host.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const directory = path.join(__dirname, 'fixtures');
const expected = JSON.parse(fs.readFileSync(path.join(directory, 'editor-compat.expected.json'), 'utf8'));
const sourcePath = path.join(directory, expected.source);
const source = fs.readFileSync(sourcePath, 'utf8');

test('shared editor-host fixture pins unique nonoverlapping semantic spans', () => {
  assert.equal(expected.kind, 'oreslang-editor-host-fixture-v1');
  assert.ok(expected.purpose.includes('no IDE-host pass is implied'));
  assert.equal(path.extname(sourcePath), '.ores');
  assert.equal(source.includes('\r'), false, 'fixture offsets require LF');
  assert.ok(source.endsWith('\n'));
  const lines = source.split('\n');
  const categories = new Set(['keyword', 'type', 'comment', 'symbol', 'string', 'operator', 'runtime', 'identifier']);
  const ids = new Set();
  const spans = new Map();

  assert.ok(expected.cases.length >= 16);
  for (const scenario of expected.cases) {
    assert.ok(!ids.has(scenario.id), 'duplicate fixture ID: ' + scenario.id);
    ids.add(scenario.id);
    assert.ok(categories.has(scenario.category), 'unknown scope category: ' + scenario.category);
    assert.ok(Number.isSafeInteger(scenario.line) && scenario.line > 0 && scenario.line <= lines.length,
      'invalid line number for ' + scenario.id);
    const line = lines[scenario.line - 1];
    const start = line.indexOf(scenario.needle);
    assert.ok(start >= 0, 'missing span for ' + scenario.id);
    assert.equal(line.lastIndexOf(scenario.needle), start, 'ambiguous span for ' + scenario.id);
    const group = spans.get(scenario.line) || [];
    group.push({ start, end: start + scenario.needle.length, id: scenario.id });
    spans.set(scenario.line, group);
  }
  for (const [line, group] of spans) {
    group.sort((a, b) => a.start - b.start);
    for (let i = 1; i < group.length; i++) {
      assert.ok(group[i - 1].end <= group[i].start,
        'overlapping assertions at line ' + line + ': ' + group[i].id);
    }
  }
});

test('host fixture includes nested-comment isolation and cross-editor boundary cases', () => {
  const byId = new Map(expected.cases.map(x => [x.id, x]));
  for (const id of ['nested-comment-control', 'nested-comment-symbol', 'outer-comment-after-inner', 'line-comment-keyword']) {
    assert.equal(byId.get(id)?.category, 'comment');
  }
  assert.equal(byId.get('keyword-after-outer-close')?.category, 'keyword');
  assert.equal(byId.get('string-with-control-and-symbol')?.category, 'string');
  assert.equal(byId.get('quoted-symbol')?.category, 'symbol');
  assert.equal(byId.get('unicode-prefixed-identifier')?.category, 'identifier');
  assert.equal(byId.get('compound-critical')?.category, 'keyword');
  assert.equal(byId.get('compound-nb')?.category, 'keyword');
});
