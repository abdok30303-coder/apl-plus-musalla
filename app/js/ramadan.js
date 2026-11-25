/* ============================================================
   ramadan.js (v7.0.0) - FULL RAMADAN MODE.
   Automatic while the Hijri month is Ramadan (APL.islamic.hijriToday().m === 9, so Settings > Hijri offset applies),
   or forced On / Off from Settings > Prayer and Quran > Ramadan Mode.
   - Look: body class "ramadan" (a soft golden wash + a small chip). Static CSS, no animation, nothing heavy.
   - Chip: Ramadan day + a live countdown: suhoor ends (Fajr) / iftar (Maghrib) / Isha / Taraweeh.
   - Reminders (toasts, once a day each): suhoor 45 min before Fajr, iftar at Maghrib, Taraweeh 15 min after Isha.
   - Cannon: existing local PCM WAV, isolated one-shot Pulse sample via Vetro.
     background/ramadan-cannon.sh waits for the existing prayer alert, never changes
     volume/mute, never touches daemon/radio/AVPlay. HTML5 fallback for preview/unreachable Vetro.
   - 30-day khatma: one tap sets the daily goal to 21 pages (js/khatma.js) and the panel shows where you should be today.
   Not touched on purpose: radio, daemon, HDMI, permissions, audio core.
   Untested on the TV (and Ramadan itself is not here yet: use "Try it now" in the panel).
   ============================================================ */
(function (global) {
    "use strict";
    var APL = global.APL;
    if (!APL || !APL.islamic) return;
    var KEY = "apl.ramadan", S = load(), chip = null, timer = 0, wash = null, forced = false;

    function load() {
        var o = null;
        try { o = JSON.parse(global.localStorage.getItem(KEY) || "null"); } catch (e) { o = null; }
        if (!o || typeof o !== "object") o = {};
        if (["auto", "on", "off"].indexOf(o.mode) < 0) o.mode = "auto";
        o.cannon = o.cannon !== false; o.tar = o.tar !== false; o.sehri = o.sehri !== false;
        o.fired = (o.fired && typeof o.fired === "object") ? o.fired : {};
        return o;
    }
    function save() { try { global.localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
    function p2(n) { return (n < 10 ? "0" : "") + n; }
    function dayKey() { var d = new Date(); return d.getFullYear() + "-" + p2(d.getMonth() + 1) + "-" + p2(d.getDate()); }
    function dg(x) { try { return APL.digits ? APL.digits(String(x)) : String(x); } catch (e) { return String(x); } }
    function say(m) { try { APL.toast(m, true); } catch (e) {} }
    function hijri() { try { return APL.islamic.hijriToday(); } catch (e) { return null; } }
    function inRamadan() { var h = hijri(); return !!(h && h.m === 9); }
    function active() { return S.mode === "on" || (S.mode === "auto" && inRamadan()); }
    function dayNo() { var h = hijri(); return (S.mode === "on" && !inRamadan()) ? 1 : (h ? Math.max(1, Math.min(30, h.d)) : 1); }

    function times() {
        var out = {}, L = [];
        try { L = APL.prayer && APL.prayer.list ? APL.prayer.list() : []; } catch (e) { L = []; }
        for (var i = 0; i < L.length; i++) if (L[i].at) out[L[i].key] = L[i].at.getTime();
        return out;
    }
    function hm(ms) {
        var m = Math.max(0, Math.round(ms / 60000)), h = Math.floor(m / 60);
        return h ? dg(h + ":" + p2(m % 60)) : dg(m) + (APL.lang === "ar" ? " د" : " min");
    }
    function status(now) {
        var t = times();
        if (!t.fajr || !t.maghrib) return "";
        if (now < t.fajr) return "السحور ينتهي بعد " + hm(t.fajr - now);
        if (now < t.maghrib) return "الإفطار بعد " + hm(t.maghrib - now);
        if (t.isha && now < t.isha) return "العشاء بعد " + hm(t.isha - now);
        if (t.isha && now < t.isha + 90 * 60000) return "وقت التراويح";
        var n = null;
        try { n = APL.prayer.next(); } catch (e) { n = null; }
        return n && n.ms ? "الفجر بعد " + hm(n.ms) : "";
    }

    function ensureUi() {
        if (!chip) {
            chip = document.createElement("div"); chip.className = "ramchip";
            document.body.appendChild(chip);
        }
        if (!wash) { wash = document.createElement("div"); wash.className = "ramwash"; document.body.appendChild(wash); }
    }
    function paint() {
        var on = active();
        document.body.classList.toggle("ramadan", on);
        if (!on) { if (chip) chip.style.display = "none"; if (wash) wash.style.display = "none"; return; }
        ensureUi();
        wash.style.display = ""; chip.style.display = "";
        var s = status(Date.now());
        chip.textContent = APL.enx("\uD83C\uDF19 رمضان • يوم " + dg(dayNo()) + (s ? " • " + s : ""));
    }

    var cannonAudio = null, cannonLast = "لسه ما اتجرّبش على التلفزيون", cannonPending = false;
    function htmlCannon() {
        try {
            var src = global.APL_ASSET ? global.APL_ASSET("sounds/ramadan-cannon.wav") : "sounds/ramadan-cannon.wav";
            if (!cannonAudio) { cannonAudio = new global.Audio(src); cannonAudio.preload = "auto"; }
            cannonAudio.currentTime = 0;
            var p = cannonAudio.play();
            cannonLast = "طلب تشغيل HTML5؛ سماعه على التلفزيون مش مؤكّد";
            if (p && p.catch) p.catch(function () { cannonLast = "HTML5 رفض التشغيل؛ جرّب Vetro"; });
        } catch (e) { cannonLast = "تعذّر تشغيل المدفع من HTML5"; }
    }
    function packageDir() {
        return new Promise(function (resolve, reject) {
            function accept(p) {
                try { p = decodeURI(String(p || "")).replace(/^file:\/\//, "").replace(/\/$/, ""); } catch (e) { p = ""; }
                if (/^\/[A-Za-z0-9_.\/-]+$/.test(p) && p !== "/") { resolve(p); return true; }
                return false;
            }
            function fallback() {
                var p = (global.location && global.location.pathname) || "";
                if (!accept(p.replace(/\/[^\/]*$/, ""))) reject(new Error("package path unavailable"));
            }
            try {
                if (global.tizen && global.tizen.filesystem) {
                    global.tizen.filesystem.resolve("wgt-package", function (dir) { if (!accept(dir.toURI())) fallback(); }, fallback, "r");
                } else fallback();
            } catch (e) { fallback(); }
        });
    }
    function cannonStatus() {
        var sys = APL.sys;
        if (!sys || sys.PREVIEW || !sys.exec) return Promise.resolve(cannonLast);
        return sys.exec("cat /run/apl-bg/cannon.status 2>/dev/null; true").then(function (r) {
            if (r && r.ok === true && Number(r.exit_code) === 0) {
                var status = String(r.output || "").trim();
                if (/^CANNON_[A-Z_]+$/.test(status)) cannonLast = status;
            }
            return cannonLast;
        }, function () { return cannonLast; }).then(function (st) {
            /* v8.7.31: also what the background player last logged about the cannon (which file it used, or that it was not found) */
            if (!APL.bgAudio || !APL.bgAudio.log) return st;
            return APL.bgAudio.log().then(function (t) {
                var l = String(t || "").split("\n").filter(function (x) { return /cannon/i.test(x); }).slice(-3).map(function (x) { return x.slice(-150); });
                return l.length ? st + "\n" + l.join("\n") : st;
            }, function () { return st; });
        });
    }
    function cannon(manual) {
        if ((!S.cannon && !manual) || cannonPending) return;
        var sys = APL.sys;
        if (!sys || sys.PREVIEW || !sys.exec) { htmlCannon(); return; }
        cannonPending = true;
        cannonLast = "بنطلب تشغيل المدفع؛ الأذان ليه الأولوية";
        packageDir().then(function (dir) {
            var cmd = "W='" + dir + "'; [ -r \"$W/background/ramadan-cannon.sh\" ] && [ -r \"$W/sounds/ramadan-cannon.wav\" ] || { echo CANNON_FILE_MISSING; exit 1; }; " +
                "command -v pactl >/dev/null 2>&1 || { echo CANNON_NO_PACTL; exit 1; }; " +
                "nohup sh -c 'cat \"$1/background/ramadan-cannon.sh\" | sh -s -- \"$1/sounds/ramadan-cannon.wav\" \"$2\"' apl-cannon \"$W\" '" +
                (manual ? "test" : "iftar") + "' >/dev/null 2>&1 </dev/null & echo APL_CANNON_QUEUED";
            return sys.exec(cmd);
        }).then(function (r) {
            if (!r || r.ok !== true || Number(r.exit_code) !== 0 || !/APL_CANNON_QUEUED/.test(String(r.output || ""))) throw new Error("native cannon unavailable");
            cannonLast = "CANNON_QUEUED — طلب التشغيل اتبعت؛ ده مش تأكيد سماع الصوت";
            global.setTimeout(function () { cannonStatus(); }, manual ? 10000 : 20000);
        }).catch(function () { htmlCannon(); }).then(function () { cannonPending = false; });
    }
    function once(name, fn) {
        var k = dayKey() + ":" + name;
        if (S.fired[k]) return;
        var keys = Object.keys(S.fired);
        if (keys.length > 12) { keys.forEach(function (x) { if (x.indexOf(dayKey()) !== 0) delete S.fired[x]; }); }
        S.fired[k] = 1; save(); fn();
    }
    function remind(now) {
        if (global.document.hidden) return;
        var t = times();
        if (!t.fajr || !t.maghrib) return;
        if (S.sehri && now >= t.fajr - 45 * 60000 && now < t.fajr - 5 * 60000) once("sehri", function () { say("🌙 باقي " + hm(t.fajr - now) + " على الفجر: وقت السحور"); });
        if (now >= t.maghrib && now < t.maghrib + 5 * 60000) once("iftar", function () { say("🌙 حان موعد الإفطار، تقبّل الله صيامكم"); });
        if (S.tar && t.isha && now >= t.isha + 15 * 60000 && now < t.isha + 60 * 60000) once("tar", function () { say("🌙 حان وقت صلاة التراويح"); });
    }

    function tick() {
        var on = active();
        paint();
        if (on && !forced) remind(Date.now());
        global.clearTimeout(timer);
        timer = global.setTimeout(tick, on ? 30000 : 10 * 60000);
    }

    /* ---------- the panel ---------- */
    var MODES = { auto: "تلقائي (في رمضان بس)", on: "شغّال دايمًا", off: "مقفول" };
    function panel(focus) {
        var kh = APL.khatma, d = dayNo(), msg = "الحالة: " + (active() ? "شغّال" : "مش في رمضان دلوقتي") +
            (inRamadan() ? " • يوم " + dg(d) + " من رمضان" : "");
        if (kh) {
            var st = kh.state(), shouldBe = Math.min(kh.pages, d * 21);
            msg += "\nالختمة: صفحة " + dg(st.page) + (active() ? " (المفروض توصل صفحة " + dg(shouldBe) + " النهاردة لو ختمة ٣٠ يوم)" : "");
        }
        msg += "\nمدفع أوفلاين بمسار Pulse مستقل عن الأذان وباقي الأصوات، والأذان ليه الأولوية. مفيش تغيير في صوت التلفزيون أو ملفاته.\nالحالة: " + cannonLast + "\nUntested on the TV";
        APL.alert({
            title: "وضع رمضان", message: msg, focus: focus || 0,
            buttons: [
                { label: "الوضع: " + MODES[S.mode], run: function () { S.mode = S.mode === "auto" ? "on" : (S.mode === "on" ? "off" : "auto"); save(); tick(); panel(0); } },
                { label: "مدفع الإفطار: " + (S.cannon ? "شغّال" : "مقفول"), run: function () { S.cannon = !S.cannon; save(); panel(1); } },
                { label: "تنبيه السحور: " + (S.sehri ? "شغّال" : "مقفول"), run: function () { S.sehri = !S.sehri; save(); panel(2); } },
                { label: "تنبيه التراويح: " + (S.tar ? "شغّال" : "مقفول"), run: function () { S.tar = !S.tar; save(); panel(3); } },
                { label: "ختمة رمضان (٣٠ يوم)", run: function () { if (kh) { kh.setPlan(21); say("هدف الختمة: ٢١ صفحة في اليوم"); } panel(4); } },
                { label: "جرّبه دلوقتي (مدفع + تنبيه)", run: function () {
                    say("🌙 حان موعد الإفطار، تقبّل الله صيامكم");
                    if (APL.prayerAlert && APL.prayerAlert.play) {
                        APL.prayerAlert.play("maghrib_ramadan");
                    } else {
                        cannon(true);
                    }
                    panel(5);
                } },
                { label: "جرّبه دلوقتي (المدفع بس)", run: function () {
                    if (APL.prayerAlert && APL.prayerAlert.play) APL.prayerAlert.play("cannon"); else cannon(true);
                    panel(6);
                } },
                { label: "حالة تشغيل المدفع", run: function () { cannonStatus().then(function (s) { APL.alert({ title: "حالة المدفع", message: s + "\nطلب تشغيل ناجح مش ضمان إن الصوت مسموع؛ جرّبه على الشاشة.\nCANNON_FINISHED = مسار Pulse خلّص الطلب.\nNO_PACTL / NO_PULSE = المسار مش متاح.\nSKIPPED_ALERT_BUSY = الأذان ليه الأولوية.", buttons: [{ label: "رجوع", run: function () { panel(7); } }] }); }); } },
                { label: "افتح المصحف", run: function () { if (kh) kh.open(); } },
                { label: "خلاص" }
            ]
        });
    }

    global.document.addEventListener("visibilitychange", function () { if (!global.document.hidden) tick(); });
    global.setTimeout(tick, 4000);
    APL.ramadan = { panel: panel, active: active, day: dayNo, state: function () { return S; }, cannon: cannon, cannonStatus: cannonStatus, cannonOn: function () { return S.cannon !== false; } };
})(window);
