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
            if path.is_symlink() or not path.is_file():
                raise ValueError("Missing or symlinked derived bundle file: " + source_name)
            data = path.read_bytes()
            if name.endswith(".tmLanguage.json") and data != original:
                raise ValueError("Derived grammar differs from canonical source: " + source_name)
            if name.endswith("package.json"):
                manifest = json.loads(data)
                languages = manifest["contributes"]["languages"]
                grammars = manifest["contributes"]["grammars"]
                if ".ores" not in languages[0]["extensions"] or \
                   grammars[0]["scopeName"] != "source.oreslang" or \
                   grammars[0]["path"] != "./syntaxes/oreslang.tmLanguage.json":
                    raise ValueError("Derived IntelliJ manifest is missing Oreslang mapping")
                if "main" in manifest or "scripts" in manifest:
                    raise ValueError("IntelliJ bundle must contain only declarative metadata")
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
