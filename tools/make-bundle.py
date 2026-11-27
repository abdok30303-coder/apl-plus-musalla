#!/usr/bin/env python3
"""Dev-only: rebuild app/js/app.bundle.js from the script order in app/js/build.js.

The TV loads ONE file (js/app.bundle.js): boot.js walks APL_BUILD.scripts from
js/build.js and loads that file, so the bundle has to hold every module in that
order. This script makes it from the sources, so a change never has to be copied
into the bundle by hand (and the bundle can be checked for drift).

Usage:
  python3 tools/make-bundle.py            write app/js/app.bundle.js
  python3 tools/make-bundle.py --check    change nothing, report drift (exit 1 if it differs)

Format, exactly as the existing bundle: for every script in the manifest one
header line "/* === js/x.js === */" followed by that file unchanged, the
sections joined by one newline. Nothing is minified, so a diff names the source.
"""
import difflib
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
APP = os.path.join(ROOT, "app")
BUILD = os.path.join(APP, "js", "build.js")
BUNDLE = os.path.join(APP, "js", "app.bundle.js")


def script_list(app_dir=APP):
    build = os.path.join(app_dir, "js", "build.js")
    src = open(build, encoding="utf-8").read()
    m = re.search(r'"scripts"\s*:\s*\[(.*?)\]', src, re.S)
    if not m:
        sys.exit("make-bundle: no \"scripts\" array in " + build)
    out = re.findall(r'"([^"]+)"', m.group(1))
    if not out:
        sys.exit("make-bundle: the scripts array is empty")
    return out


def render(app_dir=APP):
    """Return the bundle text for the tree in app_dir."""
    parts = []
    for rel in script_list(app_dir):
        path = os.path.join(app_dir, rel.replace("/", os.sep))
        if not os.path.isfile(path):
            sys.exit("make-bundle: missing script " + rel)
        text = open(path, encoding="utf-8").read()
        parts.append("/* === %s === */\n" % rel + text)
    return "\n".join(parts)


def main(argv):
    check = "--check" in argv
    new = render()
    old = ""
    if os.path.isfile(BUNDLE):
        old = open(BUNDLE, encoding="utf-8").read()
    if check:
        if new == old:
            print("bundle is in sync with js/build.js (%d bytes, %d scripts)"
                  % (len(new), len(script_list())))
            return 0
        a, b = old.splitlines(), new.splitlines()
        diff = [l for l in difflib.unified_diff(a, b, "app.bundle.js", "rebuilt", n=0, lineterm="")]
        print("bundle differs from the sources: %d diff lines (old %d lines, new %d lines)"
              % (len(diff), len(a), len(b)))
        for line in diff[:40]:
            print(line)
        if len(diff) > 40:
            print("... %d more" % (len(diff) - 40))
        return 1
    with open(BUNDLE, "w", encoding="utf-8", newline="\n") as f:
        f.write(new)
    print("wrote js/app.bundle.js: %d bytes, %d scripts" % (len(new), len(script_list())))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
