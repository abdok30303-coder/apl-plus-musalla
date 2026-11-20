/* ============================================================
   light-mode.js — Light Mode: less work in the background.

   On (Settings › Performance › Light Mode):
     - no automatic search for artwork (autoart.js is not run, and
       the artwork already found stays);
     - no content cards (What You're Watching / What's Popular), and
       ▲ from the dock no longer goes to them;
     - no visual effects (blur and glass are off, as with the
       "Visual Effects" switch), no slow background motion, no
       animated wallpapers;
     - the screen saver never streams anything (true of the whole build
       since v1.1.1: it shows the local wallpapers).
   Kept: the local wallpapers, the prayer times and alerts, the
   radio, the weather, the settings.

   Off: everything comes back. The switches the person set are not
   changed: Light Mode is a layer over them (the launcher asks
   APL.lightMode.on() at the few places that cost the most), so
   turning it off restores exactly what was there before.

   No claim is made about how much CPU it saves: that was not
   measured on a television.
   ============================================================ */
(function (global) {
    "use strict";

    var APL = global.APL, sys = APL && APL.sys;
    if (!APL || !sys) return;

    function on() { return sys.pref("lightMode") === true; }

    function apply() {
        var light = on();
        document.body.classList.toggle("light-mode", light);
        // No blur, no glass, no slides: launcher.js's applyPerf() reads the same setting
        document.body.classList.toggle("perf", light || !sys.pref("visualEffects"));
        document.body.classList.toggle("reduce-motion", light || !!sys.pref("reduceMotion"));
        document.body.classList.toggle("rich-fx", !light && !!sys.pref("richFx"));
        if (APL.onLightMode) APL.onLightMode(light);
    }

    APL.lightMode = {
        on: on,
        apply: apply,
        /* Does the launcher draw content cards at all? */
        cards: function () { return !on() && (sys.pref("liveShelf") !== false || sys.pref("hubShelf") !== false); },
        /* May the artwork search run? */
        autoArt: function () { return !on() && sys.pref("autoArt") !== false; }
    };

    sys.onPref("lightMode", apply);
    sys.onPref("visualEffects", apply);
    sys.onPref("richFx", apply);
    setTimeout(apply, 800);
})(window);
