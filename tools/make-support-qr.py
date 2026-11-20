#!/usr/bin/env python3
"""
make-support-qr.py  -  set YOUR support link and rebuild everything that depends on it.

    python3 tools/make-support-qr.py "https://ko-fi.com/yourname"

What it does
  1. writes the link into app/js/site-config.js and app/js/app.bundle.js   (support.url)
  2. draws docs/support-qr.png with the launcher's own QR encoder (app/js/qr.js)
  3. fills the Support block of README.md
  4. rebuilds releases/apl-plus-musalla-v<version>.wgt

Needs: python3 + Pillow, node, zip.   The link can be up to 216 characters.
"""
import json, re, subprocess, sys, pathlib, textwrap
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
APP = ROOT / "app"

def main():
    if len(sys.argv) != 2 or not re.match(r"^https?://", sys.argv[1]):
        sys.exit(__doc__)
    url = sys.argv[1].strip()
    if len(url) > 216:
        sys.exit("The link is longer than 216 characters (the in-app QR limit).")

    # 1) link into the sources and the generated bundle
    for name in ("js/site-config.js", "js/app.bundle.js"):
        p = APP / name
        t = p.read_text(encoding="utf-8")
        new, n = re.subn(r'(support:\s*\{\s*url:\s*)"[^"]*"', lambda m: m.group(1) + json.dumps(url), t, count=1)
        if n != 1:
            sys.exit("support.url not found in " + name)
        p.write_text(new, encoding="utf-8", newline="")

    # 2) QR picture, drawn with the launcher's own encoder
    js = ("global.window=global;global.APL={};global.document={createElement:function(){return{getContext:function(){return{}}}}};"
          "require(%s);console.log(JSON.stringify(APL.qr.matrix(%s)));") % (json.dumps(str(APP / "js/qr.js")), json.dumps(url))
    m = json.loads(subprocess.check_output(["node", "-e", js]))
    n, scale, quiet = len(m), 16, 4
    size = (n + 2 * quiet) * scale
    img = Image.new("RGB", (size, size), "white")
    px = img.load()
    for y, row in enumerate(m):
        for x, dark in enumerate(row):
            if dark:
                for dy in range(scale):
                    for dx in range(scale):
                        px[(x + quiet) * scale + dx, (y + quiet) * scale + dy] = (10, 20, 18)
    img.save(ROOT / "docs/support-qr.png", optimize=True)

    # 3) README support block
    block = textwrap.dedent(f"""\
        <!--SUPPORT-START-->
        <p align="center">
          <img src="docs/support-qr.png" width="200" alt="Support QR code"><br>
          <a href="{url}">{re.sub(r'^https?://', '', url)}</a>
        </p>
        <!--SUPPORT-END-->""")
    rd = ROOT / "README.md"
    t = rd.read_text(encoding="utf-8")
    t = re.sub(r"<!--SUPPORT-START-->.*?<!--SUPPORT-END-->", lambda _: block, t, flags=re.S)
    rd.write_text(t, encoding="utf-8")

    # 4) rebuild the .wgt
    ver = re.search(r'<widget[^>]*?\sversion="([^"]+)"', (APP / "config.xml").read_text(encoding="utf-8"), re.S).group(1)
    out = ROOT / "releases" / f"apl-plus-musalla-v{ver}.wgt"
    out.unlink(missing_ok=True)
    subprocess.check_call(["zip", "-q", "-r", "-X", str(out), "."], cwd=APP)
    print("Done:", out.name, "| QR:", n, "x", n, "modules")

if __name__ == "__main__":
    main()
