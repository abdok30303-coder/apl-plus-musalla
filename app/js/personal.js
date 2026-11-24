/* ============================================================
   personal.js v7.2.1 (+ reminder before occasions) - "مناسباتي": personal occasions (birthday, wedding anniversary, newborn, graduation, celebration...).
   Stored only in localStorage (apl.personal). Idle until opened: no timer, no network. While open, ONE 1 s timer refreshes
   the live ages (years / months / days / hours / minutes) and is cleared on close. Add/edit with the remote: chips and
   date steppers (UP/DOWN change a value), the keyboard only for an "other name". Chromium 76 safe. Untested on the TV.
   ============================================================ */
(function (global) {
    "use strict";
    var APL = global.APL, K = APL && APL.KEY;
    if (!APL || !APL.Nav || !K) return;
    var STORE = "apl.personal";
    var TYPES = [["birthday", "عيد ميلاد", "🎂"], ["anniv", "ذكرى زواج", "💍"], ["newborn", "ميلاد مولود", "👶"], ["grad", "تخرّج", "🎓"],
        ["engage", "خطوبة", "💐"], ["party", "احتفال", "🎉"], ["other", "مناسبة أخرى", "⭐"]];
    var NAMES = {
        birthday: ["أنا", "أمي", "أبي", "زوجتي", "زوجي", "ابني", "ابنتي", "أخي", "أختي", "جدي", "جدتي", "صديقي"],
        anniv: ["زواجي", "زواج أبي وأمي", "زواج أخي", "زواج أختي", "زواج صديقي"],
        newborn: ["مولودنا الجديد", "مولود أخي", "مولود أختي"],
        grad: ["تخرّجي", "تخرّج ابني", "تخرّج ابنتي", "تخرّج أخي", "تخرّج أختي"],
        engage: ["خطوبتي", "خطوبة أخي", "خطوبة أختي"],
        party: ["حفلة عائلية", "لمّة الأصحاب", "رحلة", "عزومة"],
        other: ["مناسبة عائلية", "ذكرى عزيزة", "يوم مميّز"]
    };
    var MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
    var items = load(), root, body, nav, mode = "list", draft = null, tick = null, opened = false, ageEls = [];
    function load() { try { var a = JSON.parse(global.localStorage.getItem(STORE) || "[]"); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
    function save() { try { global.localStorage.setItem(STORE, JSON.stringify(items)); } catch (e) {} }
    function dg(n) { return APL.digits ? APL.digits(String(n)) : String(n); }
    function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = APL.enx(text); return n; }
    function typeOf(k) { for (var i = 0; i < TYPES.length; i++) if (TYPES[i][0] === k) return TYPES[i]; return TYPES[6]; }
    function dim(y, m) { return new Date(y, m + 1, 0).getDate(); }
    /* calendar difference: years, months, days, then hours and minutes (a birth hour is unknown, so it counts from midnight) */
    function parts(d, now) {
        var y = now.getFullYear() - d.y, m = now.getMonth() - d.m, dd = now.getDate() - d.d;
        if (dd < 0) { m--; dd += dim(now.getFullYear(), now.getMonth() - 1 < 0 ? 11 : now.getMonth() - 1); }
        if (m < 0) { y--; m += 12; }
        return { y: y, m: m, d: dd, h: now.getHours(), n: now.getMinutes(), s: now.getSeconds() };
    }
    function nextDate(d, now) {
        var y = now.getFullYear(), t = new Date(y, d.m, Math.min(d.d, dim(y, d.m)));
        if (t.getTime() + 86400000 <= now.getTime()) { y++; t = new Date(y, d.m, Math.min(d.d, dim(y, d.m))); }
        return t;
    }
    function ageText(it, now) {
        var p = parts(it, now);
        return dg(p.y) + " سنة · " + dg(p.m) + " شهر · " + dg(p.d) + " يوم · " + dg(p.h) + " ساعة · " + dg(p.n) + " دقيقة";
    }
    function leftText(it, now) {
        var t = nextDate(it, now), ms = t.getTime() - now.getTime();
        if (now.getMonth() === it.m && now.getDate() === it.d) return "النهارده! 🎉";
        var days = Math.floor(ms / 86400000), h = Math.floor((ms % 86400000) / 3600000), n = Math.floor((ms % 3600000) / 60000);
        return "باقي " + dg(days) + " يوم و" + dg(h) + " ساعة و" + dg(n) + " دقيقة";
    }
    function refresh() {
        var now = new Date(), i;
        for (i = 0; i < ageEls.length; i++) { ageEls[i].a.textContent = APL.enx((typeOf(ageEls[i].it.type)[0] === "birthday" ? "العمر: " : "مرّ: ") + ageText(ageEls[i].it, now)); ageEls[i].l.textContent = APL.enx(leftText(ageEls[i].it, now)); }
    }
    function btn(text, run, cls) { var b = el("div", "pe__f pe__btn" + (cls ? " " + cls : ""), text); b._run = run; return b; }
    function setNav(focus) {
        var tiles = Array.prototype.slice.call(body.querySelectorAll(".pe__f")), i;
        nav.setTiles(tiles);
        for (i = 0; i < tiles.length; i++) if (tiles[i]._id === focus) { nav.focus(i); return; }
        if (tiles.length) nav.focus(0);
    }
    function paint(focus) {
        body.textContent = ""; ageEls = [];
        if (mode === "list") list(); else form();
        setNav(focus);
        if (tick) { clearInterval(tick); tick = null; }
        if (mode === "list" && items.length) { refresh(); tick = setInterval(refresh, 1000); }
    }
    function list() {
        var head = el("div", "pe__head"); head.appendChild(el("h1", "pe__title", "مناسباتي")); head.appendChild(el("div", "pe__sub", "عيد ميلاد · ذكرى زواج · تخرّج · احتفال… بتتحسب فورًا أول ما تفتح الصفحة"));
        body.appendChild(head);
        var add = btn("＋ إضافة مناسبة", function () { draft = { id: "p" + Date.now(), type: "birthday", name: "", y: 1995, m: 0, d: 1, isNew: true }; mode = "form"; paint("type-0"); }, "pe__add"); add._id = "add";
        body.appendChild(add);
        if (!items.length) { body.appendChild(el("div", "pe__empty", "مفيش مناسبات لسه. دوس «إضافة مناسبة» واختار النوع والاسم والتاريخ بالريموت.")); return; }
        var grid = el("div", "pe__grid");
        items.slice().sort(function (a, b) { return nextDate(a, new Date()) - nextDate(b, new Date()); }).forEach(function (it) {
            var c = el("div", "pe__f pe__card"); c._id = "i-" + it.id; c._run = function () { draft = JSON.parse(JSON.stringify(it)); mode = "form"; paint("name-0"); };
            var ty = typeOf(it.type);
            var cn = el("div", "pe__cname"); cn.textContent = ty[2] + " " + APL.enxName(it.name) + " \u00b7 " + APL.enx(ty[1]); c.appendChild(cn);   /* v8.7.26: typed names are not run through the phrase translator */
            c.appendChild(el("div", "pe__cdate", dg(it.d) + " " + MONTHS[it.m] + " " + dg(it.y)));
            var a = el("div", "pe__age"), l = el("div", "pe__left"); c.appendChild(a); c.appendChild(l); ageEls.push({ it: it, a: a, l: l });
            grid.appendChild(c);
        });
        body.appendChild(grid);
    }
    function chips(label, arr, sel, onPick, prefix) {
        body.appendChild(el("div", "pe__lbl", label));
        var row = el("div", "pe__chips");
        arr.forEach(function (v, i) {
            var c = el("div", "pe__f pe__chip" + (v[0] === sel ? " is-sel" : ""), v[1]); c._id = prefix + i; c._run = function () { onPick(v[0]); }; row.appendChild(c);
        });
        body.appendChild(row);
    }
    function stepper(label, id, text, delta) {
        var s = el("div", "pe__f pe__step"); s._id = id; s._delta = delta;
        s.appendChild(el("div", "pe__stl", label)); s.appendChild(el("div", "pe__stv", "▲  " + text + "  ▼")); return s;
    }
    function form() {
        var head = el("div", "pe__head"); head.appendChild(el("h1", "pe__title", draft.isNew ? "مناسبة جديدة" : "تعديل المناسبة")); body.appendChild(head);
        chips("النوع", TYPES.map(function (t) { return [t[0], t[2] + " " + APL.enx(t[1])]; }), draft.type, function (v) { draft.type = v; if (draft.isNew) draft.name = ""; paint("type-" + TYPES.map(function (t) { return t[0]; }).indexOf(v)); }, "type-");
        var sug = NAMES[draft.type] || NAMES.other;
        chips("الاسم (اختار من المقترحات)", sug.map(function (n) { return [n, n]; }), draft.name, function (v) { draft.name = v; paint("name-" + sug.indexOf(v)); }, "name-");
        var inp = el("input", "pe__f pe__input"); inp.type = "text"; inp.maxLength = 30; inp.placeholder = APL.enx("أو اكتب اسم آخر…"); inp.value = sug.indexOf(draft.name) < 0 ? draft.name : ""; inp._id = "custom";
        inp.dir = "rtl"; inp._run = function () { inp.focus(); };
        inp.addEventListener("input", function () { draft.name = inp.value; });
        inp.addEventListener("keydown", function (e) { if (e.keyCode === K.ENTER || e.keyCode === K.UP || e.keyCode === K.DOWN || e.keyCode === K.ESC) { e.stopPropagation(); inp.blur(); } });
        body.appendChild(inp);
        body.appendChild(el("div", "pe__lbl", "التاريخ (▲ ▼ تغيّر القيمة)"));
        var row = el("div", "pe__steps");
        row.appendChild(stepper("اليوم", "s-d", dg(draft.d), function (v) { draft.d = ((draft.d - 1 + v + 31) % 31) + 1; }));
        row.appendChild(stepper("الشهر", "s-m", MONTHS[draft.m], function (v) { draft.m = (draft.m + v + 12) % 12; }));
        row.appendChild(stepper("السنة", "s-y", dg(draft.y), function (v) { var now = new Date().getFullYear(); draft.y = Math.max(1900, Math.min(now + 1, draft.y + v)); }));
        body.appendChild(row);
        var acts = el("div", "pe__acts");
        var ok = btn("✓ حفظ", function () {
            draft.d = Math.min(draft.d, dim(draft.y, draft.m));
            if (!String(draft.name).trim()) { if (APL.toast) APL.toast("اختار اسم من المقترحات أو اكتب اسم", true); return; }
            var o = JSON.parse(JSON.stringify(draft)); delete o.isNew; draft.name = String(draft.name).trim(); o.name = draft.name;
            var at = -1, i; for (i = 0; i < items.length; i++) if (items[i].id === o.id) at = i;
            if (at >= 0) items[at] = o; else items.push(o);
            save(); mode = "list"; paint("add");
        }, "pe__ok"); ok._id = "save"; acts.appendChild(ok);
        if (!draft.isNew) { var del = btn("🗑 حذف", function () { items = items.filter(function (x) { return x.id !== draft.id; }); save(); mode = "list"; paint("add"); }, "pe__del"); del._id = "del"; acts.appendChild(del); }
        var cancel = btn("إلغاء", function () { mode = "list"; paint("add"); }); cancel._id = "cancel"; acts.appendChild(cancel);
        body.appendChild(acts);
    }
    function onKey(code) {
        var c = nav.current();
        if (c && c._delta && (code === K.UP || code === K.DOWN)) { c._delta(code === K.UP ? 1 : -1); paint(c._id); return true; }
        return false;
    }
    function open() {
        if (opened) return; opened = true; items = load(); mode = "list";
        root = el("section", "pe"); root.setAttribute("dir", "rtl"); body = el("div", "pe__body"); root.appendChild(body); document.body.appendChild(root);
        nav = new APL.Nav({ rawArrowKeys: true, onSelect: function (i, n) { if (n && n._run) n._run(); }, onKey: onKey,
            onBack: function () { if (mode === "form") { mode = "list"; paint("add"); } else close(); } });
        APL.pushNav(nav); paint("add");
    }
    function close() {
        if (!opened) return; opened = false;
        if (tick) { clearInterval(tick); tick = null; }
        if (nav) APL.popNav(nav);
        if (root && root.parentNode) root.parentNode.removeChild(root);
        root = body = nav = null; ageEls = [];
    }
    /* v7.2.1 addendum: reminder BEFORE a personal occasion. Not the alert path (prayer-alert / background-engine are untouched): it is a short
       toast on the launcher when it starts or when you come back to it. Today and the 3 days before; each occasion once per day.
       Respects Do-Not-Disturb (toast info flag). One-shot timeouts only, no interval. */
    var SEEN = "apl.personal.seen", remindT = null;
    function remindDays() { var v = APL.sys && APL.sys.pref ? APL.sys.pref("personalRemindDays") : 3; return (v === 0 || v === 1 || v === 3 || v === 7) ? v : 3; }
    function remindCheck() {
        try {
            var RD = remindDays(); if (RD === 0 || opened || document.hidden || !APL.toast) return;
            var list = load(), now = new Date(), seen = {}, msgs = [], i, it, days, key, name;
            var mid = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
            var today = now.getFullYear() + "-" + (now.getMonth() + 1) + "-" + now.getDate();
            try { seen = JSON.parse(global.localStorage.getItem(SEEN) || "{}") || {}; } catch (e) { seen = {}; }
            for (i = 0; i < list.length; i++) {
                it = list[i];
                if (!it || typeof it.m !== "number" || typeof it.d !== "number") continue;
                days = Math.round((nextDate(it, now).getTime() - mid) / 86400000);
                if (days < 0 || days > RD) continue;
                key = String(it.id || (it.type + it.m + "-" + it.d));
                if (seen[key] === today) continue;
                seen[key] = today;
                name = typeOf(it.type)[2] + " \uE000" + APL.enxName(it.name) + "\uE001";
                msgs.push({ d: days, t: days === 0 ? "🎉 النهارده: " + name : days === 1 ? "⏰ بكرة: " + name : "⏰ بعد " + dg(days) + " أيام: " + name });
            }
            if (!msgs.length) return;
            msgs.sort(function (a, b) { return a.d - b.d; });
            try { global.localStorage.setItem(SEEN, JSON.stringify(seen)); } catch (e2) {}
            msgs.slice(0, 3).forEach(function (m, n) { setTimeout(function () { if (!document.hidden) APL.toast(m.t, true); }, n * 3000); });
        } catch (e3) {}
    }
    /* v8.1.0: nearest personal occasion (name + days left) for the full-width Home widget; null if none */
    function nearest() {
        var list = load(), now = new Date(), best = null, mid = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime(), i, it, d;
        for (i = 0; i < list.length; i++) {
            it = list[i];
            if (!it || typeof it.m !== "number" || typeof it.d !== "number") continue;
            d = Math.round((nextDate(it, now).getTime() - mid) / 86400000);
            if (d < 0) continue;
            if (!best || d < best.days) best = { days: d, name: typeOf(it.type)[2] + " " + APL.enxName(it.name) };
        }
        return best;
    }
    function cycleRemind() { var v = remindDays(), n = v === 3 ? 7 : v === 7 ? 0 : v === 0 ? 1 : 3; APL.sys.setPref("personalRemindDays", n); return n; }
    function remindSoon() { clearTimeout(remindT); remindT = setTimeout(remindCheck, 4000); }
    document.addEventListener("visibilitychange", function () { if (!document.hidden) remindSoon(); });
    remindSoon();
    APL.personal = { open: open, close: close, count: function () { return items.length; }, remind: remindCheck, nearest: nearest, remindDays: remindDays, cycleRemind: cycleRemind };
})(window);
