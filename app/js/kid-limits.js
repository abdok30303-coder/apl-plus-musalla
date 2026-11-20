/* ============================================================
   kid-limits.js (v3.4.0) - CHILD PROFILE follow-up: allowed apps, daily time limit,
   prayer-time lock and bedtime lock. Works ONLY while a child profile is active
   (APL.sys.profiles.isKid()). In every other profile nothing changes.
   - Allowed apps: APL.launchApp / APL.launchDeepLink refuse apps that are not on the list.
   - Daily limit: minutes the child profile was active today (the TV was on and the profile was in use).
   - Locks: from the adhan for N minutes, and a bedtime window. A full-screen cover is shown while locked.
   LIMIT: this cover is inside the launcher. It does NOT block Samsung's own keys (Home / Source / Samsung menus).
   Not touched on purpose: radio, daemon, HDMI, permissions, audio core.
   Untested on the TV.
   ============================================================ */
(function (global) {
    "use strict";
    var APL = global.APL;
    if (!APL || !APL.sys || !APL.sys.profiles) return;
    var P = APL.sys.profiles, KEY = "apl.kidlim", TICK_MS = 15000, MUTE = 449;
    var BED = [
        [0, "\u0645\u0642\u0641\u0648\u0644", null],
        [1, "8 \u0645 \u2192 6 \u0635", [20, 6]],
        [2, "9 \u0645 \u2192 6 \u0635", [21, 6]],
        [3, "10 \u0645 \u2192 6 \u0635", [22, 6]],
        [4, "10 \u0645 \u2192 7 \u0635", [22, 7]]
    ];
    var LIMITS = [0, 30, 60, 90, 120, 180];
    var PRAY = [0, 10, 15, 20, 30];
    var S = load(), cover = null, lastTick = 0, lastFront = 0, warned = false, locked = "";

    function load() {
        var o = {};
        try { o = JSON.parse(global.localStorage.getItem(KEY) || "{}") || {}; } catch (e) { o = {}; }
        return { apps: Array.isArray(o.apps) ? o.apps : null, limit: o.limit | 0, bed: o.bed | 0, pray: o.pray | 0,
                 day: o.day || "", used: o.used | 0 };
    }
    function save() { try { global.localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
    function p2(n) { return (n < 10 ? "0" : "") + n; }
    function dayKey() { var d = new Date(); return d.getFullYear() + "-" + p2(d.getMonth() + 1) + "-" + p2(d.getDate()); }
    function rollDay() { var k = dayKey(); if (S.day !== k) { S.day = k; S.used = 0; warned = false; save(); } }
    function kid() { return !!(P.isKid && P.isKid()); }
    function say(m) { try { APL.toast(m, true); } catch (e) {} }

    /* ---------- why is it locked right now? ("" = not locked) ---------- */
    function reason() {
        if (!kid()) return "";
        rollDay();
        if (S.limit > 0 && S.used >= S.limit * 60) return "\u062E\u0644\u0635 \u0648\u0642\u062A \u0627\u0644\u0646\u0647\u0627\u0631\u062F\u0629";
        var b = BED[S.bed] && BED[S.bed][2];
        if (b) {
            var h = new Date().getHours();
            if (h >= b[0] || h < b[1]) return "\u0648\u0642\u062A \u0627\u0644\u0646\u0648\u0645";
        }
        if (S.pray > 0 && APL.prayer && APL.prayer.list) {
            try {
                var now = Date.now(), L = APL.prayer.list();
                for (var i = 0; i < L.length; i++) {
                    if (L[i].key === "sunrise" || !L[i].at) continue;
                    var t = L[i].at.getTime();
                    if (now >= t && now < t + S.pray * 60000) return "\u0648\u0642\u062A \u0635\u0644\u0627\u0629 " + L[i].name;
                }
            } catch (e) {}
        }
        return "";
    }

    /* ---------- the cover ---------- */
    function ensureCover() {
        if (cover) return cover;
        cover = document.createElement("div");
        cover.style.cssText = "position:fixed;left:0;top:0;right:0;bottom:0;z-index:2147483000;background:#0b1220;color:#fff;" +
            "display:none;align-items:center;justify-content:center;flex-direction:column;direction:rtl;text-align:center;font-family:inherit";
        cover.innerHTML = "<div id=\"klT\" style=\"font-size:64px;font-weight:700;margin-bottom:24px\"></div>" +
            "<div id=\"klS\" style=\"font-size:30px;opacity:.8\"></div>";
        document.body.appendChild(cover);
        return cover;
    }
    function paint() {
        var r = reason();
        if (r === locked) { if (r) { var s = cover && cover.querySelector("#klS"); if (s) s.textContent = sub(); } return; }
        locked = r;
        if (r) {
            ensureCover(); cover.querySelector("#klT").textContent = r; cover.querySelector("#klS").textContent = sub();
            cover.style.display = "flex";
        } else if (cover) cover.style.display = "none";
    }
    function sub() { return "\u0627\u0633\u062A\u0646\u0649 \u0644\u062D\u062F \u0645\u0627 \u0627\u0644\u0648\u0642\u062A \u064A\u062E\u0644\u0635 \u0623\u0648 \u0643\u0644\u0651\u0645 \u0645\u0627\u0645\u0627 \u0648\u0628\u0627\u0628\u0627"; }

    /* While locked every key is swallowed, except Mute (kid-lock.js owns the 3 s hold to leave child mode). */
    function onKey(e) {
        if (!locked) return;
        if (e.keyCode === MUTE || e.key === "VolumeMute" || e.key === "AudioVolumeMute") return;
        e.preventDefault(); if (e.stopImmediatePropagation) e.stopImmediatePropagation();
    }
    global.addEventListener("keydown", onKey, true);
    global.addEventListener("keyup", onKey, true);

    /* ---------- tick: count the time, lock, bring the launcher forward when it is locked ---------- */
    function frontOnce() {
        var now = Date.now();
        if (now - lastFront < 60000) return;
        lastFront = now;
        try {
            var t = global.tizen && global.tizen.application;
            if (t) t.launch(t.getCurrentApplication().appInfo.id, function () {}, function () {});
        } catch (e) {}
    }
    function tick() {
        var now = Date.now();
        if (kid()) {
            rollDay();
            if (lastTick) S.used += Math.min(60, Math.round((now - lastTick) / 1000));
            lastTick = now; save();
            if (S.limit > 0 && !warned && S.used >= S.limit * 60 - 300 && S.used < S.limit * 60) {
                warned = true; say("\u0628\u0627\u0642\u064A 5 \u062F\u0642\u0627\u064A\u0642 \u0639\u0644\u0649 \u0648\u0642\u062A \u0627\u0644\u0646\u0647\u0627\u0631\u062F\u0629");
            }
        } else lastTick = 0;
        paint();
        if (locked && document.hidden) frontOnce();
    }
    setInterval(tick, TICK_MS);
    P.onChange(function () { lastTick = 0; paint(); });
    document.addEventListener("visibilitychange", function () { if (!document.hidden) { lastTick = 0; paint(); } });

    /* ---------- the gate on opening apps ---------- */
    function allowed(id) {
        if (!kid()) return true;
        if (reason()) return false;
        if (S.apps === null) return true;
        return S.apps.indexOf(id) !== -1;
    }
    function denied(id) {
        var r = reason();
        say(r || "\u0627\u0644\u062A\u0637\u0628\u064A\u0642 \u062F\u0647 \u0645\u0634 \u0645\u0633\u0645\u0648\u062D \u0641\u064A \u0648\u0636\u0639 \u0627\u0644\u0637\u0641\u0644");
        return Promise.reject(new Error(r || "\u0645\u0634 \u0645\u0633\u0645\u0648\u062D"));
    }
    ["launchApp", "launchDeepLink"].forEach(function (name) {
        var orig = APL[name];
        if (typeof orig !== "function") return;
        APL[name] = function (id) { return allowed(id) ? orig.apply(this, arguments) : denied(id); };
    });

    /* ---------- the parents' screens (refused while a child profile is active) ---------- */
    function guard() { if (kid()) { say("\u0644\u0644\u0643\u0628\u0627\u0631 \u0628\u0633"); return false; } return true; }
    function fmtLimit(m) { return m ? (m % 60 ? m + " \u062F\u0642\u064A\u0642\u0629" : (m / 60) + " \u0633\u0627\u0639\u0629") : "\u0645\u0642\u0641\u0648\u0644"; }
    function nextOf(list, cur) { var i = list.indexOf(cur); return list[(i + 1) % list.length]; }

    function show(focus) {
        if (!guard()) return;
        rollDay();
        var apps = S.apps === null ? "\u0643\u0644 \u0627\u0644\u062A\u0637\u0628\u064A\u0642\u0627\u062A" : S.apps.length + " \u062A\u0637\u0628\u064A\u0642";
        APL.alert({
            title: "\u0642\u064A\u0648\u062F \u0648\u0636\u0639 \u0627\u0644\u0637\u0641\u0644",
            message: "\u0628\u062A\u0634\u062A\u063A\u0644 \u0628\u0633 \u0648 \u0648\u0636\u0639 \u0627\u0644\u0637\u0641\u0644 \u0634\u063A\u0627\u0644.\n\u062A\u0646\u0628\u064A\u0647: \u0623\u0632\u0631\u0627\u0631 \u0633\u0627\u0645\u0633\u0648\u0646\u062C (Home / Source) \u0645\u0634 \u0645\u062A\u0642\u0641\u0644\u0629.\n\u0627\u0633\u062A\u062E\u062F\u0645 \u0627\u0644\u0646\u0647\u0627\u0631\u062F\u0629: " + Math.round(S.used / 60) + " \u062F\u0642\u064A\u0642\u0629",
            focus: focus || 0,
            buttons: [
                { label: "\u0627\u0644\u062A\u0637\u0628\u064A\u0642\u0627\u062A \u0627\u0644\u0645\u0633\u0645\u0648\u062D\u0629: " + apps, run: function () { pickApps(0); } },
                { label: "\u062D\u062F \u0627\u0644\u0648\u0642\u062A \u0627\u0644\u064A\u0648\u0645\u064A: " + fmtLimit(S.limit), run: function () { S.limit = nextOf(LIMITS, S.limit); save(); show(1); } },
                { label: "\u0642\u0641\u0644 \u0648\u0642\u062A \u0627\u0644\u0635\u0644\u0627\u0629: " + (S.pray ? S.pray + " \u062F\u0642\u064A\u0642\u0629 \u0628\u0639\u062F \u0627\u0644\u0623\u0630\u0627\u0646" : "\u0645\u0642\u0641\u0648\u0644"), run: function () { S.pray = nextOf(PRAY, S.pray); save(); show(2); } },
                { label: "\u0642\u0641\u0644 \u0627\u0644\u0646\u0648\u0645: " + BED[S.bed][1], run: function () { S.bed = (S.bed + 1) % BED.length; save(); show(3); } },
                { label: "\u0635\u0641\u0651\u0631 \u0639\u062F\u0627\u062F \u0627\u0644\u0646\u0647\u0627\u0631\u062F\u0629", run: function () { S.used = 0; warned = false; save(); show(4); } },
                { label: "\u062E\u0644\u0627\u0635" }
            ]
        });
    }

    var PAGE = 6;
    function pickApps(page, list) {
        if (!guard()) return;
        if (!list) {
            if (typeof APL.loadApps !== "function") { say("\u0645\u0641\u064A\u0634 \u0642\u0627\u064A\u0645\u0629 \u062A\u0637\u0628\u064A\u0642\u0627\u062A"); return; }
            APL.loadApps().then(function (a) {
                var seen = {};
                a = (a || []).filter(function (x) { if (!x || !x.id || seen[x.id]) return false; seen[x.id] = 1; return true; });
                a.sort(function (x, y) { return String(x.name || x.id).localeCompare(String(y.name || y.id)); });
                pickApps(page, a);
            });
            return;
        }
        var chosen = S.apps || [], pages = Math.max(1, Math.ceil(list.length / PAGE)), from = page * PAGE;
        var btns = list.slice(from, from + PAGE).map(function (a, i) {
            var on = S.apps === null || chosen.indexOf(a.id) !== -1;
            return { label: (on ? "\u2714 " : "\u2716 ") + (a.name || a.id), run: function () {
                var cur = S.apps === null ? list.map(function (x) { return x.id; }) : S.apps.slice();
                var k = cur.indexOf(a.id);
                if (k === -1) cur.push(a.id); else cur.splice(k, 1);
                S.apps = cur; save(); pickApps(page, list);
            } };
        });
        if (pages > 1) btns.push({ label: "\u0627\u0644\u0635\u0641\u062D\u0629 \u0627\u0644\u062C\u0627\u064A\u0629 (" + (page + 1) + "/" + pages + ")", run: function () { pickApps((page + 1) % pages, list); } });
        btns.push({ label: "\u0627\u0633\u0645\u062D \u0628\u0643\u0644 \u0627\u0644\u062A\u0637\u0628\u064A\u0642\u0627\u062A", run: function () { S.apps = null; save(); pickApps(page, list); } });
        btns.push({ label: "\u062E\u0644\u0627\u0635", run: function () { show(0); } });
        APL.alert({ title: "\u062A\u0637\u0628\u064A\u0642\u0627\u062A \u0627\u0644\u0637\u0641\u0644", message: "\u0627\u0636\u063A\u0637 OK \u0639\u0644\u0649 \u0627\u0644\u062A\u0637\u0628\u064A\u0642 \u0644\u0644\u0633\u0645\u0627\u062D \u0623\u0648 \u0627\u0644\u0645\u0646\u0639", buttons: btns });
    }

    paint();
    APL.kidLimits = { show: show, reason: reason, allowed: allowed, usedMin: function () { rollDay(); return Math.round(S.used / 60); } };
})(window);
