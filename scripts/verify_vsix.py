"""Fail-closed verification of source-local Oreslang VSIX contents."""
import hashlib
import json
import pathlib
import sys
import zipfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
FILES = {
    "extension/package.json",
    "extension/readme.md",
    "extension/LICENSE.txt",
    "extension/extension.js",
    "extension/language-configuration.json",
    "extension/lib/scan.js",
    "extension/lib/compiler-output.js",
    "extension/lib/diagnostic-path.js",
    "extension/lib/compiler-process.js",
    "extension/syntaxes/oreslang.tmLanguage.json",
}
METADATA = {"[Content_Types].xml", "extension.vsixmanifest"}

def check(filename):
    archive = pathlib.Path(filename)
    with zipfile.ZipFile(archive) as z:
        paths=z.namelist()
        if len(paths)!=len(set(paths)):
            raise ValueError("duplicate VSIX entries")
        if set(paths)!=FILES|METADATA:
            raise ValueError(
                f"unexpected/missing VSIX files extra={sorted(set(paths)-(FILES|METADATA))}; "
                f"missing={sorted((FILES|METADATA)-set(paths))}")
        for name in paths:
            if name.startswith("/") or ".." in pathlib.PurePosixPath(name).parts or "\\" in name:
                raise ValueError("unsafe VSIX path")
        manifest=json.loads(z.read("extension/package.json"))
        if manifest.get("main")!="./extension.js":
            raise ValueError("VSIX missing runtime entry")
        capabilities=manifest.get("capabilities",{}).get("untrustedWorkspaces",{})
        if capabilities.get("supported")!="limited":
            raise ValueError("Restricted Mode declaration missing from release")
        grammars=manifest.get("contributes",{}).get("grammars",[])
        if not any(g.get("scopeName")=="source.oreslang" and
            g.get("path")=="./syntaxes/oreslang.tmLanguage.json" for g in grammars):
            raise ValueError("compiler-current TextMate grammar not registered")
        if b"compiler-process" not in z.read("extension/extension.js"):
            raise ValueError("installed CLI lifecycle hardening missing")
        if b"source.oreslang" not in z.read("extension/syntaxes/oreslang.tmLanguage.json"):
            raise ValueError("installed grammar missing")
    return hashlib.sha256(archive.read_bytes()).hexdigest()

if __name__=="__main__":
    if len(sys.argv)!=3:
        raise SystemExit("usage: verify_vsix.py first.vsix second.vsix")
    first,second=map(pathlib.Path,sys.argv[1:])
    sha=check(first)
    if sha!=check(second) or first.read_bytes()!=second.read_bytes():
        raise ValueError("two independently built VSIX archives differ")
    print(f"PASS: reproducible VSIX package exact allowlist, installed entrypoints, trust metadata")
    print(f"SHA256 {sha} {first}")
