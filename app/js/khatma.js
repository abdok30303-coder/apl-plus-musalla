/* ============================================================
   khatma.js (v7.0.0) - MUSHAF READER + KHATMA TRACKER + FRIDAY AL-KAHF.
   - Position = a page of the Madani Mushaf (604 pages, 30 juz). Resume page, pages read per day,
     daily goal (pages a day), streak, number of finished khatmas, Ramadan 30-day plan.
   - v7.0.0: APL.quran is the default offline Hafs text reader + indexes + live search.
     The following picture-only mode is preserved ONLY as a fallback if quran.js is absent.
   - Legacy reader screen: shows the page picture if the user put page pictures on the TV
     (folder APL-Quran, files 001.jpg ... 604.jpg, or .png / .webp). The launcher does NOT carry
     any Quran text or pictures (package stays light, nothing online). Without pictures the
     screen still tracks the page / juz and works as a reading counter.
   - Friday: the Al-Kahf pages are 293-304; the Al-Kahf button plays the streamed audio (APL.audioPack)
     and the pages show the "Friday" mark. Marks the Friday as done when the reader passes page 304.
   Keys in the reader: OK = I read this page (and next), LEFT = next page, RIGHT = previous page,
   UP / DOWN = next / previous juz, Back = close. Menu button on the info panel.
   Not touched on purpose: radio, daemon, HDMI, permissions, audio core.
   Untested on the TV.
   ============================================================ */
(function (global) {
    "use strict";
    var APL = global.APL;
    if (!APL || !APL.Nav) return;
    var KEY = "apl.khatma", PAGES = 604, KAHF_FROM = 293, KAHF_TO = 304;
    /* first page of each juz in the Madani Mushaf (604 pages) */
    var JUZ = [1, 22, 42, 62, 82, 102, 121, 142, 162, 182, 201, 222, 242, 262, 282, 302, 322, 342, 362, 382, 402, 422, 442, 462, 482, 502, 522, 542, 562, 582];
    var PLANS = [21, 10, 7, 4, 2];
    var DIRS = ["/opt/usr/home/owner/content/Documents", "/opt/usr/home/owner/media/Documents",
        "/opt/usr/home/owner/content/Downloads", "/opt/usr/home/owner/media/Downloads"];
    var EXTS = ["jpg", "png", "webp"], FOLDER = "APL-Quran";
    var S = load(), root = null, nav = null, el = {}, open = false, hit = null;

    function p2(n) { return (n < 10 ? "0" : "") + n; }
    function dayKey(d) { d = d || new Date(); return d.getFullYear() + "-" + p2(d.getMonth() + 1) + "-" + p2(d.getDate()); }
    function dg(x) { try { return APL.digits ? APL.digits(String(x)) : String(x); } catch (e) { return String(x); } }
    function say(m) { try { APL.toast(m, true); } catch (e) {} }
    function load() {
        var o = null;
        try { o = JSON.parse(global.localStorage.getItem(KEY) || "null"); } catch (e) { o = null; }
        if (!o || typeof o !== "object") o = {};
        o.page = Math.max(1, Math.min(PAGES, parseInt(o.page, 10) || 1));
        o.plan = PLANS.indexOf(o.plan) >= 0 ? o.plan : 21;
        o.log = (o.log && typeof o.log === "object") ? o.log : {};
        o.done = parseInt(o.done, 10) || 0;
        o.kahf = (o.kahf && typeof o.kahf === "object") ? o.kahf : {};
        o.start = o.start || dayKey();
        return o;
    }
    function save() {
        try {
            /* keep only the last 400 days of the log */
            var ks = Object.keys(S.log).sort();
            while (ks.length > 400) { delete S.log[ks.shift()]; }
            global.localStorage.setItem(KEY, JSON.stringify(S));
        } catch (e) {}
    }
    function juzOf(p) { var j = 1; for (var i = 0; i < JUZ.length; i++) if (p >= JUZ[i]) j = i + 1; return j; }
    function today() { return S.log[dayKey()] || 0; }
    function streak() {
        var n = 0, d = new Date();
        if (!S.log[dayKey(d)]) d.setDate(d.getDate() - 1);          /* today may still be empty */
        while (S.log[dayKey(d)] > 0 && n < 400) { n++; d.setDate(d.getDate() - 1); }
        return n;
    }
    function isFriday() { return new Date().getDay() === 5; }
    function planDays() { return Math.ceil(PAGES / S.plan); }
    function addRead(n) {
        if (n <= 0) return;
        var k = dayKey();
        S.log[k] = (S.log[k] || 0) + n;
        save();
    }
    function goTo(p, silent) {
        p = Math.max(1, Math.min(PAGES, p));
        var wasKahf = S.page >= KAHF_FROM && S.page <= KAHF_TO;
        S.page = p;
        if (isFriday() && wasKahf && p > KAHF_TO && !S.kahf[dayKey()]) { S.kahf[dayKey()] = 1; say("تمّت سورة الكهف النهاردة، جمعة مباركة"); }
        save();
        if (!silent) paint();
    }
    function readPage() {
        addRead(1);
        if (S.page >= PAGES) {
            S.done++; S.page = 1; S.start = dayKey(); save();
            say("مبروك! ختمة كاملة. عدد الختمات: " + dg(S.done));
            paint(); return;
        }
        var g = today() === S.plan;
        goTo(S.page + 1);
        if (g) say("وصلت هدف النهاردة: " + dg(S.plan) + " صفحة");
    }

    /* ---------- the page picture (optional, from the TV storage) ---------- */
    function pad3(n) { return (n < 10 ? "00" : n < 100 ? "0" : "") + n; }
    function candidates(p) {
        var out = [], i, j;
        if (hit) { out.push("file://" + hit.dir + "/" + FOLDER + "/" + pad3(p) + "." + hit.ext); }
        for (i = 0; i < DIRS.length; i++) for (j = 0; j < EXTS.length; j++) out.push("file://" + DIRS[i] + "/" + FOLDER + "/" + pad3(p) + "." + EXTS[j]);
        return out;
    }
    function loadPicture(p) {
        var list = candidates(p), idx = 0, img = new Image(), token = (loadPicture.t = (loadPicture.t || 0) + 1);
        el.pic.style.display = "none"; el.ph.style.display = "";
        img.onload = function () {
            if (token !== loadPicture.t) return;
            var m = /^file:\/\/(.*)\/APL-Quran\/\d+\.(\w+)$/.exec(img.src);
            if (m) hit = { dir: m[1], ext: m[2] };
            el.pic.src = img.src; el.pic.style.display = ""; el.ph.style.display = "none";
        };
        img.onerror = function () {
            if (token !== loadPicture.t) return;
            idx++;
            if (idx < list.length) img.src = list[idx];
        };
        img.src = list[0];
    }

    /* ---------- the reader screen ---------- */
    function build() {
        root = document.createElement("div");
        root.className = "khr";
        root.innerHTML = "<div class=\"khr__top\"><span class=\"khr__juz\"></span><span class=\"khr__kahf\"></span><span class=\"khr__goal\"></span></div>" +
            "<div class=\"khr__mid\"><img class=\"khr__pic\" alt=\"\"><div class=\"khr__ph\"></div></div>" +
            "<div class=\"khr__bar\"><i></i></div><div class=\"khr__hint\"></div>";
        document.body.appendChild(root);
        el.juz = root.querySelector(".khr__juz"); el.kahf = root.querySelector(".khr__kahf"); el.goal = root.querySelector(".khr__goal");
        el.pic = root.querySelector(".khr__pic"); el.ph = root.querySelector(".khr__ph");
        el.bar = root.querySelector(".khr__bar i"); el.hint = root.querySelector(".khr__hint");
        nav = new APL.Nav({
            onKey: function (code) {
                if (code === APL.KEY.ENTER) { readPage(); return true; }
                if (code === APL.KEY.LEFT) { goTo(S.page + 1); return true; }
                if (code === APL.KEY.RIGHT) { goTo(S.page - 1); return true; }
                if (code === APL.KEY.UP) { var j = juzOf(S.page); goTo(JUZ[Math.min(29, j)]); return true; }
                if (code === APL.KEY.DOWN) { var k = juzOf(S.page); goTo(S.page > JUZ[k - 1] ? JUZ[k - 1] : JUZ[Math.max(0, k - 2)]); return true; }
                return false;
            },
            onBack: close
        });
    }
    function paint() {
        if (!open) return;
        var j = juzOf(S.page), kahf = S.page >= KAHF_FROM && S.page <= KAHF_TO;
        el.juz.textContent = "الجزء " + dg(j) + " • صفحة " + dg(S.page) + " / " + dg(PAGES);
        el.kahf.textContent = kahf ? (isFriday() ? "سورة الكهف • يوم الجمعة" : "سورة الكهف") : "";
        el.goal.textContent = "النهاردة " + dg(today()) + " / " + dg(S.plan);
        el.ph.innerHTML = "<div class=\"khr__num\">" + dg(S.page) + "</div><div class=\"khr__sub\">ضع صور المصحف في مجلد " + FOLDER + " (001.jpg ... 604.jpg) لعرض الصفحة هنا</div>";
        el.bar.style.width = (S.page / PAGES * 100).toFixed(1) + "%";
        el.hint.textContent = "OK: قرأت الصفحة • ◄ ► صفحة • ▲ ▼ جزء • رجوع: خروج";
        loadPicture(S.page);
    }
    function openReader(page) {
        /* v7: use the embedded Hafs text reader; preserve the legacy picture fallback. */
        if (APL.quran && APL.quran.open) { APL.quran.open(page); return; }
        try { if (APL.settings && APL.settings.close) APL.settings.close(); } catch (e) {}
        if (!root) build();
        if (page) goTo(page, true);
        open = true; root.classList.add("is-open");
        APL.pushNav(nav); paint();
    }
    function close() {
        open = false;
        if (root) root.classList.remove("is-open");
        APL.popNav(nav);
        save();
    }

    /* ---------- the Khatma panel (Settings > Prayer and Quran) ---------- */
    function remainingText() {
        var left = PAGES - S.page + 1, days = Math.ceil(left / S.plan);
        return "باقي " + dg(left) + " صفحة (حوالي " + dg(days) + " يوم بالمعدّل ده)";
    }
    function panel(focus) {
        var kahfDone = !!S.kahf[dayKey()];
        var msg = "الصفحة " + dg(S.page) + " • الجزء " + dg(juzOf(S.page)) + "\n" + remainingText() +
            "\nقرأت النهاردة: " + dg(today()) + " صفحة (الهدف " + dg(S.plan) + ")" +
            "\nأيام متتالية: " + dg(streak()) + " • ختمات كاملة: " + dg(S.done) +
            (isFriday() ? "\nالنهاردة الجمعة: سورة الكهف" + (kahfDone ? " ✔" : " (صفحات ٢٩٣ – ٣٠٤)") : "");
        var b = [
            { label: "افتح المصحف", run: function () { openReader(); } },
            { label: "قرأت صفحة", run: function () { readPage(); panel(1); } },
            { label: "قرأت جزء كامل", run: function () { var j = juzOf(S.page), end = (j < 30 ? JUZ[j] : PAGES + 1), n = Math.max(1, end - S.page); addRead(end > PAGES ? n - 1 : n); if (end > PAGES) { S.page = PAGES; readPage(); } else goTo(end, true); save(); panel(2); } },
            { label: "هدف اليوم: " + dg(S.plan) + " صفحة (ختمة في " + dg(planDays()) + " يوم)", run: function () { S.plan = PLANS[(PLANS.indexOf(S.plan) + 1) % PLANS.length]; save(); panel(3); } },
            { label: "سورة الكهف: " + (isFriday() ? "شغّل التلاوة" : "الجمعة بس (شغّل برضه)"), run: function () { kahfPlay(); } },
            { label: "روح لصفحة الكهف", run: function () { openReader(KAHF_FROM); } },
            { label: "ابدأ ختمة جديدة", run: function () { S.page = 1; S.start = dayKey(); save(); panel(0); } },
            { label: "خلاص" }
        ];
        APL.alert({ title: "المصحف والختمة", message: msg, focus: focus || 0, buttons: b });
    }
    function kahfPlay() {
        try {
            if (APL.audioPack && APL.audioPack.play) APL.audioPack.play("kahf");
            else say("تلاوة الكهف مش متاحة");
        } catch (e) { say("تلاوة الكهف مش متاحة"); }
    }

    /* ---------- a quiet Friday reminder on the Home Screen (once, a toast) ---------- */
    function fridayNudge() {
        try {
            var k = "apl.khatma.fnudge", d = dayKey();
            if (!isFriday() || S.kahf[d] || global.localStorage.getItem(k) === d) return;
            var h = new Date().getHours();
            if (h < 9 || h > 16 || (APL.sys && APL.sys.profiles && APL.sys.profiles.isKid && APL.sys.profiles.isKid())) return;
            global.localStorage.setItem(k, d);
            say("النهاردة الجمعة: سورة الكهف (الإعدادات > الصلاة والقرآن > المصحف والختمة)");
        } catch (e) {}
    }
    global.setTimeout(fridayNudge, 45000);
    /* v8.6.5: the shared timer (js/timers.js): skipped while the launcher is not in front */
    if (APL.timers && APL.timers.every) APL.timers.every("fridayNudge", 30 * 60 * 1000, fridayNudge);
    else global.setInterval(fridayNudge, 30 * 60 * 1000);

    APL.khatma = {
        open: openReader, panel: panel, state: function () { return S; },
        goTo: goTo, readPage: readPage, /* v7: same counters/position for the offline Hafs reader */
        juzOf: juzOf, streak: streak, today: today, planDays: planDays, addRead: addRead,
        isFriday: isFriday, kahfPlay: kahfPlay, pages: PAGES, setPlan: function (n) { if (PLANS.indexOf(n) >= 0) { S.plan = n; save(); } },
        planForDays: function (days) { return Math.ceil(PAGES / days); }
    };
})(window);
