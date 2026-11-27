#!/usr/bin/env python3
"""Build the legacy .wgt for older Samsung TVs (Tizen 5.0 - 6.0, Chromium 63 - 76).

The launcher itself is the same app; this only changes what an older TV needs to
install and run it. Nothing here touches app/ - the normal 6.5 build is untouched.

What the legacy package changes
  1. config.xml: required_version 5.0 (was 6.5), own package ids APLMusallaLegacy*
     so it can be installed next to the 6.5 build and can never replace it,
     name "Salah Launcher Legacy", and the three Tizen 6.5-only
     tizen:background-category tags removed (unknown to older platforms).
  2. index.html: a globalThis shim (Chromium below 71 has no globalThis).
  3. js/updater.js: automatic updates switched off. The updater pulls
     releases/salah-launcher-v<version>.wgt, which is the 6.5 package - it must
     never land on a legacy install.
  4. install paths renamed to the legacy package folder
     (/opt/usr/apps/APLMusallaLegacy/...).
  5. js/app.bundle.js is rebuilt from the patched sources with tools/make-bundle.py.

Usage:
  python3 tools/build-legacy.py                       # Tizen 5.0 target
  python3 tools/build-legacy.py --required-version 4.0 --suffix -legacy4
"""
import hashlib
import importlib.util
import os
import re
import shutil
import sys
import tempfile
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
APP = os.path.join(ROOT, "app")
RELEASES = os.path.join(ROOT, "releases")

PKG_OLD = "APLMusalla"
PKG_NEW = "APLMusallaLegacy"
OLD_PATH = "/opt/usr/apps/APLMusalla"
NEW_PATH = "/opt/usr/apps/APLMusallaLegacy"

GLOBAL_SHIM = ('        if (typeof globalThis === "undefined") { window.globalThis = window; }\n')

UPDATER_ANCHOR = "    var latest = null, busy = false, lastCheck = 0, lastPeek = 0;"
UPDATER_FLAG = UPDATER_ANCHOR + "\n    var LEGACY = true;   /* legacy build: updates are installed by hand, never from the 6.5 package */"
UPDATER_CHECK = "    function check(loud) {\n        lastCheck = Date.now();"
UPDATER_GUARD = ("    function check(loud) {\n"
                 "        if (LEGACY) { lastCheck = Date.now(); return Promise.resolve({ ok: true, newer: false, version: U.running, running: U.running, legacy: true }); }\n"
                 "        lastCheck = Date.now();")

BG_BLOCK = """    <!-- Background execution categories required by Samsung Tizen 6.5+ so APLMusalla.Bridge
         keeps running 24/7 behind apps & HDMI without claiming a conflicting WebView media session -->
    <tizen:background-category value="media"/>
    <tizen:background-category value="background-network"/>
    <tizen:background-category value="download"/>
"""
BG_LEGACY = """    <!-- Legacy build: the Tizen 6.5 background-category tags are removed, older platforms do not
         know them. Background audio and alerts behind other apps are therefore not available here. -->
"""

SERVICE_BLOCK = """    <!-- Persistent Vetro relay & 24/7 background supervisor watchdog (bridge/service.js) -->
    <tizen:service id="APLMusalla.Bridge" on-boot="true" auto-restart="true">
        <tizen:content src="bridge/service.js"/>
        <tizen:name>APL Bridge</tizen:name>
        <tizen:description>Full Vetro relay and 24/7 background audio/alert supervisor for Salah Launcher</tizen:description>
        <tizen:metadata key="service-type" value="nodejs"/>
    </tizen:service>
"""
SERVICE_LEGACY = """    <!-- Legacy build: the nodejs background service is left out. It needs the Tizen 6.5 background
         model and Vetro root, so it cannot run here; the launcher works on its own without it. -->
"""


def die(msg):
    sys.exit("build-legacy: " + msg)


def replace_once(text, old, new, where):
    if text.count(old) != 1:
        die("expected exactly one %r in %s (found %d)" % (old[:60], where, text.count(old)))
    return text.replace(old, new)


def load_make_bundle():
    path = os.path.join(ROOT, "tools", "make-bundle.py")
    spec = importlib.util.spec_from_file_location("make_bundle", path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def patch_config(stage, required_version):
    path = os.path.join(stage, "config.xml")
    text = open(path, encoding="utf-8").read()
    text = replace_once(text, SERVICE_BLOCK, SERVICE_LEGACY, "config.xml service block")
    text = replace_once(text, 'required_version="6.5"',
                        'required_version="%s"' % required_version, "config.xml required_version")
    text = replace_once(text, 'id="http://apl-plus-musalla.local/%s"' % PKG_OLD,
                        'id="http://apl-plus-musalla.local/%s"' % PKG_NEW, "config.xml widget id")
    text = replace_once(text, 'id="%s.Home"' % PKG_OLD, 'id="%s.Home"' % PKG_NEW, "config.xml app id")
    text = replace_once(text, 'package="%s"' % PKG_OLD, 'package="%s"' % PKG_NEW, "config.xml package")
    text = replace_once(text, "<name>Salah Launcher</name>",
                        "<name>Salah Launcher Legacy</name>", "config.xml name")
    text = replace_once(text, BG_BLOCK, BG_LEGACY, "config.xml background-category block")
    text = re.sub(r"(<description>)(.*?)(</description>)",
                  lambda m: m.group(1) + m.group(2).replace(
                      "Salah Launcher:", "Salah Launcher Legacy (Tizen %s TVs):" % required_version).replace(
                      "Tizen 6.5+ Smart TVs", "Tizen %s+ Smart TVs" % required_version) + m.group(3),
                  text, count=1)
    open(path, "w", encoding="utf-8", newline="\n").write(text)


def patch_index(stage):
    path = os.path.join(stage, "index.html")
    text = open(path, encoding="utf-8").read()
    anchor = "    (function(){\n"
    text = replace_once(text, anchor, anchor + GLOBAL_SHIM, "index.html shim anchor")
    open(path, "w", encoding="utf-8", newline="\n").write(text)


def patch_updater(stage):
    path = os.path.join(stage, "js", "updater.js")
    text = open(path, encoding="utf-8").read()
    text = replace_once(text, UPDATER_ANCHOR, UPDATER_FLAG, "js/updater.js flag anchor")
    text = replace_once(text, UPDATER_CHECK, UPDATER_GUARD, "js/updater.js check()")
    open(path, "w", encoding="utf-8", newline="\n").write(text)


def patch_paths(stage):
    """Rename the installed-app folder in every script that hard-codes it."""
    changed = []
    for base, _dirs, files in os.walk(stage):
        for name in files:
            if not name.endswith((".js", ".html", ".sh")):
                continue
            path = os.path.join(base, name)
            if os.path.basename(path) == "app.bundle.js":
                continue          # rebuilt from the patched sources instead
            text = open(path, encoding="utf-8").read()
            if OLD_PATH not in text:
                continue
            open(path, "w", encoding="utf-8", newline="\n").write(text.replace(OLD_PATH, NEW_PATH))
            changed.append(os.path.relpath(path, stage))
    return changed


def add_legacy_css(stage):
    src = os.path.join(ROOT, "tools", "legacy", "legacy-grid.css")
    dst = os.path.join(stage, "css", "legacy-grid.css")
    shutil.copyfile(src, dst)
    path = os.path.join(stage, "index.html")
    text = open(path, encoding="utf-8").read()
    anchor = '    <link id="apl-custom-css" rel="stylesheet" href="css/custom.css">\n'
    link = anchor + '    <link id="apl-legacy-css" rel="stylesheet" href="css/legacy-grid.css">\n'
    text = replace_once(text, anchor, link, "index.html legacy css link")
    open(path, "w", encoding="utf-8", newline="\n").write(text)


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


def main(argv):
    required = "4.0"
    suffix = "-legacy"
    for i, a in enumerate(argv):
        if a == "--required-version" and i + 1 < len(argv):
            required = argv[i + 1]
        if a == "--suffix" and i + 1 < len(argv):
            suffix = argv[i + 1]

    version = re.search(r'version="(\d+\.\d+\.\d+)"', open(os.path.join(APP, "config.xml"), encoding="utf-8").read())
    if not version:
        die("no version in app/config.xml")
    version = version.group(1)

    stage = tempfile.mkdtemp(prefix="apl-legacy-")
    tree = os.path.join(stage, "app")
    shutil.copytree(APP, tree)

    patch_config(tree, required)
    patch_index(tree)
    patch_updater(tree)
    changed = patch_paths(tree)
    add_legacy_css(tree)

    mb = load_make_bundle()
    bundle = mb.render(tree)
    with open(os.path.join(tree, "js", "app.bundle.js"), "w", encoding="utf-8", newline="\n") as f:
        f.write(bundle)

    os.makedirs(RELEASES, exist_ok=True)
    out = os.path.join(RELEASES, "salah-launcher-v%s%s.wgt" % (version, suffix))
    zip_tree(tree, out)
    digest = hashlib.sha256(open(out, "rb").read()).hexdigest()
    with open(out + ".sha256", "w", encoding="utf-8", newline="\n") as f:
        f.write("%s  %s\n" % (digest, os.path.basename(out)))

    print("legacy build: %s" % out)
    print("  version %s, required Tizen %s, package %s" % (version, required, PKG_NEW))
    print("  bundle rebuilt: %d bytes, %d scripts" % (len(bundle), len(mb.script_list(tree))))
    print("  install paths renamed in: %s" % (", ".join(changed) if changed else "none"))
    print("  size %.1f MB, sha256 %s" % (os.path.getsize(out) / 1e6, digest))
    shutil.rmtree(stage, ignore_errors=True)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
