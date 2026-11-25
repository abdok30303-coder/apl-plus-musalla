/* ============================================================
   idb-mirror.js (v8.7.57): a second copy of the settings, kept in IndexedDB.

   Why: the settings live in localStorage. A TV that loses power at the wall can come back with that
   store empty, or without the latest changes (seen on a Frame 2022 by the original launcher's author).
   The launcher's own backups sit in the same localStorage, so they go with it.

   What it does, and nothing else:
     1. Every 20 s (and when the page is hidden) it checks the launcher's own "apl.*" settings; when they
        changed it writes a copy into IndexedDB ("aplx-mirror"). It never changes localStorage for this.
     2. At start-up, ONLY when localStorage has no "apl.prefs" at all while the copy has them, it puts the
        copy back once and reloads. It never overwrites anything on a screen whose settings are there.
   Not copied: the backups themselves, the Error Log, the weather, caches that rebuild by themselves,
   update/boot counters and the remote token.
   If IndexedDB is missing or fails, it does nothing (every step is wrapped; the launcher starts as before).
   Loaded by index.html before the launcher's own scripts. Not part of app.bundle.js.
   ============================================================ */
(function (w) {
    "use strict";
    try {
        if (w.__aplMirror) return;
        var idb = w.indexedDB, ls = w.localStorage;
        if (!idb || !ls) return;
        var SKIP = /^apl\.(backups|backup|errlog|weather\.last|bootlog|bootFails|goodBoots|restoredFor|softReload|softReloadLast|upd\.|mem$|remoteToken|appArt\.v1|onlineIcons|onlineIconsMiss|onlineWallpapers|gen\.|audio\.res\.|hijri\.feed|appsCache|mirrorRestored)/;
        var DB = "aplx-mirror", ST = "kv", KEY = "snap";
        var lastSig = null, ready = false, busy = false;

        function wanted(k) { return typeof k === "string" && k.indexOf("apl.") === 0 && !SKIP.test(k); }
        function collect() {
            var d = {}, n = 0;
            for (var i = 0; i < ls.length; i++) {
                var k = ls.key(i);
                if (!wanted(k)) continue;
                var v = ls.getItem(k);
                if (v === null) continue;
                d[k] = v; n++;
            }
            return { data: d, count: n };
        }
        function sig(d) {                          // small checksum of the keys and values, to see a change
            var h = 5381, k, v, j, keys = Object.keys(d).sort();
            for (var i = 0; i < keys.length; i++) {
                k = keys[i]; v = d[k];
                for (j = 0; j < k.length; j++) h = ((h << 5) + h + k.charCodeAt(j)) | 0;
                h = ((h << 5) + h + 58) | 0;
                for (j = 0; j < v.length; j++) h = ((h << 5) + h + v.charCodeAt(j)) | 0;
                h = ((h << 5) + h + 10) | 0;
            }
            return keys.length + ":" + h;
        }
        function open(cb) {
            var done = false;
            function fin(db) { if (done) return; done = true; try { cb(db); } catch (e) {} }
            try {
                var rq = idb.open(DB, 1);
                rq.onupgradeneeded = function () { try { rq.result.createObjectStore(ST); } catch (e) {} };
                rq.onsuccess = function () { fin(rq.result); };
                rq.onerror = function () { fin(null); };
                rq.onblocked = function () { fin(null); };
                setTimeout(function () { fin(null); }, 4000);
            } catch (e) { fin(null); }
        }
        function read(cb) {
            open(function (db) {
                if (!db) { cb(null); return; }
                try {
                    var rq = db.transaction(ST, "readonly").objectStore(ST).get(KEY);
                    rq.onsuccess = function () { var r = rq.result; try { db.close(); } catch (e) {} cb(r || null); };
                    rq.onerror = function () { try { db.close(); } catch (e) {} cb(null); };
                } catch (e) { try { db.close(); } catch (e2) {} cb(null); }
            });
        }
        function write(snap, cb) {
            open(function (db) {
                if (!db) { cb(false); return; }
                try {
                    var tx = db.transaction(ST, "readwrite");
                    tx.objectStore(ST).put(snap, KEY);
                    tx.oncomplete = function () { try { db.close(); } catch (e) {} cb(true); };
                    tx.onerror = tx.onabort = function () { try { db.close(); } catch (e) {} cb(false); };
                } catch (e) { try { db.close(); } catch (e2) {} cb(false); }
            });
        }

        var startEmpty = ls.getItem("apl.prefs") === null;      // decided now, before the launcher writes anything

        function save(existing) {
            if (!ready || busy) return;
            try {
                var c = collect();
                if (!c.count) return;
                var s = sig(c.data);
                if (s === lastSig) return;
                // never replace a copy that has the preferences with one that has none
                if (c.data["apl.prefs"] === undefined && existing && existing.data && existing.data["apl.prefs"] !== undefined) return;
                busy = true;
                write({ at: Date.now(), v: 1, data: c.data }, function (ok) { busy = false; if (ok) lastSig = s; });
            } catch (e) { busy = false; }
        }
        function tick() {
            if (!ready || busy) return;
            read(function (cur) { save(cur); });
        }

        function restore(snap) {
            try {
                if (!snap || !snap.data || snap.data["apl.prefs"] === undefined) return false;
                var d = snap.data, n = 0;
                for (var k in d) {
                    if (!Object.prototype.hasOwnProperty.call(d, k) || !wanted(k)) continue;
                    try { ls.setItem(k, d[k]); n++; } catch (e) {}
                }
                if (ls.getItem("apl.prefs") !== d["apl.prefs"]) return false;   // the write did not stick: no reload, no loop
                try { ls.setItem("apl.mirrorRestored", String(Date.now())); } catch (e) {}
                return n > 0;
            } catch (e) { return false; }
        }

        w.__aplMirror = { collect: collect, read: read, write: write, tick: tick };

        read(function (snap) {
            try {
                if (startEmpty && snap && restore(snap)) { w.location.reload(); return; }
            } catch (e) {}
            ready = true;
            lastSig = null;
            setTimeout(tick, 15000);
            setInterval(tick, 20000);
            try { w.document.addEventListener("visibilitychange", function () { if (w.document.hidden) tick(); }); } catch (e) {}
        });
    } catch (e) {}
})(window);
