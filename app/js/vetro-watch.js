/* ============================================================
   vetro-watch.js — tells the screen's owner when Vetro stops answering.

   Once a minute (every 15 s while Vetro is down), while the launcher is in front, it reads the bridge's own
   health record (/bridge-info: answered by the bridge itself, it does not call
   Vetro). Two bad readings in a row show one notice (at most one every
   10 minutes); when Vetro answers again, a short "back" notice. Nothing is
   changed on the screen and no command is sent to Vetro. The bridge itself
   tries to restart Vetro's background service (bridge/service.js).
   ============================================================ */
(function (global) {
    "use strict";
    var APL = global.APL, sys = APL && APL.sys;
    if (!sys || typeof sys.bridge !== "function") return;

    var STARTED = Date.now(), bad = 0, wasDown = false, noticeAt = 0;
    var fast = false, timer = 0;       // fast = Vetro was up before and is down now: look every 15 s until it answers, then back to every minute

    function next() {                   // one timer at a time; the next look is planned only after the last one ends
        try { if (timer) global.clearTimeout(timer); } catch (e0) {}
        timer = global.setTimeout(tick, fast ? 15000 : 60000);
    }

    function say(text, quiet) {
        try { if (sys.pref && sys.pref("vetroNotices") === false) return; } catch (e0) {}     // v1.2.85: Settings › Vetro Root Controls
        try { if (APL.toast) APL.toast(APL.t(text), quiet !== false); } catch (e) {}
    }

    /* v1.2.92: a small dot in the status pill: green = Vetro answers, red = it stopped, amber = not known yet.
       It only shows what the bridge's own record says; no extra request, one small element. */
    var dot = null;
    function setDot(state) {
        try {
            if (!dot) {
                var host = global.document.querySelector(".status");
                if (!host) return;
                dot = global.document.createElement("span");
                host.insertBefore(dot, host.firstChild);
            }
            dot.className = "vdot vdot--" + state;
        } catch (e) {}
    }

    function tick() {
        if (global.document && global.document.hidden) { next(); return; }
        if (sys.noVetro && sys.noVetro()) { next(); return; }
        var early = Date.now() - STARTED < 90000;           // Vetro can take 30-60 s to connect at cold boot
        sys.bridge("GET", "/bridge-info", "", 10000).then(function (r) { try {
            var info = null;
            try { info = JSON.parse(r.body); } catch (e) {}
            if (!info || typeof info.vetroUp !== "boolean") { fast = false; return; }      // an older bridge: nothing to read
            fast = !info.vetroUp && !!info.vetroLastOkAt;
            setDot(info.vetroUp ? "ok" : ((info.vetroLastOkAt || !early) ? "down" : "wait"));
            if (early) return;
            if (info.vetroUp || !info.vetroLastOkAt) { bad = 0; if (info.vetroUp && wasDown) { wasDown = false; say("Vetro is back"); } return; }
            bad++;
            if (bad >= 2 && Date.now() - noticeAt > 600000) {
                noticeAt = Date.now(); wasDown = true;
                say("Vetro is not responding — reconnecting…");
            }
        } finally { next(); } }, function () { setDot("wait"); next(); /* the bridge itself is restarted by system.js on the next request */ });
    }

    setTimeout(tick, 15000);
})(window);
