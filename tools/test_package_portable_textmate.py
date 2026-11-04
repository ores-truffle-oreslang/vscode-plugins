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
                        "name": "oreslang-textmate-bundle",
                        "displayName": "Oreslang",
                        "version": "0.1.0",
                        "contributes": {
                            "languages": [{
                                "id": "oreslang",
                                "aliases": ["Oreslang", "oreslang"],
                                "extensions": [".ores"]
                            }],
                            "grammars": [{
                                "language": "oreslang",
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


    def test_rejects_ambiguous_or_executable_intellij_metadata(self):
        manifest_path = self.derived / "intellij" / "Oreslang-vscode-bundle" / "package.json"
        original = json.loads(manifest_path.read_text(encoding="utf-8"))
        mutations = {
            "activation events": lambda x: x.update(activationEvents=["*"]),
            "browser entrypoint": lambda x: x.update(browser="./evil.js"),
            "extension dependencies": lambda x: x.update(extensionDependencies=["other.extension"]),
            "scripts": lambda x: x.update(scripts={"postinstall": "node evil.js"}),
            "unexpected commands": lambda x: x["contributes"].update(commands=[{"command": "oops"}]),
            "wrong language": lambda x: x["contributes"]["languages"][0].update(id="not-oreslang"),
            "wrong file extension": lambda x: x["contributes"]["languages"][0].update(extensions=[".txt"]),
            "duplicate language": lambda x: x["contributes"]["languages"].append(
                dict(x["contributes"]["languages"][0])),
            "duplicate grammar": lambda x: x["contributes"]["grammars"].append(
                dict(x["contributes"]["grammars"][0])),
            "wrong grammar language": lambda x: x["contributes"]["grammars"][0].update(language="other"),
            "path traversal": lambda x: x["contributes"]["grammars"][0].update(path="../escape.json"),
        }
        for name, modify in mutations.items():
            with self.subTest(name):
                manifest = json.loads(json.dumps(original))
                modify(manifest)
                manifest_path.write_text(json.dumps(manifest), encoding="utf-8")
                with self.assertRaisesRegex(ValueError, "declarative|mapping"):
                    MODULE.expected_files(self.source, self.derived)
        manifest_path.write_text(json.dumps(original), encoding="utf-8")

    def test_rejects_symlinked_parent_directory(self):
        directory = self.derived / "visual-studio" / "Oreslang" / "Syntaxes"
        real_directory = directory.with_name("Syntaxes-real")
        directory.rename(real_directory)
        try:
            directory.symlink_to(real_directory, target_is_directory=True)
        except (OSError, NotImplementedError):
            self.skipTest("directory symlinks unavailable on this host")
        with self.assertRaisesRegex(ValueError, "symlinked"):
            MODULE.expected_files(self.source, self.derived)

    def test_rejects_changed_zip_content_or_metadata(self):
        entries = MODULE.expected_files(self.source, self.derived)
        MODULE.write_archives(entries, self.archives)
        import zipfile
        name = "oreslang-visual-studio-textmate.zip"
        member = "Oreslang/Syntaxes/oreslang.tmLanguage.json"
        archive_path = self.archives / name
        with zipfile.ZipFile(archive_path, "w") as archive:
            archive.writestr(member, b"tampered")
        with self.assertRaisesRegex(ValueError, "content or metadata mismatch"):
            MODULE.verify_archives(entries, self.archives)
        MODULE.write_archives(entries, self.archives)
        with zipfile.ZipFile(archive_path, "w") as archive:
            info = zipfile.ZipInfo(member, date_time=(2026, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_STORED
            archive.writestr(info, entries[name][member])
        with self.assertRaisesRegex(ValueError, "content or metadata mismatch"):
            MODULE.verify_archives(entries, self.archives)



if __name__ == "__main__":
    unittest.main()
