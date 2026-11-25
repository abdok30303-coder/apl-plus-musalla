#!/usr/bin/env python3
"""Fails if the daemon text embedded in the launcher is not the daemon in app/background/daemon.sh,
or if its version differs from DAEMON_VERSION in background-engine.js. Run before every release.
With --fix it rewrites app/js/bg-daemon.js and the same text inside app/js/app.bundle.js."""
import json, re, sys, os
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "app")
d = open(os.path.join(root, "background/daemon.sh")).read()
want = "window.APL_BG_DAEMON = " + json.dumps(d, ensure_ascii=True) + ";\n"
emb_p = os.path.join(root, "js/bg-daemon.js")
bun_p = os.path.join(root, "js/app.bundle.js")
emb = open(emb_p).read()
bun = open(bun_p).read()
ver_sh = re.search(r'^DAEMON_VER="([^"]+)"', d, re.M).group(1)
ver_js = re.search(r'var DAEMON_VERSION = "([^"]+)"', open(os.path.join(root, "js/background-engine.js")).read()).group(1)
ver_bun = re.search(r'var DAEMON_VERSION = "([^"]+)"', bun).group(1)
problems = []
if emb != want: problems.append("js/bg-daemon.js is not the current daemon.sh")
if want not in bun: problems.append("app.bundle.js does not contain the current daemon.sh")
if not (ver_sh == ver_js == ver_bun): problems.append("versions differ: daemon.sh %s, background-engine.js %s, bundle %s" % (ver_sh, ver_js, ver_bun))
if problems and "--fix" in sys.argv:
    if emb != want:
        if emb in bun: bun = bun.replace(emb, want)
        open(emb_p, "w").write(want)
        open(bun_p, "w").write(bun)
    problems = [p for p in problems if "versions" in p]
if problems:
    print("\n".join(problems)); sys.exit(1)
print("daemon embed OK, version", ver_sh)
