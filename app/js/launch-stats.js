/* ============================================================
   launch-stats.js — how many times each app was opened from APL,
   and the order of the rows below the first one.

   - One counter per app and per profile, kept on the screen
     (localStorage: "apl.stats.<profileId>"). Nothing leaves the TV.
   - A count is a press on a tile in APL, not a launch that worked:
     an app that refuses to start still counts (the same choice the
     Settings describe).
   - The first row (the dock) keeps the order the person chose. The
     rows below are sorted by these counts, the most opened first; a
     tie keeps the previous order, and apps never opened fill what is
     left, in their own order.
   - Settings › Home Screen › Sort the Rows by Use turns it off, and
     Reset the Use Statistics clears the counts of this profile.
   ============================================================ */
(function (global) {
    "use strict";

    var APL = global.APL, sys = APL && APL.sys;
    if (!APL || !sys) return;

    function key() {
        var p = sys.profiles && sys.profiles.current ? sys.profiles.current() : null;
        return "apl.stats." + ((p && p.id) || "p1");
    }
    function load() {
        try { return JSON.parse(global.localStorage.getItem(key()) || "{}") || {}; } catch (e) { return {}; }
    }
    function save(o) {
        try { global.localStorage.setItem(key(), JSON.stringify(o)); } catch (e) {}
    }

    var cache = null;

    function counts() { if (!cache) cache = load(); return cache; }
    function count(id) { var c = counts(); return c[id] || 0; }

    /* A press in APL. Virtual tiles (Settings, Sources, the prayer page) are not apps:
       nothing is counted for them. */
    function note(id) {
        if (!id || String(id).indexOf("apl.") === 0 || String(id).indexOf("demo.") === 0) return;
        var c = counts();
        c[id] = (c[id] || 0) + 1;
        save(c);
        if (APL.stats.onChange) APL.stats.onChange(id, c[id]);
    }

    function reset() {
        cache = {};
        save(cache);
    }

    /* The id of an entry: the launcher passes app objects, a test passes ids. */
    function idOf(a) { return typeof a === "string" ? a : ((a && a.id) || ""); }

    /* The order of the Home Screen: the first `dock` apps untouched, then the rest by use. */
    function smartOrder(list, dock) {
        if (!list || list.length <= dock) return (list || []).slice();
        var first = list.slice(0, dock), rest = list.slice(dock), c = counts();
        var ranked = rest.map(function (app, i) { return { app: app, n: c[idOf(app)] || 0, i: i }; });
        ranked.sort(function (a, b) {
            if (b.n !== a.n) return b.n - a.n;          // more opened first
            return a.i - b.i;                            // a tie: the order it was in
        });
        // A tile that is already in the first row never comes back below it
        var seen = {};
        first.forEach(function (a) { var id = idOf(a); if (id) seen[id] = true; });
        return first.concat(ranked.filter(function (r) {
            var id = idOf(r.app);
            if (id && seen[id]) return false;            // no duplicate, ever
            if (id) seen[id] = true;
            return true;                                 // an entry without an id keeps its place
        }).map(function (r) { return r.app; }));
    }

    APL.stats = {
        note: note,
        count: count,
        counts: function () { return load(); },
        reset: reset,
        smartOrder: smartOrder,
        onChange: null            // launcher.js re-renders if it wants to
    };

    /* Count every press on a real app, wherever it comes from in the launcher:
       the tiles, the App Switcher, a profile's recent apps, TizenTube (which starts
       TizenBrew through launchApp). Wrapping launchApp alone is enough: every other
       path (openApp, launchById, the TizenTube tile) ends there, so nothing is
       counted twice. */
    var origLaunch = APL.launchApp;
    if (typeof origLaunch === "function") {
        APL.launchApp = function (id) {
            note(id);
            return origLaunch.apply(this, arguments);
        };
    }

})(window);
