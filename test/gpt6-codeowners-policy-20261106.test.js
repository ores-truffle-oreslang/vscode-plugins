'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const required = ['*', '/.github/', '/lib/', '/test/', '/tools/', '/scripts/', '/syntaxes/', '/extension.js', '/package.json', '/package-lock.json'];
const pathToPolicy = path.join(__dirname, '..', '.github', 'CODEOWNERS');
const readPolicy = () => fs.readFileSync(pathToPolicy, 'utf8');

function validate(text) {
  const entries = text.split(/\r?\n/).map(line => line.trim()).filter(line => line && !line.startsWith('#'));
  assert.equal(entries.length, required.length, 'owner policy cannot contain hidden overrides');
  const actual = entries.map(line => {
    const parts = line.split(/\s+/);
    assert.deepEqual(parts.slice(1), ['@ORESoftware'], 'sensitive files require verified owner');
    return parts[0];
  });
  assert.deepEqual(actual, required, 'last-match ownership must remain explicit and safe');
}

test('VS Code extension, syntax grammars, sources, CI and releases require CODEOWNERS', () => {
  validate(readPolicy());
});

test('a shadowed syntax/CI owner or missing wildcard cannot silently pass', () => {
  const valid = readPolicy();
  for (const attacker of [
    valid.replace('* @ORESoftware', '# * @ORESoftware'),
    valid.replace('/syntaxes/ @ORESoftware', '/syntaxes/ @attacker'),
    valid + '\n/.github/workflows/ @attacker\n',
    valid.replace('/lib/ @ORESoftware', ''),
  ]) assert.throws(() => validate(attacker));
});
