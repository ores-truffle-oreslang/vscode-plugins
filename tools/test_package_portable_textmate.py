"""Security and reproducibility checks for generated editor install packages."""
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).with_name("package-portable-textmate.py")
SPEC = importlib.util.spec_from_file_location("portable_packager", SCRIPT)
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class PortableBundleTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix="oreslang-bundles-")
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.source = self.root / "syntax.json"
        self.derived = self.root / "dist"
        self.archives = self.root / "archives"
        self.source.parent.mkdir(parents=True, exist_ok=True)
        self.source.write_text(json.dumps({
            "name": "Oreslang",
            "scopeName": "source.oreslang",
            "fileTypes": ["ores"],
            "patterns": [],
        }), encoding="utf-8")
        for members in MODULE.BUNDLES.values():
            for name in members.values():
                target = self.derived.joinpath(*name.split("/"))
                target.parent.mkdir(parents=True, exist_ok=True)
                if name.endswith(".tmLanguage.json"):
                    target.write_bytes(self.source.read_bytes())
                else:
                    target.write_text(json.dumps({
                        "contributes": {
                            "languages": [{"extensions": [".ores"]}],
                            "grammars": [{
                                "scopeName": "source.oreslang",
                                "path": "./syntaxes/oreslang.tmLanguage.json"
                            }]
                        }
                    }), encoding="utf-8")

    def test_packages_are_deterministic_and_contain_only_expected_files(self):
        members = MODULE.expected_files(self.source, self.derived)
        MODULE.write_archives(members, self.archives)
        MODULE.verify_archives(members, self.archives)
        original = {file.name: file.read_bytes() for file in self.archives.iterdir()}
        MODULE.write_archives(members, self.archives)
        self.assertEqual(original, {file.name: file.read_bytes() for file in self.archives.iterdir()})
        self.assertEqual(set(original), set(MODULE.BUNDLES))

    def test_fails_closed_for_stale_grammar_or_executable_intellij_manifest(self):
        target = self.derived / "visual-studio" / "Oreslang" / "Syntaxes" / "oreslang.tmLanguage.json"
        target.write_bytes(b"tampered")
        with self.assertRaisesRegex(ValueError, "differs"):
            MODULE.expected_files(self.source, self.derived)
        target.write_bytes(self.source.read_bytes())

        manifest_path = self.derived / "intellij" / "Oreslang-vscode-bundle" / "package.json"
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        manifest["main"] = "./extension.js"
        manifest_path.write_text(json.dumps(manifest), encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "declarative"):
            MODULE.expected_files(self.source, self.derived)

    def test_verifier_rejects_injected_archive_member(self):
        members = MODULE.expected_files(self.source, self.derived)
        MODULE.write_archives(members, self.archives)
        import zipfile
        path = self.archives / "oreslang-intellij-textmate.zip"
        with zipfile.ZipFile(path, "a") as archive:
            archive.writestr("../payload.js", "not an allowed file")
        with self.assertRaisesRegex(ValueError, "Unexpected archive members"):
            MODULE.verify_archives(members, self.archives)


if __name__ == "__main__":
    unittest.main()
