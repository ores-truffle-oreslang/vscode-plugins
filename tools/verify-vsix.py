#!/usr/bin/env python3
"""Verify contents of an installable Oreslang VS Code extension VSIX."""
from __future__ import annotations

import json
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
GRAMMAR = ROOT / "syntaxes" / "oreslang.tmLanguage.json"
RUNTIME_FILES = {
    "extension/package.json",
    "extension/extension.js",
    "extension/syntaxes/oreslang.tmLanguage.json",
    "extension/language-configuration.json",
}
EXCLUDED_PREFIXES = (
    "extension/.git/",
    "extension/.github/",
    "extension/dist/",
    "extension/test/",
    "extension/tools/",
    "extension/node_modules/",
    "extension/.vscode-test/",
)
MAX_TOTAL_UNCOMPRESSED_BYTES = 10 * 1024 * 1024


def verify_vsix(package: Path, grammar: Path = GRAMMAR) -> None:
    with zipfile.ZipFile(package, "r") as archive:
        members = archive.infolist()
        names = {member.filename for member in members}
        if len(names) != len(members) or not RUNTIME_FILES <= names:
            raise ValueError("VSIX missing required runtime files or contains duplicates")
        if sum(member.file_size for member in members) > MAX_TOTAL_UNCOMPRESSED_BYTES:
            raise ValueError("VSIX exceeds uncompressed size budget")
        for member in members:
            parts = member.filename.split("/")
            unix_type = (member.external_attr >> 16) & 0o170000
            if member.filename.startswith("/") or any(p in (".", "..") for p in parts) or \
               "\\" in member.filename or unix_type == 0o120000 or \
               any(member.filename.startswith(x) for x in EXCLUDED_PREFIXES):
                raise ValueError("Unsafe or unintended VSIX file: " + member.filename)
        if archive.read("extension/syntaxes/oreslang.tmLanguage.json") != grammar.read_bytes():
            raise ValueError("VSIX grammar is not byte-identical to canonical Oreslang grammar")
        manifest = json.loads(archive.read("extension/package.json"))
        if manifest.get("main") != "./extension.js":
            raise ValueError("VSIX package manifest does not target the extension runtime")
        contributions = manifest.get("contributes")
        if not isinstance(contributions, dict):
            raise ValueError("VSIX missing declarative language contributions")
        languages = contributions.get("languages")
        grammars = contributions.get("grammars")
        if (not isinstance(languages, list) or len(languages) != 1 or
            not isinstance(grammars, list) or len(grammars) != 1 or
            not isinstance(languages[0], dict) or not isinstance(grammars[0], dict)):
            raise ValueError("VSIX must register exactly one Oreslang language and grammar")
        language, grammar_entry = languages[0], grammars[0]
        if (language.get("id") != "oreslang" or
            not isinstance(language.get("extensions"), list) or
            language["extensions"] != [".ores"] or
            grammar_entry.get("language") != "oreslang" or
            grammar_entry.get("scopeName") != "source.oreslang" or
            grammar_entry.get("path") != "./syntaxes/oreslang.tmLanguage.json"):
            raise ValueError("VSIX does not register the expected .ores / source.oreslang grammar path")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit("usage: verify-vsix.py <file.vsix>")
    try:
        verify_vsix(Path(sys.argv[1]))
        print("VSIX grammar, runtime, manifest, and payload boundaries verified")
    except (OSError, KeyError, ValueError, zipfile.BadZipFile) as exc:
        sys.exit("VSIX verification failed: " + str(exc))
