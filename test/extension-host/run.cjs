'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { runTests } = require('@vscode/test-electron');

async function main() {
  const root = path.resolve(__dirname, '../..');
  const fixture = path.join(root, 'test', 'fixtures', 'editor-compat.ores');
  if (!fs.statSync(fixture).isFile()) throw new Error('Missing exact host fixture');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'oreslang-vscode-host-'));
  try {
    await runTests({
      version: '1.96.4',
      extensionDevelopmentPath: root,
      extensionTestsPath: path.join(__dirname, 'suite.cjs'),
      launchArgs: [
        path.dirname(fixture),
        '--no-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--skip-welcome',
        '--skip-release-notes',
        '--user-data-dir=' + path.join(tmp, 'user'),
        '--extensions-dir=' + path.join(tmp, 'extensions')
      ]
    });
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

main().catch(error => {
  console.error('Native VS Code Extension Host smoke failed:', error);
  process.exitCode = 1;
});
