/* ============================================================
   safe-restore.js (v3.5.0) - SAFE MODE: restore the last working version.
   - After a version has started well twice (Home Screen reached), the launcher keeps ONE copy of its own files on the TV
     (/opt/usr/home/owner/APL/last-good, made with root exec, only if there is enough free space). The copy is only replaced
     by a newer version after that newer version has proved itself, so it is always a version that worked.
   - Safe mode (3 failed start-ups, js/safe-mode.js) now also offers "go back to the last working version".
     After 5 failed start-ups in a row, if THIS version has never reached the Home Screen and a copy of another version
     exists, it goes back by itself (once per version), then reloads.
   - Settings > Performance > "آخر نسخة شغالة": see the saved version, save a copy now, or go back by hand.
   Never touches: audio files on the TV (Documents/APL-Audio), config.xml permissions of the installed package, radio,
   daemon, HDMI, audio core. It only copies this package's own web files.
   Untested on the TV (needs Vetro root exec and a writable package folder; says so on screen if not).
   ============================================================ */
(function (global) {
    "use strict";
    var APL = global.APL, sys = APL && APL.sys;
    if (!APL || !sys || typeof sys.exec !== "function") return;
    var DIR = "/opt/usr/home/owner/APL/last-good", GOOD = "apl.goodBoots", ONCE = "apl.restoredFor";
    var VER = (global.APL_BUILD && global.APL_BUILD.version) || "";

    function ls(k, v) { try { if (v === undefined) return global.localStorage.getItem(k); global.localStorage.setItem(k, v); } catch (e) {} return null; }
    function say(m) { try { APL.toast(m, true); } catch (e) {} }
    function www() {
        var p = (global.location && global.location.pathname) || "";
        var d = p.replace(/\/[^\/]*$/, "");
        return /^\/[\w\-\.\/]+$/.test(d) ? d : "";
    }
    function good() { var o = null; try { o = JSON.parse(ls(GOOD) || "null"); } catch (e) { o = null; } return (o && o.v === VER) ? (o.n || 0) : 0; }
    function setGood(n) { ls(GOOD, JSON.stringify({ v: VER, n: n })); }
    function run(cmd) { return sys.exec(cmd).then(function (r) { return String((r && r.output) || ""); }); }

    function info() {
        return run("cat " + DIR + "/.apl-ver 2>/dev/null; true").then(function (o) {
            var v = o.replace(/[^0-9.]/g, "");
            return v ? { ver: v } : null;
        }, function () { return null; });
    }
    function snapshot(manual) {
        var W = www();
        if (!W || !VER || !/^[0-9.]+$/.test(VER)) { if (manual) say("مش قادر أحدد مكان اللانشر"); return Promise.resolve(false); }
        var cmd = "W='" + W + "'; D=" + DIR + "; T=$D.tmp; " +
            "F=$(df -k /opt/usr/home/owner 2>/dev/null | awk 'NR==2{print $4}'); " +
            "[ \"${F:-0}\" -gt 60000 ] || { echo NOSPACE; exit 0; }; " +
            "rm -rf $T; mkdir -p $T && cp -a \"$W\"/. $T/ && echo " + VER + " > $T/.apl-ver || { rm -rf $T; echo FAIL; exit 0; }; " +
            "rm -rf $D.old; [ -d $D ] && mv $D $D.old; mv $T $D && rm -rf $D.old && echo OK || echo FAIL";
        return run(cmd).then(function (o) {
            var ok = /OK/.test(o);
            if (manual) say(ok ? "اتحفظت نسخة " + VER : (/NOSPACE/.test(o) ? "مفيش مساحة كفاية على التلفزيون" : "ماقدرتش أحفظ النسخة"));
            return ok;
        }, function () { if (manual) say("ماقدرتش أحفظ النسخة (Vetro مش متصل؟)"); return false; });
    }
    function restore() {
        var W = www();
        if (!W) { say("مش قادر أحدد مكان اللانشر"); return Promise.resolve(false); }
        var cmd = "W='" + W + "'; D=" + DIR + "; [ -s $D/index.html ] && [ -w \"$W\" ] || { echo FAIL; exit 0; }; " +
            "cp -a $D/. \"$W\"/ && rm -f \"$W\"/.apl-ver && sync && echo OK || echo FAIL";
        return run(cmd).then(function (o) {
            if (!/OK/.test(o)) { say("الرجوع ماتمّش (المجلد مقفول أو مفيش نسخة)"); return false; }
            ls(ONCE, VER); ls("apl.bootFails", "0"); ls(GOOD, "");
            say("اتعمل رجوع لآخر نسخة شغالة، بعيد التشغيل...");
            global.setTimeout(function () { try { global.location.reload(); } catch (e) {} }, 1800);
            return true;
        }, function () { say("الرجوع ماتمّش (Vetro مش متصل؟)"); return false; });
    }

    function panel() {
        info().then(function (i) {
            APL.alert({
                title: "آخر نسخة شغالة",
                message: "النسخة الحالية: " + VER + "\nالنسخة المحفوظة: " + (i ? i.ver : "مفيش") +
                    "\nبتتحفظ لوحدها بعد ما نسخة تشتغل كويس مرتين. الرجوع بيستبدل ملفات اللانشر بس، وملفات الصوت (الكهف والتكبيرات) مابتتلمسش.",
                buttons: [
                    { label: "احفظ نسخة دلوقتي", run: function () { snapshot(true).then(function () { panel(); }); } },
                    i && i.ver !== VER ? { label: "ارجع للنسخة " + i.ver, destructive: true, run: function () { restore(); } } : { label: "الرجوع مش متاح (مفيش نسخة مختلفة)" },
                    { label: "خلاص" }
                ]
            });
        });
    }

    /* ---------- a good start counts; a version that proved itself becomes the saved copy ---------- */
    var failsBefore = Math.max(0, (parseInt(ls("apl.bootFails") || "0", 10) || 0) - 1);
    var watch = global.setInterval(function () {
        if (!global.APL_BOOT_OK) return;
        global.clearInterval(watch);
        var n = good() + 1; setGood(n);
        if (n >= 2 && !global.APL_SAFE) {
            global.setTimeout(function () {
                info().then(function (i) { if (!i || i.ver !== VER) snapshot(false); });
            }, 3 * 60000);
        }
    }, 2000);
    global.setTimeout(function () { global.clearInterval(watch); }, 120000);

    /* ---------- safe mode: offer / do the way back ---------- */
    if (global.APL_SAFE && ls(ONCE) !== VER) {
        global.setTimeout(function () {
            info().then(function (i) {
                if (!i || i.ver === VER) return;
                if (failsBefore >= 5 && good() === 0) {
                    say("النسخة " + VER + " ماوصلتش للرئيسية: برجّع النسخة " + i.ver);
                    global.setTimeout(restore, 6000);
                    return;
                }
                APL.alert({
                    title: "الوضع الآمن",
                    message: "اللانشر وقف في التشغيل أكتر من مرة. فيه نسخة " + i.ver + " كانت شغّالة. أرجع ليها؟",
                    buttons: [
                        { label: "ارجع للنسخة " + i.ver, destructive: true, run: function () { restore(); } },
                        { label: "كمّل بالوضع الآمن" }
                    ]
                });
            });
        }, 7000);
    }
    APL.safeRestore = { info: info, snapshot: snapshot, restore: restore, panel: panel };
})(window);
