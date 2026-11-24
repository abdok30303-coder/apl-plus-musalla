/* ============================================================
   audio-pack.js — Surat Al-Kahf and the Eid takbeer (Egyptian Quran Radio), played from FILES KEPT OUTSIDE the package.

   v1.2.116: the sound files are NOT inside the .wgt (they would make every install and every start heavier). They live in a
   folder called APL-Audio on the TV (or on a USB stick):  alkahf.mp3  and  takbeerat-eid.mp3  (m4a / aac / ogg / wav also
   accepted). Nothing is read until the person presses the tile: the page only lists the folder, and Samsung AVPlay then
   streams the file from the disk, so the 37 MB file is never loaded into the page's memory.

   - Where it looks (first match wins): the TV's own Documents / Downloads / Music folders and every mounted USB drive, in a
     folder named APL-Audio, or directly in the root of that place.
   - How it plays: AVPlay, one file at a time. It stops the radio first (AVPlay is shared) and the radio stops it when the
     radio is started. It stops when the launcher leaves the front, like the radio; the position is kept (Al-Kahf resumes there).
   - A prayer alert pauses it and resumes it after, like the radio (Settings: "Pause on alert").
   Untested on the TV: the folder lookup (tizen.filesystem) and the AVPlay file path forms (tried one after the other).
   ============================================================ */
(function (global) {
    "use strict";

    var APL = global.APL, sys = APL && APL.sys;
    if (!APL || !sys) return;

    var DIR_NAME = "APL-Audio";
    var ITEMS = {
        kahf:    { re: /(alkahf|al-kahf|kahf|كهف)/i,                   name: "Surat Al-Kahf", keepPos: true  },
        takbeer: { re: /(takbeer|takbir|takbeerat|eid|تكبير)/i,        name: "Eid Takbeer",   keepPos: false }
    };
    var EXT = /\.(mp3|m4a|aac|ogg|oga|wav|wma)$/i;
    var SKIP_STORAGE = /^(wgt-private|wgt-private-tmp|ringtones)$/i;
    var PREPARE_TIMEOUT = 12000;
    var POS_PREFIX = "apl.audio.pos.";
    var RES_PREFIX = "apl.audio.res.";      /* v7.2.0: the place to resume from: kept even after a stop by hand (the main tile still restarts from the beginning then) */
    var startFrom = null;                    /* v7.2.0: set by resume()/restart() for one play() */
    /* If the folder lookup finds nothing (no tizen.filesystem, or a place it cannot list), these exact paths are tried
       blindly: bundled package files first, then the folders and file names that install/Install-AudioPack.ps1 uses. */
    var BLIND_DIRS = [
        "/opt/usr/home/owner/content/Documents", "/opt/usr/home/owner/media/Documents",
        "/opt/usr/home/owner/content/Downloads", "/opt/usr/home/owner/media/Downloads"
    ];
    var BLIND_FILES = { kahf: "alkahf.mp3", takbeer: "takbeerat-eid.mp3" };
    /* v8.7.23: online fallback (used only when the local file is missing). Both are plain HTTPS files on archive.org
       (302 to a storage host, byte ranges supported, so AVPlay can seek and resume).
       kahf: Surat Al-Kahf, Sheikh Mahmoud Khalil Al-Husary, the Egyptian Radio recording (Quran Radio, Egypt), MP3 128 kbps.
       takbeer: Eid takbeerat from the Egyptian Radio (presented by Shehata El-Arabi, takbeer by Sheikh Nasr El-Din Tobar), about 10 min,
       AAC in an MP4 container (it repeats until stopped, like the local file). */
    var ONLINE = {
        kahf:    ["https://archive.org/download/MahmoudKhalilAl-husary/018.mp3"],
        takbeer: ["https://archive.org/download/f-2mp-download-sd/F2mp_download_sd.mp3"]
    };
    function blindPaths(id) {
        var out = [];
        var fname = BLIND_FILES[id];
        out.push("audio/" + fname);
        out.push("./audio/" + fname);
        try {
            var loc = global.location;
            if (loc && loc.href) {
                var baseUri = loc.href.replace(/\/[^\/]*$/, "/");
                out.push(baseUri + "audio/" + fname);
                var plainPath = (loc.pathname || "").replace(/\/[^\/]*$/, "/");
                if (plainPath) out.push(plainPath + "audio/" + fname);
            }
        } catch (e) {}
        BLIND_DIRS.forEach(function (d) { out.push(d + "/" + DIR_NAME + "/" + fname); });
        return out;
    }

    var av = null, avOpen = false, session = 0;
    var current = "", playing = false, preparing = false, paused = false, why = "";
    var prepareTimer = null, posTimer = null, abortAttempt = null;
    var found = {};                 // id -> [candidate paths], from the last scan
    var listeners = [];

    function storeGet(k) { try { return global.localStorage.getItem(k) || ""; } catch (e) { return ""; } }
    function storeSet(k, v) { try { if (v) global.localStorage.setItem(k, v); else global.localStorage.removeItem(k); } catch (e) {} }
    function errorText(e) { return e && e.message ? e.message : (e && e.name ? e.name : String(e || "error")); }
    function changed() { listeners.slice().forEach(function (fn) { try { fn(state()); } catch (e) {} }); }
    function state() {
        return {
            id: current, playing: playing, preparing: preparing, paused: paused,
            why: why, name: current && ITEMS[current] ? ITEMS[current].name : ""
        };
    }

    /* ---------- finding the files (tizen.filesystem) ---------- */
    function fsApi() { return global.tizen && global.tizen.filesystem; }

    function listStorages() {
        return new Promise(function (resolve) {
            var fs = fsApi(), out = [], done = false;
            function fin() { if (done) return; done = true; resolve(out); }
            if (!fs) { resolve([]); return; }
            ["wgt-package", "documents", "downloads", "music"].forEach(function (l) { out.push(l); });
            try {
                fs.listStorages(function (list) {
                    (list || []).forEach(function (s) {
                        if (!s || !s.label || SKIP_STORAGE.test(s.label)) return;
                        if (s.state && String(s.state).toUpperCase() !== "MOUNTED") return;
                        if (out.indexOf(s.label) < 0) out.push(s.label);
                    });
                    fin();
                }, fin);
            } catch (e) { fin(); }
            setTimeout(fin, 4000);
        });
    }
    function resolveDir(label) {
        return new Promise(function (resolve) {
            var fs = fsApi(), done = false;
            function fin(v) { if (done) return; done = true; resolve(v || null); }
            try { fs.resolve(label, function (d) { fin(d); }, function () { fin(null); }, "r"); } catch (e) { fin(null); }
            setTimeout(function () { fin(null); }, 4000);
        });
    }
    function listFiles(dir) {
        return new Promise(function (resolve) {
            var done = false;
            function fin(v) { if (done) return; done = true; resolve(v || []); }
            try { dir.listFiles(function (f) { fin(f); }, function () { fin([]); }); } catch (e) { fin([]); }
            setTimeout(function () { fin([]); }, 4000);
        });
    }
    function candidatesOf(file) {
        var out = [], uri = "";
        try { uri = file.toURI ? file.toURI() : ""; } catch (e) {}
        if (uri) {
            var plain = uri.replace(/^file:\/\//i, "");
            try { plain = decodeURIComponent(plain); } catch (e) {}
            out.push(plain);
            out.push(uri);
        }
        if (file.fullPath) out.push(file.fullPath);
        return out.filter(function (v, i) { return v && out.indexOf(v) === i; });
    }
    function pick(files, want, into) {
        files.forEach(function (f) {
            if (!f || f.isDirectory || !EXT.test(f.name || "")) return;
            Object.keys(want).forEach(function (id) {
                if (into[id] || !ITEMS[id].re.test(f.name)) return;
                into[id] = candidatesOf(f);
            });
        });
    }
    /* One pass over every place. Returns {kahf:[paths]|undefined, takbeer:[paths]|undefined}. */
    function scan() {
        var res = {};
        return listStorages().then(function (labels) {
            var chain = Promise.resolve();
            labels.forEach(function (label) {
                chain = chain.then(function () {
                    if (res.kahf && res.takbeer) return null;
                    return resolveDir(label).then(function (root) {
                        if (!root) return null;
                        return listFiles(root).then(function (files) {
                            pick(files, ITEMS, res);
                            var subs = files.filter(function (f) { return f && f.isDirectory && (f.name === DIR_NAME || f.name === "audio"); });
                            if (!subs.length || (res.kahf && res.takbeer)) return null;
                            var subChain = Promise.resolve();
                            subs.forEach(function (sub) {
                                subChain = subChain.then(function () {
                                    if (res.kahf && res.takbeer) return null;
                                    return listFiles(sub).then(function (inner) { pick(inner, ITEMS, res); });
                                });
                            });
                            return subChain;
                        });
                    });
                });
            });
            return chain;
        }).then(function () { found = res; return res; }, function () { found = res; return res; });
    }

    /* ---------- AVPlay ---------- */
    function clearTimers() {
        if (prepareTimer) { clearTimeout(prepareTimer); prepareTimer = null; }
        if (posTimer) { clearInterval(posTimer); posTimer = null; }
    }
    function closeAv() {
        clearTimers();
        if (!av || !avOpen) return;
        try { av.stop(); } catch (e) {}
        try { av.close(); } catch (e) {}
        avOpen = false;
    }
    function savePos() {
        if (!current || !ITEMS[current] || !ITEMS[current].keepPos || !av || !avOpen) return;
        try {
            var ms = av.getCurrentTime(), dur = 0;
            try { dur = av.getDuration(); } catch (e2) {}
            if (dur > 0 && ms > dur - 20000) { storeSet(POS_PREFIX + current, ""); storeSet(RES_PREFIX + current, ""); return; }      // at the end: next time from the start
            if (ms > 5000) { storeSet(POS_PREFIX + current, String(Math.floor(ms))); storeSet(RES_PREFIX + current, String(Math.floor(ms))); }
        } catch (e) {}
    }
    /* v7.0.8: Eid Takbeer plays again as soon as it ends, until the person stops it. If two endings come less than
       4 s apart three times (a broken or empty file) it stops instead of looping forever. */
    var loopAt = 0, loopFast = 0;
    function loopAgain(id) {
        var now = Date.now();
        loopFast = (loopAt && now - loopAt < 4000) ? loopFast + 1 : 0;
        loopAt = now;
        if (loopFast >= 3) { stop(true, "The recording finished.", true); return; }
        closeAv();
        playing = false; preparing = false; current = "";
        play(id).then(null, function () {});
    }
    function openOne(path, id, token) {
        return new Promise(function (resolve, reject) {
            av = global.webapis && global.webapis.avplay;
            if (!av || typeof av.open !== "function" || typeof av.prepareAsync !== "function") {
                reject(new Error("AVPlay API is unavailable on this TV.")); return;
            }
            var settled = false;
            function bad(phase, e) {
                if (settled) return;
                settled = true; abortAttempt = null;
                closeAv();
                reject(new Error(phase + ": " + errorText(e)));
            }
            closeAv();
            abortAttempt = function () { bad("stopped", "stopped"); };
            try {
                av.open(path);
                avOpen = true;
                if (typeof av.setListener === "function") {
                    av.setListener({
                        onbufferingstart: function () {},
                        onbufferingcomplete: function () {},
                        oncurrentplaytime: function () {},
                        onstreamcompleted: function () {
                            if (token !== session) return;
                            storeSet(POS_PREFIX + id, "");
                            if (id === "takbeer") { loopAgain(id); return; }      // v7.0.8: Eid Takbeer repeats until it is stopped
                            stop(true, "The recording finished.", true);
                        },
                        onerror: function (e) {
                            if (token !== session) return;
                            if (!settled) { bad("error", e); return; }
                            stop(true, "Playback error: " + errorText(e));
                        }
                    });
                }
                prepareTimer = setTimeout(function () { prepareTimer = null; bad("prepare timed out", "no ready callback"); }, PREPARE_TIMEOUT);
                av.prepareAsync(function () {
                    if (settled) return;
                    if (prepareTimer) { clearTimeout(prepareTimer); prepareTimer = null; }
                    if (token !== session) { bad("stopped", "stopped"); return; }
                    try {
                        var from = startFrom !== null ? startFrom : (ITEMS[id].keepPos ? parseInt(storeGet(POS_PREFIX + id), 10) || 0 : 0);
                        av.play();
                        settled = true; abortAttempt = null;
                        if (from > 5000) { try { av.seekTo(from, function () {}, function () {}); } catch (e) {} }
                        resolve(true);
                    } catch (e) { bad("play", e); }
                }, function (e) { bad("prepare", e); });
            } catch (e) { bad("open", e); }
        });
    }
    function tryChain(paths, id, token) {
        var k = 0, last = "";
        return new Promise(function (resolve, reject) {
            (function next() {
                if (token !== session) { reject(new Error("stopped")); return; }
                if (k >= paths.length) { reject(new Error(last || "no path worked")); return; }
                var p = paths[k++];
                openOne(p, id, token).then(resolve, function (e) { last = errorText(e); next(); });
            })();
        });
    }

    /* ---------- the radio shares AVPlay: stop it first ---------- */
    function stopRadio() {
        var r = APL.radio;
        if (!r || !(r.isPlaying() || (r.state && (r.state().starting || r.state().playing)))) return Promise.resolve();
        return r.stop().then(function () {}, function () {});
    }

    function play(id, opts) {
        if (!ITEMS[id]) return Promise.reject(new Error("unknown recording"));
        if (current === id && (playing || preparing)) return Promise.resolve(true);
        if (global.APL && global.APL.quranAudio && global.APL.quranAudio.pause) {
            try { global.APL.quranAudio.pause(); } catch (e) {}
        }
        startFrom = opts && typeof opts.from === "number" ? opts.from : null;
        var token = ++session;
        closeAv();
        current = id; playing = false; paused = false; preparing = true;
        why = "Looking for the file…";
        changed();
        return stopRadio().then(function () {
            if (token !== session) throw new Error("stopped");
            var have = found[id];
            return have && have.length ? have : scan().then(function (r) { return r[id]; });
        }).then(function (paths) {
            if (token !== session) throw new Error("stopped");
            var blind = !paths || !paths.length;
            why = "Opening…";
            changed();
            /* v8.7.23: the local APL-Audio file is tried FIRST; only if it is not found (or will not open) the recording
               is streamed from the online source (ONLINE below). */
            return tryChain(blind ? blindPaths(id) : paths, id, token).then(null, function (e) {
                if (token !== session) throw e;
                var localErr = e;
                why = "Not found on the TV, trying online…";
                changed();
                return tryChain(ONLINE[id], id, token).then(null, function (e2) {
                    if (token !== session) throw e2;
                    if (blind) { var nf = new Error("NOFILE"); nf.noFile = true; nf.triedOnline = true; throw nf; }
                    throw localErr;
                });
            });
        }).then(function () {
            if (token !== session) return true;
            preparing = false; playing = true; paused = false; why = "";
            posTimer = setInterval(savePos, 10000);
            changed();
            return true;
        }, function (e) {
            if (token === session) {
                closeAv();
                preparing = false; playing = false;
                found = {};      // a file that was moved or deleted: look again next time
                why = e && e.noFile ? "NOFILE" : errorText(e);
                var keep = current; current = "";
                changed();
                e.itemId = keep;
            }
            throw e;
        });
    }

    function stop(silent, reason, noSave) {
        session++;
        if (!noSave) savePos();
        var abort = abortAttempt; abortAttempt = null;
        closeAv();
        playing = false; preparing = false; paused = false;
        var was = current; current = "";
        why = reason || "";
        if (abort) { try { abort(); } catch (e) {} }
        if (was || !silent) changed();
        return Promise.resolve(true);
    }
    /* v7.0.8: stopping Surat Al-Kahf by hand forgets the place: the next play starts from the beginning.
       (Leaving the launcher or a prayer alert still keep the place.) */
    function manualStop() {
        var was = current;
        if (was && ITEMS[was] && ITEMS[was].keepPos) savePos();      // v7.2.0: the place is kept for the Resume button
        var r = stop(false, "", true);
        if (was && ITEMS[was] && ITEMS[was].keepPos) storeSet(POS_PREFIX + was, "");
        return r;
    }
    /* v7.2.0: the two small buttons beside the Al-Kahf tile.
       resume(): continue from the place where it was stopped or interrupted (a prayer-alert pause is simply resumed).
       restart(): from the very beginning, even if it is playing now. */
    function resume(id) {
        if (!ITEMS[id] || !ITEMS[id].keepPos) return play(id);
        if (paused && current === id) return resumeAfterAlert();
        if (current === id && (playing || preparing)) return Promise.resolve(true);
        var from = parseInt(storeGet(RES_PREFIX + id), 10) || parseInt(storeGet(POS_PREFIX + id), 10) || 0;
        return play(id, { from: from });
    }
    function restart(id) {
        if (!ITEMS[id]) return Promise.reject(new Error("unknown recording"));
        storeSet(POS_PREFIX + id, ""); storeSet(RES_PREFIX + id, "");
        return stop(true, "", true).then(function () { return play(id, { from: 0 }); });
    }
    function hasResume(id) { return !!(ITEMS[id] && ITEMS[id].keepPos && (parseInt(storeGet(RES_PREFIX + id), 10) || parseInt(storeGet(POS_PREFIX + id), 10))); }
    function toggle(id) { return current === id && (playing || preparing) ? manualStop() : play(id); }

    /* a prayer alert: pause, then resume (the same rule as the radio: Settings "Pause on alert") */
    function pauseForAlert() {
        if (!playing || sys.pref("radioDuringAlert") === false) return Promise.resolve(false);
        try { savePos(); av.pause(); playing = false; paused = true; changed(); return Promise.resolve(true); }
        catch (e) { return Promise.resolve(false); }
    }
    function resumeAfterAlert() {
        if (!paused) return Promise.resolve(false);
        paused = false;
        if (document.hidden) { stop(true); return Promise.resolve(false); }
        try { av.play(); playing = true; changed(); return Promise.resolve(true); }
        catch (e) { stop(true, "Playback error: " + errorText(e)); return Promise.resolve(false); }
    }

    /* leaving the launcher stops it (the position is kept), like the radio */
    function left() { if (current || paused) stop(true, "Stopped because Salah Launcher is no longer in front."); }
    document.addEventListener("visibilitychange", function () { if (document.hidden) left(); });
    global.addEventListener("pagehide", left);

    /* starting the radio, or opening an input, takes AVPlay: this stops first (so the state shown is true) */
    (function hookRadio() {
        var r = APL.radio;
        if (!r) return;
        var p0 = r.play, v0 = r.releaseForVideo;
        if (typeof p0 === "function") r.play = function () { if (current) stop(true); return p0.apply(r, arguments); };
        if (typeof v0 === "function") r.releaseForVideo = function () { if (current) stop(true); return v0.apply(r, arguments); };
    })();

    APL.audioPack = {
        play: play,
        stop: function (silent) { return silent === true ? stop(true) : manualStop(); },
        toggle: toggle,
        resume: resume,
        restart: restart,
        hasResume: hasResume,
        scan: scan,
        isPlaying: function () { return playing; },
        isActive: function () { return playing || preparing || paused; },
        state: state,
        pauseForAlert: pauseForAlert,
        resumeAfterAlert: resumeAfterAlert,
        onChange: function (fn) { if (typeof fn === "function") listeners.push(fn); },
        folderName: DIR_NAME,
        items: ITEMS
    };

    /* Automatically ensure permanent copy in TV Documents storage if bundled files exist */
    function persistAudioFiles() {
        var fs = fsApi();
        if (!fs) return;
        if (storeGet("apl.audio.persisted") === "true") return;

        // Try Vetro exec first for instantaneous OS-level copy:
        if (APL.sys && typeof APL.sys.exec === "function") {
            var cmd = "mkdir -p /opt/usr/home/owner/content/Documents/APL-Audio && " +
                      "[ ! -s /opt/usr/home/owner/content/Documents/APL-Audio/alkahf.mp3 ] && " +
                      "[ -f /opt/usr/apps/APLMusalla/res/wgt/audio/alkahf.mp3 ] && " +
                      "cp /opt/usr/apps/APLMusalla/res/wgt/audio/*.mp3 /opt/usr/home/owner/content/Documents/APL-Audio/ 2>/dev/null; " +
                      "chmod -R a+rX /opt/usr/home/owner/content/Documents/APL-Audio";
            APL.sys.exec(cmd).then(function () {
                storeSet("apl.audio.persisted", "true");
            }).catch(function () {});
        }

        // Native tizen.filesystem copy fallback:
        try {
            fs.resolve("documents", function (docDir) {
                var targetDir = null;
                try { targetDir = docDir.createDirectory(DIR_NAME); } catch (e) {
                    try { targetDir = docDir.resolve(DIR_NAME); } catch (e2) {}
                }
                ["alkahf.mp3", "takbeerat-eid.mp3"].forEach(function (name) {
                    fs.resolve("wgt-package/audio/" + name, function (srcFile) {
                        var destPath = "documents/" + DIR_NAME + "/" + name;
                        fs.resolve(destPath, function () {
                            // File already exists in Documents: do not duplicate!
                            storeSet("apl.audio.persisted", "true");
                        }, function () {
                            // File not yet in Documents: copy safely without overwriting!
                            try {
                                srcFile.copyTo(destPath, false, function () {
                                    storeSet("apl.audio.persisted", "true");
                                }, function () {});
                            } catch (eCopy) {}
                        }, "r");
                    }, function () {}, "r");
                });
            }, function () {}, "rw");
        } catch (eFs) {}
    }

    setTimeout(persistAudioFiles, 3500);
})(window);
