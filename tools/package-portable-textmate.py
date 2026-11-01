#!/usr/bin/env python3
"""Create and verify dependency-free, deterministic editor ZIP bundles.

Run node tools/export-portable-textmate.js first.
No external source or source-code execution occurs during packaging.
"""
from __future__ import annotations

import hashlib
import json
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "syntaxes" / "oreslang.tmLanguage.json"
DERIVED = ROOT / "dist" / "editor-bundles"
ARCHIVES = ROOT / "dist" / "editor-packages"
FIXED_DATE = (1980, 1, 1, 0, 0, 0)

BUNDLES = {
    "oreslang-visual-studio-textmate.zip": {
        "Oreslang/Syntaxes/oreslang.tmLanguage.json":
            "visual-studio/Oreslang/Syntaxes/oreslang.tmLanguage.json",
    },
    "oreslang-intellij-textmate.zip": {
        "Oreslang-vscode-bundle/package.json":
            "intellij/Oreslang-vscode-bundle/package.json",
        "Oreslang-vscode-bundle/syntaxes/oreslang.tmLanguage.json":
            "intellij/Oreslang-vscode-bundle/syntaxes/oreslang.tmLanguage.json",
    },
}


def expected_files(source: Path = SOURCE, derived: Path = DERIVED) -> dict[str, dict[str, bytes]]:
    original = source.read_bytes()
    grammar = json.loads(original)
    if grammar.get("scopeName") != "source.oreslang" or "ores" not in grammar.get("fileTypes", []):
        raise ValueError("Canonical grammar has incorrect scope or extension")
    result = {}
    for archive, members in BUNDLES.items():
        entries = {}
        for name, source_name in members.items():
            path = derived.joinpath(*source_name.split("/"))
            # Reject both symlink files and symlink parent directories.
            # Path.is_file() alone follows symlinks and would allow an off-tree read.
            if any(p.is_symlink() for p in (path, *path.parents) if p == derived or derived in p.parents) or \
               not path.is_file():
                raise ValueError("Missing or symlinked derived bundle file: " + source_name)
            data = path.read_bytes()
            if name.endswith(".tmLanguage.json") and data != original:
                raise ValueError("Derived grammar differs from canonical source: " + source_name)
            if name.endswith("package.json"):
                manifest = json.loads(data)
                if (not isinstance(manifest, dict) or
                    set(manifest) != {"name", "displayName", "version", "contributes"} or
                    not isinstance(manifest.get("contributes"), dict) or
                    set(manifest["contributes"]) != {"languages", "grammars"}):
                    raise ValueError("IntelliJ bundle must contain only declarative metadata")
                languages = manifest["contributes"]["languages"]
                grammars = manifest["contributes"]["grammars"]
                if (not isinstance(languages, list) or len(languages) != 1 or
                    not isinstance(grammars, list) or len(grammars) != 1 or
                    not isinstance(languages[0], dict) or
                    not isinstance(grammars[0], dict)):
                    raise ValueError("Derived IntelliJ manifest is missing Oreslang mapping")
                language, grammar_entry = languages[0], grammars[0]
                if (set(language) != {"id", "aliases", "extensions"} or
                    language.get("id") != "oreslang" or
                    language.get("extensions") != [".ores"] or
                    set(grammar_entry) != {"language", "scopeName", "path"} or
                    grammar_entry.get("language") != "oreslang" or
                    grammar_entry.get("scopeName") != "source.oreslang" or
                    grammar_entry.get("path") != "./syntaxes/oreslang.tmLanguage.json"):
                    raise ValueError("Derived IntelliJ manifest is missing Oreslang mapping")
            entries[name] = data
        result[archive] = entries
    return result


def write_archives(entries: dict[str, dict[str, bytes]], output: Path = ARCHIVES) -> None:
    output.mkdir(parents=True, exist_ok=True)
    for name, members in sorted(entries.items()):
        with zipfile.ZipFile(output / name, "w") as target:
            for member, data in sorted(members.items()):
                info = zipfile.ZipInfo(member, date_time=FIXED_DATE)
                info.compress_type = zipfile.ZIP_STORED
                info.create_system = 3
                info.external_attr = 0o100644 << 16
                target.writestr(info, data)


def verify_archives(entries: dict[str, dict[str, bytes]], output: Path = ARCHIVES) -> None:
    for name, members in entries.items():
        with zipfile.ZipFile(output / name, "r") as archive:
            if archive.namelist() != sorted(members):
                raise ValueError("Unexpected archive members: " + name)
            for member, expected in members.items():
                info = archive.getinfo(member)
                if info.compress_type != zipfile.ZIP_STORED or \
                   info.date_time != FIXED_DATE or archive.read(member) != expected:
                    raise ValueError("Archive content or metadata mismatch: " + member)


def main() -> None:
    entries = expected_files()
    write_archives(entries)
    verify_archives(entries)
    for archive in sorted(entries):
        dest = ARCHIVES / archive
        print(f"{archive} SHA-256 {hashlib.sha256(dest.read_bytes()).hexdigest()}")


if __name__ == "__main__":
    try:
        main()
    except (ValueError, OSError, KeyError, json.JSONDecodeError, zipfile.BadZipFile) as exc:
        sys.exit(f"Editor bundle packaging rejected: {exc}")
