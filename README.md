# Oreslang for VS Code

Language support for `.ores` files.

## Editor contract

The extension deliberately keeps Oreslang's language keywords in one color family instead of allowing control-flow, declarations, visibility, and type-system keywords to drift apart.

- **Language keywords:** exact magenta by default (`#FF00FF`).
- **Runtime globals:** exact royal blue by default (`#4169E1`) for `recover`, `defer`, `throw`, and `raise`.

The exact colors are applied by editor decorations, while the bundled TextMate grammar also assigns stable semantic scopes for compatibility with normal VS Code themes.

Examples of the magenta class include `pub`, `fnc`, `void`, `class`, `module`, `return`, `if`, `else`, `elif`, `fi`, `case`, `match`, `switch`, `try`, `catch`, `select`, actor/concurrency modifiers, type-system keywords, and declaration keywords.

## Diagnostics / squigglies

Built-in diagnostics run without a compiler process and currently catch:

- unmatched or mismatched `()`, `[]`, and `{}`;
- unterminated strings;
- unterminated nested block comments.

The scanner intentionally ignores keyword-looking text inside strings and comments.

Authoritative diagnostics come through the canonical Oreslang developer-tooling CLI:

```text
oreslang check --format=json {file}
```

The defaults are:

- `oreslang.cli.command = "oreslang"`
- `oreslang.cli.args = ["check", "--format=json", "{file}"]`

The extension does not call `ORESoftware/ores-cli`, does not call a command named `ores`, and does not invoke the Java compiler directly. `oreslang-cli` owns the editor-facing process contract and delegates safely to the non-executing compiler backend.

The extension invokes the CLI only when **VS Code Workspace Trust** is enabled.
An untrusted workspace receives TextMate highlighting and lightweight scanner
diagnostics, but cannot launch a configured executable, including through the
explicit check command. CLI arguments are passed without a shell and placeholders
are expanded atomically. The lexical scanner skips raw template bodies and
files over 2 MiB; the compiler remains authoritative for full syntax checks.

Use **Oreslang: Check Current File** to run an explicit compiler check.

## Development

No build step is required, but the TextMate/Oniguruma engine tests require dev dependencies.

```bash
npm install --ignore-scripts
npm test
```

Then open this repository in VS Code and launch an Extension Development Host.

## Source of truth

Language syntax should track the compiler lexer and grammar in:

- `ores-truffle-oreslang/oreslang-source.java/src/main/java/dev/oreslang/parser/Lexer.java`
- `ores-truffle-oreslang/oreslang-source.java/docs/grammar.ebnf`

### Compiler compatibility

The editor grammar tracks proposed compiler constructs without changing compiler acceptance. See [docs/compiler-pr-sync.md](docs/compiler-pr-sync.md) for the October 2026 upstream PR matrix and validation gates.

## Shared lexer fixture contract

`conformance/oreslang-syntax-v1.json` is copied byte-for-byte into VS Code,
Sublime Text, and the HTML highlighter. `test/conformance.test.js` verifies
positive and negative editor-token cases. These are **source-free host checks**,
not proof that the compiler accepts the examples or that VS Code's actual
TextMate renderer colors them identically.

The manifest pins the authoritative Java lexer and EBNF blob identities. The
pinned compiler `main` still recognizes `isoactor`, `null`, `%` and `^`,
whereas the proposed editor-target contract intentionally excludes them.
That is an explicit compiler/editor parity discrepancy, **not** a validated
compiler migration. Review before merging semantics changes.

The shared suite now includes **50 adversarial fixtures**. The tests run
through regular editor PR CI and validate only the editor-target contract.

**Privacy boundary:** The compiler source repository is private. Public
workflows must not clone or mirror its source. The removed scheduled watcher
could not verify private Git blobs via anonymous fetches. Compiler-side
lexer/parser tests are proposed in private oreslang-source.java PR #2350,
but currently have zero executed CI steps. Public editor CI is not a proof
of compiler acceptance, guest execution, or actual TextMate rendering.

## TextMate engine tests

The new textmate-engine test uses the real `vscode-textmate` interpreter and `vscode-oniguruma` WASM to assert token scope boundaries across nested comments, quoted strings, Symbols, compound forms and runtime globals. This does not yet run a VS Code Extension Host, custom color decoration rendering or a compiler.
