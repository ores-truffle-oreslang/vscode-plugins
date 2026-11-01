# Oreslang syntax-highlighting coverage

The canonical TextMate grammar is [`syntaxes/oreslang.tmLanguage.json`](../syntaxes/oreslang.tmLanguage.json).
It declares `source.oreslang` and the `.ores` file extension. **Do not manually fork this grammar for different editors.**
TextMate highlighting is lexical, not proof that a program compiles. The Java compiler and shared lexical contract remain the authority for syntax admission.

| Product | Delivery | Scope / limitation |
| --- | --- | --- |
| Visual Studio Code | Install generated `.vsix` from CI | TextMate coloring plus optional extension diagnostics/keyword decorations |
| Sublime Text | Install [`sublime-text-plugins`](https://github.com/ores-truffle-oreslang/sublime-text-plugins) | Uses its native `.sublime-syntax`; keep aligned via shared conformance fixtures |
| Visual Studio (Windows IDE, not VS Code) | Copy exported TextMate grammar to the user-local extensions folder | TextMate coloring; **not** a published VSIX or a verified native language service |
| IntelliJ IDEA / JetBrains | Import the exported VS Code-format TextMate bundle | TextMate coloring; **not** an IntelliJ PSI parser, formatter or LSP client |
| Claude Code | Use an Oreslang-enabled editor while using Claude Code | The Claude Code terminal has its **own** renderer; this extension does not register a new language in that renderer |
| OpenAI Codex | Use an Oreslang-enabled editor while using Codex | The Codex terminal's Markdown/diff syntax highlighting and themes are distinct from editor grammar registration |

## Export once, without duplicated source files

From the VS Code plugin repository:

~~~sh
npm test
node tools/export-portable-textmate.js
python3 -m unittest discover -s tools -p 'test_*.py' -v
python3 tools/package-portable-textmate.py
~~~

The exporter produces **derived** files in `dist/editor-bundles` and reads the canonical grammar directly. Tests compare the exported files byte-for-byte with the input and ensure file-type/scope registration. The packager verifies that those bytes match the canonical source, rejects executable IntelliJ metadata, and produces deterministic ZIP archives in `dist/editor-packages`.

### VS Code and compatible editors

For an installable extension, download the **`oreslang-vscode-vsix`** artifact from a successful GitHub Actions run. Extract the outer GitHub Actions artifact ZIP and install the contained `oreslang-vscode.vsix`:

~~~sh
code --install-extension oreslang-vscode.vsix
~~~

Or open VS Code's Extensions view, choose its menu and **Install from VSIX…**. This is a built VS Code extension including the Oreslang grammar and editor runtime, not a Visual Studio (Windows IDE) VSIX. The CI verifier checks for essential runtime files and byte-identical Oreslang grammar, but an actual VS Code extension-host installation remains a separate acceptance test.

For each successful GitHub Actions run, download the **`oreslang-portable-editor-bundles`** artifact from the run's **Artifacts** section (retained for 14 days). It contains `oreslang-visual-studio-textmate.zip` and `oreslang-intellij-textmate.zip`. The ZIP archives are installable *TextMate grammar bundles*, **not signed marketplace extensions**. SHA-256 archive digests are printed in the job log. The CI artifacts are generated from the exact commit tested.

### Visual Studio (Windows IDE)

Extract `oreslang-visual-studio-textmate.zip` directly into `%USERPROFILE%\.vs\Extensions` so it creates the `Oreslang\Syntaxes` directory. Alternatively, copy the generated `dist/editor-bundles/visual-studio/Oreslang` folder into that same parent directory. Resulting file:

~~~text
%USERPROFILE%\.vs\Extensions\Oreslang\Syntaxes\oreslang.tmLanguage.json
~~~

Reopen any already-open `.ores` files. This is the user-local grammar route documented by Microsoft; packaging a marketplace VSIX with a `.pkgdef` and validation on a Windows IDE runner is a **separate future release gate**.

Official guide: https://learn.microsoft.com/en-us/visualstudio/ide/adding-visual-studio-editor-support-for-other-languages

### IntelliJ IDEA and other JetBrains IDEs

1. Confirm **TextMate Bundles** is enabled under Settings > Plugins.
2. Open Settings > Editor > TextMate Bundles.
3. Extract `oreslang-intellij-textmate.zip` and add the resulting `Oreslang-vscode-bundle` folder, or add the generated `dist/editor-bundles/intellij/Oreslang-vscode-bundle` directory.
4. Open a `.ores` file and check its highlighting.

JetBrains supports importing VS Code extensions with `package.json` as TextMate bundles; the exported bundle contains only a declaration and grammar, **not executable extension JavaScript**. You can alternatively try importing this repository's root as a VS Code-format TextMate bundle.

Official guide: https://www.jetbrains.com/help/idea/textmate.html

### Claude Code and OpenAI Codex

For **Oreslang highlighting while working with these agents**, the supported route is to combine the relevant *IDE's* Oreslang grammar with the agent's IDE integration:

| Host | Oreslang syntax color | Agent integration |
| --- | --- | --- |
| VS Code / compatible editor | This repository's Oreslang extension | Claude Code for VS Code or Codex IDE extension |
| IntelliJ IDEA / JetBrains | The exported Oreslang TextMate bundle from this repository | Claude Code's JetBrains integration or Codex's JetBrains integration |
| Sublime Text | The Oreslang package in `sublime-text-plugins` | Use an external Claude Code or Codex terminal to edit the same project files |
| Visual Studio (Windows IDE) | The exported Visual Studio TextMate grammar | Use a compatible external agent workflow; **do not assume** VS Code's extensions install in Visual Studio |

**VS Code workflow:** Install the Oreslang VS Code extension and the [Claude Code extension](https://marketplace.visualstudio.com/items?itemName=anthropic.claude-code) or [Codex IDE integration](https://learn.chatgpt.com/docs/ide). Open `*.ores` files in the editor; coloring comes from Oreslang's grammar, not from the agent.

**JetBrains workflow:** Import the Oreslang TextMate bundle under Settings > Editor > TextMate Bundles. Install the [Claude Code JetBrains integration](https://claude.com/product/claude-code) or [Codex JetBrains integration](https://learn.chatgpt.com/docs/ide). The IDE provides code colorization.

**Terminal limitation:** The standalone agent CLIs render their **own** code blocks and diffs. Installing TextMate or Sublime grammars does not register Oreslang as a language in either terminal. Codex's documented `/theme` and `.tmTheme` support change *colors*, not the tokenizer or supported language list: https://learn.chatgpt.com/docs/cli-customization. Do not treat these editor integrations as proof of native Oreslang grammar registration in either TUI.

Write Markdown code fences as `oreslang` or `ores` when a given renderer understands them; otherwise use a supported editor for the actual source view. `CLAUDE.md` and `AGENTS.md` can describe Oreslang tooling to agents but do **not** supply syntax coloring.

## Acceptance gates

- The VS Code `.ores` grammar, Sublime syntax and web highlighter must share an adversarial fixture registry for nested comments, multiline strings, quoted Symbols, Unicode and reserved words.
- `npm test` must pass with real executed GitHub Actions steps, and all exported grammars must be byte-identical to the pinned canonical source.
- Validate imported TextMate scopes in **actual Visual Studio and IntelliJ hosts** before claiming end-user compatibility is verified. Export tests are packaging tests, not in-host execution evidence.
- For actual CLI-native syntax highlighting, first confirm that Claude Code or Codex offers an officially supported custom-language registration API. A separate Tree-sitter grammar may be valuable for compatible terminal editors, but it does **not** automatically extend either agent's renderer.
- A first-party JetBrains plugin and a Visual Studio VSIX are future options if users need diagnostics/LSP, language services, publication/discoverability, or automated installation. They can start in this mono-repo; new GitHub repos are optional, not a prerequisite for TextMate support.

## Exact shared host-acceptance fixture

The source fixture [`test/fixtures/editor-compat.ores`](../test/fixtures/editor-compat.ores)
and machine-readable [expected semantic spans](../test/fixtures/editor-compat.expected.json)
pin line/needle/category assertions for all four editor hosts. The Node fixture
tests check these records for unique, valid UTF-16 source spans, **not** actual
TextMate scopes or editor installation. Some expected Symbol, Unicode and
compound-keyword scopes depend on grammar hardening in PR #14 and must not be
declared passing on PR #17's older canonical grammar.

For a native-host acceptance run, use the **same exact-head ZIP/VSIX** that
passed source CI, record its SHA-256 and the installed host version, open the
fixture as `.ores`, and map each recorded semantic category to the target
editor's actual token scopes. Negative assertions must confirm that nested
comments and strings do not leak keyword/Symbol scopes; the keyword suffix of
`éreturn` must not be independently matched. Visual inspection of color alone
is insufficient when themes mask tokenization differences.

- **VS Code:** install the generated VSIX into an isolated extensions directory,
  verify `oreslang` file association, and use the real extension/TextMate host
  for scope assertions. Packaging-only checks cannot stand in for this.
- **Sublime Text:** use the companion native `.sublime-syntax` and Sublime's
  `syntax_test_*.ores` assertion format with the shared fixture spans. A
  generic TextMate parser test does not validate Sublime's own syntax engine.
- **Visual Studio:** use an actual Windows Visual Studio IDE, extract the
  Visual Studio grammar archive into the documented user-local folder, reopen
  `.ores` and capture association, effective scopes and version evidence.
  A ZIP copy or ordinary Windows shell check is not host execution.
- **IntelliJ:** enable the TextMate Bundles plugin and import the unpacked
  `Oreslang-vscode-bundle` folder in a pinned IntelliJ IDEA release. Reopen
  `.ores` and capture plugin/build/version, effective scopes and an import
  diagnostic. The bundle's `package.json` and archive checks are only
  source-level tests.

Do not mark these four host rows green without individual execution records.
Claude Code and Codex may display editor-host coloring but their standalone
CLI renderers do not automatically load these exported grammars.
