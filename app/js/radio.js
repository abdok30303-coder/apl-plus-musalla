/* ============================================================
   radio.js — Qur'an Cairo (Egyptian Quran Radio), foreground playback.

   v1.2.37: the station is played through Samsung AVPlay only, while APL
   Launcher is in front (it stops on leaving, by design). What changed:
     - several direct MP3 stream URLs (site-config.js radio.urls) are tried
       in turn instead of one web-page address; the last good one goes first;
     - once playing, any error, end of stream, stall, or a player the TV
       released triggers an automatic reconnect with back-off, for as long as
       the radio is wanted and the launcher is in front;
     - the network coming back reconnects at once;
     - a failed resume after a prayer alert reconnects instead of throwing.
   Prayer alerts remain on their separate Pulse sample route.
   ============================================================ */
(function (global) {
    "use strict";

    var APL = global.APL, sys = APL && APL.sys;
    if (!APL || !sys) return;

    var SITE = global.APL_SITE || {};
    var CFG = SITE.radio || {};
    var DEFAULT_URLS = [
        "https://radio.xecod.com/station/quran-cairo",
        "https://stream.radiojar.com/8s5u5tpdtwzuv",
        "https://n12.radiojar.com/8s5u5tpdtwzuv"
    ];
    var INTENT_KEY = "apl.radio.wanted";
    var GOOD_KEY = "apl.radio.good";
    var PREPARE_TIMEOUT = 15000;      // one stream address
    var STALL_LIMIT = 20000;          // buffering this long = reconnect
    var WATCH_EVERY = 8000;           // player state check while playing
    var RETRY_MIN = 2000, RETRY_MAX = 15000;

    var av = global.webapis && global.webapis.avplay;
    var avOpen = false, session = 0;
    var h5 = null, h5Last = -1, h5Still = 0;      // second engine: the page's own audio element, used if AVPlay cannot play the station
    var prepareTimer = null, stallTimer = null, watchTimer = null, retryTimer = null;
    var abortAttempt = null, retryCount = 0, curUrl = "";
    var mode = "", playing = false, preparing = false, pausedForAlert = false, why = "";
    var waiters = [];
    /* v8.7.66: stations of the list (Shoutcast MP3) are watched more closely: the audio clock must keep moving, and after
       a stall the other host (backup.qurango.net) is tried first. Cairo keeps the old settings. */
    var avLast = -1, avStill = 0, avMoved = false, rot = 0;
    function isStation() { return !!(sys.pref("radioStation") && APL.radioStations && APL.radioStations.get(sys.pref("radioStation"))); }

    function storeGet(k) { try { return global.localStorage.getItem(k) || ""; } catch (e) { return ""; } }
    function storeSet(k, v) { try { if (v) global.localStorage.setItem(k, v); else global.localStorage.removeItem(k); } catch (e) {} }

    /* Address list: a custom address from Settings first (the old web-page
       address of earlier builds is ignored), then the configured streams,
       with the last address that worked moved to the front. */
    function urls() {
        var out = [];
        function add(u) {
            u = String(u || "").trim();
            if (!/^https?:\/\//i.test(u)) return;
            if (out.indexOf(u) < 0) out.push(u);
        }
        /* v8.7.65: a station picked from the list (long press on the Radio tile) plays alone; no silent switch to Cairo */
        var st = sys.pref("radioStation");
        if (st && APL.radioStations) {
            APL.radioStations.urls(st).forEach(add);
            if (out.length) {
                var r = rot % out.length;
                if (r) out = out.slice(r).concat(out.slice(0, r));
                return out;
            }
        }
        add(sys.pref("radioUrl"));
        (CFG.urls && CFG.urls.length ? CFG.urls : DEFAULT_URLS).forEach(add);
        if (!out.length) DEFAULT_URLS.forEach(add);
        var good = storeGet(GOOD_KEY), gi = out.indexOf(good);
        if (gi > 0) { out.splice(gi, 1); out.unshift(good); }
        return out;
    }
    function url() { return curUrl || urls()[0]; }
    function wanted() { return storeGet(INTENT_KEY) === "1"; }
    function setWanted(on) { storeSet(INTENT_KEY, on ? "1" : ""); }
    function listeners(fn) { if (typeof fn === "function") waiters.push(fn); }
    function state() {
        return {
            playing: playing,
            starting: preparing,
            mode: mode,
            url: url(),
            why: why,
            background: false,
            solid: mode === "avplay" || mode === "html5" ? "launcher" : "",
            wanted: wanted(),
            bgReport: bgReport,
            pausedForAlert: pausedForAlert,
            engine: mode === "html5" ? "HTML5 audio" : "AVPlay"
        };
    }
    function changed() {
        var s = state();
        waiters.forEach(function (fn) { try { fn(s); } catch (e) {} });
    }
    function errorText(e) {
        var s = String((e && (e.message || e.name || e.code)) || e || "unknown error");
        return s.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").slice(0, 260);
    }
    function clearTimers() {
        if (prepareTimer) { clearTimeout(prepareTimer); prepareTimer = null; }
        if (stallTimer) { clearTimeout(stallTimer); stallTimer = null; }
        if (watchTimer) { clearInterval(watchTimer); watchTimer = null; }
    }
    function clearRetry() { if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; } }
    function closeH5() {
        if (!h5) return;
        var a = h5; h5 = null; h5Last = -1; h5Still = 0;
        try {
            a.onerror = a.onplaying = a.onended = null;
            a.pause();
            a.src = "";
            a.removeAttribute("src");
            a.load();
        } catch (e) {}
    }
    function closeAvPlay() {
        clearTimers();
        closeH5();
        var p = global.webapis && global.webapis.avplay;
        if (p) {
            try {
                var s = "";
                try { s = String(p.getState()); } catch (e0) {}
                if (s === "PLAYING" || s === "PAUSED" || s === "READY") {
                    try { p.stop(); } catch (e1) {}
                }
                try { p.close(); } catch (e2) {}
            } catch (e) {}
        }
        if (av && av !== p) {
            try {
                try { av.stop(); } catch (e3) {}
                try { av.close(); } catch (e4) {}
            } catch (e) {}
        }
        avOpen = false;
    }
    function stopLegacyRadio() {
        // A prior package may have left the old root player wanted. Stop only
        // that radio worker; the alert keeper remains available for alerts.
        if (APL.bgAudio && typeof APL.bgAudio.stop === "function") {
            try { APL.bgAudio.stop().catch(function () {}); } catch (e) {}
        }
        if (sys && typeof sys.exec === "function" && !sys.PREVIEW) {
            try {
                sys.exec("killall -9 gst-launch-1.0 pacat aplay 2>/dev/null; pkill -9 -f 'gst-launch.*(radio|quran|station)' 2>/dev/null; pkill -9 -f 'pacat.*APL' 2>/dev/null; rm -f /run/apl-bg/radio.* /tmp/apl-bg/radio.* /opt/usr/home/owner/APL/bg/radio.* 2>/dev/null; true").catch(function () {});
            } catch (e) {}
        }
    }

    /* ---- one attempt on one address ---- */
    function openOne(targetUrl, token) {
        return new Promise(function (resolve, reject) {
            av = global.webapis && global.webapis.avplay;      // looked up again: it may not have existed at start-up
            if (!av || typeof av.open !== "function" || typeof av.prepareAsync !== "function") {
                reject(new Error("AVPlay API is unavailable on this TV."));
                return;
            }
            var settled = false;
            function bad(phase, e) {
                if (settled) return;
                settled = true;
                abortAttempt = null;
                closeAvPlay();
                reject(new Error("AVPlay " + phase + ": " + errorText(e)));
            }
            function runtimeFailure(phase, e) {
                if (token !== session) return;
                if (!settled) { bad(phase, e); return; }
                lostStream(token, phase, e);
            }
            closeAvPlay();
            abortAttempt = function () { bad("stopped", "stopped"); };
            try {
                av.open(targetUrl);
                avOpen = true;
                if (typeof av.setListener === "function") {
                    av.setListener({
                        onbufferingstart: function () {
                            if (token !== session) return;
                            if (settled && playing) {
                                if (stallTimer) clearTimeout(stallTimer);
                                stallTimer = setTimeout(function () {
                                    stallTimer = null;
                                    runtimeFailure("stalled", "buffering for over " + (STALL_LIMIT / 1000) + " seconds");
                                }, isStation() ? 10000 : STALL_LIMIT);
                            }
                        },
                        onbufferingcomplete: function () {
                            if (stallTimer) { clearTimeout(stallTimer); stallTimer = null; }
                        },
                        onstreamcompleted: function () { runtimeFailure("stream ended", "the station closed the stream"); },
                        onerror: function (e) { runtimeFailure("error", e); }
                    });
                }
                prepareTimer = setTimeout(function () {
                    prepareTimer = null;
                    bad("prepare timed out", "no ready callback after " + (PREPARE_TIMEOUT / 1000) + " seconds");
                }, PREPARE_TIMEOUT);
                av.prepareAsync(function () {
                    if (settled) return;
                    if (token !== session) { bad("stopped", "stopped"); return; }
                    if (prepareTimer) { clearTimeout(prepareTimer); prepareTimer = null; }
                    try {
                        av.play();
                        settled = true;
                        abortAttempt = null;
                        resolve(true);
                    } catch (e) { bad("play", e); }
                }, function (e) { bad("prepare", e); });
            } catch (e) { bad("open", e); }
        });
    }

    /* ---- second engine: <audio>. Judged by the clock moving, not by a promise resolving. ---- */
    function openH5(targetUrl, token) {
        return new Promise(function (resolve, reject) {
            var a, done = false, t0 = Date.now(), poll = null, giveUp = null;
            function fin(ok, e) {
                if (done) return; done = true;
                clearInterval(poll); clearTimeout(giveUp); abortAttempt = null;
                if (ok) { h5 = a; resolve(true); return; }
                try { a.onerror = null; a.pause(); a.removeAttribute("src"); a.load(); } catch (e2) {}
                reject(new Error("HTML5 audio: " + errorText(e)));
            }
            try {
                a = new global.Audio();
                h5 = a;
                a.preload = "auto";
                a.onerror = function () { fin(false, "media error " + (a.error ? a.error.code : "?")); };
                abortAttempt = function () { fin(false, "stopped"); };
                a.src = targetUrl;
                var pr = a.play();
                if (pr && pr.catch) pr.catch(function (e) { fin(false, e); });
                poll = setInterval(function () {
                    if (token !== session) { fin(false, "stopped"); return; }
                    if (a.currentTime > 0.4 && !a.paused) fin(true);
                }, 300);
                giveUp = setTimeout(function () { fin(false, "no sound after 10 seconds"); }, 10000);
            } catch (e) { fin(false, e); }
        });
    }

    /* ---- try every address once, starting with the preferred one ---- */
    function connectChain(token) {
        var list = urls(), k = 0, lastWhy = "", errs = [];
        return new Promise(function (resolve, reject) {
            (function next() {
                if (token !== session) { reject(new Error("AVPlay stopped")); return; }
                if (k >= 2 * list.length) { reject(new Error(errs.length ? errs.join(" | ") : (lastWhy || "no stream address worked"))); return; }
                var useH5 = k >= list.length;
                curUrl = list[k % list.length]; k++;
                var step = k % list.length || list.length;
                why = (useH5 ? "HTML5 audio preparing… (" : "AVPlay preparing… (") + step + "/" + list.length + ")";
                changed();
                (useH5 ? openH5(curUrl, token) : openOne(curUrl, token)).then(function () {
                    if (token !== session) { closeAvPlay(); reject(new Error("AVPlay stopped")); return; }
                    storeSet(GOOD_KEY, curUrl);
                    mode = useH5 ? "html5" : "avplay";
                    resolve(true);
                }, function (e) {
                    lastWhy = errorText(e);
                    errs.push((useH5 ? "H" : "A") + step + " " + String(curUrl).replace(/^https?:\/\//, "").slice(0, 26) + " → " + lastWhy.slice(0, 70));
                    next();
                });
            })();
        });
    }

    function onConnected(token) {
        if (token !== session) return;
        preparing = false;
        playing = true;
        mode = h5 ? "html5" : "avplay";
        why = "";
        retryCount = 0;
        avLast = -1; avStill = 0; avMoved = false;
        clearRetry();
        // The TV can release a player without any callback (alert focus, source
        // change). Check the real player state while we believe we are playing.
        if (watchTimer) clearInterval(watchTimer);
        watchTimer = setInterval(function () {
            if (token !== session || !playing) return;
            var st = "";
            if (h5) {                                   // HTML5 engine: the clock must keep moving
                var ct = h5.currentTime;
                h5Still = (ct === h5Last || h5.paused || h5.ended) ? h5Still + 1 : 0;
                h5Last = ct;
                if (h5Still >= (isStation() ? 3 : 2)) lostStream(token, "player state", "audio clock stopped");
                return;
            }
            try { st = String(av.getState()); } catch (e) { st = "ERROR"; }
            if (st === "PLAYING" && isStation()) {
                /* AVPlay can say PLAYING while the stream delivers nothing: judge by the play position moving */
                var cp = -1;
                try { cp = Number(av.getCurrentTime()); } catch (e5) { cp = -1; }
                if (cp >= 0) {
                    if (avLast >= 0 && cp !== avLast) { avMoved = true; avStill = 0; }
                    else if (avLast >= 0) avStill++;
                    avLast = cp;
                    if (avMoved && avStill >= 3) { lostStream(token, "no progress", "the audio position stopped moving"); return; }
                }
            }
            if (st !== "PLAYING") {
                if (document.hidden && bgOK()) {            // released while another app is in front: do not reopen now
                    closeAvPlay(); playing = false; mode = ""; clearTimers();
                    why = "Background: the TV released the player (" + st + ")"; changed();
                    return;
                }
                lostStream(token, "player state", st);
            }
        }, isStation() ? 4000 : WATCH_EVERY);
        changed();
    }

    /* The stream dropped while we wanted it: reconnect, for as long as the
       radio is wanted and the launcher is in front. */
    function lostStream(token, phase, e) {
        if (token !== session) return;
        if (isStation()) rot++;                 // the next try starts on the other host
        closeAvPlay();
        playing = false;
        why = "AVPlay " + phase + ": " + errorText(e);
        scheduleRetry();
    }
    function scheduleRetry(immediate) {
        clearRetry();
        if (!wanted() || document.hidden || pausedForAlert) {
            preparing = false; playing = false; mode = "";
            changed();
            return;
        }
        var delay = immediate ? 0 : Math.min(RETRY_MIN * Math.pow(2, retryCount), RETRY_MAX);
        retryCount++;
        preparing = true;
        playing = false;
        mode = "avplay";
        if (delay) why = "Reconnecting in " + Math.round(delay / 1000) + "s… (" + why + ")";
        changed();
        var mine = session;
        retryTimer = setTimeout(function () {
            retryTimer = null;
            if (mine !== session || !wanted() || document.hidden) return;
            var token = ++session;
            connectChain(token).then(function () { onConnected(token); }, function (err) {
                if (token !== session) return;
                why = errorText(err);
                scheduleRetry();
            });
        }, delay);
    }

    /* ---- public controls ---- */
    function playAvPlay(targetUrl) {
        var token = ++session;
        preparing = true;
        playing = false;
        mode = "avplay";
        why = "AVPlay preparing…";
        changed();
        return connectChain(token).then(function () {
            onConnected(token);
            return true;
        }, function (e) {
            if (token === session) {
                closeAvPlay();
                preparing = false; playing = false; mode = "";
                why = errorText(e);
                setWanted(false);
                changed();
            }
            throw e;
        });
    }

    /* ---- public controls ---- */
    function play(forcedUrl) {
        if (playing && (mode === "avplay" || mode === "html5")) {
            return Promise.resolve(true);
        }
        if (preparing) return Promise.resolve(false);
        if (global.APL && global.APL.quranAudio && global.APL.quranAudio.pause) {
            try { global.APL.quranAudio.pause(); } catch (e) {}
        }
        stopLegacyRadio();
        pausedForAlert = false;
        clearRetry();
        retryCount = 0;
        rot = 0;
        setWanted(true);
        var targetUrl = forcedUrl || url();
        curUrl = targetUrl;
        return playAvPlay(targetUrl);
    }

    function stop(clearIntent) {
        session++;
        clearRetry();
        clearTimers();
        if (clearIntent !== false) setWanted(false);
        preparing = false;
        playing = false;
        mode = "";
        pausedForAlert = false;
        retryCount = 0;
        why = "";
        stopHoWatch();
        handedOff = false;
        var abort = abortAttempt;
        abortAttempt = null;
        closeAvPlay();
        if (abort) { try { abort(); } catch (e) {} }
        stopLegacyRadio();
        changed();
        return Promise.resolve(true);
    }

    function isActive() {
        if (playing || preparing || wanted()) return true;
        if (h5 && !h5.paused) return true;
        var p = global.webapis && global.webapis.avplay;
        if (p) {
            try {
                var s = String(p.getState());
                if (s === "PLAYING" || s === "PAUSED" || s === "READY") return true;
            } catch (e) {}
        }
        return false;
    }

    function isPlaying() {
        return isActive();
    }

    function toggle() {
        return isActive() ? stop() : play();
    }

    function ensure() {
        if (isPlaying()) return Promise.resolve(true);
        if (!wanted()) return Promise.resolve(false);
        return play();
    }

    function pauseForAlert() {
        if (!isPlaying() || !wanted() || sys.pref("radioDuringAlert") === false) return Promise.resolve(false);
        pausedForAlert = true;
        why = "Paused for prayer alert";
        changed();
        try {
            clearTimers();
            if (h5) h5.pause(); else if (av) av.pause();
            playing = false;
            return Promise.resolve(true);
        } catch (e) {
            why = "AVPlay pause: " + errorText(e);
            changed();
            return Promise.resolve(false);
        }
    }

    function resumeAfterAlert() {
        if (!pausedForAlert) return Promise.resolve(false);
        pausedForAlert = false;
        if (!wanted()) return Promise.resolve(false);
        if (document.hidden) return Promise.resolve(false);
        closeAvPlay();
        playing = false;
        return play();
    }

    var hiddenAt = 0, bgReport = "";
    function bgOK() { return true; }
    var hoTimer = null, handedOff = false;
    function hoOK() { return false; }
    function stopHoWatch() { if (hoTimer) { clearInterval(hoTimer); hoTimer = null; } }
    function startHoWatch() {}
    function doHandoff() {}
    function endHandoff() { return false; }

    function backInFront() {
        stopHoWatch();
        stopLegacyRadio();
        if (!hiddenAt) return;
        hiddenAt = 0;
        if (!wanted() || pausedForAlert) return;
        scheduleRetry(true);
    }

    function releaseForVideo() {
        if (!playing && !preparing && !avOpen) return false;
        stop(true);
        why = "Stopped because an input was opened.";
        changed();
        return true;
    }

    function leftLauncher() {
        if (!playing && !preparing && !pausedForAlert && !wanted()) return;
        hiddenAt = Date.now();
        closeAvPlay();
        playing = false;
        mode = "";
        why = "Stopped because Salah Launcher is no longer in front.";
        changed();
    }

    // Clean up any lingering background radio worker on startup
    stopLegacyRadio();

    document.addEventListener("visibilitychange", function () {
        if (document.hidden) leftLauncher();
        else backInFront();
    });
    global.addEventListener("pagehide", function () {
        leftLauncher();
    });

    global.addEventListener("online", function () {
        if (retryTimer && wanted() && !isPlaying() && !pausedForAlert && !document.hidden) {
            clearRetry();
            retryCount = 0;
            scheduleRetry(true);
        }
    });

    APL.radio = {
        play: play,
        stop: stop,
        releaseForVideo: releaseForVideo,
        toggle: toggle,
        ensure: ensure,
        isPlaying: isPlaying,
        state: state,
        wanted: wanted,
        pauseForAlert: pauseForAlert,
        resumeAfterAlert: resumeAfterAlert,
        onChange: listeners,
        name: CFG.name || "إذاعة القرآن الكريم من القاهرة",
        url: url,
        urls: urls
    };
})(window);
