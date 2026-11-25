/* ============================================================
   boot.js — launcher start-up (local only, custom build).

   The original loader could run a version of the launcher downloaded
   from GitHub (a bundle kept in localStorage, images read from
   raw.githubusercontent.com). This custom build has NO automatic
   update and reads NOTHING from the network at start-up: the launcher
   always runs the code that is inside the installed .wgt.

   What is kept, unchanged, for the rest of the code:
     APL_ASSET(path)  → the path as it is (no rewriting to a web URL)
     APL_UPDATE       → the object js/system.js and js/diag.js read,
                        reporting the installed version only
   Scripts are still loaded in the order written by tools/make-build.py
   (js/build.js), so a missing file is reported by tools/verify.py.
   ============================================================ */
(function (global) {
    "use strict";

    var LOADER = 1;
    var BUILD = global.APL_BUILD || { version: "0", scripts: [], images: [] };

    /* A bundle left by an earlier version of the original project is dropped:
       it would replace this custom build with upstream code. */
    try { global.localStorage.removeItem("apl.bundle"); } catch (e) {}

    /* Every image is in the package: nothing is ever re-pointed to a web URL. */
    global.APL_ASSET = function (p) { return p; };
    global.APL_UPDATE = {
        LOADER: LOADER,
        REPO: "abdok30303-coder/apl-plus-musalla", BRANCH: "main", RAW: "https://raw.githubusercontent.com/abdok30303-coder/apl-plus-musalla/main/",
        cmp: function () { return 0; },
        installed: BUILD.version,
        running: BUILD.version,
        fromBundle: false,
        custom: true
    };

    /* v1.1.2: all scripts come in ONE file (js/app.bundle.js, made by tools/make-bundle.py):
       one request instead of ~50 one after the other. If the bundle cannot be loaded for any
       reason, the separate files are loaded one by one, in the same order, as before. */
    var list = BUILD.scripts || [], i = 0;
    function separate() {
        (function next() {
            if (i >= list.length) return;
            var s = document.createElement("script");
            s.src = list[i++];
            s.onload = s.onerror = next;
            document.body.appendChild(s);
        })();
    }
    if (BUILD.bundle) {
        var b = document.createElement("script");
        b.src = BUILD.bundle;
        b.onerror = separate;
        /* v1.2.101: time from the start of the page to the end of the bundle (shown in Settings > Performance > Error Report) */
        b.onload = function () { try { global.APL_BOOT_MS = Math.round(global.performance.now()); } catch (e) {} };
        document.body.appendChild(b);
    } else {
        separate();
    }
})(window);
