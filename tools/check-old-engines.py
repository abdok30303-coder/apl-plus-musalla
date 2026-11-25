#!/usr/bin/env python3
"""Dev-only check: finds JS and CSS features that older TV browsers do not have.
Not shipped (tools/ is not in the .wgt) and never changes any file; it only reads and reports.

Usage: python3 tools/check-old-engines.py [--target 76|85|56] [--bundle]
  --target  oldest Chromium to support (Tizen 6.0 = 76, Tizen 6.5 = 85, Tizen 4 = 56). Default 76.
  --bundle  also scan app/js/app.bundle.js (the file the TV loads). Default scans the source files only.
JS findings are errors (exit code 1). CSS findings are only notes (exit 0), because the launcher
already guards its CSS with fallbacks (.no-flex-gap, @supports, perf mode) and a regex cannot tell
a guarded use from an unguarded one: read the notes and check the ones that are new.
Known and accepted uses can be listed in tools/old-engines-allow.txt as "file:line" or "file:pattern-name".
Version numbers are from MDN / Samsung's engine table; treat them as a guide, not a proof."""
import re, sys, os, glob

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
# (name, regex, first Chromium that has it)
JS = [
    ("String.prototype.padStart/padEnd", r"\.pad(?:Start|End)\s*\(", 57),
    ("Object.entries/values", r"\bObject\.(?:entries|values)\s*\(", 54),
    ("Array.prototype.flat/flatMap", r"\.flat(?:Map)?\s*\(", 69),
    ("Object.fromEntries", r"\bObject\.fromEntries\s*\(", 73),
    ("String.prototype.matchAll", r"\.matchAll\s*\(", 73),
    ("Promise.allSettled", r"\bPromise\.allSettled\b", 76),
    ("optional chaining ?.", r"\?\.(?![0-9])", 80),
    ("nullish coalescing ??", r"\?\?", 80),
    ("String.prototype.replaceAll", r"\.replaceAll\s*\(", 85),
    ("Promise.any", r"\bPromise\.any\b", 85),
    ("logical assignment ||= &&= ??=", r"(?:\|\||&&|\?\?)=", 85),
    ("numeric separators 1_000", r"\b\d+_\d+\b", 75),
    ("Array/String .at()", r"\.at\s*\(\s*-?\d", 92),
    ("Object.hasOwn", r"\bObject\.hasOwn\s*\(", 93),
    ("structuredClone", r"\bstructuredClone\s*\(", 98),
    ("Array findLast", r"\.findLast(?:Index)?\s*\(", 97),
    ("class fields / static blocks", r"^\s*(?:static\s+)?#?[A-Za-z_$][\w$]*\s*=\s*[^=>]", None),  # not checked, too noisy
    ("CanvasRenderingContext2D.roundRect", r"\.roundRect\s*\(", 99),
    ("AbortSignal.timeout", r"\bAbortSignal\.timeout\b", 103),
    ("Array.prototype.toSorted/toReversed", r"\.to(?:Sorted|Reversed|Spliced)\s*\(", 110),
    ("globalThis", r"\bglobalThis\b", 71),
    ("BigInt literal", r"\b\d+n\b", 67),
    ("Intl.RelativeTimeFormat", r"\bIntl\.RelativeTimeFormat\b", 71),
    ("ResizeObserver", r"\bnew\s+ResizeObserver\b", 64),
    ("IntersectionObserver", r"\bnew\s+IntersectionObserver\b", 51),
    ("Element.replaceChildren", r"\.replaceChildren\s*\(", 86),
    ("Element.closest", r"\.closest\s*\(", 41),
    ("fetch with AbortController", r"\bnew\s+AbortController\b", 66),
]
CSS = [
    ("flex gap (row-gap/column-gap/gap)", r"(?<![\w-])(?:gap|row-gap|column-gap)\s*:", 84),
    ("aspect-ratio", r"(?<![\w-])aspect-ratio\s*:", 88),
    ("inset shorthand", r"(?<![\w-])inset\s*:", 87),
    (":is() / :where()", r":(?:is|where)\(", 88),
    (":has()", r":has\(", 105),
    ("@container / @layer", r"@(?:container|layer)\b", 99),
    ("color-mix()", r"color-mix\(", 111),
    ("dvh/svh/lvh units", r"\d(?:dvh|svh|lvh)\b", 108),
    ("min()/max()/clamp()", r"(?<![\w-])(?:clamp|min|max)\(", 79),
    ("overflow: clip", r"overflow(?:-[xy])?\s*:\s*clip", 90),
    ("scroll-snap/scrollbar-width", r"scrollbar-width\s*:", 121),
    ("backdrop-filter (unprefixed)", r"(?<![\w-])backdrop-filter\s*:", 76),
    ("text-wrap: balance", r"text-wrap\s*:", 114),
    ("accent-color", r"accent-color\s*:", 93),
]

def blank_js(s):
    """Blank out comments, strings, template text and regex-free noise so patterns only match code."""
    out, i, n = [], 0, len(s)
    while i < n:
        c = s[i]
        if c == "/" and i + 1 < n and s[i+1] == "/":
            j = s.find("\n", i); j = n if j < 0 else j
            out.append(" " * (j - i)); i = j
        elif c == "/" and i + 1 < n and s[i+1] == "*":
            j = s.find("*/", i + 2); j = n if j < 0 else j + 2
            out.append(re.sub(r"[^\n]", " ", s[i:j])); i = j
        elif c in "\"'`":
            q, j = c, i + 1
            while j < n and s[j] != q:
                if s[j] == "\\": j += 1
                elif s[j] == "\n" and q != "`": break
                j += 1
            j = min(j + 1, n)
            out.append(q + re.sub(r"[^\n]", " ", s[i+1:j-1]) + q); i = j
        else:
            out.append(c); i += 1
    return "".join(out)

def blank_css(s):
    return re.sub(r"/\*.*?\*/", lambda m: re.sub(r"[^\n]", " ", m.group(0)), s, flags=re.S)

def main():
    a = sys.argv[1:]
    target = 76
    if "--target" in a: target = int(a[a.index("--target") + 1])
    allow = set()
    p = os.path.join(ROOT, "tools", "old-engines-allow.txt")
    if os.path.exists(p):
        allow = set(l.strip() for l in open(p, encoding="utf-8") if l.strip() and not l.startswith("#"))
    jsfiles = sorted(glob.glob(os.path.join(ROOT, "app", "js", "*.js")))
    if "--bundle" not in a:
        jsfiles = [f for f in jsfiles if not f.endswith("app.bundle.js")]
    cssfiles = sorted(glob.glob(os.path.join(ROOT, "app", "css", "*.css")))
    found, skipped = [], 0
    for files, rules, blank in ((jsfiles, JS, blank_js), (cssfiles, CSS, blank_css)):
        for f in files:
            rel = os.path.relpath(f, os.path.join(ROOT, "app"))
            try: text = blank(open(f, encoding="utf-8", errors="replace").read())
            except Exception: continue
            for name, rx, ver in rules:
                if ver is None or ver <= target: continue
                for m in re.finditer(rx, text, re.M):
                    line = text.count("\n", 0, m.start()) + 1
                    if ("%s:%d" % (rel, line)) in allow or ("%s:%s" % (rel, name)) in allow:
                        skipped += 1; continue
                    found.append((rel, line, name, ver))
    errs = [x for x in found if x[0].startswith("js/")]
    notes = [x for x in found if not x[0].startswith("js/")]
    for rel, line, name, ver in errs:
        print("ERROR %s:%d  %s  (Chromium %d+)" % (rel, line, name, ver))
    counts = {}
    for rel, line, name, ver in notes:
        counts.setdefault((name, ver), []).append("%s:%d" % (rel, line))
    for (name, ver), where in sorted(counts.items()):
        print("note  CSS %s (Chromium %d+): %d uses, first %s" % (name, ver, len(where), ", ".join(where[:3])))
    print("target Chromium %d: %d JS files, %d CSS files scanned, %d JS errors, %d CSS notes, %d allowed" % (target, len(jsfiles), len(cssfiles), len(errs), len(notes), skipped))
    sys.exit(1 if errs else 0)

main()
