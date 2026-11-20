/* ============================================================
   errlog.js — Error Log (v1.2.92). Loaded FIRST.

   Keeps the last 50 errors of the launcher (script errors and
   promises nobody caught) with the time, the file and the line, so
   a problem can be read in Settings > Performance > Error Log
   instead of being guessed. The same error twice in a row is
   counted, not repeated. Saved at most every 2 s (one small JSON).
   The bridge keeps its own list (bridge/service.js, /bridge-info).
   ============================================================ */
(function (global) {
    "use strict";

    var KEY = "apl.errlog", MAX = 50, buf = [], dirty = false, timer = null;
    try {
        buf = JSON.parse(global.localStorage.getItem(KEY) || "[]");
        if (!Array.isArray(buf)) buf = [];
    } catch (e) { buf = []; }

    function flush() {
        timer = null;
        if (!dirty) return;
        dirty = false;
        try { global.localStorage.setItem(KEY, JSON.stringify(buf)); } catch (e) {}
    }

    function push(kind, msg, where) {
        try {
            var m = String(msg || "").replace(/\s+/g, " ").slice(0, 160);
            var last = buf[buf.length - 1];
            if (last && last.m === m && last.k === kind) { last.n = (last.n || 1) + 1; last.t = Date.now(); }
            else {
                buf.push({ t: Date.now(), k: kind, m: m, w: String(where || "").slice(0, 80), n: 1 });
                if (buf.length > MAX) buf.splice(0, buf.length - MAX);
            }
            dirty = true;
            if (!timer) timer = setTimeout(flush, 2000);
        } catch (e) {}
    }

    // Not in the capture phase: a missing picture is not a script error and does not come here.
    global.addEventListener("error", function (ev) {
        var f = ev && ev.filename ? String(ev.filename).replace(/^.*\//, "") + ":" + (ev.lineno || 0) : "";
        push("error", (ev && ev.message) || "error", f);
    }, false);
    global.addEventListener("unhandledrejection", function (ev) {
        var r = ev && ev.reason;
        push("promise", (r && (r.message || r)) || "rejected", "");
    }, false);

    global.APL_ERRLOG = {
        list: function () { return buf.slice(); },
        clear: function () { buf = []; dirty = false; try { global.localStorage.removeItem(KEY); } catch (e) {} },
        push: push
    };
})(window);
