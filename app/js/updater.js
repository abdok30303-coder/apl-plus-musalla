/* ============================================================
   updater.js — automatic updates REMOVED IN THIS CUSTOM BUILD (v1.1.1).

   The original file read launcher/version.json from GitHub, downloaded
   the code and the catalog, and read new images straight from
   raw.githubusercontent.com. This custom build:
     - has no automatic update and makes no request of any kind here,
     - never replaces its code (prayer page, radio, Arabic text) with
       upstream code,
     - loads every image from inside the installed .wgt.

   The API is kept so Settings › Update and js/diag.js run unchanged.
   "Check for Update" says how updates are done instead: install a new
   .wgt (or re-sign it with Apps2Samsung).
   ============================================================ */
(function (global) {
    "use strict";

    var APL = global.APL || (global.APL = {});
    var U = global.APL_UPDATE || { installed: "0", running: "0", fromBundle: false };
    var MESSAGE = "This build never updates itself: install the new .wgt from a USB drive.";

    function check(loud) {
        if (loud && APL.toast) { try { APL.toast(APL.t(MESSAGE)); } catch (e) {} }
        return Promise.resolve({ ok: false, custom: true, version: U.running, message: MESSAGE });
    }
    function reset() {
        /* Nothing downloaded is ever stored: there is no bundle to remove. */
        try { global.localStorage.removeItem("apl.bundle"); } catch (e) {}
        return Promise.resolve(false);
    }

    APL.updater = {
        check: check, reset: reset,
        running: function () { return U.running; },
        installed: function () { return U.installed; },
        fromBundle: function () { return false; },
        custom: true
    };
})(window);
