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
                    "languages": [{"id": "oreslang", "extensions": [".ores"]}],
                    "grammars": [{
                        "language": "oreslang",
                        "scopeName": "source.oreslang",
                        "path": "./syntaxes/oreslang.tmLanguage.json"
                    }]
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
        for unsafe in ("extension/dist/generated.zip", "extension/test/test.js", "extension/.vscode-test/binary", "extension/../evil.js"):
            with self.subTest(unsafe=unsafe):
                entries = dict(self.members)
                entries[unsafe] = b"unsafe"
                self.write_zip(entries)
                with self.assertRaisesRegex(ValueError, "Unsafe"):
                    VERIFIER.verify_vsix(self.package, self.grammar)


    def test_rejects_invalid_or_ambiguous_language_registration(self):
        original = json.loads(self.members["extension/package.json"])
        mutations = {
            "wrong language ID": lambda x: x["contributes"]["languages"][0].update(id="other"),
            "wrong extension": lambda x: x["contributes"]["languages"][0].update(extensions=[".txt"]),
            "extra extension": lambda x: x["contributes"]["languages"][0].update(extensions=[".ores", ".txt"]),
            "wrong grammar language": lambda x: x["contributes"]["grammars"][0].update(language="other"),
            "wrong scope": lambda x: x["contributes"]["grammars"][0].update(scopeName="source.other"),
            "wrong grammar path": lambda x: x["contributes"]["grammars"][0].update(path="./syntaxes/other.json"),
            "parent directory path": lambda x: x["contributes"]["grammars"][0].update(path="../other.json"),
            "duplicate language": lambda x: x["contributes"]["languages"].append(dict(x["contributes"]["languages"][0])),
            "duplicate grammar": lambda x: x["contributes"]["grammars"].append(dict(x["contributes"]["grammars"][0])),
            "no languages": lambda x: x["contributes"].update(languages=[]),
            "no grammars": lambda x: x["contributes"].update(grammars=[]),
            "non-dict contributions": lambda x: x.update(contributes=None),
        }
        for name, modify in mutations.items():
            with self.subTest(name):
                manifest = json.loads(json.dumps(original))
                modify(manifest)
                entries = dict(self.members)
                entries["extension/package.json"] = json.dumps(manifest).encode()
                self.write_zip(entries)
                with self.assertRaisesRegex(ValueError, "VSIX"):
                    VERIFIER.verify_vsix(self.package, self.grammar)

    def test_rejects_missing_required_runtime_files(self):
        for missing in VERIFIER.RUNTIME_FILES:
            with self.subTest(missing):
                entries = dict(self.members)
                del entries[missing]
                self.write_zip(entries)
                with self.assertRaisesRegex(ValueError, "missing required"):
                    VERIFIER.verify_vsix(self.package, self.grammar)

    def test_rejects_duplicate_zip_members(self):
        import warnings
        self.write_zip(self.members)
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", UserWarning)
            with zipfile.ZipFile(self.package, "a") as archive:
                archive.writestr("extension/extension.js", "overwritten")
        with self.assertRaisesRegex(ValueError, "duplicates"):
            VERIFIER.verify_vsix(self.package, self.grammar)

    def test_rejects_zip_symlinks_and_dot_components(self):
        self.write_zip(self.members)
        link = zipfile.ZipInfo("extension/link")
        link.create_system = 3
        link.external_attr = 0o120777 << 16
        with zipfile.ZipFile(self.package, "a") as archive:
            archive.writestr(link, "../../outside")
        with self.assertRaisesRegex(ValueError, "Unsafe"):
            VERIFIER.verify_vsix(self.package, self.grammar)

        entries = dict(self.members)
        entries["extension/./shadow.js"] = b"invalid path"
        self.write_zip(entries)
        with self.assertRaisesRegex(ValueError, "Unsafe"):
            VERIFIER.verify_vsix(self.package, self.grammar)

    def test_rejects_oversized_uncompressed_vsix(self):
        entries = dict(self.members)
        entries["extension/extra.bin"] = b"x" * (VERIFIER.MAX_TOTAL_UNCOMPRESSED_BYTES + 1)
        self.write_zip(entries)
        with self.assertRaisesRegex(ValueError, "size budget"):
            VERIFIER.verify_vsix(self.package, self.grammar)

    def test_rejects_missing_or_wrong_extension_entrypoint(self):
        for main in ("./missing.js", "", None):
            with self.subTest(main):
                entries = dict(self.members)
                manifest = json.loads(entries["extension/package.json"])
                manifest["main"] = main
                entries["extension/package.json"] = json.dumps(manifest).encode()
                self.write_zip(entries)
                with self.assertRaisesRegex(ValueError, "extension runtime"):
                    VERIFIER.verify_vsix(self.package, self.grammar)



if __name__ == "__main__":
    unittest.main()
