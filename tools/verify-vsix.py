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
            if member.filename.startswith("/") or ".." in parts or \
               "\\" in member.filename or any(member.filename.startswith(x) for x in EXCLUDED_PREFIXES):
                raise ValueError("Unsafe or unintended VSIX file: " + member.filename)
        if archive.read("extension/syntaxes/oreslang.tmLanguage.json") != grammar.read_bytes():
            raise ValueError("VSIX grammar is not byte-identical to canonical Oreslang grammar")
        manifest = json.loads(archive.read("extension/package.json"))
        if manifest.get("main") != "./extension.js":
            raise ValueError("VSIX package manifest does not target the extension runtime")
        languages = manifest["contributes"]["languages"]
        grammars = manifest["contributes"]["grammars"]
        if ".ores" not in languages[0]["extensions"] or \
           grammars[0]["scopeName"] != "source.oreslang":
            raise ValueError("VSIX does not register .ores / source.oreslang")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit("usage: verify-vsix.py <file.vsix>")
    try:
        verify_vsix(Path(sys.argv[1]))
        print("VSIX grammar, runtime, manifest, and payload boundaries verified")
    except (OSError, KeyError, ValueError, zipfile.BadZipFile) as exc:
        sys.exit("VSIX verification failed: " + str(exc))
