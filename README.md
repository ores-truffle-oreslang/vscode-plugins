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

The extension also has an **external check-only compiler adapter**. Set:

- `oreslang.compiler.command`
- `oreslang.compiler.args`

The default argument template is:

```text
--check {file}
```

The current Oreslang launcher does not yet expose a check-only mode, so the compiler command is blank by default. This prevents the editor from accidentally executing the program just to obtain diagnostics. Once the compiler exposes check-only diagnostics, configure its executable and VS Code will add compiler/type errors to the same editor workflow.

Use **Oreslang: Check Current File** to run an explicit compiler check.

## Development

No build step is required.

```bash
npm test
```

Then open this repository in VS Code and launch an Extension Development Host.

## Source of truth

Language syntax should track the compiler lexer and grammar in:

- `ores-truffle-oreslang/oreslang-source.java/src/main/java/dev/oreslang/parser/Lexer.java`
- `ores-truffle-oreslang/oreslang-source.java/docs/grammar.ebnf`
