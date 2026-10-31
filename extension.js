'use strict';
const compilerCheckGenerations = new Map();
const compilerProcesses = new Map();

function cancelCompilerProcess(key) {
  const current = compilerProcesses.get(key);
  if (current) current.cancel();
}

const vscode = require('vscode');
const childProcess = require('child_process');
const path = require('path');
const { scanOreslang } = require('./lib/scan');
const { launchCompiler, terminateProcessTree } = require('./lib/compiler-process');
const { setTimeout: cliSetTimeout, clearTimeout: cliClearTimeout } = require('node:timers');
const { parseCompilerOutputRecords } = require('./lib/compiler-output');
const { matchesCompilerDiagnosticPath } = require('./lib/diagnostic-path');

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
  if (name === 'info') return vscode.DiagnosticSeverity.Information;
  return vscode.DiagnosticSeverity.Error;
}

function refreshDocument(document) {
  if (!isOreslang(document)) return;

  // The bundled scanner is deliberately lightweight; large files still get
  // TextMate coloring without blocking the extension host on unbounded scans.
  const text = document.getText();
  if (text.length > 2 * 1024 * 1024) {
    lexicalDiagnostics.delete(document.uri);
    for (const editor of vscode.window.visibleTextEditors) {
      if (editor.document.uri.toString() === document.uri.toString()) {
        editor.setDecorations(keywordDecoration, []);
        editor.setDecorations(runtimeGlobalDecoration, []);
      }
    }
    return;
  }
  const result = scanOreslang(text);

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
  cancelCompilerProcess(key);
  // The compiler result belongs to the previous saved version. Clear its
  // squigglies immediately instead of displaying stale results until save.
  compilerDiagnostics.delete(document.uri);
  const oldTimer = debounceTimers.get(key);
  if (oldTimer) clearTimeout(oldTimer);
  debounceTimers.set(key, setTimeout(() => {
    debounceTimers.delete(key);
    refreshDocument(document);
  }, 100));
}

function parseCompilerOutput(document, output, cwd) {
  // Null document is a deliberate parser-only mode used by diagnostics tests.
  // The editor always supplies the active file, which enforces path ownership.
  const activePath = document?.uri?.fsPath;
  const base = cwd || (activePath ? path.dirname(activePath) : '.');
  return parseCompilerOutputRecords(output)
    .filter(item => !document || matchesCompilerDiagnosticPath(item.path, activePath, base))
    .map(item => {
    const lineNumber = item.line - 1;
    const column = item.column - 1;
    const start = new vscode.Position(lineNumber, column);
    const end = new vscode.Position(item.endLine - 1, item.endColumn - 1);
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

  if (!Array.isArray(args) || args.length > 64 ||
      args.some(value => typeof value !== 'string' || value.length > 4096 || value.includes('\0'))) {
    throw new TypeError('oreslang.cli.args must be an array of up to 64 bounded strings');
  }
  // One-pass expansion prevents placeholder-looking text in a real filename
  // from being expanded a second time as if it came from configuration.
  return args.map(value => value.replace(/\{file\}|\{workspaceFolder\}/g,
    token => token === '{file}' ? document.uri.fsPath : workspacePath));
}

async function runCompilerCheck(document, interactive) {
  if (!isOreslang(document)) return;
  const key = document.uri.toString();
  const generation = (compilerCheckGenerations.get(key) || 0) + 1;
  compilerCheckGenerations.set(key, generation);
  // Superseding a run must release its child and pending Promise, not merely
  // suppress stale diagnostics after a timeout.
  cancelCompilerProcess(key);
  const version = document.version;

  // A workspace can supply settings and source files; never launch its CLI
  // automatically (or interactively) until VS Code says it is trusted.
  if (vscode.workspace.isTrusted !== true) {
    compilerDiagnostics.delete(document.uri);
    if (interactive) vscode.window.showWarningMessage(
      'Trust this workspace before running the Oreslang CLI.'
    );
    return;
  }

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

  let args;
  try {
    args = expandCompilerArgs(document);
  } catch (error) {
    compilerDiagnostics.delete(document.uri);
    if (interactive) vscode.window.showWarningMessage(error.message);
    return;
  }
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
  const cwd = workspaceFolder ? workspaceFolder.uri.fsPath : path.dirname(document.uri.fsPath);
  const suppliedTimeout = Number(cfg.get('timeoutMs', 10000));
  const timeout = Number.isFinite(suppliedTimeout)
    ? Math.max(100, Math.min(60000, suppliedTimeout)) : 10000;

  await new Promise(resolve => {
    let child;
    let settled = false;
    let watchdog;
    const active = {
      cancel() {
        if (settled) return;
        settled = true;
        if (compilerProcesses.get(key) === active) compilerProcesses.delete(key);
        cliClearTimeout(watchdog);
        terminateProcessTree(child);
        resolve();
      }
    };
    const finish = () => {
      if (settled) return;
      settled = true;
      if (compilerProcesses.get(key) === active) compilerProcesses.delete(key);
      cliClearTimeout(watchdog);
      resolve();
    };
    compilerProcesses.set(key, active);
    try {
      child = launchCompiler(childProcess, command, args,
        {cwd, timeout, maxBuffer: 4 * 1024 * 1024}, (error, stdout, stderr) => {
      if (settled) return;
      if (vscode.workspace.isTrusted !== true) {
        compilerDiagnostics.delete(document.uri);
        finish();
        return;
      }
      if (document.isClosed || document.isDirty || document.version !== version ||
          compilerCheckGenerations.get(key) !== generation) {
        finish();
        return;
      }
      const output = [stdout, stderr].filter(Boolean).join('\n');
      const diagnostics = parseCompilerOutput(document, output, cwd);

      if (error && diagnostics.length === 0) {
        const outsideFile = parseCompilerOutputRecords(output).some(item =>
          item.path && !matchesCompilerDiagnosticPath(item.path, document.uri.fsPath, cwd));
        const diagnostic = new vscode.Diagnostic(
          new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 1)),
          outsideFile
            ? 'Oreslang check reported errors in a different source file; inspect the CLI output for its path.'
            : (output.trim() || error.message),
          vscode.DiagnosticSeverity.Error
        );
        diagnostic.source = 'oreslang';
        diagnostics.push(diagnostic);
      }

      compilerDiagnostics.set(document.uri, diagnostics);
      if (interactive && !error && diagnostics.length === 0) {
        vscode.window.showInformationMessage('oreslang check passed.');
      }
      finish();
    });
      // execFile's timeout kills the leader only; a watchdog also kills
      // descendants that may have inherited its output pipe.
      if (!settled) {
        watchdog = cliSetTimeout(() => active.cancel(), timeout + 100);
        watchdog.unref?.();
      }
    } catch (error) {
      finish();
      if (interactive) vscode.window.showWarningMessage('Could not start the Oreslang CLI: ' + error.message);
    }
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
      const key = document.uri.toString();
      clearTimeout(debounceTimers.get(key));
      debounceTimers.delete(key);
      cancelCompilerProcess(key);
      lexicalDiagnostics.delete(document.uri);
      compilerDiagnostics.delete(document.uri);
      compilerCheckGenerations.delete(document.uri.toString());
    }),
    vscode.window.onDidChangeVisibleTextEditors(editors => {
      for (const editor of editors) refreshDocument(editor.document);
    }),
    vscode.workspace.onDidChangeConfiguration(event => {
      if (event.affectsConfiguration('oreslang.cli')) {
        for (const key of [...compilerProcesses.keys()]) cancelCompilerProcess(key);
        // Changed compiler settings invalidate every previously published run.
        compilerDiagnostics.clear();
      }
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
  for (const key of [...compilerProcesses.keys()]) cancelCompilerProcess(key);
  compilerCheckGenerations.clear();
  for (const timer of debounceTimers.values()) clearTimeout(timer);
  debounceTimers.clear();
}

module.exports = {
  activate,
  deactivate,
  parseCompilerOutput
};
