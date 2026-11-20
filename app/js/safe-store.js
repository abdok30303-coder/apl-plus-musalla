/* ============================================================
   safe-store.js — a full browser storage no longer loses a save silently (v1.2.102). Loaded right after errlog.js.

   Before: every `localStorage.setItem` in the launcher sat in its own try/catch, so when the storage was
   full the write simply failed and nothing told anyone (a task or a setting could be lost without a trace).

   Now: ONLY when a write fails because the storage is full, this layer
     1. frees space by removing two things that are rebuilt by themselves — the Error Log copy
        ("apl.errlog") and the last weather snapshot ("apl.weather.last", fetched again at the next refresh),
        one at a time, trying the write again after each;
     2. if the write still does not fit, throws the SAME error as before, so every caller behaves exactly
        as it did (their own try/catch);
     3. in both cases the Error Log gets one line ("storage full ..."), so it can be read in Settings.
   Nothing else is touched: no user data (tasks, settings, backups, profiles, icons, prayer data) is ever
   removed, and a write that succeeds goes through unchanged.
   ============================================================ */
(function (global) {
    "use strict";
    if (global.__aplSafeStore) return;
    var proto = null, orig = null;
    try { proto = global.Storage && global.Storage.prototype; orig = proto && proto.setItem; } catch (e0) {}
    if (!proto || typeof orig !== "function") return;

    var DISPOSABLE = ["apl.errlog", "apl.weather.last"];

    function isQuota(e) {
        if (!e) return false;
        return e.name === "QuotaExceededError" || e.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
               e.code === 22 || e.code === 1014 || /quota/i.test(String(e.message || ""));
    }
    function note(msg, key) {
        try { if (global.APL_ERRLOG && global.APL_ERRLOG.push) global.APL_ERRLOG.push("storage", msg, String(key || "").slice(0, 60)); } catch (e) {}
    }

    var patched = function (key, value) {
        try {
            return orig.call(this, key, value);
        } catch (e) {
            if (!isQuota(e) || this !== global.localStorage) throw e;
            if (String(key) === "apl.errlog") throw e;               // the log itself is disposable; never log about it (no loop)
            var self = this, freed = [];
            for (var i = 0; i < DISPOSABLE.length; i++) {
                var dk = DISPOSABLE[i];
                if (dk === String(key)) continue;                    // never delete the very key being written
                try { if (self.getItem(dk) === null) continue; self.removeItem(dk); freed.push(dk); } catch (e1) { continue; }
                try {
                    orig.call(self, key, value);
                    note("storage full: saved after freeing " + freed.join(", "), key);
                    return;
                } catch (e2) { if (!isQuota(e2)) throw e2; }
            }
            note("storage full: could not save", key);
            throw e;                                                  // same error as before for the caller
        }
    };
    try {
        proto.setItem = patched;
        global.__aplSafeStore = true;
    } catch (e3) {}
})(window);
