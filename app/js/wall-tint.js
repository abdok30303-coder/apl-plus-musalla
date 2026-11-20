/* ============================================================
   wall-tint.js (v3.4.1) - Settings > Accessibility > "Tint from wallpaper" (pref wallTint, default off).
   Takes one average colour from the current LOCAL wallpaper (8x8 canvas, once per change) and lays a soft
   wash of it over the top of the Home Screen scrim (CSS var --wall-tint). Online wallpapers are skipped
   (their canvas is blocked), and so is any picture that fails to load: nothing changes then.
   The wash is a little lighter in the light theme (which follows the real Sunrise / Maghrib). Untested on the TV.
   ============================================================ */
(function (global) {
    "use strict";
    var APL = global.APL;
    if (!APL || !APL.sys || !APL.wallpapers) return;
    var sys = APL.sys, last = "", busy = false;

    function clear() { document.body.classList.remove("wall-tint"); document.documentElement.style.removeProperty("--wall-tint"); last = ""; }
    function paint(r, g, b) {
        var light = document.body.classList.contains("theme-light");
        document.documentElement.style.setProperty("--wall-tint", "rgba(" + r + "," + g + "," + b + "," + (light ? 0.16 : 0.26) + ")");
        document.body.classList.add("wall-tint");
    }
    function sample(url) {
        if (busy) return;
        busy = true;
        var img = new Image();
        img.onload = function () {
            busy = false;
            try {
                var c = document.createElement("canvas"); c.width = 8; c.height = 8;
                var x = c.getContext("2d"); x.drawImage(img, 0, 0, 8, 8);
                var d = x.getImageData(0, 0, 8, 8).data, r = 0, g = 0, b = 0, n = 0, i, l;
                for (i = 0; i < d.length; i += 4) {
                    l = (d[i] + d[i + 1] + d[i + 2]) / 3;
                    if (l < 25 || l > 235) continue;                      // skip near-black / near-white pixels
                    r += d[i]; g += d[i + 1]; b += d[i + 2]; n++;
                }
                if (n < 8) { clear(); return; }
                last = url; paint(Math.round(r / n), Math.round(g / n), Math.round(b / n));
            } catch (e) { clear(); }
        };
        img.onerror = function () { busy = false; clear(); };
        img.src = url;
    }
    function apply() {
        if (!sys.pref("wallTint")) { clear(); return; }
        var url = APL.wallpapers.current ? APL.wallpapers.current() : null;
        if (!url || /^https?:/i.test(url)) { clear(); return; }
        if (url !== last) sample(url);
    }
    APL.wallpapers.onChange(apply);
    sys.onPref("wallTint", apply);
    sys.onPref("appearance", function () { if (last) { last = ""; apply(); } });
    document.addEventListener("visibilitychange", function () { if (!document.hidden) apply(); });
    setTimeout(apply, 1500);
    APL.wallTint = { apply: apply };
})(window);
