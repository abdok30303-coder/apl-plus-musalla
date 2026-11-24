/* ============================================================
   prayer-flow.js (v3.5.0) - PRAYER FLOW: adhan -> iqama countdown -> dim -> resume.
   Off by default (Settings > Prayer and Quran > Prayer Flow). Works only when an iqama time is set for the prayer
   (Prayer page > Adjust Prayer Times > Iqama minutes) and the launcher is in front.
   1) From the adhan: a calm full-screen countdown "iqama in mm:ss".
   2) At the iqama: the screen goes dark with a small text for N minutes (10 / 15 / 20), so nobody has to turn the TV off.
   3) Then it lifts by itself and says a short dua. Any key lifts it at once (volume / mute keys are left alone).
   Not touched on purpose: radio, daemon, HDMI, permissions, audio core (it never plays or pauses sound).
   Untested on the TV.
   ============================================================ */
(function (global) {
    "use strict";
    var APL = global.APL;
    if (!APL || !APL.prayer || !APL.prayer.iqama) return;
    var KEY = "apl.pflow", MINS = [10, 15, 20], S = load(), box = null, shown = "", pending = null, skip = "", poll = 0, sec = 0;

    function load() {
        var o = null;
        try { o = JSON.parse(global.localStorage.getItem(KEY) || "null"); } catch (e) { o = null; }
        if (!o || typeof o !== "object") o = {};
        o.on = o.on === true; o.min = MINS.indexOf(o.min) >= 0 ? o.min : 10;
        return o;
    }
    function save() { try { global.localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
    function dg(x) { try { return APL.digits ? APL.digits(String(x)) : String(x); } catch (e) { return String(x); } }
    function sk(k) { return k + ":" + new Date().toDateString(); }
    function p2(n) { return (n < 10 ? "0" : "") + n; }
    function mmss(ms) { var s = Math.max(0, Math.ceil(ms / 1000)); return dg(Math.floor(s / 60) + ":" + p2(s % 60)); }

    function ensure() {
        if (box) return;
        box = document.createElement("div"); box.className = "pflow";
        box.innerHTML = "<div class=\"pflow__a\"></div><div class=\"pflow__b\"></div>";
        document.body.appendChild(box);
    }
    function show(phase, a, b) {
        ensure();
        box.className = "pflow is-open pflow--" + phase;
        box.children[0].textContent = a || ""; box.children[1].textContent = b || "";
        shown = phase;
    }
    function hide() { if (box) box.className = "pflow"; shown = ""; global.clearInterval(sec); sec = 0; }

    function check() {
        if (!S.on || global.document.hidden) { if (shown) hide(); return; }
        var q = null, now = Date.now();
        try { q = APL.prayer.iqama(); } catch (e) { q = null; }
        if (q && sk(q.key) !== skip) {
            pending = { key: q.key, end: q.at.getTime() };
            var prevPhase = shown;
            show("iqama", APL.enx("الإقامة بعد ") + mmss(q.ms), q.name);
            if (!sec || prevPhase !== "iqama") {
                if (sec) global.clearInterval(sec);
                sec = global.setInterval(check, 1000);
            }
            return;
        }
        if (pending && now >= pending.end && now < pending.end + S.min * 60000 && sk(pending.key) !== skip) {
            var left = pending.end + S.min * 60000 - now;
            var prevPhaseDim = shown;
            show("dim", APL.enx("الصلاة"), APL.lang === "ar" ? "تعود الشاشة بعد " + dg(Math.ceil(left / 60000)) + " د" : "The screen returns in " + dg(Math.ceil(left / 60000)) + " min");
            if (!sec || prevPhaseDim !== "dim") {
                if (sec) global.clearInterval(sec);
                sec = global.setInterval(check, 15000);
            }
            return;
        }
        if (pending && now >= pending.end + S.min * 60000) {
            pending = null;
            if (shown) { hide(); try { APL.toast("تقبّل الله صلاتكم", true); } catch (e) {} }
            return;
        }
        if (shown) hide();
    }
    global.addEventListener("keydown", function (e) {
        if (!shown) return;
        if (e.keyCode === 447 || e.keyCode === 448 || e.keyCode === 449) return;
        e.preventDefault(); e.stopImmediatePropagation();
        if (pending) skip = sk(pending.key);
        hide();
    }, true);
    global.document.addEventListener("visibilitychange", check);
    poll = global.setInterval(function () { if (S.on) check(); }, 15000);

    function panel(focus) {
        APL.alert({
            title: "تدفق الصلاة", focus: focus || 0,
            message: "عدّاد الإقامة بعد الأذان، وبعدها الشاشة بتهدى ويرجع كل شيء لوحده.\nلازم تحدد دقايق الإقامة الأول (صفحة الصلاة > ضبط المواقيت).\nأي زرار بيرجّع الشاشة فورًا.",
            buttons: [
                { label: "تدفق الصلاة: " + (S.on ? "شغّال" : "مقفول"), run: function () { S.on = !S.on; save(); if (!S.on) hide(); panel(0); } },
                { label: "مدة هدوء الشاشة: " + dg(S.min) + " دقيقة", run: function () { S.min = MINS[(MINS.indexOf(S.min) + 1) % MINS.length]; save(); panel(1); } },
                { label: "خلاص" }
            ]
        });
    }
    APL.prayerFlow = { panel: panel, state: function () { return S; } };
})(window);
