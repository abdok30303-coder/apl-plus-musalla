/* ============================================================
   tv-check.js (v3.3.3) - one screen: Settings > Performance > TV Check.
   Each line: OK / WARN / FAIL + a short reason. Read only: nothing is changed
   on the screen. Can be saved as a text file on a USB stick.
   Untested on the TV.
   ============================================================ */
(function (global) {
    "use strict";
    var APL = global.APL, sys = APL && APL.sys;
    if (!APL || !sys) return;

    var OK = "\u2714", WARN = "\u26A0", BAD = "\u2716";
    /* v8.7.25: English for the diagnostics lines (exact texts first, then phrases, longest first) */
    var TE_D = {"الإصدار": "Version", "مواقيت الصلاة": "Prayer times", "متحمّلة": "Loaded", "مفيش بيانات": "No data", "خطأ": "Error", "معايرة المواقيت": "Prayer time calibration", "مش محسوبة لسه": "Not calculated yet", "تحديث الويدجت": "Widget refresh", "موجود": "Present", "مش متسجل": "Not registered", "قفل الطفل": "Child lock", "جاهز": "Ready", "مش متحمّل": "Not loaded", "المحراب الحي": "Live mihrab", "المصحف والختمة": "Mushaf and khatma", "مصحف حفص أوفلاين": "Hafs Mushaf offline", "قارئ وفهارس وبحث؛ تجربة الشاشة لسه مطلوبة": "Reader, indexes and search; a test on the screen is still needed", "مصحف حفص": "Hafs Mushaf", "وضع رمضان": "Ramadan mode", "شغّال": "On", "مش في رمضان": "Not in Ramadan", "الراديو": "Radio", "الصوت (AVPlay)": "Audio (AVPlay)", "مش جاهز": "Not ready", "الذاكرة": "Memory", "مش متاحة": "Not available", "سجل الأخطاء": "Error log", "الجسر": "Bridge", "شغال": "Running", "مش بيرد": "Not answering", "حارس التنبيهات": "Alert guard", "مفيش فحص ناجح": "No successful check", "فشل متكرر": "Repeated failure", "ماردّش لسه": "No answer yet", "مفيش رد": "No answer", "مش متاح هنا": "Not available here", "مفيش فلاشة": "No USB stick", "USB مش متاح": "USB not available", "مفيش فلاشة USB": "No USB stick", "مقدرتش أكتب على USB": "Could not write to USB"};
    var TE_F = {" MB عالية": " MB (high)", "المرحلة: ": "Phase: ", "صفحة ": "Page ", "آخر فحص من ": "Last check ", "آخر رد من ": "Last reply ", " · من ": " · ", "من ": "", " د": " min", " يوم": " days", " خطأ": " errors", " مش شغال": " not running", " محتاج انتباه": " needs attention", " كله تمام": " all good", "اتحفظ:\n": "Saved:\n"};
    var TE_K = Object.keys(TE_F).sort(function (a, b) { return b.length - a.length; });
    function TE(s) {
        if (APL.lang === "ar" || typeof s !== "string" || !/[\u0600-\u06FF]/.test(s)) return s;
        if (Object.prototype.hasOwnProperty.call(TE_D, s)) return TE_D[s];
        var out = s;
        for (var i = 0; i < TE_K.length; i++) if (out.indexOf(TE_K[i]) >= 0) out = out.split(TE_K[i]).join(TE_F[TE_K[i]]);
        return out;
    }
    function line(mark, name, why) { return mark + " " + TE(name) + (why ? " \u2014 " + TE(why) : ""); }

    function syncChecks() {
        var L = [], v = (global.APL_BUILD && global.APL_BUILD.version) || "?";
        L.push(line(OK, "\u0627\u0644\u0625\u0635\u062F\u0627\u0631", v));
        try {
            var n = APL.prayer && APL.prayer.next ? APL.prayer.next() : null;
            L.push(n ? line(OK, "\u0645\u0648\u0627\u0642\u064A\u062A \u0627\u0644\u0635\u0644\u0627\u0629", "\u0645\u062A\u062D\u0645\u0651\u0644\u0629") : line(BAD, "\u0645\u0648\u0627\u0642\u064A\u062A \u0627\u0644\u0635\u0644\u0627\u0629", "\u0645\u0641\u064A\u0634 \u0628\u064A\u0627\u0646\u0627\u062A"));
        } catch (e) { L.push(line(BAD, "\u0645\u0648\u0627\u0642\u064A\u062A \u0627\u0644\u0635\u0644\u0627\u0629", "\u062E\u0637\u0623")); }
        try {
            var cb = APL.prayer && APL.prayer.calibration ? APL.prayer.calibration() : null;
            if (cb) L.push(line(OK, "\u0645\u0639\u0627\u064A\u0631\u0629 \u0627\u0644\u0645\u0648\u0627\u0642\u064A\u062A", JSON.stringify(cb.v) + " / " + cb.n + " \u064A\u0648\u0645"));
            else L.push(line(WARN, "\u0645\u0639\u0627\u064A\u0631\u0629 \u0627\u0644\u0645\u0648\u0627\u0642\u064A\u062A", "\u0645\u0634 \u0645\u062D\u0633\u0648\u0628\u0629 \u0644\u0633\u0647"));
        } catch (e) {}
        L.push(typeof APL.refreshWidgets === "function" ? line(OK, "\u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0648\u064A\u062F\u062C\u062A", "\u0645\u0648\u062C\u0648\u062F") : line(BAD, "\u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0648\u064A\u062F\u062C\u062A", "\u0645\u0634 \u0645\u062A\u0633\u062C\u0644"));
        L.push(APL.kidLock ? line(OK, "\u0642\u0641\u0644 \u0627\u0644\u0637\u0641\u0644", "\u062C\u0627\u0647\u0632") : line(WARN, "\u0642\u0641\u0644 \u0627\u0644\u0637\u0641\u0644", "\u0645\u0634 \u0645\u062A\u062D\u0645\u0651\u0644"));
        L.push(APL.ambient ? line(OK, "\u0627\u0644\u0645\u062D\u0631\u0627\u0628 \u0627\u0644\u062D\u064A", "\u0627\u0644\u0645\u0631\u062D\u0644\u0629: " + APL.ambient.phase()) : line(WARN, "\u0627\u0644\u0645\u062D\u0631\u0627\u0628 \u0627\u0644\u062D\u064A", "\u0645\u0634 \u0645\u062A\u062D\u0645\u0651\u0644"));
        L.push(APL.khatma ? line(OK, "\u0627\u0644\u0645\u0635\u062D\u0641 \u0648\u0627\u0644\u062E\u062A\u0645\u0629", "\u0635\u0641\u062D\u0629 " + APL.khatma.state().page) : line(WARN, "\u0627\u0644\u0645\u0635\u062D\u0641 \u0648\u0627\u0644\u062E\u062A\u0645\u0629", "\u0645\u0634 \u0645\u062A\u062D\u0645\u0651\u0644"));
        L.push(APL.quran ? line(OK, "مصحف حفص أوفلاين", "قارئ وفهارس وبحث؛ تجربة الشاشة لسه مطلوبة") : line(WARN, "مصحف حفص", "مش متحمّل"));
        L.push(APL.ramadan ? line(OK, "\u0648\u0636\u0639 \u0631\u0645\u0636\u0627\u0646", APL.ramadan.active() ? "\u0634\u063A\u0651\u0627\u0644" : "\u0645\u0634 \u0641\u064A \u0631\u0645\u0636\u0627\u0646") : line(WARN, "\u0648\u0636\u0639 \u0631\u0645\u0636\u0627\u0646", "\u0645\u0634 \u0645\u062A\u062D\u0645\u0651\u0644"));
        L.push(APL.radio ? line(OK, "\u0627\u0644\u0631\u0627\u062F\u064A\u0648", "\u0645\u0648\u062C\u0648\u062F") : line(BAD, "\u0627\u0644\u0631\u0627\u062F\u064A\u0648", "\u0645\u0634 \u0645\u062A\u062D\u0645\u0651\u0644"));
        try {
            var a = APL.audioPack && APL.audioPack.state ? APL.audioPack.state() : null;
            L.push(a ? line(OK, "\u0627\u0644\u0635\u0648\u062A (AVPlay)", "\u062C\u0627\u0647\u0632") : line(WARN, "\u0627\u0644\u0635\u0648\u062A (AVPlay)", "\u0645\u0634 \u062C\u0627\u0647\u0632"));
        } catch (e) { L.push(line(WARN, "\u0627\u0644\u0635\u0648\u062A (AVPlay)", "\u062E\u0637\u0623")); }
        try {
            var m = global.performance && global.performance.memory;
            if (m && m.usedJSHeapSize) {
                var mb = Math.round(m.usedJSHeapSize / 1048576);
                L.push(mb > 150 ? line(WARN, "\u0627\u0644\u0630\u0627\u0643\u0631\u0629", mb + " MB \u0639\u0627\u0644\u064A\u0629") : line(OK, "\u0627\u0644\u0630\u0627\u0643\u0631\u0629", mb + " MB"));
            } else L.push(line(WARN, "\u0627\u0644\u0630\u0627\u0643\u0631\u0629", "\u0645\u0634 \u0645\u062A\u0627\u062D\u0629"));
        } catch (e) {}
        try {
            var el = global.APL_ERRLOG && global.APL_ERRLOG.list ? global.APL_ERRLOG.list() : null;
            if (el && el.length) L.push(line(WARN, "\u0633\u062C\u0644 \u0627\u0644\u0623\u062E\u0637\u0627\u0621", el.length + " \u062E\u0637\u0623"));
        } catch (e) {}
        return L;
    }

    function asyncChecks() {
        var jobs = [];
        if (typeof sys.bridge === "function" && !(sys.noVetro && sys.noVetro())) {
            jobs.push(sys.bridge("GET", "/bridge-info", "", 6000).then(function (r) {
                var i = JSON.parse(r.body), out = [];
                out.push(line(OK, "\u0627\u0644\u062C\u0633\u0631", i.bridgeVersion || "?"));
                out.push(i.vetroUp ? line(OK, "Vetro", "\u0634\u063A\u0627\u0644") : line(BAD, "Vetro", "\u0645\u0634 \u0628\u064A\u0631\u062F"));
                var age = i.lastHeartbeatOkAt ? Math.round((Date.now() - i.lastHeartbeatOkAt) / 60000) : -1;
                if (age < 0) out.push(line(BAD, "\u062D\u0627\u0631\u0633 \u0627\u0644\u062A\u0646\u0628\u064A\u0647\u0627\u062A", "\u0645\u0641\u064A\u0634 \u0641\u062D\u0635 \u0646\u0627\u062C\u062D"));
                else if ((i.heartbeatFailures || 0) >= 3) out.push(line(BAD, "\u062D\u0627\u0631\u0633 \u0627\u0644\u062A\u0646\u0628\u064A\u0647\u0627\u062A", "\u0641\u0634\u0644 \u0645\u062A\u0643\u0631\u0631"));
                else if (age > 30) out.push(line(WARN, "\u062D\u0627\u0631\u0633 \u0627\u0644\u062A\u0646\u0628\u064A\u0647\u0627\u062A", "\u0622\u062E\u0631 \u0641\u062D\u0635 \u0645\u0646 " + age + " \u062F"));
                else out.push(line(OK, "\u062D\u0627\u0631\u0633 \u0627\u0644\u062A\u0646\u0628\u064A\u0647\u0627\u062A", "\u0645\u0646 " + age + " \u062F"));
                /* v7.0.7: the daemon's own answer (bridge 7.0.7+): Vetro taking the command does not prove the daemon ran it */
                if (i.lastDaemonOkAt !== undefined) {
                    var dAge = i.lastDaemonOkAt ? Math.round((Date.now() - i.lastDaemonOkAt) / 60000) : -1;
                    out.push(dAge >= 0 && dAge <= 30 ? line(OK, "daemon", (i.daemonState || "") + " \u00B7 \u0645\u0646 " + dAge + " \u062F")
                                                     : line(WARN, "daemon", dAge < 0 ? "\u0645\u0627\u0631\u062F\u0651\u0634 \u0644\u0633\u0647" : "\u0622\u062E\u0631 \u0631\u062F \u0645\u0646 " + dAge + " \u062F"));
                }
                return out;
            }).catch(function () { return [line(BAD, "\u0627\u0644\u062C\u0633\u0631", "\u0645\u0641\u064A\u0634 \u0631\u062F")]; }));
        } else jobs.push(Promise.resolve([line(WARN, "\u0627\u0644\u062C\u0633\u0631", "\u0645\u0634 \u0645\u062A\u0627\u062D \u0647\u0646\u0627")]));
        var el = APL.errorLog;
        if (el && el.usbLabels) {
            jobs.push(el.usbLabels().then(function (r) {
                return [(r && r.usb && r.usb.length) ? line(OK, "USB", r.usb[0]) : line(WARN, "USB", "\u0645\u0641\u064A\u0634 \u0641\u0644\u0627\u0634\u0629")];
            }).catch(function () { return [line(WARN, "USB", "\u062E\u0637\u0623")]; }));
        }
        return Promise.all(jobs).then(function (parts) { return [].concat.apply([], parts); });
    }

    function run(then) { asyncChecks().then(function (extra) { then(syncChecks().concat(extra)); }); }

    function show() {
        run(function (L) {
            var bad = L.filter(function (x) { return x.charAt(0) === BAD; }).length;
            var warn = L.filter(function (x) { return x.charAt(0) === WARN; }).length;
            var head = bad ? BAD + " " + bad + " \u0645\u0634 \u0634\u063A\u0627\u0644" : (warn ? WARN + " " + warn + " \u0645\u062D\u062A\u0627\u062C \u0627\u0646\u062A\u0628\u0627\u0647" : OK + " \u0643\u0644\u0647 \u062A\u0645\u0627\u0645");
            APL.alert({
                title: APL.t("TV Check"),
                message: head + "\n\n" + L.join("\n"),
                buttons: [
                    { label: "USB", run: function () { exportUsb(L); } },
                    { label: APL.t("OK") }
                ]
            });
        });
    }

    function exportUsb(L) {
        var el = APL.errorLog, d = new Date();
        function p(n) { return (n < 10 ? "0" : "") + n; }
        function say(m) { APL.alert({ title: APL.t("TV Check"), message: m, buttons: [{ label: APL.t("OK") }] }); }
        if (!el || !el.usbLabels || !el.writeText) { say("USB \u0645\u0634 \u0645\u062A\u0627\u062D"); return; }
        el.usbLabels().then(function (r) {
            if (!r || !r.usb || !r.usb.length) { say("\u0645\u0641\u064A\u0634 \u0641\u0644\u0627\u0634\u0629 USB"); return; }
            var name = "apl-tvcheck-" + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + "-" + p(d.getHours()) + p(d.getMinutes()) + ".txt";
            return el.writeText(r.usb[0], name, L.join("\n")).then(function (path) { say("\u0627\u062A\u062D\u0641\u0638:\n" + path); });
        }).catch(function () { say("\u0645\u0642\u062F\u0631\u062A\u0634 \u0623\u0643\u062A\u0628 \u0639\u0644\u0649 USB"); });
    }

    APL.tvCheck = { show: show, run: run };
})(window);
