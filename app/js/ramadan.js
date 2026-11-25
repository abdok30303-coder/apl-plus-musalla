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
        var A = APL.lang === "ar";
        if (now < t.fajr) return (A ? "السحور ينتهي بعد " : "Suhoor ends in ") + hm(t.fajr - now);
        if (now < t.maghrib) return (A ? "الإفطار بعد " : "Iftar in ") + hm(t.maghrib - now);
        if (t.isha && now < t.isha) return (A ? "العشاء بعد " : "Isha in ") + hm(t.isha - now);
        if (t.isha && now < t.isha + 90 * 60000) return A ? "وقت التراويح" : "Taraweeh time";
        var n = null;
        try { n = APL.prayer.next(); } catch (e) { n = null; }
        return n && n.ms ? (A ? "الفجر بعد " : "Fajr in ") + hm(n.ms) : "";
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
        if (S.sehri && now >= t.fajr - 45 * 60000 && now < t.fajr - 5 * 60000) once("sehri", function () { say(APL.lang === "ar" ? "🌙 باقي " + hm(t.fajr - now) + " على الفجر: وقت السحور" : "🌙 " + hm(t.fajr - now) + " until Fajr: time for suhoor"); });
        if (now >= t.maghrib && now < t.maghrib + 5 * 60000) once("iftar", function () { say(APL.lang === "ar" ? "🌙 حان موعد الإفطار، تقبّل الله صيامكم" : "🌙 Time to break your fast. May Allah accept your fasting"); });
        if (S.tar && t.isha && now >= t.isha + 15 * 60000 && now < t.isha + 60 * 60000) once("tar", function () { say(APL.lang === "ar" ? "🌙 حان وقت صلاة التراويح" : "🌙 Time for Taraweeh prayer"); });
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
                    say(APL.lang === "ar" ? "🌙 حان موعد الإفطار، تقبّل الله صيامكم" : "🌙 Time to break your fast. May Allah accept your fasting");
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
    /* ============================================================
       v8.7.40 - THE RAMADAN WIDGET (Home Screen, above the apps row).
       A glass card: a big crescent (or, mostly in the first 5 days, a fanous lantern) and beside it a Ramadan dua, a tip, or
       - in the last ten nights - a dua / virtue of Laylat al-Qadr. Content: data/ramadan/ramadan.json (offline; Quran and
       hadith only, each with its source). On by itself while the Hijri month is Ramadan (APL.islamic, the same date as
       everywhere else), off with Settings > Prayer and Quran > Ramadan Widget; Ramadan Widget Preview shows it outside Ramadan.
       It sits in the shelf state only (hidden while the grid / full screen / a page / the screen saver is up), on the side of the
       screen opposite the focused app's description, and moves the wisdom widget up while it is shown (body.rw-on).
       ============================================================ */
    var RW = { el: null, data: null, loading: false, cur: null, recent: [], lantern: false, on: false, key: "" };
    function rwPref(k) { try { return APL.sys.pref(k); } catch (e) { return undefined; } }
    function rwAr() { return APL.lang === "ar"; }
    /* v8.7.42: the widget runs in three phases that are never mixed (ph in the data):
         "a"  the day before Ramadan and days 1-20: general duas, tips and virtues of Ramadan
         "b"  days 21-30 (the last ten nights): Laylat al-Qadr and night-prayer content only
         "c"  the first 3 days of Eid al-Fitr: Eid tips only
       The Islamic day starts at Maghrib, so after today's Maghrib the "effective" Hijri date is tomorrow's: the night of the 21st
       (the first of the last ten) starts at Maghrib on the 20th, the first night of Ramadan at Maghrib on the 29th/30th of Sha'ban,
       and the Eid eve at Maghrib on the last day of Ramadan. The dates come from islamic.js (Egypt: the announced month starts first,
       the crescent estimate for months not announced yet, then the Hijri Date Adjustment). Without prayer times it uses the civil date. */
    function rwHijriAt(plus) {
        try { var dt = new Date(); dt.setDate(dt.getDate() + plus); return APL.islamic.toHijri(dt.getFullYear(), dt.getMonth() + 1, dt.getDate()); } catch (e) { return null; }
    }
    function rwState() {
        if (rwPref("ramadanWidget") === false) return null;
        var pv = parseInt(rwPref("ramadanWidgetPreview"), 10) || 0;
        if (pv === 40) return { ph: "pre", day: 0, preview: true };
        if (pv === 31) return { ph: "c", day: 1, preview: true };
        if (pv > 0) return { ph: pv >= 21 ? "b" : "a", day: Math.min(30, pv), preview: true };
        var t = times(), shift = (t.maghrib && Date.now() >= t.maghrib) ? 1 : 0;
        var e = rwHijriAt(shift);
        if (!e) return null;
        if (e.m === 9) return { ph: e.d >= 21 ? "b" : "a", day: Math.max(1, Math.min(30, e.d)), preview: false };
        if (e.m === 10 && e.d <= 3) return { ph: "c", day: e.d, preview: false };
        var n = rwHijriAt(shift + 1);
        if (n && n.m === 9 && n.d === 1) return { ph: "pre", day: 0, preview: false };
        return null;
    }
    var RW_CRESCENT = '<svg viewBox="0 0 120 120" aria-hidden="true"><defs>' +
        '<linearGradient id="rwcg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff3c4"/><stop offset=".55" stop-color="#f3c969"/><stop offset="1" stop-color="#c8902a"/></linearGradient>' +
        '<radialGradient id="rwcgl" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffd978" stop-opacity=".55"/><stop offset="1" stop-color="#ffd978" stop-opacity="0"/></radialGradient></defs>' +
        '<circle cx="60" cy="60" r="58" fill="url(#rwcgl)"/>' +
        '<path d="M78 14A47 47 0 1 0 106 80A38 38 0 1 1 78 14Z" fill="url(#rwcg)"/>' +
        '<path d="M92 34l3.2 7.4 8 .8-6 5.4 1.8 7.9-7-4.1-7 4.1 1.8-7.9-6-5.4 8-.8z" fill="#fff3c4"/></svg>';
    var RW_LANTERN = '<svg viewBox="0 0 120 120" aria-hidden="true"><defs>' +
        '<linearGradient id="rwlg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff3c4"/><stop offset=".55" stop-color="#f3c969"/><stop offset="1" stop-color="#b9821f"/></linearGradient>' +
        '<linearGradient id="rwlb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe9a8" stop-opacity=".95"/><stop offset="1" stop-color="#ff9d3c" stop-opacity=".75"/></linearGradient>' +
        '<radialGradient id="rwlgl" cx=".5" cy=".55" r=".5"><stop offset="0" stop-color="#ffd978" stop-opacity=".5"/><stop offset="1" stop-color="#ffd978" stop-opacity="0"/></radialGradient></defs>' +
        '<circle cx="60" cy="62" r="58" fill="url(#rwlgl)"/>' +
        '<circle cx="60" cy="9" r="4.5" fill="none" stroke="url(#rwlg)" stroke-width="2.5"/><path d="M60 13.5V20" stroke="url(#rwlg)" stroke-width="2.5"/>' +
        '<path d="M40 31Q60 12 80 31Z" fill="url(#rwlg)"/><rect x="38" y="31" width="44" height="6" rx="3" fill="url(#rwlg)"/>' +
        '<path d="M41 37H79L86 80H34Z" fill="url(#rwlb)" stroke="url(#rwlg)" stroke-width="2.5" stroke-linejoin="round"/>' +
        '<path d="M52 37L49 80M68 37L71 80M60 37V80" stroke="#b9821f" stroke-width="1.6" opacity=".8"/>' +
        '<rect x="32" y="80" width="56" height="7" rx="3" fill="url(#rwlg)"/><path d="M42 87H78L60 106Z" fill="url(#rwlg)"/>' +
        '<path d="M60 106V112" stroke="url(#rwlg)" stroke-width="2.5"/><circle cx="60" cy="114" r="3" fill="url(#rwlg)"/></svg>';
    function rwBuild() {
        if (RW.el) return RW.el;
        var d = global.document.createElement("div");
        d.className = "rw";
        d.innerHTML = '<div class="rw__art"></div><div class="rw__body"><div class="rw__top"><span class="rw__kind"></span><span class="rw__day"></span></div>' +
            '<div class="rw__text"></div><div class="rw__tr"></div><div class="rw__src"></div></div>';
        global.document.body.appendChild(d);
        RW.el = d;
        return d;
    }
    function rwLoad() {
        if (RW.data || RW.loading) return;
        RW.loading = true;
        var r = new XMLHttpRequest();
        r.open("GET", global.APL_ASSET ? global.APL_ASSET("data/ramadan/ramadan.json") : "data/ramadan/ramadan.json", true);
        r.timeout = 15000;
        r.onload = function () {
            RW.loading = false;
            try { var j = JSON.parse(r.responseText); if (j && j.items && j.items.length) { RW.data = j.items; rwSync(true); } } catch (e) {}
        };
        r.onerror = r.ontimeout = function () { RW.loading = false; };
        r.send();
    }
    function rwPick(st) {
        var items = RW.data, ph = st.ph === "pre" ? "a" : st.ph, r = Math.random(), kind = null, pool, i;
        function inPh(x) { return x.ph === ph && RW.recent.indexOf(x) < 0; }
        if (ph === "a") kind = r < 0.3 ? "dua" : (r < 0.64 ? "fadl" : "tip");
        pool = items.filter(function (x) { return inPh(x) && (!kind || x.k === kind); });
        if (!pool.length) pool = items.filter(inPh);
        if (!pool.length) { RW.recent = RW.recent.filter(function (x) { return x.ph !== ph; }); pool = items.filter(function (x) { return x.ph === ph; }); }
        if (!pool.length) return null;
        i = pool[Math.floor(Math.random() * pool.length)];
        RW.recent.push(i);
        if (RW.recent.length > 40) RW.recent.shift();
        return i;
    }
    /* v8.7.41: centred above the apps row. Measured live: never over the focused app's name / description (it slides to the free side),
       and always a clear 16px gap under the status column (prayer card, tasks): it is pushed down toward the apps row and shortened. */
    function rwGap() {
        var el = RW.el, doc = global.document;
        if (!el || el.className.indexOf("is-on") < 0 || el.offsetWidth < 1) return;
        el.style.top = ""; el.style.height = ""; el.style.left = "440px"; el.style.right = "auto";
        el.classList.remove("rw--short");
        var sc = el.getBoundingClientRect().width / el.offsetWidth || 1, g = 16 * sc, er = el.getBoundingClientRect(), si = doc.querySelector(".shelfinfo"), sx = doc.querySelector(".statusx");
        try {
            if (si && parseFloat(global.getComputedStyle(si).opacity) > 0.05 && (si.textContent || "").replace(/\s+/g, "") !== "") {
                var rg = doc.createRange(); rg.selectNodeContents(si); var rr = rg.getBoundingClientRect();
                if (rr.width > 0 && rr.bottom > er.top && rr.top < er.bottom) {
                    if (rr.left + rr.width / 2 < (er.left + er.width / 2)) { if (er.left < rr.right + g) el.style.left = (440 + (rr.right + g - er.left) / sc) + "px"; }
                    else if (er.right > rr.left - g) el.style.left = (440 - (er.right - rr.left + g) / sc) + "px";
                }
            }
        } catch (e) {}
        er = el.getBoundingClientRect();
        if (sx) {
            var sr = sx.getBoundingClientRect();
            if (sr.width > 0 && sr.right > er.left && sr.left < er.right && er.top < sr.bottom + g) {
                var d = Math.ceil((sr.bottom + g - er.top) / sc), h = Math.max(116, 172 - d);
                el.style.top = "calc(var(--dock-top, 807px) - 188px + " + (172 - h) + "px)"; el.style.height = h + "px"; if (h < 160) el.classList.add("rw--short");
            }
        }
    }
    function rwFit() {
        var t = RW.el && RW.el.querySelector(".rw__text"), b = RW.el && RW.el.querySelector(".rw__body");
        if (!t || !b) return;
        var fs = 28, tr = RW.el.querySelector(".rw__tr");
        t.style.fontSize = fs + "px"; if (tr) tr.style.fontSize = Math.round(fs * 0.68) + "px";
        var floor = RW.el.classList.contains("rw--short") ? 12 : 15;
        while (fs > floor && b.scrollHeight > b.clientHeight + 1) {
            fs -= 1;
            t.style.fontSize = fs + "px"; if (tr) tr.style.fontSize = Math.max(floor - 1, Math.round(fs * 0.68)) + "px";
        }
        /* a very long item (e.g. Sayyid al-Istighfar): still too tall at the smallest size, so the English line goes and the Arabic text with its source stays */
        if (tr && tr.style.display !== "none" && b.scrollHeight > b.clientHeight + 1) { tr.style.display = "none"; }
    }
    function rwPaint(st, fresh) {
        var el = rwBuild(), ar = rwAr(), it = RW.cur, kindTxt, dayTxt;
        if (!it) return;
        el.className = "rw rw--" + (RW.lantern ? "lantern" : "crescent") + (it.k === "qadr" ? " rw--qadr" : "") + " is-on";
        el.querySelector(".rw__art").innerHTML = RW.lantern ? RW_LANTERN : RW_CRESCENT;
        kindTxt = it.k === "qadr" ? (ar ? "ليلة القدر" : "Laylat al-Qadr") : it.k === "eid" ? (ar ? "العيد" : "Eid") : it.k === "qiyam" ? (ar ? "قيام الليل" : "Night prayer") : it.k === "fadl" ? (ar ? "فضل رمضان" : "Virtue of Ramadan") : it.k === "dua" ? (ar ? "دعاء" : "Dua") : (ar ? "نصيحة رمضانية" : "Ramadan tip");
        dayTxt = st.ph === "pre" ? (ar ? "رمضان غدًا إن شاء الله" : "Ramadan begins tomorrow, God willing") :
            st.ph === "c" ? ((ar ? "عيد الفطر · اليوم " : "Eid al-Fitr · Day ") + dg(st.day)) :
            (ar ? "رمضان · اليوم " : "Ramadan · Day ") + dg(st.day) + (st.ph === "b" ? (ar ? " · العشر الأواخر" : " · last ten nights") : "");
        if (st.preview) dayTxt += ar ? " · معاينة" : " · preview";
        el.querySelector(".rw__kind").textContent = kindTxt;
        el.querySelector(".rw__day").textContent = dayTxt;
        var tx = el.querySelector(".rw__text"), tr = el.querySelector(".rw__tr");
        /* v8.7.55: English UI: the widget is fully English (the English text is the main text, no Arabic, same phase rules) */
        tx.textContent = ar ? it.ar : (it.en || it.ar); tx.setAttribute("dir", ar ? "rtl" : "ltr");
        tr.textContent = ""; tr.style.display = "none";
        el.querySelector(".rw__src").textContent = ar ? it.sar : it.sen;
        rwGap(); rwFit();
        global.setTimeout(function () { rwGap(); rwFit(); }, 400);
    }
    function rwSync(rotate) {
        var st = rwState(), body = global.document.body;
        if (!st) {
            if (RW.el) { RW.el.className = "rw"; }
            if (RW.on) { RW.on = false; body.classList.remove("rw-on"); try { if (APL.hekamRefit) APL.hekamRefit(); } catch (e) {} }
            return;
        }
        if (!RW.data) { rwLoad(); return; }
        var key = st.ph + st.day + (st.preview ? "p" : "") + (rwAr() ? "a" : "e");
        if (rotate || !RW.cur || key !== RW.key) {
            if (rotate || !RW.cur || RW.cur.ph !== (st.ph === "pre" ? "a" : st.ph)) {
                RW.cur = rwPick(st);
                /* the lantern: sometimes in the first 5 days (most of the time then), never after them */
                RW.lantern = (st.ph === "pre" || (st.ph === "a" && st.day <= 5)) && (!RW.el || RW.el.className.indexOf("is-on") < 0 || Math.random() < 0.7);
            }
            RW.key = key;
        }
        rwPaint(st);
        if (!RW.on) { RW.on = true; body.classList.add("rw-on"); try { if (APL.hekamRefit) APL.hekamRefit(); } catch (e) {} }
    }
    function rwRotate() { if (!global.document.hidden) rwSync(true); }
    if (APL.timers && APL.timers.every) APL.timers.every("ramadanWidget", 25000, rwRotate);
    else global.setInterval(rwRotate, 25000);
    ["ramadanWidget", "ramadanWidgetPreview"].forEach(function (k) { try { APL.sys.onPref(k, function () { RW.cur = null; rwSync(true); }); } catch (e) {} });
    global.document.addEventListener("visibilitychange", function () { if (!global.document.hidden) rwSync(false); });
    global.setTimeout(function () { rwSync(false); }, 5000);
    APL.ramadanWidget = { sync: function () { rwSync(true); }, state: rwState,
        /* for the tests: show item i and say whether its text fits the card at the smallest font */
        _show: function (i) { RW.cur = RW.data[i]; rwPaint(rwState()); var t = RW.el.querySelector(".rw__text"), bd = RW.el.querySelector(".rw__body"); return { fs: parseInt(t.style.fontSize, 10), over: bd.scrollHeight > bd.clientHeight + 1, n: RW.data.length }; } };

    APL.ramadan = { panel: panel, active: active, day: dayNo, state: function () { return S; }, cannon: cannon, cannonStatus: cannonStatus, cannonOn: function () { return S.cannon !== false; } };
})(window);
