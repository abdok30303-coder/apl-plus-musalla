#!/usr/bin/env python3
"""Dev-only: build releases/salah-launcher-v<version>.wgt from app/, plus its .sha256.

The package is the app/ tree zipped, with config.xml at the root, the same shape as
every previous release (tools/build-legacy.py zips its own variant the same way).
The version comes from app/config.xml, so the file name always matches the package.

Usage:
  python3 tools/build-wgt.py
"""
import hashlib
import os
import re
import sys
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
APP = os.path.join(ROOT, "app")
RELEASES = os.path.join(ROOT, "releases")


def zip_tree(stage, out_path):
    if os.path.exists(out_path):
        os.remove(out_path)
    with zipfile.ZipFile(out_path, "w", zipfile.ZIP_DEFLATED) as z:
        for base, dirs, files in os.walk(stage):
            dirs.sort()
            for name in sorted(dirs):
                full = os.path.join(base, name)
                z.write(full, os.path.relpath(full, stage) + "/")
            for name in sorted(files):
                full = os.path.join(base, name)
                z.write(full, os.path.relpath(full, stage))


def main():
    cfg = open(os.path.join(APP, "config.xml"), encoding="utf-8").read()
    m = re.search(r'version="(\d+\.\d+\.\d+)"', cfg)
    if not m:
        sys.exit("build-wgt: no version in app/config.xml")
    version = m.group(1)
    if not os.path.isfile(os.path.join(APP, "config.xml")):
        sys.exit("build-wgt: app/config.xml is missing")
    os.makedirs(RELEASES, exist_ok=True)
    out = os.path.join(RELEASES, "salah-launcher-v%s.wgt" % version)
    zip_tree(APP, out)
    digest = hashlib.sha256(open(out, "rb").read()).hexdigest()
    with open(out + ".sha256", "w", encoding="utf-8", newline="\n") as f:
        f.write("%s  %s\n" % (digest, os.path.basename(out)))
    print("wgt: %s" % out)
    print("  version %s, size %.1f MB, sha256 %s" % (version, os.path.getsize(out) / 1e6, digest))
    return 0


if __name__ == "__main__":
    sys.exit(main())
