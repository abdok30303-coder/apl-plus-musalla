/* ============================================================
   smart-perf.js — Auto Light Effects (v1.2.91).

   If the remote feels slow, the heavy effects (blur, glass, slow
   background motion) are turned off by themselves, until the next
   restart. It only watches: while an arrow key is being used it
   counts the screen's frames for 0.7 s (requestAnimationFrame, a
   few callbacks, nothing drawn). Four slow readings in a row
   switch the "perf" look on; a smooth reading takes one away.
   Nothing is saved: the person's own switches are not changed.
   Settings > Performance > Auto Light Effects turns it off.
   ============================================================ */
(function (global) {
    "use strict";

    var APL = global.APL, sys = APL && APL.sys;
    if (!APL || !sys) return;

    var BOOT = Date.now(), slow = 0, sampling = false, applied = false;
    var ARROWS = { 37: 1, 38: 1, 39: 1, 40: 1 };
    var WINDOW_MS = 700, SLOW_AVG_MS = 40, MIN_FRAMES = 5, STRIKES = 4, QUIET_MS = 60000;

    function enabled() {
        var b = document.body;
        return sys.pref("autoPerf") !== false && !applied && !document.hidden && b &&
            !b.classList.contains("perf") && Date.now() - BOOT > QUIET_MS;     // the first minute is busy anyway
    }

    function engage() {
        applied = true;
        document.body.classList.add("perf", "auto-perf");
        try { if (APL.toast) APL.toast(APL.t("Auto Light Effects: heavy effects are off until the next restart"), true); } catch (e) {}
    }

    function verdict(n, avg) {
        if (document.hidden) return;
        if (n < MIN_FRAMES || avg > SLOW_AVG_MS) slow++; else slow = Math.max(0, slow - 1);
        if (slow >= STRIKES) engage();
    }

    function sample() {
        sampling = true;
        var first = 0, last = 0, n = 0, sum = 0;
        function step(t) {
            if (!first) first = t;
            if (last) { sum += t - last; n++; }
            last = t;
            if (t - first < WINDOW_MS && !document.hidden) { global.requestAnimationFrame(step); return; }
            sampling = false;
            verdict(n, n ? sum / n : 999);
        }
        global.requestAnimationFrame(step);
    }

    document.addEventListener("keydown", function (e) {
        if (ARROWS[e.keyCode] && !sampling && enabled()) sample();
    }, true);
})(window);
