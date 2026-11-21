/* ============================================================
   screensaver.js — screen saver (custom build, local images only).

   Styles (Settings › Screen Saver › Type):
     "wallpaper" (the default here): the six wallpapers packaged in
        the .wgt (images/wallpapers/), crossfading every 20 s with the
        wallpaper's name at the bottom left. Nothing is downloaded.
     "art": the apps' own artwork (packaged tiles / icons), scrolling.
     "dark": a clock on a black background.
     "clock": the clock over the artwork.
   The clock is always the launcher's clock (12h with ص/م or AM/PM,
   Settings › Clock Format).

   The original "Aerial" style — Apple's videos streamed from
   sylvan.apple.com — is GONE in this build: window.APL_AERIALS is an
   empty list (js/aerials.js) and no video path is left in this file.
   With a stored "aerial" preference the screen saver simply shows the
   local wallpapers, so an old setting can never bring the network back.

   On request, the clock moves from corner to corner (OLED screens).
   Any key exits the screen saver without triggering an action.
   ============================================================ */
(function (global) {
    "use strict";

    var APL = global.APL, sys = APL.sys;
    var root, layers, labelEl, timeEl;
    var active = false, lastInput = Date.now(), slideTimer = null;
    var idx = 0, cur = 0, wIdx = -1;

    function el(tag, cls) { var e = document.createElement(tag); e.className = cls; return e; }

    function buildDom() {
        root = el("div", "saver");
        layers = [el("div", "saver__img"), el("div", "saver__img")];
        layers.forEach(function (l) { root.appendChild(l); });
        root.appendChild(el("div", "saver__shade"));
        timeEl = el("div", "saver__time");
        labelEl = el("div", "saver__label");
        root.appendChild(timeEl); root.appendChild(labelEl);
        document.body.appendChild(root);
    }

    /* The same clock as the Home Screen: 12h with ص/م (AM/PM) unless the user
       chose 24h in Settings. */
    function clock() {
        var d = new Date(), m = (d.getMinutes() < 10 ? "0" : "") + d.getMinutes();
        if (sys.pref("clockFormat") === "24") {
            var h24 = d.getHours();
            timeEl.textContent = APL.digits((h24 < 10 ? "0" : "") + h24 + ":" + m);
            return;
        }
        var h = d.getHours(), h12 = (h % 12) || 12;
        var ar = String(APL.lang || "en").indexOf("ar") === 0;
        timeEl.textContent = APL.digits(h12 + ":" + m) + " " + (h < 12 ? (ar ? "ص" : "AM") : (ar ? "م" : "PM"));
    }

    function showLabel(text) {
        labelEl.classList.remove("is-shown");
        labelEl.textContent = text || "";
        if (!text) return;
        setTimeout(function () { labelEl.classList.add("is-shown"); }, 1800);
        setTimeout(function () { labelEl.classList.remove("is-shown"); }, 9000);
    }

    function crossfade(url, pan) {
        var nextLayer = layers[1 - cur];
        nextLayer.style.backgroundImage = url ? "url('" + url + "')" : "none";
        nextLayer.classList.remove("is-on", "is-pan-a", "is-pan-b");
        void nextLayer.offsetWidth;
        nextLayer.classList.add("is-on", pan ? "is-pan-a" : "is-pan-b");
        layers[cur].classList.remove("is-on");
        cur = 1 - cur;
    }

    /* ---------- local wallpapers ---------- */
    function wallpaperName(w) {
        var ar = String(APL.lang || "en").indexOf("ar") === 0;
        return (ar ? w.ar : w.en) || w.en || "";
    }

    function nextWallpaper() {
        clock();
        var list = (APL.wallpapers && APL.wallpapers.list()) || [];
        if (!list.length) { startArt(); return; }
        // Start from the wallpaper the Home Screen is showing, then move forward.
        if (wIdx < 0) wIdx = APL.wallpapers.index ? (APL.wallpapers.index() || 0) : 0;
        else wIdx = (wIdx + 1) % list.length;
        var w = list[wIdx % list.length];
        crossfade(w.file, wIdx % 2 === 0);
        showLabel(wallpaperName(w));
    }

    function startWallpapers() {
        clearInterval(slideTimer);
        root.classList.remove("is-video");
        wIdx = -1;
        nextWallpaper();
        slideTimer = setInterval(nextWallpaper, 20000);
    }

    /* ---------- app artwork ---------- */
    function slides() {
        var list = ((APL.allApps && APL.allApps()) || []).filter(function (a) { return a.bg; });
        return list.length ? list : [{ name: "Salah Launcher", bg: null }];
    }

    function nextArt() {
        clock();
        var list = slides(), s = list[idx % list.length]; idx++;
        crossfade(s.bg || null, idx % 2 === 0);
        showLabel(s.name);
    }

    function startArt() {
        clearInterval(slideTimer);
        root.classList.remove("is-video");
        nextArt();
        slideTimer = setInterval(nextArt, 14000);
    }

    /* ---------- moving clock ----------
       Settings › Screen Saver › Move the Clock, for OLED screens: every 1 to 5 minutes the clock goes to
       the next corner, clockwise, a few pixels off each time, so it never lands twice on the same spot.
       Each corner is measured from its own two edges, so a wider time (9:59, then 10:00) grows inward. */
    var moveTimer = null, corner = 0, EDGE_X = 90, EDGE_Y = 60, JITTER = 28;
    function nudge(edge) { return (edge + Math.floor(Math.random() * (JITTER + 1))) + "px"; }
    function placeClock(c) {
        var s = timeEl.style, right = c === 1 || c === 2, bottom = c >= 2;
        s.top = bottom ? "auto" : nudge(EDGE_Y);
        s.bottom = bottom ? nudge(EDGE_Y) : "auto";
        s.left = right ? "auto" : nudge(EDGE_X);
        s.right = right ? nudge(EDGE_X) : "auto";
        s.width = "auto"; s.transform = "none"; s.textAlign = right ? "right" : "left";
        // The wallpaper's name sits at the bottom left: across the screen while the clock is there
        labelEl.style.left = c === 3 ? "auto" : "";
        labelEl.style.right = c === 3 ? EDGE_X + "px" : "";
    }
    function moveClock() {
        if (!active) return;
        corner = (corner + 1) % 4;                              // 0 top left, 1 top right, 2 bottom right, 3 bottom left
        if (root.classList.contains("no-motion")) { placeClock(corner); return; }
        timeEl.classList.add("is-away");                        // fades out, moves, fades back in
        setTimeout(function () {
            if (!active) return;
            placeClock(corner);
            timeEl.classList.remove("is-away");
        }, 900);
    }
    function startMoving() {
        stopMoving();
        var every = sys.pref("screensaverClockMove");
        if (!every) return;
        root.classList.add("is-moving");
        corner = 1;                                             // top right, where the small clock always was
        placeClock(corner);
        moveTimer = setInterval(moveClock, every * 60000);
    }
    function stopMoving() {
        clearInterval(moveTimer);
        moveTimer = null;
        timeEl.removeAttribute("style");
        labelEl.removeAttribute("style");
        timeEl.classList.remove("is-away");
        root.classList.remove("is-moving");
    }

    /* ---------- start / stop ---------- */
    function start() {
        if (active) return;
        if (!root) buildDom();
        active = true;
        document.body.classList.add("screensaver-active");
        var style = sys.pref("screensaverStyle");
        // An "aerial" preference stored by an older version: local wallpapers, never a video.
        if (style === "aerial") style = "wallpaper";
        if (style === "mihrab") document.body.classList.add("mihrab-active");
        if (APL.updateHekam) APL.updateHekam();
        root.classList.toggle("no-motion", !!sys.pref("reduceMotion"));
        root.classList.add("is-active");
        clock();
        root.classList.toggle("is-dark", style === "dark");
        root.classList.toggle("is-clock", style === "clock");
        root.classList.toggle("is-mihrab", style === "mihrab");
        if (style === "mihrab" && APL.ambient) { APL.ambient.start(root); return; }   // v3.4.1
        startMoving();
        if (style === "dark") return;
        // Wallpapers switched off in Settings: the apps' own artwork instead.
        if (style === "wallpaper" && (!APL.wallpapers || APL.wallpapers.current())) { startWallpapers(); return; }
        startArt();
    }

    function stop() {
        if (!active) return;
        active = false;
        document.body.classList.remove("screensaver-active", "mihrab-active");
        if (APL.armHekam) APL.armHekam();
        clearInterval(slideTimer);
        if (APL.ambient) APL.ambient.stop();
        root.classList.remove("is-mihrab");
        stopMoving();
        layers.forEach(function (l) { l.classList.remove("is-on"); l.style.backgroundImage = "none"; });
        root.classList.remove("is-active", "is-video");
        lastInput = Date.now();
    }

    // Any key: resets the idle time; if the screen saver is running, exits it without acting.
    APL.addHotkey(function () {
        lastInput = Date.now();
        if (active) { stop(); return true; }
        return false;
    });

    APL.timers.every("screensaver", 10000, function () {      // v1.2.100: shared timer, also while hidden (as before)
        var delay = sys.pref("screensaverDelay");
        // Only with the launcher really in front: an app over it can leave the page "visible", and the
        // screen saver would then greet the return to the Home Screen
        var front = document.visibilityState !== "hidden" && (!document.hasFocus || document.hasFocus());
        if (!active && delay && front && Date.now() - lastInput > delay * 60000) start();
        if (active) clock();
    }, { hidden: true });

    // Back from an app, or Home (an app control, not a key): the Home Screen, never the screen saver.
    // The idle time starts again from there, not from the last key pressed in the launcher.
    function back() { if (active) stop(); lastInput = Date.now(); }
    document.addEventListener("visibilitychange", function () {
        if (document.visibilityState === "hidden") stop();
        else back();
    });
    global.addEventListener("appcontrol", back);

    APL.screensaver = { start: start, stop: stop, isActive: function () { return active; } };
})(window);
