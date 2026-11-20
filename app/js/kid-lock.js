/* ============================================================
   kid-lock.js (v1.99.0) — leaving the CHILD PROFILE.
   The only way out of a child profile: hold the remote's MUTE key for 3 seconds while the launcher is in front.
   The Mute key is taken over (tizen.tvinputdevice.registerKey) ONLY while a child profile is active; a short
   press still mutes / unmutes (done here), so the sound keeps working. In every other profile nothing changes.
   Not touched on purpose: radio, background daemon, HDMI, permissions, audio playback core.
   ============================================================ */
(function (global) {
    "use strict";
    var APL = global.APL;
    if (!APL || !APL.sys || !APL.sys.profiles) return;
    var P = APL.sys.profiles, HOLD_MS = 3000, GAP_MS = 350, MUTE = 449;
    var registered = false, holdTimer = 0, releaseTimer = 0, active = false;

    function tz() { return global.tizen && global.tizen.tvinputdevice ? global.tizen.tvinputdevice : null; }
    function isMuteKey(e) { return e.keyCode === MUTE || e.key === "VolumeMute" || e.key === "AudioVolumeMute"; }
    function sync() {
        var want = !!(P.isKid && P.isKid());
        if (want === registered) return;
        try { var t = tz(); if (t) { if (want) t.registerKey("VolumeMute"); else t.unregisterKey("VolumeMute"); } } catch (e) {}
        registered = want;
        if (!want) { clearTimeout(holdTimer); clearTimeout(releaseTimer); holdTimer = releaseTimer = 0; active = false; }
    }
    function toggleMute() {
        try { if (APL.sys.audio) APL.sys.audio.setMute(!APL.sys.audio.isMute()); } catch (e) {}
    }
    function onDown(e) {
        if (!isMuteKey(e) || !(P.isKid && P.isKid())) return;
        e.preventDefault(); if (e.stopImmediatePropagation) e.stopImmediatePropagation();
        if (releaseTimer) { clearTimeout(releaseTimer); releaseTimer = 0; }     // a held key can report a key-up / key-down pair
        if (active) return;
        active = true;
        holdTimer = setTimeout(function () {
            holdTimer = 0; active = false;
            if (P.exitKid && P.exitKid()) { try { APL.toast(APL.t("Left child mode"), true); } catch (er) {} }
        }, HOLD_MS);
    }
    function onUp(e) {
        if (!isMuteKey(e) || !active) return;
        e.preventDefault(); if (e.stopImmediatePropagation) e.stopImmediatePropagation();
        if (releaseTimer) clearTimeout(releaseTimer);
        releaseTimer = setTimeout(function () {
            releaseTimer = 0;
            if (holdTimer) { clearTimeout(holdTimer); holdTimer = 0; active = false; toggleMute(); }   // short press = normal mute
        }, GAP_MS);
    }
    global.addEventListener("keydown", onDown, true);
    global.addEventListener("keyup", onUp, true);
    P.onChange(sync);
    document.addEventListener("visibilitychange", function () { if (!document.hidden) sync(); });
    sync();
    APL.kidLock = { sync: sync, holdMs: HOLD_MS };
})(window);
