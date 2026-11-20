/* ============================================================
   timers.js — ONE shared timer for the launcher's periodic jobs (v1.2.100). Loaded second, after errlog.js.

   Before, about ten separate setInterval timers ran for ever (clock, theme, night dimming, Control Center,
   screen saver, weather, wallpapers, task and prayer ticks...). Now each of them registers here, and ONE
   setTimeout is armed for the nearest job. Jobs that fall due within 1 s of each other run in the same wake-up.

     APL.timers.every(name, ms, fn [, { hidden: true }])   register (or replace) a job; the first run is after ms
     APL.timers.cancel(name)                               stop it
     APL.timers.info()                                     [{ name, ms, inMs, hidden }] for diagnosis

   While the launcher is not in front (document.hidden) the jobs are skipped, exactly as the old
   "if (document.hidden) return" lines did, unless the job asks for { hidden: true }.
   An error in one job is thrown again on its own, so the Error Log sees it, and the other jobs still run.
   Not here, on purpose: the radio's own timers, Vetro watch (its period changes), the pages' own tick while
   they are open, the background daemon and the bridge service.
   ============================================================ */
(function (global) {
    "use strict";
    var APL = global.APL = global.APL || {};
    var jobs = {}, timer = 0, WINDOW = 1000, MIN = 250;

    function hidden() { try { return !!global.document.hidden; } catch (e) { return false; } }
    function names() { return Object.keys(jobs); }

    function arm() {
        if (timer) { global.clearTimeout(timer); timer = 0; }
        var best = Infinity, h = hidden(), i, j, ks = names();
        for (i = 0; i < ks.length; i++) {
            j = jobs[ks[i]];
            if (h && !j.hidden) continue;
            if (j.next < best) best = j.next;
        }
        if (best === Infinity) return;
        timer = global.setTimeout(fire, Math.max(MIN, best - Date.now()));
    }

    function fire() {
        timer = 0;
        var now = Date.now(), h = hidden(), due = [], ks = names(), i, j;
        for (i = 0; i < ks.length; i++) {
            j = jobs[ks[i]];
            if (h && !j.hidden) continue;
            if (j.next - now <= WINDOW) due.push(j);
        }
        for (i = 0; i < due.length; i++) {
            j = due[i];
            if (jobs[j.name] !== j) continue;          // cancelled or replaced by an earlier job of this round
            j.next = Date.now() + j.ms;
            try { j.fn(); } catch (e) { (function (err) { global.setTimeout(function () { throw err; }, 0); })(e); }
        }
        arm();
    }

    function every(name, ms, fn, opts) {
        ms = Math.max(1000, parseInt(ms, 10) || 0);
        if (typeof fn !== "function") return;
        jobs[name] = { name: name, ms: ms, fn: fn, hidden: !!(opts && opts.hidden), next: Date.now() + ms };
        arm();
    }
    function cancel(name) {
        if (jobs[name]) { delete jobs[name]; arm(); }
    }

    /* coming back to the front: the jobs that were skipped wait a full period again (the code that needs an
       immediate refresh on return does it itself, with its own visibilitychange line) */
    try {
        global.document.addEventListener("visibilitychange", function () {
            if (!hidden()) {
                var ks = names(), now = Date.now();
                for (var i = 0; i < ks.length; i++) if (!jobs[ks[i]].hidden) jobs[ks[i]].next = now + jobs[ks[i]].ms;
            }
            arm();
        });
    } catch (e) {}

    /* v1.2.115: run one job now (its next run is a full period from now). The launcher uses it when it comes back
       to the front (APL.refreshHome): the prayer card and the task card show the right time at once instead of
       waiting for their next tick. Only the jobs named by the caller; the others keep waiting as before. */
    function runNow(name) {
        var j = jobs[name];
        if (!j) return false;
        j.next = Date.now() + j.ms;
        try { j.fn(); } catch (e) { (function (err) { global.setTimeout(function () { throw err; }, 0); })(e); }
        arm();
        return true;
    }

    /* v1.2.115: a JSON request that can never hang. The answer (headers AND body) must arrive within `ms`,
       otherwise the promise is rejected (and the request aborted where the browser can) so the callers' own
       error paths run: before, a stalled request left the weather "busy" for ever. */
    function fetchJSON(url, ms, opts) {
        return new Promise(function (resolve, reject) {
            var done = false, ctl = null, o = opts || {};
            try { ctl = global.AbortController ? new global.AbortController() : null; } catch (e) { ctl = null; }
            if (ctl) o.signal = ctl.signal;
            var to = global.setTimeout(function () {
                if (done) return;
                done = true;
                try { if (ctl) ctl.abort(); } catch (e) {}
                reject(new Error("timeout after " + Math.round(ms / 1000) + " s"));
            }, ms);
            function fail(e) { if (done) return; done = true; global.clearTimeout(to); reject(e); }
            global.fetch(url, o).then(function (r) {
                if (!r.ok) throw new Error("HTTP " + r.status);
                return r.json();
            }).then(function (j) {
                if (done) return;
                done = true; global.clearTimeout(to); resolve(j);
            }, fail);
        });
    }
    APL.fetchJSON = fetchJSON;

    APL.timers = {
        every: every,
        cancel: cancel,
        runNow: runNow,
        info: function () {
            var now = Date.now();
            return names().map(function (k) { return { name: k, ms: jobs[k].ms, inMs: jobs[k].next - now, hidden: jobs[k].hidden }; });
        }
    };
})(window);
