/* ============================================================
   home-status.js — the small lines under the clock on the Home
   Screen: the weather, then the next prayer and the time left.

   Each feature writes its own line; this file owns the box, so a
   feature that has nothing to say (no network, times not fetched
   yet) simply leaves its line empty and nothing moves.
   ============================================================ */
(function (global) {
    "use strict";

    var APL = global.APL;
    if (!APL || !APL.sys) return;

    var box = null;
    var rows = {};              // id -> { el, order }

    function build() {
        if (box) return box;
        box = document.createElement("div");
        box.className = "statusx";
        document.body.appendChild(box);
        return box;
    }

    var lastSig = null;

    /* one row, with its click (weather and prayer open the Prayer and Quran page) */
    function makeLine(id) {
        var r = rows[id];
        if (!r || r.html === null || r.html === undefined || r.html === "") return null;
        var line = document.createElement("div");
        line.className = "statusx__row statusx__row--" + id;
        line.innerHTML = r.html;
        /* Chromium < 105 has no :has(): mark rows that hold the prayer widget (replaces .statusx__row:has(.pw)) */
        try { if (line.querySelector(".pw")) line.className += " statusx__row--haspw"; } catch (eHp) {}
        if (id === "weather") {
            line.style.cursor = "pointer";
            line.addEventListener("click", function () {
                if (APL.prayerPage && typeof APL.prayerPage.openWeather === "function") {
                    APL.prayerPage.open();
                    APL.prayerPage.openWeather();
                }
            });
        } else if (id === "prayer") {
            line.style.cursor = "pointer";
            line.addEventListener("click", function () {
                if (APL.prayerPage) APL.prayerPage.open();
            });
        } else if (id === "hekam") {
            line.style.cursor = "pointer";
            line.addEventListener("click", function () {
                if (APL.prayerPage && APL.prayerPage.openHekam) {
                    APL.prayerPage.open();
                    APL.prayerPage.openHekam();
                }
            });
        }
        return line;
    }

    /* v7.1.1 full-width view: the next four occasions (the same ones as the Prayer and Quran page; the Monday/Thursday fast
       and the White Days repeat all the time, so they stay out), as plain cards */
    function occasionsHtml() {
        var o = null, html = "";
        try { o = APL.islamic ? APL.islamic.occasions() : null; } catch (e) { o = null; }
        if (!o || !o.all) return "";
        o.all.filter(function (st) { return st.ev && st.ev.key !== "white" && st.ev.key !== "monthu"; }).slice(0, 4).forEach(function (st) {
            var big, unit = "", now = false;
            if (st.kind === "soon") { big = APL.digits(String(st.days)); unit = APL.t("days"); }
            else if (st.kind === "today") { big = APL.t("Today"); now = true; }
            else if (st.kind === "tonight") { big = APL.t("Tonight"); now = true; }
            else { big = APL.digits(String(st.left)); unit = APL.t("days left"); now = true; }
            html += '<div class="sx-ev' + (now ? " is-now" : "") + '"><div class="sx-ev__name">' + st.name + '</div>' +
                '<div class="sx-ev__val"><span class="sx-ev__num">' + big + '</span>' + (unit ? '<span class="sx-ev__unit">' + unit + "</span>" : "") + '</div>' +
                '<div class="sx-ev__date">' + (st.exact ? "" : "\u2248 ") + APL.digits(String(st.dateText || "")) + "</div>" +
                (st.fadl && APL.lang === "ar" ? '<div class="sx-ev__fadl">' + st.fadl + "</div>" : "") + "</div>";
        });
        return html;
    }

    /* v7.2.1: "verse of the day" for the full-screen widget: one verse of the verified local mushaf (data/quran), short ones only.
       Loaded once, only when this option is on (meta.json 8 KB + one juz file). No tafsir here: the OCR tafsir has no reliable verse mapping. */
    var ayahCache = null, ayahLoading = false;
    function getJ(path, cb) {
        var r = new XMLHttpRequest();
        r.open("GET", global.APL_ASSET ? global.APL_ASSET(path) : path, true); r.timeout = 15000;
        r.onload = function () { try { cb(null, JSON.parse(r.responseText)); } catch (e) { cb(e); } };
        r.onerror = r.ontimeout = r.onabort = function () { cb(new Error("quran")); };
        r.send();
    }
    function dayKey() { var d = new Date(); return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); }
    function loadAyah() {
        if (ayahLoading || (ayahCache && ayahCache.day === dayKey())) return;
        ayahLoading = true;
        var d = new Date(), doy = Math.floor((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - new Date(d.getFullYear(), 0, 0)) / 864e5);
        var idx = (doy * 97 + d.getFullYear() * 13) % 6236;
        getJ("data/quran/meta.json", function (e, m) {
            if (e || !m || !m.juz || !m.surahs) { ayahLoading = false; return; }
            var j = 0, i;
            for (i = 0; i < 30; i++) if (m.juz[i] <= idx) j = i;
            getJ("data/quran/juz/" + (j + 1 < 10 ? "0" : "") + (j + 1) + ".json", function (e2, jd) {
                ayahLoading = false;
                if (e2 || !jd || !jd.verses) return;
                var k = idx, v = jd.verses[k - jd.start], tries = 0, s = 0;
                while (v && v.length > 240 && tries < 40 && k + 1 - jd.start < jd.verses.length) { k++; tries++; v = jd.verses[k - jd.start]; }
                if (!v) return;
                for (i = 0; i < 114; i++) if (m.surahs[i][1] <= k) s = i;
                var n = k - m.surahs[s][1] + 1;
                if (n === 1 && s !== 0 && m.opening && v.indexOf(m.opening) === 0) v = v.slice(m.opening.length).replace(/^\s+/, "");
                ayahCache = { day: dayKey(), text: v, name: m.surahs[s][0], n: n, s: s + 1 };
                lastSig = null; paint();
            });
        });
    }
    function ayahHtml() {
        if (!ayahCache || ayahCache.day !== dayKey()) { loadAyah(); return ayahCache ? ayahBlock() : ""; }
        return ayahBlock();
    }
    function ayahBlock() {
        var a = ayahCache; if (!a) return "";
        return '<div class="sx-ev sx-ayah"><div class="sx-ayah__t">\uFD3F ' + a.text + ' \uFD3E</div><div class="sx-ayah__s">' + APL.enx("سورة ") + a.name + APL.enx(" · آية ") + APL.digits(String(a.n)) + '</div></div>';
    }

    /* v8.2.0/v8.5.0: fifth choice, today's ayah + its Saadi tafsir excerpt (verified data/tafsir/NN.json). */
    var tfxCache = null, tfxLoading = false;
    function loadTfx() {
        var a = ayahCache; if (tfxLoading || !a || !a.s) return;
        if (tfxCache && tfxCache.day === a.day) return;
        tfxLoading = true;
        getJ("data/tafsir/" + a.s + ".json", function (e2, t) {
            tfxLoading = false;
            var tx = !e2 && t && t.ayahs && t.ayahs[String(a.n)] ? String(t.ayahs[String(a.n)]) : "";
            if (tx.length > 280) tx = tx.slice(0, 275) + "…";
            tfxCache = { day: a.day, text: tx };
            lastSig = null; paint();
        });
    }
    function tafHtml() {
        var h = ayahHtml(), a = ayahCache; if (!a) return h;
        if (!tfxCache || tfxCache.day !== a.day) { loadTfx(); return h; }
        return h + '<div class="sx-ev sx-ayah"><div class="sx-ayah__t">' + (tfxCache.text || APL.enx("تفسير الآية")) + '</div><div class="sx-ayah__s">تيسير الكريم الرحمن في تفسير كلام المنان · الشيخ السعدي</div></div>';
    }

    /* v8.1.0: nearest personal occasion (js/personal.js) */
    function persHtml() {
        var n = APL.personal && APL.personal.nearest ? APL.personal.nearest() : null;
        if (!n) return '<div class="sx-ev sx-ayah"><div class="sx-ayah__t">' + APL.enx("مفيش مناسبات شخصية متسجّلة") + '</div><div class="sx-ayah__s">' + APL.enx("ضيف من صفحة الصلاة والقرآن › مناسباتي") + '</div></div>';
        return '<div class="sx-ev sx-ayah"><div class="sx-ayah__t">' + n.name + '</div><div class="sx-ayah__s">' + APL.enx(n.days === 0 ? "النهارده! 🎉" : n.days === 1 ? "بكرة" : "باقي " + APL.digits(String(n.days)) + " يوم") + '</div></div>';
    }

    /* v8.5.0: wisdom from Kalem Tayeb (data/hekam/excerpts.json)
       v8.6.4: the wisdom shown is picked AT RANDOM (never the same one twice in a row): when the data is first read, every time the
       launcher comes back to the Home Screen (APL.hekamOnHome, called from APL.refreshWidgets) and on every 5-minute rotation.
       Before, the widget always started from the first item of the file and then walked through the list in order.
       v8.7.39: the pool is the WHOLE Kalem Tayeb library - 35,219 wisdoms over 53 sections (data/hekam/sec_*.json,
       indexed by data/hekam/sections.json) - not only the 1,000-item excerpts sample. A pick chooses a section at
       random, weighted by how many wisdoms it holds (so every wisdom has the same chance), loads just that one file
       (at most 3 stay in memory; a section file can reach ~1.8 MB) and takes one wisdom from it. Wisdoms over 500
       letters (about 7% of the library) are too long for a Home-screen widget and are skipped here; every one of
       them is still readable in the full reader (Prayer & Quran > Hekam). If the index cannot be read, the old
       excerpts file stays the fallback. */
    var hekamCache = null, hekamLoading = false, hekamCur = null, hekamLastPick = 0;
    var hkIndex = null, hkIndexLoading = false, hkTotal = 0;
    var hkSecCache = {}, hkSecOrder = [], hkSecLoading = {};
    var HK_MAXLEN = 500;
    function esc(v) { return String(v === null || v === undefined ? "" : v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
    function pickFromSection(sec, d) {
        var items = d && d.items;
        if (!items || !items.length) return null;
        for (var t = 0; t < 15; t++) {
            var x = items[Math.floor(Math.random() * items.length)];
            if (!x || !x.text) continue;
            var tx = String(x.text);
            if (tx.length > HK_MAXLEN) continue;
            if (hekamCur && (x.id === hekamCur.id || tx === hekamCur.text)) continue;
            hekamCur = { id: x.id, text: tx, ref: x.ref || "", sec: sec.name || "" };
            hekamLastPick = Date.now();
            return hekamCur;
        }
        return null;
    }
    function loadHekamSection(sec) {
        if (hkSecLoading[sec.id]) return;
        hkSecLoading[sec.id] = true;
        getJ("data/hekam/" + sec.file, function (e, d) {
            delete hkSecLoading[sec.id];
            if (e || !d || !d.items || !d.items.length) return;
            hkSecCache[sec.id] = d;
            hkSecOrder.push(sec.id);
            while (hkSecOrder.length > 3) delete hkSecCache[hkSecOrder.shift()];
            if (pickFromSection(sec, d)) {
                lastSig = null;
                if ((APL.sys && APL.sys.pref("hekamWidget") === true) || hekamActive()) updateHekamWidget();
                paint();
            }
        });
    }
    function hekamPick() {
        if (hkIndex && hkIndex.length && hkTotal > 0) {
            var r = Math.floor(Math.random() * hkTotal), sec = hkIndex[hkIndex.length - 1];
            for (var i = 0; i < hkIndex.length; i++) { r -= hkIndex[i].count; if (r < 0) { sec = hkIndex[i]; break; } }
            var d = hkSecCache[sec.id];
            if (!d) { hekamLastPick = Date.now(); loadHekamSection(sec); return hekamCur; }
            var oi = hkSecOrder.indexOf(sec.id);
            if (oi !== -1) { hkSecOrder.splice(oi, 1); hkSecOrder.push(sec.id); }
            return pickFromSection(sec, d) || hekamCur;
        }
        var items = hekamCache && hekamCache.items;
        if (!items || !items.length) return null;
        var j = Math.floor(Math.random() * items.length);
        if (items.length > 1 && items[j] === hekamCur) j = (j + 1 + Math.floor(Math.random() * (items.length - 1))) % items.length;
        hekamCur = items[j];
        hekamLastPick = Date.now();
        return hekamCur;
    }
    function hekamActive() {
        return !!(document.body && (document.body.classList.contains("screensaver-active") || document.body.classList.contains("mihrab-active")));
    }
    function hekamFullMode() {
        return APL.sys.pref("prayerWidgetFull") === true && APL.sys.pref("prayerWidgetShow") === "hekam";
    }
    /* v8.7.55: English UI: the wisdom pool is data/hekam/en.json (English only, read on demand); the Kalem Tayeb library stays Arabic-only.
       If the file cannot be read the Arabic library is the fallback. */
    var hkEnLoading = false;
    function hkTxt(it) { return String(it.text || "") + (APL.lang === "en" && it.ref ? " \u2014 " + it.ref : ""); }
    function loadHekam() {
        if (hekamLoading || hekamCache || hkIndex || hkIndexLoading || hkEnLoading) return;
        if (APL.lang === "en") {
            hkEnLoading = true;
            getJ("data/hekam/en.json", function (e, d) {
                hkEnLoading = false;
                if (!e && d && d.items && d.items.length) {
                    hekamCache = { day: dayKey(), items: d.items };
                    hekamPick();
                    lastSig = null;
                    if ((APL.sys && APL.sys.pref("hekamWidget") === true) || hekamActive()) updateHekamWidget();
                    paint();
                    return;
                }
                loadHekamAr();
            });
            return;
        }
        loadHekamAr();
    }
    function loadHekamAr() {
        if (hekamLoading || hekamCache || hkIndex || hkIndexLoading) return;
        hkIndexLoading = true;
        getJ("data/hekam/sections.json", function (e, d) {
            hkIndexLoading = false;
            if (!e && d && d.length) {
                hkIndex = [];
                var i;
                for (i = 0; i < d.length; i++) if (d[i] && d[i].count > 0 && d[i].file) hkIndex.push(d[i]);
                hkTotal = 0;
                for (i = 0; i < hkIndex.length; i++) hkTotal += hkIndex[i].count;
                if (hkIndex.length) {
                    hekamPick();
                    lastSig = null;
                    if ((APL.sys && APL.sys.pref("hekamWidget") === true) || hekamActive()) updateHekamWidget();
                    paint();
                    return;
                }
            }
            /* the section index could not be read: the old 1,000-wisdom excerpts file is the fallback */
            hekamLoading = true;
            getJ("data/hekam/excerpts.json", function (e2, d2) {
                hekamLoading = false;
                if (e2 || !d2 || !d2.length) return;
                hekamCache = { day: dayKey(), items: d2 };
                hekamPick();
                lastSig = null;
                if ((APL.sys && APL.sys.pref("hekamWidget") === true) || hekamActive()) updateHekamWidget();
                paint();
            });
        });
    }
    function hekamHtml() {
        if (!hekamCache) { loadHekam(); return ""; }
        var cur = hekamCur || hekamPick();
        if (!cur) return "";
        return '<div class="sx-ev sx-ayah"><div class="sx-ayah__t">' + esc(cur.text) + '</div><div class="sx-ayah__s">' + (cur.ref ? esc(cur.ref) + ' \u00B7 ' : '') + esc(cur.sec || '\u062D\u0643\u0645 \u0648\u0645\u0648\u0627\u0639\u0638 \u0627\u0644\u0643\u0644\u0645 \u0627\u0644\u0637\u064A\u0628') + '</div></div>';
    }
    /* v8.6.4: the launcher is back on the Home Screen (from an app, HDMI or a page): a new random wisdom. Calls that arrive in a burst
       (visibilitychange + focus + the 400 ms / 1.5 s looks) pick only once (4 s), and nothing is picked while a page covers the Home Screen. */
    function hekamOnHome(force) {
        try {
            if (document.hidden || hekamActive()) return;
            var cl = document.body.classList;
            if (cl.contains("has-aplpage") || cl.contains("has-settings") || cl.contains("has-cc") || cl.contains("has-search") || cl.contains("blackout-active") || cl.contains("has-blackout")) return;
            var widgetOn = APL.sys.pref("hekamWidget") === true, fullOn = hekamFullMode();
            if (!widgetOn && !fullOn) return;
            if (!hkIndex && !hekamCache) { loadHekam(); return; }
            if (!force && Date.now() - hekamLastPick < 4000) return;
            hekamPick();
            if (widgetOn) updateHekamWidget();
            if (fullOn) { lastSig = null; paint(); }
        } catch (e) {}
    }

    /* v8.5.0: standalone Hekam widget on Home Screen with screen placement and custom scaling */
    var hekamBox = null;
    function buildHekamBox() {
        if (hekamBox) return hekamBox;
        hekamBox = document.createElement("div");
        hekamBox.id = "hekam-standalone-widget";
        hekamBox.className = "hekam-widget";
        hekamBox.style.cursor = "pointer";
        hekamBox.addEventListener("click", function () {
            if (APL.prayerPage && APL.prayerPage.openHekam) {
                APL.prayerPage.open();
                APL.prayerPage.openHekam();
            }
        });
        document.body.appendChild(hekamBox);
        return hekamBox;
    }

    function updateHekamWidget() {
        var ssActive = document.body.classList.contains("screensaver-active") || document.body.classList.contains("mihrab-active");
        var on = (APL.sys && APL.sys.pref("hekamWidget") === true) || ssActive;
        if (!on) {
            if (rows.hekam) { delete rows.hekam; lastSig = null; paint(); }
            if (hekamBox && hekamBox.parentNode) { hekamBox.parentNode.removeChild(hekamBox); hekamBox = null; }
            if (APL.timers && APL.timers.cancel) APL.timers.cancel("hekamWidget");
            return;
        }
        if (!hkIndex && !hekamCache) { loadHekam(); return; }
        var it = hekamCur || hekamPick();
        if (!it) return;
        var pos = (APL.sys.pref("hekamPos") || "above-dock");
        var scale = Number(APL.sys.pref("hekamScale")) || 100;

        if (pos === "inline" && !ssActive) {
            if (hekamBox && hekamBox.parentNode) { hekamBox.parentNode.removeChild(hekamBox); hekamBox = null; }
            /* v8.7.33: the whole wisdom shows here too - a longer wisdom takes a smaller font and a wider
               row instead of the old two-line cut with "..." */
            var tlen = hkTxt(it).length;
            var sizeCls = tlen > 220 ? " hk-long" : tlen > 150 ? " hk-mid" : "";
            var html = '<div class="statusx__card hc__row hc__row--hekam' + (sizeCls ? " hk-wide" : "") + '" style="--hekam-s:' + (scale / 100) + '">' +
                '<div class="hc__cell">' +
                    '<span class="hc__time"><span class="hc__t">💎</span></span>' +
                    '<span class="hc__label hc__label--hekam">' + APL.enx("حكمة اليوم") + '</span>' +
                '</div>' +
                '<div class="hc__date hc__date--hekam">' +
                    '<span class="hc__greg hc__greg--hekam hc__text--green' + sizeCls + '"' + (APL.lang === "en" ? ' dir="ltr"' : '') + '>' + esc(hkTxt(it)) + '</span>' +
                '</div>' +
            '</div>';
            rows.hekam = { html: html, order: 25 };
            lastSig = null;
            paint();
            return;
        }

        // Detached standalone box
        if (rows.hekam) { delete rows.hekam; lastSig = null; paint(); }
        var color = APL.sys.pref("hekamColor") || "white";
        var hb = buildHekamBox();
        hb.className = "hekam-widget" + (ssActive ? "" : " hekam-widget--" + pos) + " hekam-widget--color-" + color;
        hb.style.setProperty("--hekam-scale", String(scale / 100));
        hb.innerHTML = '<div class="hekam-w__inner">' +
            '<div class="hekam-w__text"' + (APL.lang === "en" ? ' dir="ltr" style="text-align:left"' : '') + '>' + esc(hkTxt(it)) + '</div>' +
        '</div>';
        fitHekam(hb, scale, pos, ssActive);
    }
    /* v8.7.33: the whole wisdom ALWAYS shows - the four-line "..." clamp is gone from custom.css.
       A long wisdom first widens the window (up to nearly the whole screen), then makes the font smaller,
       down to a readable minimum; if a wisdom still needs more room the window grows taller instead of
       cutting the text. The same fit now also runs in the screen saver and the live mihrab, where a fixed
       font size used to override it. */
    /* v8.7.34: the wisdom window must never sit on the clock or the prayer widget. After the text fits, the window is
       placed in the free space: the gap between the widgets on its own row (next to its corner if that gap is wide
       enough, else the widest gap). The width is the gap, the font shrinks to the readable minimum, and only
       then does the window grow taller, always inside the free column. Measured live, so it works for any
       widget layout, left-to-right or right-to-left, 720p or 1080p. */
    var lastFit = null, obsSig = "";
    /* Rectangles in the 1920x1080 stage's own pixels (the PC preview scales the stage; on the TV the scale is 1). */
    function stageBox() {
        var bd = document.body, r = bd.getBoundingClientRect(), w = bd.offsetWidth || global.innerWidth || 1920;
        return { k: (r.width / w) || 1, x: r.left, y: r.top, w: w, h: bd.offsetHeight || global.innerHeight || 1080 };
    }
    function stageRect(e, sb) {
        var r = e.getBoundingClientRect();
        return { l: (r.left - sb.x) / sb.k, t: (r.top - sb.y) / sb.k, r: (r.right - sb.x) / sb.k, b: (r.bottom - sb.y) / sb.k };
    }
    function hekamObstacles() {
        var out = [], sb = stageBox();
        [".status", ".statusx"].forEach(function (sel) {
            var e = document.querySelector(sel);
            if (!e) return;
            var cs = global.getComputedStyle(e);
            if (cs.display === "none" || cs.visibility === "hidden" || parseFloat(cs.opacity) === 0) return;
            var r = stageRect(e, sb);
            if (r.r - r.l > 4 && r.b - r.t > 4) out.push(r);
        });
        return out;
    }
    function gapsFor(obs, top, bottom, lo, hi, gap) {
        var segs = [[lo, hi]];
        obs.forEach(function (o) {
            if (o.b <= top || o.t >= bottom) return;
            var cl = o.l - gap, cr = o.r + gap, next = [];
            segs.forEach(function (g) {
                if (cr <= g[0] || cl >= g[1]) { next.push(g); return; }
                if (cl > g[0]) next.push([g[0], cl]);
                if (cr < g[1]) next.push([cr, g[1]]);
            });
            segs = next;
        });
        return segs;
    }
    function fitHekam(hb, scale, pos, ssActive) {
        lastFit = [hb, scale, pos, ssActive];
        try {
            var txt = hb.querySelector(".hekam-w__text");
            if (!txt) return;
            var sbx = stageBox(), vw = sbx.w, vh = sbx.h;
            var mihrab = !!(document.body && document.body.classList.contains("mihrab-active"));
            var centered = ssActive || pos === "above-dock" || pos === "top-center" || pos === "bottom-center";
            var fs = mihrab ? 28 : ssActive ? 23 : Math.round(24 * (scale / 100));
            var min = Math.max(15, Math.round(vh / 72));
            var maxH = Math.round(vh * (ssActive ? 0.5 : 0.33));
            var wNorm = Math.round(vw * (centered ? 0.6 : 0.42));
            var wWide = Math.round(vw * (centered ? 0.92 : 0.8));
            var free = !ssActive && !mihrab;
            var margin = Math.round(vw * 0.034), gap = Math.round(vw * 0.0125), minW = Math.round(vw * 0.22);
            hb.style.left = ""; hb.style.right = ""; hb.style.transform = ""; hb.style.maxHeight = "";
            var cap = wNorm, wide = false, rect, i, segs, anchor, pick, k, len;
            txt.style.fontSize = fs + "px";
            for (i = 0; i < 5; i++) {
                hb.style.maxWidth = cap + "px";
                if (free) {
                    rect = stageRect(hb, sbx);
                    segs = gapsFor(hekamObstacles(), rect.top - 6, rect.bottom + 6, margin, vw - margin, gap);
                    anchor = centered ? vw / 2 : (/left/.test(pos) ? margin : vw - margin);
                    pick = null;
                    for (k = 0; k < segs.length; k++) if (segs[k][0] <= anchor + 1 && segs[k][1] >= anchor - 1 && segs[k][1] - segs[k][0] >= minW) pick = segs[k];
                    if (!pick) for (k = 0; k < segs.length; k++) if (!pick || segs[k][1] - segs[k][0] > pick[1] - pick[0]) pick = segs[k];
                    if (pick) {
                        len = Math.floor(pick[1] - pick[0]);
                        var want = Math.min(len, wide ? wWide : wNorm);
                        hb.style.maxWidth = want + "px";
                        hb.style.minWidth = Math.min(want, 440) + "px";
                        if (centered) { hb.style.left = Math.round((pick[0] + pick[1]) / 2) + "px"; }
                        else if (/left/.test(pos)) { hb.style.left = Math.round(pick[0]) + "px"; hb.style.right = "auto"; }
                        else { hb.style.right = Math.round(vw - pick[1]) + "px"; hb.style.left = "auto"; }
                    }
                }
                /* 1) widen the window (inside the free gap) before touching the font */
                if (!wide && hb.offsetHeight > maxH) { wide = true; cap = wWide; if (!free) { hb.style.maxWidth = cap + "px"; } continue; }
                /* 2) shrink the font, never below the readable minimum */
                while (fs > min && hb.offsetHeight > maxH) {
                    fs -= 1;
                    txt.style.fontSize = fs + "px";
                }
                if (!free) break;
                /* 3) the height may have changed, so the free gap may have changed too: look again (a few rounds) */
                var r2 = stageRect(hb, sbx), s2 = gapsFor(hekamObstacles(), r2.top - 6, r2.bottom + 6, margin, vw - margin, gap), ok = false;
                for (k = 0; k < s2.length; k++) if (r2.left >= s2[k][0] - 2 && r2.right <= s2[k][1] + 2) ok = true;
                if (ok) break;
            }
            /* still tall at the minimum font: the window stays tall inside its column; nothing is ever cut */
        } catch (e) {}
    }
    /* the widgets next to it can change size (prayer card, tasks): look again every few seconds, only when they moved */
    global.setInterval(function () {
        try {
            if (!lastFit || !lastFit[0] || !lastFit[0].parentNode || document.hidden) return;
            var sig = hekamObstacles().map(function (o) { return [o.l, o.t, o.r, o.b].map(Math.round).join(","); }).join(";") + "|" + (global.innerWidth || 0);
            if (sig === obsSig) return;
            obsSig = sig;
            fitHekam(lastFit[0], lastFit[1], lastFit[2], lastFit[3]);
        } catch (e) {}
    }, 2500);
    function rotateHekam() {
        hekamPick();
        updateHekamWidget();
        if (hekamFullMode()) { lastSig = null; paint(); }
    }
    function armHekamWidget() {
        var ssActive = document.body.classList.contains("screensaver-active") || document.body.classList.contains("mihrab-active");
        if ((APL.sys && APL.sys.pref("hekamWidget") === true) || ssActive) {
            updateHekamWidget();
            if (APL.timers && APL.timers.every) APL.timers.every("hekamWidget", 300000, rotateHekam);
        } else {
            if (APL.timers && APL.timers.cancel) APL.timers.cancel("hekamWidget");
            if (rows.hekam) { delete rows.hekam; lastSig = null; paint(); }
            if (hekamBox && hekamBox.parentNode) { hekamBox.parentNode.removeChild(hekamBox); hekamBox = null; }
        }
    }

    function paint() {
        if (!box) return;
        var ids = Object.keys(rows).sort(function (a, b) { return rows[a].order - rows[b].order; });
        var wide = APL.sys.pref("prayerWidgetFull") === true && !!rows.prayer && !!rows.prayer.html && rows.prayer.html.indexOf("pw pw--") >= 0;
        var show = APL.sys.pref("prayerWidgetShow"), occ = wide ? (show === "ayah" ? ayahHtml() : show === "tafsir" ? tafHtml() : show === "hekam" ? hekamHtml() : show === "pers" ? persHtml() : occasionsHtml()) : "";
        /* v1.2.96: nothing changed since the last paint (the usual case on the 15 s refresh): leave the DOM alone */
        var sig = (wide ? "W" : "N") + occ + "\u0003" + ids.map(function (id) { return id + "\u0001" + rows[id].html; }).join("\u0002");
        if (sig === lastSig) return;
        lastSig = sig;
        box.innerHTML = "";
        box.classList.toggle("statusx--wide", wide);
        if (wide) {
            var top = document.createElement("div"), l;
            top.className = "sx-top";
            ["prayer", "weather", "tasks", "hekam"].forEach(function (id) { l = makeLine(id); if (l) top.appendChild(l); });
            box.appendChild(top);
            if (occ) { var strip = document.createElement("div"); strip.className = "sx-occ"; strip.innerHTML = occ; box.appendChild(strip); }
            return;
        }
        ids.forEach(function (id) { var line = makeLine(id); if (line) box.appendChild(line); });
    }

    /* html: a string, or null to hide the line. order: 0 = first (top). */
    function set(id, html, order) {
        build();
        rows[id] = { html: html, order: order === undefined ? 10 : order };
        paint();
    }

    APL.sys.onPref("prayerWidgetFull", function () { lastSig = null; paint(); });
    APL.sys.onPref("prayerWidgetShow", function () { lastSig = null; paint(); if (hekamFullMode() && !hekamCache) loadHekam(); });
    APL.sys.onPref("hekamWidget", function () { armHekamWidget(); });
    APL.sys.onPref("hekamPos", function () { updateHekamWidget(); });
    APL.sys.onPref("hekamScale", function () { updateHekamWidget(); });
    APL.sys.onPref("hekamColor", function () { updateHekamWidget(); });
    APL.sys.onPref("personalRemindDays", function () {});
    APL.updateHekam = updateHekamWidget;
    APL.hekamOnHome = hekamOnHome;
    APL.armHekam = armHekamWidget;
    APL.hekamRefit = function () { try { if (lastFit && lastFit[0] && lastFit[0].parentNode) fitHekam(lastFit[0], lastFit[1], lastFit[2], lastFit[3]); } catch (e) {} };   /* v8.7.40: the Ramadan widget moved the wisdom widget */
    /* v8.7.14: the full-screen prayer widget (the same prayer / weather / tasks row and the occasions strip as the Home Screen
       "full view"), built as a loose element for the Quran listening page. Independent of the Home option; null if the prayer times are not ready. */
    function wideNode() {
        try {
            var pr = rows.prayer && rows.prayer.html;
            if (!pr || pr.indexOf("pw pw--") < 0) {
                pr = APL.prayer && APL.prayer.widgetHtml ? APL.prayer.widgetHtml({ variant: "home" }) : "";
                if (!pr) return null;
            }
            var node = document.createElement("div"), top = document.createElement("div"), saved = rows.prayer, tmp = { html: pr, order: 20 }, l;
            node.className = "statusx statusx--wide statusx--qa";
            top.className = "sx-top";
            rows.prayer = tmp;
            try { ["prayer", "weather", "tasks"].forEach(function (id) { l = makeLine(id); if (l) { l.style.cursor = "default"; top.appendChild(l); } }); }
            finally { if (saved) rows.prayer = saved; else delete rows.prayer; }
            node.appendChild(top);
            var occ = ""; try { occ = occasionsHtml(); } catch (eOc) {}
            if (occ) { var strip = document.createElement("div"); strip.className = "sx-occ"; strip.innerHTML = occ; node.appendChild(strip); }
            return node;
        } catch (e) { return null; }
    }
    APL.homeStatus = { set: set, wideNode: wideNode, clear: function (id) { if (rows[id]) { delete rows[id]; paint(); } } };

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { build(); armHekamWidget(); });
    else { build(); armHekamWidget(); }
})(window);
