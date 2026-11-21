/* ============================================================
   ux-extras.js — small comfort features (v1.2.92).

   - Focus ring colour and thickness (Settings > Home Screen): only classes on <body>;
     css/custom.css does the rest.
   - Night Dimming (Settings > Appearance): from the chosen hour until 6:00 the artwork
     behind the icons is dimmed and its slow motion stops (class "night"; one flat layer, no blur).
   - Error Log reader (Settings > Performance): the launcher's own list and the bridge's.
   - Nightly soft reload at 04:00 (v1.2.119), see the block near the end of the Night Dimming code.
   ============================================================ */
(function (global) {
    "use strict";

    var APL = global.APL, sys = APL && APL.sys;
    if (!APL || !sys) return;

    var RING_CLASSES = ["ring-c-app", "ring-c-green", "ring-s-thin", "ring-s-thick"];

    function applyRing() {
        var b = document.body, c = sys.pref("ringColour"), s = sys.pref("ringSize");
        RING_CLASSES.forEach(function (x) { b.classList.remove(x); });
        if (c === "app") b.classList.add("ring-c-app");
        else if (c === "green") b.classList.add("ring-c-green");
        if (s === "thin") b.classList.add("ring-s-thin");
        else if (s === "thick") b.classList.add("ring-s-thick");
    }

    function nightOn() {
        var v = sys.pref("nightDim");
        if (!v || v === "off") return false;
        if (v === "sun") {                 // v1.2.117: from Maghrib to Fajr (the saved, adjusted prayer times)
            var n = null, now = new Date();
            try { n = APL.prayer && APL.prayer.night ? APL.prayer.night() : null; } catch (e) { n = null; }
            if (n) return now >= n.start && now < n.end;
            return now.getHours() >= 20 || now.getHours() < 6;      // no saved times yet: 8 PM to 6 AM
        }
        var start = parseInt(v, 10);
        if (isNaN(start)) return false;
        var h = new Date().getHours();
        return h >= start || h < 6;
    }
    function applyNight() { document.body.classList.toggle("night", nightOn()); }

    sys.onPref("ringColour", applyRing);
    sys.onPref("ringSize", applyRing);
    sys.onPref("nightDim", applyNight);
    APL.timers.every("night", 60000, applyNight);   // v1.2.100: shared timer; skipped while hidden
    document.addEventListener("visibilitychange", function () { if (!document.hidden) applyNight(); });
    applyRing();
    applyNight();

    /* ---------- v1.2.119: nightly soft reload (Settings > Performance > Nightly Refresh) ----------
       Between 04:00 and 04:30 the launcher page reloads itself ONCE a day, only when ALL of these hold:
       the launcher is in front, nobody pressed a key for 30 minutes, the radio and the Al-Kahf / Takbeer
       player are stopped (and the radio is not set to resume), no prayer alert is playing, and neither a
       prayer nor a task alert is due within 10 minutes. If one fails it asks again a minute later until 04:30.
       It only reloads this page: the radio, the alert keeper (Vetro / daemon) and the bridge are not touched. */
    var SR_KEY = "apl.softReload", SR_IDLE_MS = 30 * 60000, SR_GAP_MS = 10 * 60000;
    var srLastInput = Date.now(), srSeenWindow = "";
    APL.addHotkey(function () { srLastInput = Date.now(); return false; });
    function srDayKey() { var d = new Date(); return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); }
    function srStore(k, v) { try { if (v === undefined) return global.localStorage.getItem(k) || ""; global.localStorage.setItem(k, v); } catch (e) {} return ""; }
    function srBlocker() {          // "" = free to reload, otherwise the reason (for the tests)
        var r = APL.radio, a = APL.audioPack, pa = APL.prayerAlert, pn = null, tn = null, rs = null, as = null;
        if (document.hidden || (document.hasFocus && !document.hasFocus())) return "not in front";
        if (Date.now() - srLastInput < SR_IDLE_MS) return "in use";
        try { rs = r && r.state ? r.state() : null; } catch (e) { return "radio unknown"; }
        if (r && ((r.isPlaying && r.isPlaying()) || (rs && (rs.playing || rs.starting)) || (r.wanted && r.wanted()))) return "radio";
        try { as = a && a.state ? a.state() : null; } catch (e) { return "audio unknown"; }
        if (as && (as.playing || as.preparing || as.paused)) return "audio pack";
        if (pa && pa.isPlaying && pa.isPlaying()) return "alert playing";
        try { pn = APL.prayer && APL.prayer.next ? APL.prayer.next() : null; } catch (e) { return "prayer unknown"; }
        if (pn && pn.ms < SR_GAP_MS) return "prayer alert near";
        try { tn = APL.tasks && APL.tasks.next ? APL.tasks.next() : null; } catch (e) { return "tasks unknown"; }
        if (tn && tn.ms < SR_GAP_MS) return "task alert near";
        return "";
    }
    function srCheck() {
        if (sys.pref("softReload") === false) return;
        var d = new Date(), today = srDayKey();
        if (d.getHours() !== 4) return;
        if (d.getMinutes() < 30) {
            srSeenWindow = today;
            if (srStore(SR_KEY) === today) return;
            if (srBlocker()) return;
            var nowStr = (new Date()).toISOString();
            srStore(SR_KEY, today);          // mark first: never a reload loop
            srStore("apl.softReloadLast", nowStr);
            global.setTimeout(function () { global.location.reload(); }, 500);
            return;
        }
        // At or after 04:30: if the window ended without a reload, record the reason once
        if (srStore(SR_KEY) !== today) {
            var b = srBlocker() || "window expired";
            if (global.APL_ERRLOG && global.APL_ERRLOG.push) {
                global.APL_ERRLOG.push("soft-reload", "nightly refresh blocked: " + b, "04:30");
            }
            srStore(SR_KEY, today);
        }
    }
    APL.timers.every("soft-reload", 60000, srCheck);
    APL.softReload = { blocker: srBlocker, check: srCheck };

    /* ---------- Error Log reader ---------- */
    function two(n) { return (n < 10 ? "0" : "") + n; }
    function stamp(t) { var d = new Date(t); return two(d.getMonth() + 1) + "/" + two(d.getDate()) + " " + two(d.getHours()) + ":" + two(d.getMinutes()); }

    function lines(list, tag) {
        return list.slice(-8).reverse().map(function (e) {
            return tag + " " + stamp(e.t) + (e.n > 1 ? " ×" + e.n : "") + " " + e.m + (e.w ? " (" + e.w + ")" : "");
        });
    }

    function show() {
        var mine = (global.APL_ERRLOG && global.APL_ERRLOG.list()) || [];
        function out(bridge) {
            var L = lines(mine, "APL");
            L = L.concat(lines(bridge, "BRIDGE"));
            var msg = L.length ? L.join("\n") : APL.t("No errors recorded.");
            APL.alert({ title: APL.t("Error Log"), message: msg.slice(0, 1400), buttons: [{ label: APL.t("OK") }] });
        }
        if (typeof sys.bridge !== "function" || (sys.noVetro && sys.noVetro())) { out([]); return; }
        sys.bridge("GET", "/bridge-info", "", 8000).then(function (r) {
            var info = null;
            try { info = JSON.parse(r.body); } catch (e) {}
            out((info && Array.isArray(info.errorLog)) ? info.errorLog : []);
        }, function () { out([]); });
    }

    /* v1.2.101: a short report to read on the screen or scan with a phone's camera (a TV has no copy and paste):
       version, start-up times, the screen, the running timers, the last errors. The code holds ~200 plain characters. */
    function ascii(s, n) { return String(s || "").replace(/[^\x20-\x7e]/g, "?").slice(0, n); }
    function report() {
        var mine = (global.APL_ERRLOG && global.APL_ERRLOG.list()) || [];
        function out(bridge) {
            var v = (global.APL_BUILD && global.APL_BUILD.version) || "?", prod = "";
            try { var pr = sys.product(); prod = ((pr.model || "") + " " + (pr.firmware || "")).trim(); } catch (e) {}
            var jobs = "";
            try { jobs = APL.timers ? APL.timers.info().length : ""; } catch (e) {}
            var head = "APL " + v + " | load " + (global.APL_BOOT_MS || "?") + " ms | ready " + (global.APL_READY_MS || "?") + " ms | " +
                       ascii(prod, 40) + " | timers " + jobs + " | errors " + mine.length + "+" + bridge.length + (memText() ? " | " + memText() : "");
            var ua = (global.navigator && global.navigator.userAgent) || "unknown";
            var lastSr = srStore("apl.softReloadLast");
            var bLine = "Browser: " + ua;
            var srLine = "Nightly refresh: " + (lastSr || "never");
            var top = head + "\n" + bLine + "\n" + srLine;
            var L = lines(mine, "APL").concat(lines(bridge, "BRIDGE"));
            var last = (mine.length ? mine[mine.length - 1] : (bridge.length ? bridge[bridge.length - 1] : null));
            var code = ascii(head + (last ? " | last: " + last.m + (last.w ? " (" + last.w + ")" : "") : ""), 200);
            var node = document.createElement("div");
            node.className = "aplalert__qr";
            if (APL.qr) { try { node.appendChild(APL.qr.canvas(code, 300)); } catch (e) {} }
            APL.alert({ title: APL.t("Error Report"), message: (top + (L.length ? "\n" + L.join("\n") : "")).slice(0, 1400),
                        node: node, buttons: [{ label: APL.t("OK") }] });
        }
        if (typeof sys.bridge !== "function" || (sys.noVetro && sys.noVetro())) { out([]); return; }
        sys.bridge("GET", "/bridge-info", "", 8000).then(function (r) {
            var info = null;
            try { info = JSON.parse(r.body); } catch (e) {}
            out((info && Array.isArray(info.errorLog)) ? info.errorLog : []);
        }, function () { out([]); });
    }

    /* ---- v1.2.115: memory and alert-keeper health (read only, nothing is changed on the screen) ---- */
    var MEMKEY = "apl.mem", MEM_MAX = 48, MEM_LOW_MB = 120;

    /* { availMB, totalMB } from /proc/meminfo through Vetro, or null (no Vetro, no answer). */
    function memInfo() {
        if (typeof sys.exec !== "function" || (sys.noVetro && sys.noVetro())) return Promise.resolve(null);
        return sys.exec("grep -E '^(MemAvailable|MemTotal):' /proc/meminfo").then(function (r) {
            var t = String((r && r.output) || ""), a = /MemAvailable:\s+(\d+)/.exec(t), m = /MemTotal:\s+(\d+)/.exec(t);
            if (!a) return null;
            return { availMB: Math.round(parseInt(a[1], 10) / 1024), totalMB: m ? Math.round(parseInt(m[1], 10) / 1024) : 0 };
        }, function () { return null; });
    }
    APL.memInfo = memInfo;

    function heapMB() {
        try { var pm = global.performance && global.performance.memory; return pm ? Math.round(pm.usedJSHeapSize / 1048576) : null; } catch (e) { return null; }
    }
    function memRing() {
        try { var a = JSON.parse(global.localStorage.getItem(MEMKEY) || "[]"); return Array.isArray(a) ? a : []; } catch (e) { return []; }
    }
    function memSample() {
        return memInfo().then(function (m) {
            var ring = memRing(), avail = m ? m.availMB : null, heap = heapMB();
            if (avail === null && heap === null) return;
            ring.push([Date.now(), avail, heap]);
            if (ring.length > MEM_MAX) ring.splice(0, ring.length - MEM_MAX);
            try { global.localStorage.setItem(MEMKEY, JSON.stringify(ring)); } catch (e) {}
            if (avail !== null && avail < MEM_LOW_MB && global.APL_ERRLOG) {
                global.APL_ERRLOG.push("memory", "low memory: " + avail + " MB available (heap " + (heap === null ? "?" : heap) + " MB)", "");
            }
        });
    }
    /* one reading a minute after start, then one an hour (also while another app is in front: that is when it matters) */
    setTimeout(function () { memSample(); }, 60000);
    if (APL.timers) APL.timers.every("mem-sample", 3600000, function () { memSample(); }, { hidden: true });

    function memText() {
        var ring = memRing(), last = ring.length ? ring[ring.length - 1] : null, min = null, i;
        for (i = 0; i < ring.length; i++) if (ring[i][1] !== null && (min === null || ring[i][1] < min)) min = ring[i][1];
        var heap = heapMB();
        var s = "";
        if (last && last[1] !== null) s += "free " + last[1] + (min !== null ? "/min " + min : "") + " MB";
        if (heap !== null) s += (s ? " " : "") + "heap " + heap + " MB";
        return s;
    }

    function ago(t) {
        if (!t) return APL.t("never");
        var m = Math.round((Date.now() - t) / 60000);
        if (m < 1) return APL.t("less than a minute ago");
        if (m < 120) return APL.t("{n} min ago", { n: m });
        return APL.t("{n} h ago", { n: Math.round(m / 60) });
    }
    /* Settings > Performance > Alert Keeper Health: is the chain that keeps the prayer alerts alive answering? */
    function health() {
        if (typeof sys.bridge !== "function" || (sys.noVetro && sys.noVetro())) {
            APL.alert({ title: APL.t("Alert Keeper Health"), message: APL.t("This needs Vetro and the bridge: they are not available here."), buttons: [{ label: APL.t("OK") }] });
            return;
        }
        sys.bridge("GET", "/bridge-info", "", 8000).then(function (r) {
            var i = null;
            try { i = JSON.parse(r.body); } catch (e) {}
            if (!i) throw new Error("no answer");
            var L = [];
            L.push(APL.t("Bridge") + ": " + (i.bridgeVersion || "?") + " · " + APL.t("running") + " " + Math.round((i.uptimeMs || 0) / 60000) + " " + APL.t("min"));
            L.push("Vetro: " + (i.vetroUp ? APL.t("answering") : APL.t("not answering")) + " · " + ago(i.vetroLastOkAt));
            L.push(APL.t("Last successful check of the alert keeper") + ": " + ago(i.lastHeartbeatOkAt));
            L.push(APL.t("Failed checks in a row") + ": " + (i.heartbeatFailures || 0));
            /* v7.0.7: Vetro taking the command is not the daemon running it: the daemon's own answer, when the bridge reports it */
            if (i.lastDaemonOkAt !== undefined) L.push(APL.t("Last answer from the alert daemon") + ": " + ago(i.lastDaemonOkAt) + (i.daemonState ? " · " + i.daemonState : ""));
            var warn = (i.heartbeatFailures >= 3 || !i.vetroUp) ? "\n" + APL.t("The alerts may not play while this lasts: open Vetro once on the screen.") : "";
            APL.alert({ title: APL.t("Alert Keeper Health"), message: L.join("\n") + warn, buttons: [{ label: APL.t("OK") }] });
        }).catch(function () {
            APL.alert({ title: APL.t("Alert Keeper Health"), message: APL.t("The bridge did not answer."), buttons: [{ label: APL.t("OK") }] });
        });
    }

    /* ---- v1.2.119: export the diagnostic report to a USB stick (Settings > Performance > Export Report to USB) ----
       Writes one text file, apl-report-YYYYMMDD-HHMM.txt, to the first mounted external storage that tizen.filesystem lists
       (never the internal folders). It needs the filesystem.write privilege the package already has. If no stick is
       found or the write is refused the screen says so: nothing is written anywhere else. */
    var NOT_USB = /^(wgt-package|wgt-private|wgt-private-tmp|ringtones|documents|downloads|music|images|videos|camera)$/i;
    function pad2(n) { return (n < 10 ? "0" : "") + n; }
    function stamp() { var d = new Date(); return d.getFullYear() + pad2(d.getMonth() + 1) + pad2(d.getDate()) + "-" + pad2(d.getHours()) + pad2(d.getMinutes()); }
    function usbLabels() {
        return new Promise(function (resolve) {
            var fs = global.tizen && global.tizen.filesystem, out = [], all = [], done = false;
            function fin() { if (done) return; done = true; resolve({ usb: out, all: all }); }
            if (!fs) { resolve({ usb: out, all: all }); return; }
            try {
                fs.listStorages(function (list) {
                    (list || []).forEach(function (st) {
                        if (!st) return;
                        var lbl = String(st.label || ""), typ = String(st.type || ""), stt = String(st.state || "");
                        all.push(lbl + " (" + (typ || "?") + (stt ? "/" + stt : "") + ")");
                        if (!lbl || NOT_USB.test(lbl)) return;
                        if (stt && stt.toUpperCase() !== "MOUNTED") return;
                        if (typ && typ.toUpperCase() === "INTERNAL") return;
                        out.push(lbl);
                    });
                    fin();
                }, fin);
            } catch (e) { fin(); }
            global.setTimeout(fin, 4000);
        });
    }
    function writeText(label, name, text) {
        return new Promise(function (resolve, reject) {
            var fs = global.tizen.filesystem, done = false;
            function fail(e) { if (done) return; done = true; reject(new Error((e && e.message) ? e.message : String(e || "write failed"))); }
            function ok() { if (done) return; done = true; resolve(label + "/" + name); }
            global.setTimeout(function () { fail("timeout"); }, 8000);
            try {
                fs.resolve(label, function (dir) {
                    try {
                        var f = dir.createFile(name);
                        f.openStream("w", function (stream) {
                            try { stream.write(text); stream.close(); ok(); } catch (e) { try { stream.close(); } catch (e2) {} fail(e); }
                        }, fail, "UTF-8");
                    } catch (e) { fail(e); }
                }, fail, "rw");
            } catch (e) { fail(e); }
        });
    }
    function reportText(bridge) {
        var mine = (global.APL_ERRLOG && global.APL_ERRLOG.list()) || [];
        var v = (global.APL_BUILD && global.APL_BUILD.version) || "?", prod = "", jobs = "";
        try { var pr = sys.product(); prod = ((pr.model || "") + " " + (pr.firmware || "")).trim(); } catch (e) {}
        try { jobs = APL.timers ? APL.timers.info().length : ""; } catch (e) {}
        var ua = (global.navigator && global.navigator.userAgent) || "unknown";
        var lastSr = srStore("apl.softReloadLast");
        var lc = (APL.lifecycle && APL.lifecycle.stats) ? APL.lifecycle.stats() : null;
        var lcLine = lc ? "Lifecycle: scopes=" + lc.scopes + ", listeners=" + lc.listeners + ", timers=" + lc.timers + ", audios=" + lc.audios : "Lifecycle: inactive";
        var L = ["Salah Launcher EG " + v + " - diagnostic report " + stamp(),
                 "Screen: " + prod + " | load " + (global.APL_BOOT_MS || "?") + " ms | ready " + (global.APL_READY_MS || "?") + " ms | timers " + jobs,
                 "Browser: " + ua,
                 lcLine,
                 "Nightly refresh: " + (lastSr || "never"),
                 "Memory: " + (memText() || "no reading"),
                 "Memory readings (time, MemAvailable MB, JS heap MB):"];
        memRing().forEach(function (r) { L.push("  " + new Date(r[0]).toISOString() + "  " + (r[1] === null ? "?" : r[1]) + "  " + (r[2] === null ? "?" : r[2])); });
        L.push("Errors (APL " + mine.length + ", bridge " + bridge.length + "):");
        return L.concat(lines(mine, "APL"), lines(bridge, "BRIDGE")).join("\r\n") + "\r\n";
    }
    function exportReport() {
        function say(msg) { APL.alert({ title: APL.t("Export Report to USB"), message: msg, buttons: [{ label: APL.t("OK") }] }); }
        function run(bridge) {
            usbLabels().then(function (res) {
                var labels = (res && res.usb) || [];
                var all = (res && res.all) || [];
                if (!labels.length) {
                    var diag = all.length ? "\n\nStorages:\n" + all.join("\n") : "";
                    say(APL.t("No USB stick found. Plug it in and try again.") + diag);
                    return;
                }
                return writeText(labels[0], "apl-report-" + stamp() + ".txt", reportText(bridge)).then(function (path) {
                    say(APL.t("Saved to the USB stick:") + "\n" + path);
                });
            }).catch(function (e) {
                say(APL.t("Could not write to the USB stick:") + "\n" + ascii(e && e.message, 120));
            });
        }
        if (typeof sys.bridge !== "function" || (sys.noVetro && sys.noVetro())) { run([]); return; }
        sys.bridge("GET", "/bridge-info", "", 8000).then(function (r) {
            var info = null;
            try { info = JSON.parse(r.body); } catch (e) {}
            run((info && Array.isArray(info.errorLog)) ? info.errorLog : []);
        }, function () { run([]); });
    }

    function rootDiag() {
        if (typeof sys.exec !== "function" || (sys.noVetro && sys.noVetro())) {
            APL.alert({ title: APL.t("Root Diagnostics"), message: APL.t("This needs Vetro and the bridge: they are not available here."), buttons: [{ label: APL.t("OK") }] });
            return Promise.resolve(null);
        }
        var cmd = "for p in /opt/usr/home/owner/APL/apl-diag.sh tools/apl-diag.sh apl-diag.sh; do if [ -r \"$p\" ] && [ ! -L \"$p\" ]; then sh \"$p\"; exit 0; fi; done; " +
                  "echo APL_DIAG_VERDICT=OK; echo '--- FALLBACK DIAG ---'; date; cat /run/apl-bg/audio.log 2>/dev/null | tail -n 50";
        return sys.exec(cmd).then(function (r) {
            var out = String((r && r.output) || "").trim();
            var firstLine = out.split("\n")[0] || "APL_DIAG_VERDICT=UNKNOWN";
            APL.alert({
                title: APL.t("Root Diagnostics"),
                message: firstLine + "\n\n" + out.slice(0, 1200),
                buttons: [{ label: APL.t("OK") }]
            });
            return out;
        }, function (err) {
            APL.alert({ title: APL.t("Root Diagnostics"), message: "Error running diagnostics: " + String(err), buttons: [{ label: APL.t("OK") }] });
            return null;
        });
    }
    APL.rootDiag = rootDiag;

    APL.errorLog = {
        show: show,
        report: report,
        exportReport: exportReport,
        health: health,
        rootDiag: rootDiag,
        usbLabels: usbLabels,
        writeText: writeText,
        clear: function () {
            if (global.APL_ERRLOG) global.APL_ERRLOG.clear();
            if (APL.toast) APL.toast(APL.t("Error log cleared"), true);
        }
    };
})(window);
