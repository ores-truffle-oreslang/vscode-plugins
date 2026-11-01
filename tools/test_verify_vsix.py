"""Fail-closed VSIX manifest/grammar validation tests."""
import importlib.util
import json
import tempfile
import unittest
import zipfile
from pathlib import Path

SCRIPT = Path(__file__).with_name("verify-vsix.py")
SPEC = importlib.util.spec_from_file_location("vscode_vsix_verifier", SCRIPT)
VERIFIER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(VERIFIER)


class VerifyVsixTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix="oreslang-vsix-")
        self.addCleanup(self.tmp.cleanup)
        self.package = Path(self.tmp.name) / "test.vsix"
        self.grammar = Path(self.tmp.name) / "grammar.json"
        self.grammar.write_text('{"scopeName":"source.oreslang","fileTypes":["ores"]}')
        self.members = {
            "extension/package.json": json.dumps({
                "main": "./extension.js",
                "contributes": {
                    "languages": [{"extensions": [".ores"]}],
                    "grammars": [{"scopeName": "source.oreslang"}]
                }
            }).encode(),
            "extension/extension.js": b"module.exports = {}",
            "extension/syntaxes/oreslang.tmLanguage.json": self.grammar.read_bytes(),
            "extension/language-configuration.json": b"{}",
        }

    def write_zip(self, content):
        with zipfile.ZipFile(self.package, "w") as archive:
            for path, data in content.items():
                archive.writestr(path, data)

    def test_accepts_runtime_only_package(self):
        self.write_zip(self.members)
        VERIFIER.verify_vsix(self.package, self.grammar)

    def test_rejects_modified_grammar(self):
        entries = dict(self.members)
        entries["extension/syntaxes/oreslang.tmLanguage.json"] = b"altered"
        self.write_zip(entries)
        with self.assertRaisesRegex(ValueError, "not byte-identical"):
            VERIFIER.verify_vsix(self.package, self.grammar)

    def test_rejects_unsafe_entries(self):
        for unsafe in ("extension/dist/generated.zip", "extension/test/test.js", "extension/../evil.js"):
            with self.subTest(unsafe=unsafe):
                entries = dict(self.members)
                entries[unsafe] = b"unsafe"
                self.write_zip(entries)
                with self.assertRaisesRegex(ValueError, "Unsafe"):
                    VERIFIER.verify_vsix(self.package, self.grammar)


if __name__ == "__main__":
    unittest.main()
