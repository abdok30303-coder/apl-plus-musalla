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
            If anything fails nothing is replaced, and the message names the exact step that failed and why
            (v8.7.34: 1 Vetro, 2 launcher folder, 3 tools on the TV, 4 download, 5 file check, 6 unpack, 7 copy),
            then shows the file to install from a USB drive / Apps2Samsung.
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

    /* ---------------- v8.7.34: every step reports its own name and reason ----------------
       Steps: 1 Vetro (root command) | 2 the launcher folder | 3 tools on the TV (downloader, unzip) |
              4 download | 5 check of the file | 6 unpack | 7 copy into the launcher folder.
       Rules for the commands we send through Vetro: no backslashes (Vetro doubles them), no single quotes
       inside the background script, and one single line (no heredoc). */
    var STORE = "apl.upd.report";
    var CANDIDATES = ["/opt/usr/apps/APLMusalla/res/wgt"];
    var info = null;   /* what the TV told us before the install */

    function saveReport(text) {
        try { global.localStorage.setItem(STORE, new Date().toISOString().slice(0, 16).replace("T", " ") + "  " + text); } catch (e) {}
    }
    function lastReport() { try { return global.localStorage.getItem(STORE) || ""; } catch (e) { return ""; } }

    function kv(out) {
        var o = {}, m, re = /^([A-Za-z_0-9]+)=(.*)$/gm;
        while ((m = re.exec(String(out || "")))) o[m[1]] = m[2].replace(/\s+$/, "");
        return o;
    }
    function has(o, t) { return !!(o["T_" + t] && o["T_" + t] !== "-"); }

    /* One short command: who we are, which tools exist, which folder is the launcher, can we write there, can curl reach GitHub. */
    function preflightCmd() {
        var c = ["echo UID=$(id -u)"];
        c.push("for t in curl wget busybox unzip bsdtar python3 sha256sum nohup; do echo T_$t=$(command -v $t || echo -); done");
        c.push("W=; for p in " + [www()].concat(CANDIDATES).join(" ") + "; do [ -s $p/js/app.bundle.js ] && W=$p && break; done; echo W=$W");
        c.push("if [ -n \"$W\" ]; then touch $W/.apl-w 2>/dev/null && echo WRITABLE=1 || echo WRITABLE=0; rm -f $W/.apl-w 2>/dev/null; fi");
        c.push("D=/opt/usr/home/owner/APL/upd; mkdir -p $D 2>/dev/null; touch $D/.t 2>/dev/null && echo DIR=$D || echo DIR=/tmp/apl-upd; rm -f $D/.t 2>/dev/null");
        c.push("echo FREE_KB=$(df -k /opt/usr/home/owner 2>/dev/null | tail -n 1 | tr -s ' ' | cut -d ' ' -f4)");
        c.push("echo CURLV=$(curl -V 2>/dev/null | head -n 1)");
        c.push("command -v curl >/dev/null 2>&1 && { N=$(curl -s -m 15 -o /dev/null -w %{http_code} https://raw.githubusercontent.com/ 2>&1); echo NETCURL=$N/$?; }");
        c.push("true");
        return c.join("; ");
    }

    function script(v, o, hash) {
        var T = o.DIR, W = o.W;
        var s = [
            "T=" + T, "W=" + W, "V=" + v, "U=" + wgtUrl(v), "H=" + (hash || "-"), "S=$T/status", "L=$T/log",
            "f() { echo FAIL:$1:$2 > $S; exit 0; }",
            "sz() { wc -c < $T/u.wgt 2>/dev/null || echo 0; }",
            "big() { [ $(sz) -gt 1000000 ]; }",
            "rm -rf $T/x $T/u.wgt $L; mkdir -p $T/x || f prepare cannot-create-$T",
            "echo DOWNLOAD > $S",
            "ok=0; INS=0; CE=none; WE=none; BE=none; KE=none",
            "if command -v curl >/dev/null 2>&1; then curl -fsSL --connect-timeout 25 -m 900 -o $T/u.wgt $U >>$L 2>&1; CE=$?; [ $CE = 0 ] && big && ok=1; fi",
            "if [ $ok = 0 ] && command -v wget >/dev/null 2>&1; then wget -q -O $T/u.wgt $U >>$L 2>&1; WE=$?; [ $WE = 0 ] && big && ok=1; fi",
            "if [ $ok = 0 ] && command -v busybox >/dev/null 2>&1; then busybox wget -q -O $T/u.wgt $U >>$L 2>&1; BE=$?; [ $BE = 0 ] && big && ok=1; fi",
            "if [ $ok = 0 ] && [ $H != - ] && command -v curl >/dev/null 2>&1; then curl -fsSLk --connect-timeout 25 -m 900 -o $T/u.wgt $U >>$L 2>&1; KE=$?; [ $KE = 0 ] && big && ok=1 && INS=1; fi",
            "[ $ok = 1 ] || f download curl=$CE,wget=$WE,busybox=$BE,curl-k=$KE,bytes=$(sz)",
            "echo CHECK > $S",
            "if [ $H != - ]; then if command -v sha256sum >/dev/null 2>&1; then A=$(sha256sum $T/u.wgt); A=${A%% *}; [ $A = $H ] || f hash got-$A; else [ $INS = 0 ] || f hash no-sha256sum; fi; fi",
            "echo UNPACK > $S",
            "X=0",
            "if command -v unzip >/dev/null 2>&1; then unzip -oq $T/u.wgt -d $T/x >>$L 2>&1 && X=1; fi",
            "[ $X = 1 ] || { busybox unzip -oq $T/u.wgt -d $T/x >>$L 2>&1 && X=1; }",
            "[ $X = 1 ] || { bsdtar -xf $T/u.wgt -C $T/x >>$L 2>&1 && X=1; }",
            "[ $X = 1 ] || { python3 -c \"import sys,zipfile; zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])\" $T/u.wgt $T/x >>$L 2>&1 && X=1; }",
            "[ $X = 1 ] || f unpack all-unpackers-failed-or-file-damaged",
            "rm -f $T/u.wgt",
            "echo VERIFY > $S",
            "[ -s $T/x/index.html ] && [ -s $T/x/js/boot.js ] && [ -s $T/x/js/app.bundle.js ] || f verify files-missing-in-package",
            "grep -q $V $T/x/js/build.js || f verify wrong-version-in-package",
            "echo WRITE > $S",
            "touch $W/.apl-w 2>>$L || mount -o remount,rw $W >>$L 2>&1",
            "touch $W/.apl-w 2>>$L || f writable uid-$(id -u)",
            "rm -f $W/.apl-w",
            "echo COPY > $S",
            "rm -f $T/x/config.xml $T/x/author-signature.xml $T/x/signature1.xml",
            "cp -a $T/x/. $W/ >>$L 2>&1 || f copy $(df -k $W | tail -n 1)",
            "chmod -R a+rX $W 2>/dev/null",
            "sync",
            "grep -q $V $W/js/build.js || f copy installed-files-do-not-show-new-version",
            "echo OK > $S",
            "rm -rf $T/x"
        ];
        return s.join("; ");
    }

    function curlWhy(n) {
        var m = { 6: ["ما قدرش يحل اسم github (DNS)", "could not resolve github.com (DNS)"],
                  7: ["ما قدرش يتصل بـ github", "could not connect to github.com"],
                  22: ["GitHub رد بخطأ (الملف مش موجود؟)", "GitHub answered with an error (file not found?)"],
                  23: ["خطأ كتابة على التلفزيون (مساحة؟)", "write error on the TV (disk space?)"],
                  28: ["انتهت المهلة (النت بطيء)", "timed out (slow Internet)"],
                  35: ["اتصال آمن (TLS) مرفوض", "secure (TLS) connection refused"],
                  51: ["شهادة الموقع مرفوضة", "certificate refused"], 58: ["شهادة مرفوضة", "certificate refused"],
                  60: ["شهادة github مش معروفة للتلفزيون", "the TV does not trust GitHub's certificate"],
                  77: ["ملف الشهادات مفقود على التلفزيون", "the TV's certificate file is missing"],
                  56: ["انقطع الاتصال أثناء التحميل", "connection dropped while downloading"] };
        return m[n] ? tr(m[n][0], m[n][1]) : "";
    }

    /* step: [number, Arabic name, English name]; reason: text; extra: technical detail */
    var STEPS = {
        vetro: [1, "Vetro (أوامر الروت)", "Vetro (root commands)"],
        folder: [2, "مكان اللانشر", "the launcher folder"],
        tools: [3, "أدوات التلفزيون", "tools on the TV"],
        prepare: [4, "تجهيز مكان التحميل", "preparing the download folder"],
        download: [4, "التحميل", "download"],
        hash: [5, "فحص الملف", "checking the file"],
        verify: [5, "فحص الملف", "checking the file"],
        unpack: [6, "فك الضغط", "unpacking"],
        writable: [7, "الكتابة في مجلد اللانشر", "writing to the launcher folder"],
        copy: [7, "نسخ الملفات", "copying the files"]
    };
    function fail(step, reason, extra, v) {
        busy = false;
        var st = STEPS[step] || [0, step, step];
        var head = tr("فشل في الخطوة " + st[0] + ": " + st[1], "Failed at step " + st[0] + ": " + st[2]);
        var msg = head + "\n" + tr("السبب: ", "Reason: ") + reason + (extra ? "\n(" + extra + ")" : "");
        saveReport(head + " | " + reason + (extra ? " | " + extra : ""));
        toast(head, false);
        try {
            APL.alert({
                title: tr("التثبيت من اللانشر ماتمّش", "Install did not finish"),
                message: msg + "\n\n" + tr("ثبّت الملف ده من فلاشة أو Apps2Samsung:\n", "Install this file from a USB drive or Apps2Samsung:\n") + wgtUrl(v),
                buttons: [{ label: tr("تمام", "OK") }]
            });
        } catch (e) {}
    }
    function explain(code, detail) {
        var d = String(detail || ""), m;
        if (code === "download") {
            m = /curl=(\d+)/.exec(d);
            var n = m ? parseInt(m[1], 10) : -1, why = curlWhy(n);
            if (/curl=none/.test(d) && /wget=none/.test(d) && /busybox=none/.test(d)) why = tr("مفيش curl ولا wget على التلفزيون", "the TV has no curl or wget");
            return { r: why || tr("التحميل ماكملش", "the download did not complete"), x: d };
        }
        if (code === "hash") return { r: /no-sha256sum/.test(d) ? tr("التلفزيون مش بيقدر يتحقق من سلامة الملف", "the TV cannot verify the file") : tr("الملف المحمّل مش مطابق للأصلي", "the downloaded file does not match the original"), x: d };
        if (code === "verify") return { r: tr("الملف المحمّل مش نسخة صالحة من اللانشر", "the downloaded file is not a valid launcher package"), x: d };
        if (code === "unpack") return { r: tr("فك الضغط فشل (مفيش unzip شغال أو الملف تالف)", "unpacking failed (no working unzip, or the file is damaged)"), x: d };
        if (code === "writable") return { r: tr("مجلد اللانشر مقفول للكتابة", "the launcher folder is read-only"), x: d };
        if (code === "copy") return { r: tr("نسخ الملفات فشل (مساحة أو صلاحيات). لو اللانشر ماشتغلش، النسخة الاحتياطية بترجّعه.", "copying failed (space or permissions). If the launcher does not start, the safety copy restores it."), x: d };
        if (code === "prepare") return { r: tr("ماقدرتش أجهز مكان التحميل", "could not create the download folder"), x: d };
        return { r: tr("سبب غير معروف", "unknown reason"), x: d };
    }

    function poll(v, tries, o) {
        var sys = APL.sys, T = o.DIR;
        sys.exec("cat " + T + "/status 2>/dev/null; echo; tail -c 300 " + T + "/log 2>/dev/null; true").then(function (r) {
            var raw = String((r && r.output) || ""), s = raw.split(/\r?\n/)[0].replace(/\s+/g, "");
            if (s === "OK") {
                busy = false;
                saveReport("OK " + v);
                toast(tr("اتثبّتت النسخة " + v + ". بعيد التشغيل...", "Version " + v + " installed. Restarting..."), true);
                global.setTimeout(function () { try { global.location.reload(); } catch (e) {} }, 2200);
            } else if (/^FAIL:/.test(s)) {
                var p = s.split(":"), e = explain(p[1], p.slice(2).join(":"));
                var tail = raw.split(/\r?\n/).slice(1).join(" ").replace(/\s+/g, " ").trim().slice(-160);
                fail(p[1], e.r, e.x + (tail ? " | " + tail : ""), v);
            } else if (tries <= 0) {
                fail("download", tr("الخطوة " + (s || "؟") + " أخدت وقت طويل جداً", "step " + (s || "?") + " took too long"), "status=" + s, v);
            } else {
                if (s === "DOWNLOAD" && tries % 15 === 0) toast(tr("بنزّل النسخة " + v + "...", "Downloading version " + v + "..."), true);
                global.setTimeout(function () { poll(v, tries - 1, o); }, 4000);
            }
        }, function (e) {
            if (tries <= 0) fail("vetro", tr("Vetro وقف يرد أثناء التثبيت", "Vetro stopped answering during the install"), String(e && e.message || e), v);
            else global.setTimeout(function () { poll(v, tries - 1, o); }, 4000);
        });
    }

    function doInstall(v, hash) {
        var sys = APL.sys;
        if (!sys || typeof sys.exec !== "function") { fail("vetro", tr("اللانشر مفيهوش وصلة لـ Vetro", "this launcher has no connection to Vetro"), "", v); return; }
        busy = true;
        toast(tr("بفحص التلفزيون قبل التحديث...", "Checking the TV before the update..."), true);
        sys.exec(preflightCmd()).then(function (r) {
            var o = kv(r && r.output), why;
            info = o;
            var det = "uid=" + (o.UID || "?") + " dir=" + (o.W || "-") + " curl=" + (has(o, "curl") ? "y" : "n") + " wget=" + ((has(o, "wget") || has(o, "busybox")) ? "y" : "n") +
                      " unzip=" + ((has(o, "unzip") || has(o, "busybox") || has(o, "bsdtar") || has(o, "python3")) ? "y" : "n") + " net=" + (o.NETCURL || "-") + " free=" + (o.FREE_KB || "?") + "KB";
            if (!o.UID) { fail("vetro", tr("Vetro رد بس مش بيشغّل الأوامر", "Vetro answered but did not run the command"), String((r && r.output) || "").slice(0, 80), v); return; }
            if (!o.W) { fail("folder", tr("ماقدرتش ألاقي مجلد اللانشر على التلفزيون", "could not find the launcher folder on the TV"), "page=" + ((global.location && global.location.pathname) || "?"), v); return; }
            if (!has(o, "curl") && !has(o, "wget") && !has(o, "busybox")) { fail("tools", tr("مفيش curl ولا wget على التلفزيون", "the TV has no curl or wget"), det, v); return; }
            if (!has(o, "unzip") && !has(o, "busybox") && !has(o, "bsdtar") && !has(o, "python3")) { fail("tools", tr("مفيش أداة فك ضغط (unzip) على التلفزيون", "the TV has no unzip tool"), det, v); return; }
            if (o.WRITABLE === "0") { fail("writable", tr("مجلد اللانشر مقفول للكتابة", "the launcher folder is read-only"), det, v); return; }
            var cmd = "mkdir -p " + o.DIR + "; rm -f " + o.DIR + "/status; N=; command -v nohup >/dev/null 2>&1 && N=nohup; " +
                      "$N sh -c '" + script(v, o, hash) + "' </dev/null >" + o.DIR + "/log2 2>&1 & sleep 1; echo STARTED";
            return sys.exec(cmd).then(function () {
                toast(tr("بدأ التحديث...", "Update started..."), true);
                global.setTimeout(function () { poll(v, 200, o); }, 3000);
            }, function (e) { fail("vetro", tr("Vetro مارضيش يشغّل التحديث", "Vetro would not start the update"), String(e && e.message || e), v); });
        }, function (e) {
            fail("vetro", tr("Vetro مش بيرد (افتح Vetro مرة على الشاشة)", "Vetro is not answering (open Vetro once on the screen)"), String(e && e.message || e), v);
        });
    }

    function getText(url) {
        return new Promise(function (resolve, reject) {
            try {
                var x = new XMLHttpRequest();
                x.open("GET", url + "?t=" + Date.now(), true);
                x.timeout = 15000;
                x.onload = function () { x.status === 200 ? resolve(String(x.responseText || "")) : reject(new Error("HTTP " + x.status)); };
                x.onerror = x.ontimeout = function () { reject(new Error("network")); };
                x.send();
            } catch (e) { reject(e); }
        });
    }
    /* The package's SHA-256 is published beside it (releases/<file>.sha256) and read over the launcher's own HTTPS. */
    function getHash(v) {
        return getText(wgtUrl(v) + ".sha256").then(function (t) {
            var m = /\b([0-9a-fA-F]{64})\b/.exec(t);
            return m ? m[1].toLowerCase() : "-";
        }, function () { return "-"; });
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
                    buttons: [{ label: tr("نزّل وثبّت", "Download and install"), run: function () { getHash(r.version).then(function (h) { doInstall(r.version, h); }); } }, { label: tr("مش دلوقتي", "Not now") }]
                });
            } catch (e) { getHash(r.version).then(function (h) { doInstall(r.version, h); }); }
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
        report: lastReport,
        custom: true
    };
})(window);
