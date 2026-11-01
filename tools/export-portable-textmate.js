'use strict';

// The VS Code extension's TextMate grammar is the single source of truth.
// Export platform-specific *copies* only when packaging; never edit them.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const GRAMMAR_PATH = path.join(ROOT, 'syntaxes', 'oreslang.tmLanguage.json');
const DEFAULT_OUTPUT = path.join(ROOT, 'dist', 'editor-bundles');

function writeText(filePath, text) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, text, { encoding: 'utf8' });
}

function exportPortableTextmate(outputDir = DEFAULT_OUTPUT) {
  const source = fs.readFileSync(GRAMMAR_PATH, 'utf8');
  const grammar = JSON.parse(source);
  if (grammar.name !== 'Oreslang' ||
      grammar.scopeName !== 'source.oreslang' ||
      !Array.isArray(grammar.fileTypes) ||
      !grammar.fileTypes.includes('ores') ||
      !Array.isArray(grammar.patterns)) {
    throw new Error('Canonical Oreslang grammar must declare source.oreslang and .ores');
  }

  // Visual Studio can load a user-local TextMate grammar directly.
  const visualStudio = path.join(outputDir, 'visual-studio', 'Oreslang', 'Syntaxes', 'oreslang.tmLanguage.json');
  writeText(visualStudio, source);

  // IntelliJ accepts a VS Code extension folder as a TextMate bundle.
  // Export only the declarative grammar; do not execute the VS Code extension.
  const intelliJBundle = path.join(outputDir, 'intellij', 'Oreslang-vscode-bundle');
  const intelliJGrammar = path.join(intelliJBundle, 'syntaxes', 'oreslang.tmLanguage.json');
  writeText(intelliJGrammar, source);
  const manifest = {
    name: 'oreslang-textmate-bundle',
    displayName: 'Oreslang',
    version: '0.1.0',
    contributes: {
      languages: [{ id: 'oreslang', aliases: ['Oreslang', 'oreslang'], extensions: ['.ores'] }],
      grammars: [{ language: 'oreslang', scopeName: 'source.oreslang', path: './syntaxes/oreslang.tmLanguage.json' }]
    }
  };
  writeText(path.join(intelliJBundle, 'package.json'), JSON.stringify(manifest, null, 2) + '\n');

  return {
    visualStudio,
    intelliJBundle,
    intelliJGrammar,
    sourceSha256: crypto.createHash('sha256').update(source).digest('hex')
  };
}

if (require.main === module) {
  const result = exportPortableTextmate();
  console.log('Exported Oreslang editor grammars (source SHA-256: ' + result.sourceSha256 + ')');
  console.log('Visual Studio: ' + result.visualStudio);
  console.log('IntelliJ: ' + result.intelliJBundle);
}

module.exports = { exportPortableTextmate, GRAMMAR_PATH };
