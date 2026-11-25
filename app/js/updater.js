/* ============================================================
   updater.js - Salah Launcher updates from OUR GitHub repository (v8.7.31).

   Source of truth: https://github.com/abdok30303-coder/apl-plus-musalla
     - the newest version number is read from app/version.json on the main branch
     - the package is releases/salah-launcher-v<version>.wgt in the same repository
   Nothing is ever taken from the original APL Launcher project.

   Check:   reads version.json (no download of the package).
   Install: asks, then (through Vetro root exec, the same way safe-restore.js works) downloads the .wgt
            to /tmp, tests it, unpacks it, checks it holds this launcher's index.html and the new version,
            and only then copies the files over the installed ones and restarts the launcher.
            If anything fails nothing is replaced. If the TV has no curl/wget/unzip, or the package folder
            is read-only, it says so and shows the file to install from a USB drive / Apps2Samsung instead.
   Never touches: the saved settings (localStorage), audio files, radio.
   ============================================================ */
(function (global) {
    "use strict";

    var APL = global.APL || (global.APL = {});
    var U = global.APL_UPDATE || { installed: "0", running: "0", fromBundle: false };
    var REPO = "abdok30303-coder/apl-plus-musalla";
    var RAW = "https://raw.githubusercontent.com/" + REPO + "/main/";
    var DIR = "/tmp/apl-upd";
    var latest = null, busy = false, lastCheck = 0;

    function ar() { return APL.lang === "ar"; }
    function tr(a, e) { return ar() ? a : e; }
    function toast(m, ok) { try { if (APL.toast) APL.toast(m, ok); } catch (e) {} }
    function cmp(a, b) {
        var x = String(a || "0").split("."), y = String(b || "0").split("."), i, d;
        for (i = 0; i < 4; i++) { d = (parseInt(x[i], 10) || 0) - (parseInt(y[i], 10) || 0); if (d) return d > 0 ? 1 : -1; }
        return 0;
    }
    function wgtUrl(v) { return RAW + "releases/salah-launcher-v" + v + ".wgt"; }
    function www() {
        var p = (global.location && global.location.pathname) || "";
        var d = p.replace(/\/[^\/]*$/, "");
        return /^\/[\w\-\.\/]+$/.test(d) ? d : "";
    }
    function getJson(url) {
        return new Promise(function (resolve, reject) {
            try {
                var x = new XMLHttpRequest();
                x.open("GET", url + "?t=" + Date.now(), true);
                x.timeout = 20000;
                x.onload = function () {
                    if (x.status !== 200) { reject(new Error("HTTP " + x.status)); return; }
                    try { resolve(JSON.parse(x.responseText)); } catch (e) { reject(e); }
                };
                x.onerror = x.ontimeout = function () { reject(new Error("network")); };
                x.send();
            } catch (e) { reject(e); }
        });
    }

    /* Reads the newest version from GitHub. Resolves { ok, newer, version, running, message }. */
    function check(loud) {
        lastCheck = Date.now();
        return getJson(RAW + "app/version.json").then(function (j) {
            var v = String((j && j.version) || "");
            if (!/^\d+(\.\d+){1,3}$/.test(v)) throw new Error("version");
            latest = { version: v, notes: String((j && j.notes) || "") };
            var newer = cmp(v, U.running) > 0;
            if (loud) toast(newer ? tr("فيه نسخة جديدة: " + v + " (الحالية " + U.running + ")", "New version available: " + v + " (running " + U.running + ")")
                                  : tr("اللانشر محدّث (" + U.running + ")", "Up to date (" + U.running + ")"), !newer);
            return { ok: true, newer: newer, version: v, running: U.running };
        }, function (e) {
            if (loud) toast(tr("ماقدرتش أوصل لـ GitHub: اتأكد من النت", "Could not reach GitHub: check the Internet"), false);
            return { ok: false, newer: false, version: U.running, message: String(e && e.message || e) };
        });
    }

    function script(v) {
        var W = www();
        return [
            "T=" + DIR + "; W='" + W + "'; V=" + v + "; U='" + wgtUrl(v) + "'; S=$T/status",
            "echo RUN > $S",
            "rm -rf $T/x $T/u.wgt; mkdir -p $T/x",
            "echo DOWNLOAD > $S",
            "{ curl -fsSL -m 900 -o $T/u.wgt \"$U\" || wget -q -O $T/u.wgt \"$U\" || busybox wget -q -O $T/u.wgt \"$U\"; } >/dev/null 2>&1",
            "SZ=$(wc -c < $T/u.wgt 2>/dev/null || echo 0); [ \"${SZ:-0}\" -gt 1000000 ] || { echo FAIL_DOWNLOAD > $S; exit 0; }",
            "echo UNPACK > $S",
            "{ unzip -oq $T/u.wgt -d $T/x || busybox unzip -oq $T/u.wgt -d $T/x; } >/dev/null 2>&1",
            "[ -s $T/x/index.html ] && [ -s $T/x/js/boot.js ] && grep -q \"\\\"version\\\": \\\"$V\\\"\" $T/x/js/build.js || { echo FAIL_PACKAGE > $S; exit 0; }",
            "[ -w \"$W\" ] || { echo FAIL_READONLY > $S; exit 0; }",
            "echo COPY > $S",
            "rm -f $T/x/config.xml $T/x/author-signature.xml $T/x/signature1.xml",
            "cp -a $T/x/. \"$W\"/ && sync && echo OK > $S || echo FAIL_COPY > $S",
            "rm -rf $T/x $T/u.wgt"
        ].join("\n");
    }

    function failText(code) {
        var m = {
            FAIL_DOWNLOAD: tr("التحميل فشل (النت أو التلفزيون مفيهوش curl/wget).", "Download failed (Internet, or the TV has no curl/wget)."),
            FAIL_PACKAGE: tr("الملف اتحمّل بس مش نسخة صالحة (أو مفيش unzip على التلفزيون).", "The file downloaded but is not a valid package (or the TV has no unzip)."),
            FAIL_READONLY: tr("مجلد اللانشر مقفول للكتابة.", "The launcher folder is read-only."),
            FAIL_COPY: tr("نسخ الملفات فشل. اللانشر ممكن يحتاج إعادة تثبيت.", "Copying the files failed. The launcher may need a reinstall.")
        };
        return m[code] || tr("التثبيت فشل.", "Install failed.");
    }
    function manual(v) {
        try {
            APL.alert({
                title: tr("التثبيت اليدوي", "Manual install"),
                message: tr("ثبّت الملف ده من فلاشة أو Apps2Samsung:\n", "Install this file from a USB drive or Apps2Samsung:\n") + wgtUrl(v),
                buttons: [{ label: tr("تمام", "OK") }]
            });
        } catch (e) {}
    }

    function poll(v, tries) {
        var sys = APL.sys;
        sys.exec("cat " + DIR + "/status 2>/dev/null; true").then(function (r) {
            var s = String((r && r.output) || "").replace(/\s+/g, "");
            if (s === "OK") {
                busy = false;
                toast(tr("اتثبّتت النسخة " + v + ". بعيد التشغيل...", "Version " + v + " installed. Restarting..."), true);
                global.setTimeout(function () { try { global.location.reload(); } catch (e) {} }, 2200);
            } else if (/^FAIL/.test(s)) {
                busy = false; toast(failText(s), false); manual(v);
            } else if (tries <= 0) {
                busy = false; toast(tr("التحديث أخد وقت طويل. اتأكد من النت وجرّب تاني.", "The update is taking too long. Check the Internet and try again."), false);
            } else {
                if (s === "DOWNLOAD") toast(tr("بنزّل النسخة " + v + "...", "Downloading version " + v + "..."), true);
                global.setTimeout(function () { poll(v, tries - 1); }, 4000);
            }
        }, function () {
            if (tries <= 0) { busy = false; toast(tr("Vetro مش متصل", "Vetro is not responding"), false); }
            else global.setTimeout(function () { poll(v, tries - 1); }, 4000);
        });
    }

    function doInstall(v) {
        var sys = APL.sys;
        if (!sys || typeof sys.exec !== "function" || !www()) { manual(v); return; }
        busy = true;
        var cmd = "mkdir -p " + DIR + "; cat > " + DIR + "/run.sh <<'APLEOS'\n" + script(v) + "\nAPLEOS\n" +
                  "rm -f " + DIR + "/status; nohup sh " + DIR + "/run.sh >" + DIR + "/log 2>&1 &\nsleep 1; echo STARTED";
        sys.exec(cmd).then(function () {
            toast(tr("بدأ التحديث...", "Update started..."), true);
            global.setTimeout(function () { poll(v, 120); }, 3000);
        }, function () { busy = false; toast(tr("Vetro مش متصل (افتح Vetro مرة على الشاشة)", "Vetro is not responding (open Vetro once on the screen)"), false); manual(v); });
    }

    /* Settings > Launcher Update > Install Update: checks, asks, installs. */
    function install() {
        if (busy) { toast(tr("التحديث شغال بالفعل", "An update is already running"), false); return Promise.resolve(false); }
        return check(false).then(function (r) {
            if (!r.ok) { toast(tr("ماقدرتش أوصل لـ GitHub: اتأكد من النت", "Could not reach GitHub: check the Internet"), false); return false; }
            if (!r.newer) { toast(tr("اللانشر محدّث (" + U.running + ")", "Up to date (" + U.running + ")"), true); return false; }
            try {
                APL.alert({
                    title: tr("تحديث اللانشر", "Update the launcher"),
                    message: tr("النسخة الحالية " + U.running + "، الجديدة " + r.version + ".\nهتتحمّل من GitHub وتتثبت وبعدها اللانشر يعيد التشغيل. الإعدادات بتفضل زي ما هي.",
                                "Running " + U.running + ", new " + r.version + ".\nIt downloads from GitHub, installs, then the launcher restarts. Your settings are kept."),
                    buttons: [{ label: tr("نزّل وثبّت", "Download and install"), run: function () { doInstall(r.version); } }, { label: tr("مش دلوقتي", "Not now") }]
                });
            } catch (e) { doInstall(r.version); }
            return true;
        });
    }

    function reset() { try { global.localStorage.removeItem("apl.bundle"); } catch (e) {} return Promise.resolve(false); }

    /* v8.7.33: a quiet check shortly after start-up, then at most ONE check every 24 hours (only when
       "Automatic updates" is on). The last check's time is kept in localStorage, so a TV that restarts
       often still gets one check a day, not one per start. It only tells you; it never installs by itself. */
    var CHECK_KEY = "apl.upd.lastAuto";
    function auto() {
        try { if (APL.sys && APL.sys.pref("autoUpdate") === false) return; } catch (e) {}
        var now = Date.now(), last = 0;
        try { last = parseInt(global.localStorage.getItem(CHECK_KEY), 10) || 0; } catch (e) {}
        if (now - last < 24 * 3600000) return;
        try { global.localStorage.setItem(CHECK_KEY, String(now)); } catch (e) {}
        check(false).then(function (r) {
            if (r.ok && r.newer) toast(tr("فيه نسخة جديدة من اللانشر: " + r.version + ". الإعدادات ثم الدعم ثم تحديث اللانشر.", "New launcher version " + r.version + ". Settings > Support > Launcher Update."), true);
        });
    }
    global.setTimeout(auto, 60000);
    global.setInterval(auto, 3600000);   /* an hourly look; the 24-hour stamp above decides */


    APL.updater = {
        check: check, install: install, reset: reset,
        running: function () { return U.running; },
        installed: function () { return U.installed; },
        latest: function () { return latest ? latest.version : ""; },
        fromBundle: function () { return false; },
        repo: REPO,
        custom: true
    };
})(window);
