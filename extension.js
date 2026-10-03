'use strict';

const vscode = require('vscode');
const childProcess = require('child_process');
const path = require('path');
const { scanOreslang } = require('./lib/scan');
const { parseCompilerOutputRecords } = require('./lib/compiler-output');

let keywordDecoration;
let runtimeGlobalDecoration;
let lexicalDiagnostics;
let compilerDiagnostics;
const debounceTimers = new Map();

function isOreslang(document) {
  return document && document.languageId === 'oreslang';
}

function configuredColor(key, fallback) {
  return vscode.workspace.getConfiguration('oreslang.colors').get(key, fallback);
}

function rebuildDecorations() {
  if (keywordDecoration) keywordDecoration.dispose();
  if (runtimeGlobalDecoration) runtimeGlobalDecoration.dispose();

  keywordDecoration = vscode.window.createTextEditorDecorationType({
    color: configuredColor('keyword', '#FF00FF')
  });

  runtimeGlobalDecoration = vscode.window.createTextEditorDecorationType({
    color: configuredColor('runtimeGlobal', '#4169E1')
  });
}

function offsetRange(document, start, end) {
  return new vscode.Range(document.positionAt(start), document.positionAt(end));
}

function severityFor(name) {
  if (name === 'warning') return vscode.DiagnosticSeverity.Warning;
  if (name === 'hint') return vscode.DiagnosticSeverity.Hint;
  return vscode.DiagnosticSeverity.Error;
}

function refreshDocument(document) {
  if (!isOreslang(document)) return;

  const result = scanOreslang(document.getText());

  if (vscode.workspace.getConfiguration('oreslang.diagnostics').get('enabled', true)) {
    const diagnostics = result.diagnostics.map(item => {
      const diagnostic = new vscode.Diagnostic(
        offsetRange(document, item.start, item.end),
        item.message,
        severityFor(item.severity)
      );
      diagnostic.source = 'oreslang';
      return diagnostic;
    });
    lexicalDiagnostics.set(document.uri, diagnostics);
  } else {
    lexicalDiagnostics.delete(document.uri);
  }

  for (const editor of vscode.window.visibleTextEditors) {
    if (editor.document.uri.toString() !== document.uri.toString()) continue;

    const keywordRanges = [];
    const runtimeGlobalRanges = [];
    for (const token of result.tokens) {
      const range = offsetRange(document, token.start, token.end);
      if (token.kind === 'runtimeGlobal') runtimeGlobalRanges.push(range);
      else if (token.kind === 'keyword') keywordRanges.push(range);
    }

    editor.setDecorations(keywordDecoration, keywordRanges);
    editor.setDecorations(runtimeGlobalDecoration, runtimeGlobalRanges);
  }
}

function scheduleRefresh(document) {
  if (!isOreslang(document)) return;
  const key = document.uri.toString();
  const oldTimer = debounceTimers.get(key);
  if (oldTimer) clearTimeout(oldTimer);
  debounceTimers.set(key, setTimeout(() => {
    debounceTimers.delete(key);
    refreshDocument(document);
  }, 100));
}

function parseCompilerOutput(document, output) {
  return parseCompilerOutputRecords(output).map(item => {
    const lineNumber = item.line - 1;
    const column = item.column - 1;
    const start = new vscode.Position(lineNumber, column);
    const end = new vscode.Position(Math.max(lineNumber, item.endLine - 1), Math.max(column + 1, item.endColumn - 1));
    const diagnostic = new vscode.Diagnostic(
      new vscode.Range(start, end),
      item.message,
      severityFor(item.severity)
    );
    diagnostic.source = 'oreslang';
    return diagnostic;
  });
}

function expandCompilerArgs(document) {
  const cfg = vscode.workspace.getConfiguration('oreslang.cli');
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
  const workspacePath = workspaceFolder ? workspaceFolder.uri.fsPath : path.dirname(document.uri.fsPath);
  const args = cfg.get('args', ['check', '--format=json', '{file}']);

  return args.map(value => String(value)
    .replaceAll('{file}', document.uri.fsPath)
    .replaceAll('{workspaceFolder}', workspacePath));
}

async function runCompilerCheck(document, interactive) {
  if (!isOreslang(document)) return;

  const cfg = vscode.workspace.getConfiguration('oreslang.cli');
  const command = String(cfg.get('command', 'oreslang') || '').trim();

  if (!command) {
    compilerDiagnostics.delete(document.uri);
    if (interactive) {
      vscode.window.showInformationMessage(
        'Oreslang CLI checks are disabled. Set oreslang.cli.command to the canonical oreslang executable.'
      );
    }
    return;
  }

  if (document.uri.scheme !== 'file') {
    if (interactive) vscode.window.showWarningMessage('Oreslang CLI checks require a file-backed document.');
    return;
  }

  if (document.isDirty) {
    if (interactive) {
      vscode.window.showInformationMessage('Save the Oreslang file before running oreslang check.');
    }
    return;
  }

  const args = expandCompilerArgs(document);
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
  const cwd = workspaceFolder ? workspaceFolder.uri.fsPath : path.dirname(document.uri.fsPath);
  const timeout = cfg.get('timeoutMs', 10000);

  await new Promise(resolve => {
    childProcess.execFile(command, args, {
      cwd,
      timeout,
      maxBuffer: 4 * 1024 * 1024,
      windowsHide: true
    }, (error, stdout, stderr) => {
      const output = [stdout, stderr].filter(Boolean).join('\n');
      const diagnostics = parseCompilerOutput(document, output);

      if (error && diagnostics.length === 0) {
        const diagnostic = new vscode.Diagnostic(
          new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 1)),
          output.trim() || error.message,
          vscode.DiagnosticSeverity.Error
        );
        diagnostic.source = 'oreslang';
        diagnostics.push(diagnostic);
      }

      compilerDiagnostics.set(document.uri, diagnostics);
      if (interactive && !error && diagnostics.length === 0) {
        vscode.window.showInformationMessage('oreslang check passed.');
      }
      resolve();
    });
  });
}

function activate(context) {
  lexicalDiagnostics = vscode.languages.createDiagnosticCollection('oreslang');
  compilerDiagnostics = vscode.languages.createDiagnosticCollection('oreslang-compiler');
  rebuildDecorations();

  context.subscriptions.push(
    lexicalDiagnostics,
    compilerDiagnostics,
    vscode.workspace.onDidOpenTextDocument(refreshDocument),
    vscode.workspace.onDidChangeTextDocument(event => scheduleRefresh(event.document)),
    vscode.workspace.onDidSaveTextDocument(document => {
      refreshDocument(document);
      if (isOreslang(document) &&
          vscode.workspace.getConfiguration('oreslang.cli').get('runOnSave', true)) {
        runCompilerCheck(document, false);
      }
    }),
    vscode.workspace.onDidCloseTextDocument(document => {
      lexicalDiagnostics.delete(document.uri);
      compilerDiagnostics.delete(document.uri);
    }),
    vscode.window.onDidChangeVisibleTextEditors(editors => {
      for (const editor of editors) refreshDocument(editor.document);
    }),
    vscode.workspace.onDidChangeConfiguration(event => {
      if (event.affectsConfiguration('oreslang.colors')) rebuildDecorations();
      if (event.affectsConfiguration('oreslang')) {
        for (const editor of vscode.window.visibleTextEditors) refreshDocument(editor.document);
      }
    }),
    vscode.commands.registerCommand('oreslang.checkCurrentFile', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor || !isOreslang(editor.document)) {
        vscode.window.showInformationMessage('Open an Oreslang (.ores) file first.');
        return;
      }
      refreshDocument(editor.document);
      await runCompilerCheck(editor.document, true);
    })
  );

  for (const document of vscode.workspace.textDocuments) refreshDocument(document);
  for (const editor of vscode.window.visibleTextEditors) refreshDocument(editor.document);
}

function deactivate() {
  for (const timer of debounceTimers.values()) clearTimeout(timer);
  debounceTimers.clear();
}

module.exports = {
  activate,
  deactivate,
  parseCompilerOutput
};
