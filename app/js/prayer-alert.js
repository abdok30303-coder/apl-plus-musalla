/* ============================================================
   prayer-alert.js — spoken prayer alerts & task chimes via Vetro.

   Routes alerts through Vetro's persistent GStreamer root daemon first
   so alerts ALWAYS play reliably in both foreground and background
   (pausing & resuming Quran Radio automatically). Falls back to HTML5
   Audio + synthesized WebAudio chime on PC preview or when Vetro is
   unreachable.
   ============================================================ */
(function (global) {
    "use strict";

    var APL = global.APL, sys = APL && APL.sys;
    if (!APL || !sys) return;

    var FILES = {
        fajr: "sounds/prayer/fajr.wav",
        dhuhr: "sounds/prayer/dhuhr.wav",
        asr: "sounds/prayer/asr.wav",
        maghrib: "sounds/prayer/maghrib.wav",
        isha: "sounds/prayer/isha.wav",
        task: "sounds/task-alert.wav",
        cannon: "sounds/ramadan-cannon.wav",
        "ramadan-cannon": "sounds/ramadan-cannon.wav"
    };
    var el = null, playingKey = "", resumeTimer = null;

    function asset(p) { return p && global.APL_ASSET ? global.APL_ASSET(p) : p; }
    function volume() {
        var v = parseFloat(sys.pref("prayerAlertVolume"));
        return (v >= 0 && v <= 1) ? v : 0.92;
    }

    function audio() {
        if (el) return el;
        el = document.createElement("audio");
        el.preload = "auto";
        el.addEventListener("ended", finish);
        el.addEventListener("error", function () { beep(); finish(); });
        document.body.appendChild(el);
        return el;
    }

    function beep() {
        try {
            var AC = global.AudioContext || global.webkitAudioContext;
            if (!AC) return;
            var ctx = new AC();
            [0, 0.28, 0.56].forEach(function (t, i) {
                var o = ctx.createOscillator(), g = ctx.createGain();
                o.type = "sine";
                o.frequency.value = [523.25, 659.25, 880][i] || 880;
                g.gain.setValueAtTime(0.0001, ctx.currentTime + t);
                g.gain.exponentialRampToValueAtTime(0.25 * volume(), ctx.currentTime + t + 0.04);
                g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.36);
                o.connect(g); g.connect(ctx.destination);
                o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.4);
            });
            setTimeout(function () { try { ctx.close(); } catch (e) {} }, 1400);
        } catch (e) {}
    }

    function finish() {
        clearTimeout(resumeTimer);
        resumeTimer = null;
        playingKey = "";
        if (APL.radio && APL.radio.resumeAfterAlert) {
            APL.radio.resumeAfterAlert().then(function (resumed) {
                if (resumed && APL.toast) APL.toast(APL.t("Radio resumed"), true);
            });
        }
        /* v1.2.116: Surat Al-Kahf / the Eid takbeer (js/audio-pack.js) are paused and resumed like the radio */
        if (APL.audioPack && APL.audioPack.resumeAfterAlert) {
            APL.audioPack.resumeAfterAlert().then(function (resumed) {
                if (resumed && APL.toast) APL.toast(APL.t("Recording resumed"), true);
            });
        }
        if (APL.quranAudio && APL.quranAudio.resumeAfterAlert) {
            APL.quranAudio.resumeAfterAlert().then(function (resumed) {
                if (resumed && APL.toast) APL.toast(APL.lang === "ar" ? "تم استئناف تلاوة القرآن" : "Quran audio resumed", true);
            });
        }
    }
    function pauseAudioPack() {
        var pPack = (!APL.audioPack || !APL.audioPack.isPlaying || !APL.audioPack.isPlaying())
            ? Promise.resolve(false)
            : APL.audioPack.pauseForAlert().then(function (p) { return !!p; }, function () { return false; });
        return pPack.then(function (apPaused) {
            if (APL.quranAudio && APL.quranAudio.isPlaying && APL.quranAudio.isPlaying()) {
                return APL.quranAudio.pauseForAlert().then(function (qaPaused) {
                    if (qaPaused && APL.toast) APL.toast(APL.lang === "ar" ? "تم إيقاف تلاوة القرآن مؤقتاً" : "Quran audio paused", true);
                    return apPaused || qaPaused;
                }, function () { return apPaused; });
            }
            return apPaused;
        });
    }

    function playHtml(key) {
        if (key === "maghrib_ramadan") {
            var cannonSrc = asset("sounds/ramadan-cannon.wav");
            var adhanSrc = asset(FILES.maghrib);
            var startSeq = function () {
                var a = audio();
                a.volume = volume();
                playingKey = "maghrib_ramadan";
                a.src = cannonSrc;
                var onCannonEnd = function () {
                    a.removeEventListener("ended", onCannonEnd);
                    a.src = adhanSrc;
                    a.addEventListener("ended", finish);
                    a.play().catch(function () { beep(); finish(); });
                };
                a.removeEventListener("ended", finish);
                a.addEventListener("ended", onCannonEnd);
                a.play().catch(function () {
                    a.src = adhanSrc;
                    a.addEventListener("ended", finish);
                    a.play().catch(function () { beep(); finish(); });
                });
                clearTimeout(resumeTimer);
                resumeTimer = setTimeout(finish, 26000);
            };
            pauseAudioPack().then(function (apPaused) {
                if (APL.radio && APL.radio.pauseForAlert && APL.radio.isPlaying()) {
                    APL.radio.pauseForAlert().then(function (paused) {
                        if (paused && APL.toast) APL.toast(APL.t("Quran Radio paused"), true);
                        setTimeout(startSeq, paused || apPaused ? 600 : 0);
                    }, startSeq);
                } else {
                    if (apPaused) setTimeout(startSeq, 600); else startSeq();
                }
            });
            return;
        }
        var src = asset(FILES[key] || FILES.isha);
        var start = function () {
            var a = audio();
            a.volume = volume();
            playingKey = key;
            try {
                a.src = src;
                var p = a.play();
                if (p && p.catch) p.catch(function () { beep(); finish(); });
            } catch (e) { beep(); finish(); return; }
            clearTimeout(resumeTimer);
            resumeTimer = setTimeout(finish, 20000);
        };
        pauseAudioPack().then(function (apPaused) {
            if (APL.radio && APL.radio.pauseForAlert && APL.radio.isPlaying()) {
                APL.radio.pauseForAlert().then(function (paused) {
                    if (paused && APL.toast) APL.toast(APL.t("Quran Radio paused"), true);
                    setTimeout(start, paused || apPaused ? 600 : 0);
                }, start);
            } else {
                if (apPaused) setTimeout(start, 600); else start();
            }
        });
    }

    /* v1.2.35: the root daemon plays the alert over the launcher's own AVPlay radio, which it
       cannot pause. So the launcher pauses the radio itself and resumes it after a FIXED delay
       (the daemon's PCM chime is about 1.5 s + its 4 s hold; the MP3 fallback is up to 5.7 s).
       Change DAEMON_ALERT_MS if the alert on the TV turns out shorter or longer. Untested on TV. */
    var DAEMON_ALERT_MS = 10000, daemonResume = null;
    function cancelDaemonResume() { clearTimeout(daemonResume); daemonResume = null; }
    function pauseRadioFirst(pauseRad) {
        return (pauseRad ? pauseAudioPack() : Promise.resolve(false)).then(function (apPaused) {
            if (!pauseRad || !APL.radio || !APL.radio.isPlaying || !APL.radio.isPlaying() || !APL.radio.pauseForAlert) {
                return apPaused;
            }
            return APL.radio.pauseForAlert().then(function (paused) {
                if (paused && APL.toast) APL.toast(APL.t("Quran Radio paused"), true);
                return paused || apPaused;
            }, function () { return apPaused; });
        });
    }
    function scheduleDaemonResume(customMs) {
        cancelDaemonResume();
        daemonResume = setTimeout(function () { daemonResume = null; finish(); }, customMs || DAEMON_ALERT_MS);
    }

    function play(key) {
        var rawKey = key;
        var validKey = (rawKey === "maghrib_ramadan") ? "maghrib_ramadan" : (FILES[key] ? key : "isha");
        var pauseRad = sys.pref("radioDuringAlert") !== false;
        var isMagRam = (validKey === "maghrib_ramadan");
        var resumeHold = isMagRam ? 22000 : DAEMON_ALERT_MS;

        if (APL.bgAudio && APL.bgAudio.playAlert) {
            APL.bgAudio.available().then(function (ok) {
                if (!ok) { playHtml(validKey); return; }
                return pauseRadioFirst(pauseRad).then(function (paused) {
                    playingKey = validKey;
                    clearTimeout(resumeTimer);
                    resumeTimer = setTimeout(function () { playingKey = ""; }, isMagRam ? 24000 : 12000);
                    return APL.bgAudio.playAlert(validKey, volume(), pauseRad).then(function (started) {
                        if (!started) { cancelDaemonResume(); playHtml(validKey); }
                        else if (paused) scheduleDaemonResume(resumeHold);
                    }, function () {
                        cancelDaemonResume();
                        playHtml(validKey);
                    });
                });
            }, function () {
                playHtml(validKey);
            });
            return;
        }
        playHtml(validKey);
    }

    APL.prayerAlert = {
        play: play,
        test: function (key) { play(key || "isha"); },
        isPlaying: function () { return !!playingKey; },
        filesPresent: function () {
            var ok = {};
            ["fajr", "dhuhr", "asr", "maghrib", "isha"].forEach(function (k) { ok[k] = asset(FILES[k]); });
            return ok;
        }
    };
})(window);
