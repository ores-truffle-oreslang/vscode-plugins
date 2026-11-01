# Oreslang syntax-highlighting coverage

The canonical TextMate grammar is [`syntaxes/oreslang.tmLanguage.json`](../syntaxes/oreslang.tmLanguage.json).
It declares `source.oreslang` and the `.ores` file extension. **Do not manually fork this grammar for different editors.**
TextMate highlighting is lexical, not proof that a program compiles. The Java compiler and shared lexical contract remain the authority for syntax admission.

| Product | Delivery | Scope / limitation |
| --- | --- | --- |
| Visual Studio Code | Install the extension in this repository | TextMate coloring plus optional extension diagnostics/keyword decorations |
| Sublime Text | Install [`sublime-text-plugins`](https://github.com/ores-truffle-oreslang/sublime-text-plugins) | Uses its native `.sublime-syntax`; keep aligned via shared conformance fixtures |
| Visual Studio (Windows IDE, not VS Code) | Copy exported TextMate grammar to the user-local extensions folder | TextMate coloring; **not** a published VSIX or a verified native language service |
| IntelliJ IDEA / JetBrains | Import the exported VS Code-format TextMate bundle | TextMate coloring; **not** an IntelliJ PSI parser, formatter or LSP client |
| Claude Code | Use an Oreslang-enabled editor while using Claude Code | The Claude Code terminal has its **own** renderer; this extension does not register a new language in that renderer |
| OpenAI Codex | Use an Oreslang-enabled editor while using Codex | The Codex terminal's Markdown/diff syntax highlighting and themes are distinct from editor grammar registration |

## Export once, without duplicated source files

From the VS Code plugin repository:

~~~sh
node tools/export-portable-textmate.js
npm test
~~~

The exporter produces **derived** files in `dist/editor-bundles` and reads the canonical grammar directly. Tests compare the exported files byte-for-byte with the input and ensure file-type/scope registration.

### Visual Studio (Windows IDE)

Copy the generated `dist/editor-bundles/visual-studio/Oreslang` folder to:

~~~text
%USERPROFILE%\.vs\Extensions\Oreslang
~~~

The resulting grammar is at `%USERPROFILE%\.vs\Extensions\Oreslang\Syntaxes\oreslang.tmLanguage.json`. Reopen any already-open `.ores` files. This is the user-local grammar route documented by Microsoft; packaging a marketplace VSIX with a `.pkgdef` and validation on a Windows IDE runner is a **separate future release gate**.

Official guide: https://learn.microsoft.com/en-us/visualstudio/ide/adding-visual-studio-editor-support-for-other-languages

### IntelliJ IDEA and other JetBrains IDEs

1. Confirm **TextMate Bundles** is enabled under Settings > Plugins.
2. Open Settings > Editor > TextMate Bundles.
3. Add the generated `dist/editor-bundles/intellij/Oreslang-vscode-bundle` directory.
4. Open a `.ores` file and check its highlighting.

JetBrains supports importing VS Code extensions with `package.json` as TextMate bundles; the exported bundle contains only a declaration and grammar, **not executable extension JavaScript**. You can alternatively try importing this repository's root as a VS Code-format TextMate bundle.

Official guide: https://www.jetbrains.com/help/idea/textmate.html

### Claude Code and Codex

These are coding agents, not standalone IDE language-extension hosts. Running them **inside a supported editor** retains that editor's Oreslang syntax coloring. Their own terminal responses, diffs and fenced code blocks have separate highlighting engines; neither CLI is known to accept this TextMate extension as a direct language plug-in. Do not claim otherwise based on the editor tests.

For markdown source examples, label code fences `oreslang` or `ores` when the renderer recognizes it, but do not assume either CLI renders those labels natively. `CLAUDE.md` and `AGENTS.md` may help the agents understand the Oreslang build, syntax and test commands; they **do not install a syntax highlighter**.

Official Codex TUI documentation: https://learn.chatgpt.com/docs/cli-customization

## Acceptance gates

- The VS Code `.ores` grammar, Sublime syntax and web highlighter must share an adversarial fixture registry for nested comments, multiline strings, quoted Symbols, Unicode and reserved words.
- `npm test` must pass with real executed GitHub Actions steps, and all exported grammars must be byte-identical to the pinned canonical source.
- Validate imported TextMate scopes in **actual Visual Studio and IntelliJ hosts** before claiming end-user compatibility is verified. Export tests are packaging tests, not in-host execution evidence.
- For actual CLI-native syntax highlighting, first confirm that Claude Code or Codex offers an officially supported custom-language registration API. A separate Tree-sitter grammar may be valuable for compatible terminal editors, but it does **not** automatically extend either agent's renderer.
- A first-party JetBrains plugin and a Visual Studio VSIX are future options if users need diagnostics/LSP, language services, publication/discoverability, or automated installation. They can start in this mono-repo; new GitHub repos are optional, not a prerequisite for TextMate support.
