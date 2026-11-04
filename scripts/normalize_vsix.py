"""Normalize unsigned VSIX ZIP metadata only after byte-for-byte payload comparison."""
import os
import pathlib
import sys
import zipfile

FIXED_DATE=(1980,1,1,0,0,0)
def normalize_pair(one,two):
    first,second=map(pathlib.Path,(one,two))
    with zipfile.ZipFile(first) as a,zipfile.ZipFile(second) as b:
        a_names,b_names=a.namelist(),b.namelist()
        if len(a_names)!=len(set(a_names)) or set(a_names)!=set(b_names):
            raise ValueError("VSIX payload layouts differ")
        for name in a_names:
            if a.read(name)!=b.read(name):
                raise ValueError(f"VSIX payload bytes differ in {name}; no metadata-only normalization permitted")
    for src in (first,second):
        staged=src.with_name(src.name+".normalized")
        with zipfile.ZipFile(src) as archive,zipfile.ZipFile(staged,"w",compression=zipfile.ZIP_DEFLATED,compresslevel=9) as out:
            for name in sorted(archive.namelist()):
                entry=zipfile.ZipInfo(name,FIXED_DATE)
                entry.create_system=3
                entry.external_attr=0o100644<<16
                entry.compress_type=zipfile.ZIP_DEFLATED
                out.writestr(entry,archive.read(name),compress_type=zipfile.ZIP_DEFLATED,compresslevel=9)
        os.replace(staged,src)
if __name__=="__main__":
    if len(sys.argv)!=3:
        raise SystemExit("usage: normalize_vsix.py first.vsix second.vsix")
    normalize_pair(sys.argv[1],sys.argv[2])
    print("PASS identical VSIX payloads, normalized ZIP metadata")
