/* ============================================================
   islamic.js — the Hijri date and the Islamic occasions (v1.2.51).

   What it gives the rest of the launcher:
     APL.islamic.hijriToday()      today's Hijri date { y, m, d, exact }
     APL.islamic.hijriText(h)      "5 جمادى الآخرة 1448 هـ" in the launcher's language
     APL.islamic.gregorian(j|date) the weekday, day, month and year in the launcher's language
     APL.islamic.occasions()       the next dates: Ramadan, the last ten nights, Eid al-Fitr,
                                   Eid al-Adha and the other occasions, with the days left
                                   (v1.2.117: also the voluntary fasts: White Days, Monday/Thursday, six of Shawwal)

   v8.7.27: the calendar follows the PLACE of the prayer times (the city, found by js/auto-location.js
   or chosen by hand), not Cairo only. "Today" is the date in that city, and the crescent is checked
   at that city's sunset.

   Where the dates come from (Settings > Hijri Calendar Source: Automatic by country, or one picked):
     0. A month corrected by hand (Settings > Correct Ramadan & Eid dates): that start date, shifted
        by the days given. Always exact.
     1. Egypt (the Automatic choice for Egypt): the month starts announced by Dar al-Ifta once they
        are published (ANNOUNCED below), then the crescent rule below for the months not announced
        yet, from a firm anchor (1 Ramadan 1447 = 19 February 2026, announced by Dar al-Ifta).
        Other countries: the Hijri date AlAdhan sends with the prayer times (calendarMethod HJCoSA =
        Saudi announcements, UAQ, or DIYANET for Turkey; saved on the screen for this month and the next
        one, see js/prayer.js), renewed weekly and every 12 hours around a month change.
     2. Every other month: worked out from the astronomical new moon (Meeus, chapter 49). A month ends
        on the evening of its 29th day when the new moon is at least MIN_AGE hours old at sunset in
        the city, otherwise it has 30 days. MIN_AGE is 4 hours (it was 5).
        Checked against 15 Egyptian month starts (Ramadan, Eid al-Fitr, Dhul-Hijjah, 1443 to 1447), taken from the
        announcements as remembered, not re-read from the bulletins: 4 hours fits all 15, 5 hours misses
        Dhul-Hijjah 1445 (the moon was 4.3 hours old at sunset). The hours that fit all 15 are only 3.7 to
        4.3, so this is an estimate, not the authority's real method (which also looks at moonset).
        A date is "exact" once its month has begun and the moon was clearly on one side
        of the limit (1.5 hours); otherwise it is shown with a "≈" until the announcement.
     3. Before the anchor (a screen with a wrong date): the plain tabular Islamic calendar, "≈".
   Nothing here reads the network. All dates are plain day numbers (JDN), so the TV's time
   zone never moves a date.
   ============================================================ */
(function (global) {
    "use strict";

    var APL = global.APL || (global.APL = {});

    /* ---------- day numbers (Gregorian calendar) ---------- */
    function jdn(y, m, d) {
        var a = Math.floor((14 - m) / 12), yy = y + 4800 - a, mm = m + 12 * a - 3;
        return d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
    }
    function ymd(j) {
        var a = j + 32044, b = Math.floor((4 * a + 3) / 146097), c = a - Math.floor(146097 * b / 4);
        var d = Math.floor((4 * c + 3) / 1461), e = c - Math.floor(1461 * d / 4), m = Math.floor((5 * e + 2) / 153);
        return { d: e - Math.floor((153 * m + 2) / 5) + 1, m: m + 3 - 12 * Math.floor(m / 10), y: 100 * b + d - 4800 + Math.floor(m / 10) };
    }
    function weekday(j) { return (j + 1) % 7; }                       // 0 = Sunday
    function pad(n) { return (n < 10 ? "0" : "") + n; }
    function isoOf(j) { var p = ymd(j); return p.y + "-" + pad(p.m) + "-" + pad(p.d); }
    function jdnOfIso(iso) {
        var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ""));
        return m ? jdn(+m[1], +m[2], +m[3]) : null;
    }
    /* v8.7.27: today's date in the city of the prayer times (its own time zone), else the screen's date. */
    function todayJdn() {
        try {
            var j = jdnOfIso(APL.prayer && APL.prayer.todayKey ? APL.prayer.todayKey() : "");
            if (j !== null) return j;
        } catch (e) {}
        var d = new Date();
        return jdn(d.getFullYear(), d.getMonth() + 1, d.getDate());
    }

    /* ---------- the plain tabular Islamic calendar (last resort) ---------- */
    var ISLAMIC_EPOCH = 1948439.5;
    function islamicToJd(y, m, d) {
        return d + Math.ceil(29.5 * (m - 1)) + (y - 1) * 354 + Math.floor((3 + 11 * y) / 30) + ISLAMIC_EPOCH - 1;
    }
    function tabular(j) {
        var jd = j - 0.5;
        var y = Math.floor((30 * (jd - ISLAMIC_EPOCH) + 10646) / 10631);
        var m = Math.min(12, Math.ceil((jd - (29 + islamicToJd(y, 1, 1))) / 29.5) + 1);
        return { y: y, m: m, d: Math.floor(jd - islamicToJd(y, m, 1) + 1) };
    }

    /* ---------- the new moon (Jean Meeus, Astronomical Algorithms, chapter 49) ---------- */
    var RAD = Math.PI / 180;
    function sinD(x) { return Math.sin(x * RAD); }
    var DELTA_T = 69;                                                 // seconds, TT - UT around 2026

    /* New moon number k (k = 0 is the one of 6 January 2000). Returns a Julian Date in UT. */
    function newMoon(k) {
        var T = k / 1236.85, T2 = T * T, T3 = T2 * T, T4 = T3 * T;
        var jde = 2451550.09766 + 29.530588861 * k + 0.00015437 * T2 - 0.000000150 * T3 + 0.00000000073 * T4;
        var E = 1 - 0.002516 * T - 0.0000074 * T2;
        var M = 2.5534 + 29.10535670 * k - 0.0000014 * T2 - 0.00000011 * T3;
        var Mp = 201.5643 + 385.81693528 * k + 0.0107582 * T2 + 0.00001238 * T3 - 0.000000058 * T4;
        var F = 160.7108 + 390.67050284 * k - 0.0016118 * T2 - 0.00000227 * T3 + 0.000000011 * T4;
        var O = 124.7746 - 1.56375588 * k + 0.0020672 * T2 + 0.00000215 * T3;
        var c =
            -0.40720 * sinD(Mp) + 0.17241 * E * sinD(M) + 0.01608 * sinD(2 * Mp) + 0.01039 * sinD(2 * F) +
            0.00739 * E * sinD(Mp - M) - 0.00514 * E * sinD(Mp + M) + 0.00208 * E * E * sinD(2 * M) -
            0.00111 * sinD(Mp - 2 * F) - 0.00057 * sinD(Mp + 2 * F) + 0.00056 * E * sinD(2 * Mp + M) -
            0.00042 * sinD(3 * Mp) + 0.00042 * E * sinD(M + 2 * F) + 0.00038 * E * sinD(M - 2 * F) -
            0.00024 * E * sinD(2 * Mp - M) - 0.00017 * sinD(O) - 0.00007 * sinD(Mp + 2 * M) +
            0.00004 * sinD(2 * Mp - 2 * F) + 0.00004 * sinD(3 * M) + 0.00003 * sinD(Mp + M - 2 * F) +
            0.00003 * sinD(2 * Mp + 2 * F) - 0.00003 * sinD(Mp + M + 2 * F) + 0.00003 * sinD(Mp - M + 2 * F) -
            0.00002 * sinD(Mp - M - 2 * F) - 0.00002 * sinD(3 * Mp + M) + 0.00002 * sinD(4 * Mp);
        var A = [
            [299.77 + 0.107408 * k - 0.009173 * T2, 0.000325], [251.88 + 0.016321 * k, 0.000165],
            [251.83 + 26.651886 * k, 0.000164], [349.42 + 36.412478 * k, 0.000126],
            [84.66 + 18.206239 * k, 0.000110], [141.74 + 53.303771 * k, 0.000062],
            [207.14 + 2.453732 * k, 0.000060], [154.84 + 7.306860 * k, 0.000056],
            [34.52 + 27.261239 * k, 0.000047], [207.19 + 0.121824 * k, 0.000042],
            [291.34 + 1.844379 * k, 0.000040], [161.72 + 24.198154 * k, 0.000037],
            [239.56 + 25.513099 * k, 0.000035], [331.55 + 3.592518 * k, 0.000023]
        ];
        for (var i = 0; i < A.length; i++) c += A[i][1] * sinD(A[i][0]);
        return jde + c - DELTA_T / 86400;
    }

    /* ---------- the sunset of the prayer city (NOAA's short formula, good to a minute or two) ---------- */
    /* v8.7.27: the city of the prayer times (before: Cairo only). */
    function where() {
        var c = null;
        try { c = APL.prayer && APL.prayer.city ? APL.prayer.city() : null; } catch (e) { c = null; }
        return (c && typeof c.lat === "number" && typeof c.lon === "number") ? { lat: c.lat, lon: c.lon, cc: c.cc || "" } : { lat: 30.0444, lon: 31.2357, cc: "EG" };
    }
    function sunsetJd(j, lat, lon) {
        var LAT = typeof lat === "number" ? lat : 30.0444, LON = typeof lon === "number" ? lon : 31.2357;
        var jd = j - LON / 360;                                       // about solar noon there
        var T = (jd - 2451545) / 36525;
        var L0 = (280.46646 + 36000.76983 * T) % 360;
        var M = 357.52911 + 35999.05029 * T;
        var e = 0.016708634 - 0.000042037 * T;
        var C = (1.914602 - 0.004817 * T) * sinD(M) + (0.019993 - 0.000101 * T) * sinD(2 * M) + 0.000289 * sinD(3 * M);
        var om = 125.04 - 1934.136 * T;
        var lam = L0 + C - 0.00569 - 0.00478 * sinD(om);
        var eps = 23 + (26 + (21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60) / 60 + 0.00256 * Math.cos(om * RAD);
        var dec = Math.asin(sinD(eps) * sinD(lam)) / RAD;
        var y = Math.tan(eps * RAD / 2); y *= y;
        var eot = 4 * (y * sinD(2 * L0) - 2 * e * sinD(M) + 4 * e * y * sinD(M) * Math.cos(2 * L0 * RAD) -
                       0.5 * y * y * sinD(4 * L0) - 1.25 * e * e * sinD(2 * M)) / RAD;
        var cosH = (sinD(-0.833) - sinD(LAT) * sinD(dec)) / (Math.cos(LAT * RAD) * Math.cos(dec * RAD));
        var ha = Math.acos(Math.max(-1, Math.min(1, cosH))) / RAD;
        var minutes = 720 - 4 * (LON - ha) - eot;                     // sunset, in minutes after 0h UT
        return (j - 0.5) + minutes / 1440;
    }

    /* The new moon nearest to time t (a Julian Date, UT): the one that ends the lunation. */
    function nearestNewMoon(t) {
        var k0 = Math.floor((t - 2451550.09766) / 29.530588861), best = null, bestGap = Infinity;
        for (var k = k0 - 1; k <= k0 + 2; k++) {
            var nm = newMoon(k), gap = Math.abs(nm - t);
            if (gap < bestGap) { bestGap = gap; best = nm; }
        }
        return best;
    }

    /* Is the new crescent counted on the evening of civil day j (the 29th of the month)?
       The new moon (conjunction) is behind us, by at least MIN_AGE hours at sunset. A new moon that
       comes after sunset, or only a few hours before it, does not count: the month then has 30 days.
       v8.7.27: MIN_AGE 4 (was 5), see the header for what it was checked against and how far it can be trusted. */
    var MIN_AGE = 4;
    function crescentAge(j, w) {
        w = w || where();
        var ss = sunsetJd(j, w.lat, w.lon);
        return (ss - nearestNewMoon(ss)) * 24;
    }
    function crescentCounted(j, w) { return crescentAge(j, w) >= MIN_AGE; }

    /* ---------- the Hijri months ---------- */
    var version = 0;                                                  // bumped by clearCache()
    function offset() {
        var off = 0;
        try { off = parseInt(APL.sys && APL.sys.pref("hijriOffset"), 10) || 0; } catch (e) { off = 0; }
        return off;
    }
    /* Corrections made by hand: { "1448-9": 1 } = the month 9 of 1448 starts one day later than the automatic date. */
    function fixes() {
        var o = null;
        try { o = APL.sys && APL.sys.pref("hijriFix"); } catch (e) { o = null; }
        return (o && typeof o === "object") ? o : {};
    }
    /* The calendar followed here: "egypt" (the rule), "HJCoSA", "UAQ" or "DIYANET" (AlAdhan's Hijri dates). */
    function source() {
        var s = "";
        try { s = APL.prayer && APL.prayer.calendarSource ? APL.prayer.calendarSource() : ""; } catch (e) { s = ""; }
        return s || "egypt";
    }

    /* What the saved prayer times know: { "y-m": first day (JDN) }, and the last saved day. */
    function savedMonths() {
        var known = {}, last = 0, list = [];
        try { list = (APL.prayer && APL.prayer.hijriDays && APL.prayer.hijriDays()) || []; } catch (e) { list = []; }
        for (var i = 0; i < list.length; i++) {
            var it = list[i], j = jdnOfIso(it.iso);
            if (j === null) continue;
            known[it.y + "-" + it.m] = j - (it.d - 1);
            if (j > last) last = j;
        }
        return { known: known, last: last };
    }

    /* The months by the crescent rule, one after the other from the anchor: [{ y, m, start, len, firm, endFirm }].
       firm = the start of this month was decided with the moon clearly on one side of the limit (the anchor is announced). */
    var ANCHOR = { y: 1447, m: 9, start: jdn(2026, 2, 19) };

    /* Egyptian month starts announced by Dar al-Ifta, added as they are published: "y-m" -> first day (JDN).
       The crescent rule alone missed Dhu al-Qa'da 1447, Rabi al-Thani 1448 and Jumada al-Akhira 1448
       (it only checks the moon's age at sunset; on 9 November 2026 the moon even set before the sun),
       so an announced start wins over the rule and is exact. */
    var ANNOUNCED = {
        "1447-10": jdn(2026, 3, 20),
        "1447-11": jdn(2026, 4, 19),
        "1447-12": jdn(2026, 5, 18),
        "1448-1": jdn(2026, 6, 16),
        "1448-2": jdn(2026, 7, 15),
        "1448-3": jdn(2026, 8, 14),
        "1448-4": jdn(2026, 9, 13),
        "1448-5": jdn(2026, 10, 12),
        "1448-6": jdn(2026, 11, 11)
    };
    /* v8.7.50: month starts announced by each country's fatwa authority, fetched from a small file in the project's own repository
       (feed/hijri-announced.json: { "updated": "YYYY-MM-DD", "countries": { "EG": { "1448-9": "2027-02-08" } } }).
       Treated as data only: the text is parsed as JSON and only month keys and dates are kept; anything else is dropped.
       Cached in storage; offline, or before the first fetch, the saved copy and then the crescent estimate are used. */
    var FEED_URL = "https://raw.githubusercontent.com/abdok30303-coder/apl-plus-musalla/main/feed/hijri-announced.json";
    var FEED_KEY = "apl.hijri.feed", FEED_EVERY = 12 * 3600 * 1000, FEED_RETRY = 3600 * 1000;
    var feedMem = null, feedBusy = false;
    function feedSanitize(txt) {
        var j = null, out = {}, n = 0, cc, k, m, d;
        try { j = JSON.parse(String(txt)); } catch (e) { return null; }
        if (!j || typeof j !== "object" || !j.countries || typeof j.countries !== "object") return null;
        for (cc in j.countries) {
            if (!/^[A-Z]{2}$/.test(cc) || !j.countries[cc] || typeof j.countries[cc] !== "object") continue;
            for (k in j.countries[cc]) {
                var km = /^(\d{4})-(\d{1,2})$/.exec(k), v = j.countries[cc][k];
                if (!km || typeof v !== "string") continue;
                var y = parseInt(km[1], 10), mo = parseInt(km[2], 10);
                m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
                if (y < 1447 || y > 1500 || mo < 1 || mo > 12 || !m) continue;
                var yy = parseInt(m[1], 10), mm = parseInt(m[2], 10), dd = parseInt(m[3], 10);
                if (yy < 2026 || yy > 2100 || mm < 1 || mm > 12 || dd < 1 || dd > 31) continue;
                (out[cc] = out[cc] || {})[y + "-" + mo] = jdn(yy, mm, dd);
                n++;
            }
        }
        var upd = (typeof j.updated === "string" && /^\d{4}-\d{2}-\d{2}$/.test(j.updated)) ? j.updated : "";
        return { data: out, n: n, upd: upd };
    }
    function feedLoad() {
        if (feedMem) return feedMem;
        var o = { at: 0, tried: 0, upd: "", n: 0, data: {} };
        try {
            var s = JSON.parse(global.localStorage.getItem(FEED_KEY) || "null");
            if (s && typeof s === "object") {
                o.at = +s.at || 0; o.tried = +s.tried || 0; o.upd = typeof s.upd === "string" ? s.upd : ""; o.n = +s.n || 0;
                var chk = feedSanitize(JSON.stringify({ updated: o.upd, countries: s.iso || {} }));
                if (chk) o.data = chk.data;
            }
        } catch (e) {}
        feedMem = o;
        return o;
    }
    function feedSave(o, iso) {
        try { global.localStorage.setItem(FEED_KEY, JSON.stringify({ at: o.at, tried: o.tried, upd: o.upd, n: o.n, iso: iso })); } catch (e) {}
    }
    var feedIso = {};
    /* The country whose announcements are followed: the one picked in Settings, else Egypt for the Egyptian calendar, else the country of the city. */
    function feedCountry() {
        var p = "auto";
        try { p = APL.sys && APL.sys.pref("hijriCountry") || "auto"; } catch (e) { p = "auto"; }
        if (/^[A-Z]{2}$/.test(p)) return p;
        if (source() === "egypt") return "EG";
        var c = where().cc;
        return /^[A-Z]{2}$/.test(String(c || "").toUpperCase()) ? String(c).toUpperCase() : "EG";
    }
    function feedMonths() {
        var cc = feedCountry(), d = feedLoad().data[cc] || {};
        return d;
    }
    function feedUpdate(force, done) {
        var o = feedLoad(), now = Date.now();
        if (feedBusy) { if (done) done(false, "busy"); return; }
        if (!force && (now - o.at < FEED_EVERY || now - o.tried < FEED_RETRY)) { if (done) done(true, "fresh"); return; }
        feedBusy = true;
        function fin(ok, why, parsed) {
            feedBusy = false;
            o.tried = Date.now();
            if (ok && parsed) {
                var before = JSON.stringify(o.data);
                o.at = o.tried; o.upd = parsed.upd; o.n = parsed.n; o.data = parsed.data;
                feedSave(o, isoOf2(parsed.data));
                if (JSON.stringify(o.data) !== before) {
                    clearCache();
                    try { APL.sys && APL.sys.setPref("hijriFeedStamp", o.at); } catch (e) {}
                }
            } else feedSave(o, isoOf2(o.data));
            if (done) done(ok, why);
        }
        try {
            var x = new global.XMLHttpRequest();
            x.open("GET", FEED_URL + "?t=" + Math.floor(now / 600000), true);
            x.timeout = 15000;
            x.onload = function () {
                var p = (x.status === 200 && x.responseText && x.responseText.length < 200000) ? feedSanitize(x.responseText) : null;
                if (p) fin(true, "ok", p); else fin(false, "bad");
            };
            x.onerror = function () { fin(false, "offline"); };
            x.ontimeout = function () { fin(false, "offline"); };
            x.send();
        } catch (e) { fin(false, "offline"); }
    }
    function isoOf2(data) {
        var out = {}, cc, k;
        for (cc in data) for (k in data[cc]) { var p = ymd(data[cc][k]); (out[cc] = out[cc] || {})[k] = p.y + "-" + (p.m < 10 ? "0" : "") + p.m + "-" + (p.d < 10 ? "0" : "") + p.d; }
        return out;
    }
    function feedStatus() { var o = feedLoad(); return { at: o.at, upd: o.upd, n: o.n, country: feedCountry(), count: Object.keys(feedMonths()).length }; }
    var rule = { sig: "", list: [] };
    function ruleList(w, upto) {
        var sig = w.lat.toFixed(2) + "," + w.lon.toFixed(2);
        if (rule.sig !== sig) rule = { sig: sig, list: [] };
        var L = rule.list, guard = 0;
        if (!L.length) L.push({ y: ANCHOR.y, m: ANCHOR.m, start: ANCHOR.start, firm: true });
        while (L[L.length - 1].start <= upto && guard++ < 1500) {
            var a = L[L.length - 1], age = crescentAge(a.start + 28, w), counted = age >= MIN_AGE;
            a.len = counted ? 29 : 30;
            a.endFirm = counted ? age >= MIN_AGE + 1.5 : age <= MIN_AGE - 1.5;
            var ny = a.y, nm = a.m + 1;
            if (nm > 12) { nm = 1; ny++; }
            L.push({ y: ny, m: nm, start: a.start + a.len, firm: a.endFirm });
        }
        return L;
    }

    /* Before the anchor (a screen with a wrong date): the tabular calendar, months by the rule from there. */
    function tabularMonths(j, count, w) {
        var t = tabular(j), y = t.y, m = t.m, start = j - (t.d - 1), out = [];
        for (var i = 0; i < count; i++) {
            var len = crescentCounted(start + 28, w) ? 29 : 30, ny = y, nm = m + 1;
            if (nm > 12) { nm = 1; ny++; }
            out.push({ y: y, m: m, start: start, len: len, exact: false });
            y = ny; m = nm; start += len;
        }
        return out;
    }

    /* The months from the one that holds day j, `count` of them: { y, m, start, len, exact }, with the corrections applied:
         1. a month corrected by hand: shifted by that many days, exact;
         2. an Egyptian month start announced by Dar al-Ifta (ANNOUNCED above): exact;
         3. the AlAdhan Hijri dates saved on the screen (every source but Egypt's own rule): exact;
         4. the crescent rule: exact once the month has begun and its start was firm. */
    function monthsFrom(j, count) {
        var w = where(), src = source(), saved = src === "egypt" ? { known: {} } : savedMonths(), fx = fixes(), i, cc = feedCountry(), fm = feedMonths();
        if (j < ANCHOR.start - 2) return tabularMonths(j, count, w);
        var L = ruleList(w, j + (count + 3) * 31), eff = [];
        for (i = 0; i < L.length - 1; i++) {
            var r = L[i], key = r.y + "-" + r.m, s = r.start, ex = !!(r.firm && r.start <= j), d = parseInt(fx[key], 10);
            if (cc === "EG" && ANNOUNCED[key] !== undefined) { s = ANNOUNCED[key]; ex = true; }
            if (saved.known[key] !== undefined && Math.abs(saved.known[key] - s) <= 3) { s = saved.known[key]; ex = true; }
            if (fm[key] !== undefined && Math.abs(fm[key] - r.start) <= 3) { s = fm[key]; ex = true; }      // announced by the country, online (a date far from the estimate is ignored)
            if (d) { s += Math.max(-2, Math.min(2, d)); ex = true; }
            eff.push({ y: r.y, m: r.m, start: s, exact: ex });
        }
        for (i = 0; i < eff.length - 1; i++) eff[i].len = eff[i + 1].start - eff[i].start;
        eff.pop();
        for (i = 0; i < eff.length; i++) if (eff[i].start <= j && j < eff[i].start + eff[i].len) break;
        if (i >= eff.length) return tabularMonths(j, count, w);
        return eff.slice(i, i + count);
    }
    function hijriOnDay(j) {
        var mo = monthsFrom(j, 1)[0];
        return { y: mo.y, m: mo.m, d: j - mo.start + 1, exact: mo.exact };
    }

    /* ---------- names, in the launcher's language ---------- */
    function L() { return APL.lang === "ar" ? 0 : APL.lang === "fr" ? 2 : 1; }          // ar, en, fr
    function pick(list) { return list[L()]; }

    var WEEKDAYS = [
        ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"],
        ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
        ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"]
    ];
    var GREG_MONTHS = [
        ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"],
        ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
        ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"]
    ];
    var HIJRI_MONTHS = [
        ["المحرم", "صفر", "ربيع الأول", "ربيع الآخر", "جمادى الأولى", "جمادى الآخرة", "رجب", "شعبان", "رمضان", "شوال", "ذو القعدة", "ذو الحجة"],
        ["Muharram", "Safar", "Rabi' al-Awwal", "Rabi' al-Thani", "Jumada al-Ula", "Jumada al-Akhirah", "Rajab", "Sha'ban", "Ramadan", "Shawwal", "Dhu al-Qi'dah", "Dhu al-Hijjah"],
        ["Mouharram", "Safar", "Rabi' al-Awwal", "Rabi' ath-Thani", "Joumada al-Oula", "Joumada ath-Thania", "Rajab", "Chaabane", "Ramadan", "Chawwal", "Dhou al-Qi'da", "Dhou al-Hijja"]
    ];
    var AH = ["هـ", "AH", "H"], EVENING = ["مساءً", "evening", "soir"];

    function gregorian(j) {
        if (j instanceof Date) j = jdn(j.getFullYear(), j.getMonth() + 1, j.getDate());
        var p = ymd(j), lang = L();
        var month = GREG_MONTHS[lang][p.m - 1];
        return {
            jdn: j, weekday: WEEKDAYS[lang][weekday(j)], day: p.d, month: month, year: p.y,
            date: p.d + " " + month + " " + p.y,
            full: WEEKDAYS[lang][weekday(j)] + (lang === 1 ? ", " : " ") + p.d + " " + month + " " + p.y
        };
    }
    function hijriText(h, opts) {
        if (!h) return "";
        var lang = L();
        var s = (opts && opts.night ? opts.night : h.d) + " " + HIJRI_MONTHS[lang][h.m - 1] + (h.y ? " " + h.y + " " + AH[lang] : "");
        return (opts && opts.night ? (lang === 0 ? "ليلة " : lang === 2 ? "nuit du " : "night of ") : "") + s;
    }
    function hijriToday() { return hijriOnDay(todayJdn() + offset()); }

    /* ---------- the occasions ---------- */
    /* m = Hijri month, d = day it begins on. evening: it begins at Maghrib of that day (the night
       belongs to the next Hijri day). span: "month" = until the end of the month, or a number of days. */
    /* v7.1.2: the virtue of each occasion (Arabic only): s = short line for the cards, f = full text with the source */
    var FADL = {
        newyear: { s: "بداية عام جديد؛ وقفة للمحاسبة، و«أفضل الصيام بعد رمضان شهر الله المحرّم».", f: "«أفضل الصيام بعد رمضان شهر الله المحرّم» (مسلم)؛ بداية عام جديد، فرصة للمحاسبة وتجديد النية." },
        ashura: { s: "صيامه يكفّر السنة الماضية، والأفضل صيام التاسع معه.", f: "«صيام يوم عاشوراء أحتسب على الله أن يكفّر السنة التي قبله» (مسلم)، والأفضل أن يُصام التاسع معه." },
        mawlid: { s: "فرصة للإكثار من الصلاة على النبي ﷺ: من صلّى عليه مرة صلّى الله عليه عشرًا.", f: "«من صلّى عليّ صلاة صلّى الله عليه بها عشرًا» (مسلم)؛ فرصة لتجديد محبته ﷺ باتباع سنّته." },
        isra: { s: "رحلة الإسراء والمعراج وفرض الصلوات الخمس؛ تذكير بمكانة الصلاة.", f: "رحلة الإسراء والمعراج وفرض الصلوات الخمس؛ تذكير بمكانة الصلاة. (تحديد ليلتها غير ثابت بدليل صحيح)" },
        shaban: { s: "كان النبي ﷺ يكثر الصيام في شعبان؛ شهر ترفع فيه الأعمال.", f: "كان ﷺ يكثر الصيام في شعبان (متفق عليه)، وقال: «ترفع فيه الأعمال إلى رب العالمين» (النسائي، حسّنه الألباني). ولم يصح تخصيص ليلة النصف بعبادة." },
        ramadan: { s: "«من صام رمضان إيمانًا واحتسابًا غُفر له ما تقدّم من ذنبه».", f: "«من صام رمضان إيمانًا واحتسابًا غُفر له ما تقدّم من ذنبه» (متفق عليه)." },
        last10: { s: "كان ﷺ إذا دخل العشر أحيا ليله وأيقظ أهله وشدّ مئزره.", f: "كان ﷺ إذا دخل العشر أحيا ليله وأيقظ أهله وشدّ مئزره (متفق عليه)؛ وفيها ليلة القدر." },
        qadr: { s: "«من قام ليلة القدر إيمانًا واحتسابًا غُفر له»؛ ادعُ: اللهم إنك عفوّ تحب العفو فاعفُ عني.", f: "«من قام ليلة القدر إيمانًا واحتسابًا غُفر له ما تقدّم من ذنبه» (متفق عليه)، وهي خير من ألف شهر. والدعاء: «اللهم إنك عفوّ تحب العفو فاعفُ عني» (الترمذي وصححه)." },
        fitr: { s: "«للصائم فرحتان: فرحة عند فطره، وفرحة عند لقاء ربه»؛ وزكاة الفطر قبل الصلاة.", f: "«للصائم فرحتان: فرحة عند فطره، وفرحة عند لقاء ربه» (متفق عليه)؛ ومن سنّته إخراج زكاة الفطر قبل صلاة العيد." },
        shawwal6: { s: "من صام رمضان ثم أتبعه ستًّا من شوال كان كصيام الدهر.", f: "«من صام رمضان ثم أتبعه ستًّا من شوال كان كصيام الدهر» (مسلم)." },
        first10: { s: "«ما من أيام العمل الصالح فيها أحب إلى الله من هذه الأيام العشر».", f: "«ما من أيام العمل الصالح فيها أحب إلى الله من هذه الأيام العشر» (البخاري)؛ فأكثروا فيها من التهليل والتكبير والتحميد." },
        arafah: { s: "صيامه لغير الحاج يكفّر السنة الماضية والباقية.", f: "«أحتسب على الله أن يكفّر السنة التي قبله والسنة التي بعده» (مسلم)، لغير الحاج." },
        adha: { s: "يوم النحر أعظم الأيام عند الله؛ ومن سنّته صلاة العيد والأضحية والتكبير.", f: "«أعظم الأيام عند الله تبارك وتعالى يوم النحر» (أبو داود)؛ ومن سنّته صلاة العيد والأضحية والتكبير." },
        white: { s: "صيام ثلاثة أيام من كل شهر كصيام الدهر؛ ومنها أيام البيض ١٣ و١٤ و١٥.", f: "«صيام ثلاثة أيام من كل شهر صيام الدهر كله» (متفق عليه)؛ ومنها أيام البيض: ١٣ و١٤ و١٥." },
        monthu: { s: "«تُعرض الأعمال يوم الاثنين والخميس فأحب أن يُعرض عملي وأنا صائم».", f: "«تُعرض الأعمال يوم الاثنين والخميس فأحب أن يُعرض عملي وأنا صائم» (الترمذي، وصححه الألباني)." }
    };
    var EVENTS = [
        { key: "newyear", m: 1,  d: 1,  names: ["رأس السنة الهجرية", "Islamic New Year", "Nouvel An hégirien"] },
        { key: "ashura",  m: 1,  d: 10, names: ["يوم عاشوراء", "Day of Ashura", "Jour d'Achoura"] },
        { key: "mawlid",  m: 3,  d: 12, names: ["المولد النبوي", "Mawlid al-Nabi", "Mawlid"] },
        { key: "isra",    m: 7,  d: 27, names: ["الإسراء والمعراج", "Isra' and Mi'raj", "Isra et Miraj"] },
        { key: "shaban",  m: 8,  d: 14, evening: true, night: 15, names: ["ليلة النصف من شعبان", "Mid-Sha'ban night", "Nuit de la mi-Chaabane"] },
        { key: "ramadan", m: 9,  d: 1,  span: "month", core: true, names: ["رمضان", "Ramadan", "Ramadan"] },
        { key: "last10",  m: 9,  d: 20, evening: true, night: 21, span: "month", core: true, names: ["العشر الأواخر", "Last 10 nights", "10 dernières nuits"] },
        { key: "qadr",    m: 9,  d: 26, evening: true, night: 27, names: ["ليلة القدر (27)", "Laylat al-Qadr (27th)", "Nuit du Destin (27e)"] },
        { key: "fitr",    m: 10, d: 1,  core: true, names: ["عيد الفطر", "Eid al-Fitr", "Aïd al-Fitr"] },
        { key: "shawwal6", m: 10, d: 2, span: "month", names: ["ست من شوال", "Six days of Shawwal", "Six jours de Chawwal"] },
        { key: "first10", m: 12, d: 1,  span: 10, names: ["العشر من ذي الحجة", "First 10 of Dhul-Hijjah", "10 premiers jours de Dhou al-Hijja"] },
        { key: "arafah",  m: 12, d: 9,  names: ["يوم عرفة", "Day of Arafah", "Jour d'Arafat"] },
        { key: "adha",    m: 12, d: 10, core: true, names: ["عيد الأضحى", "Eid al-Adha", "Aïd al-Adha"] }
    ];

    var cache = { sig: "", data: null };

    /* One occasion, from the first month that still has it ahead (or under way). */
    function place(ev, months, today) {
        for (var i = 0; i < months.length; i++) {
            var mo = months[i];
            if (mo.m !== ev.m) continue;
            var start = mo.start + ev.d - 1, end = start;
            if (ev.span === "month") end = mo.start + mo.len - 1;
            else if (typeof ev.span === "number") end = start + ev.span - 1;
            if (end < today) continue;
            var st = { ev: ev, start: start, end: end, hy: mo.y, exact: mo.exact };
            if (start > today) { st.kind = "soon"; st.days = start - today; }
            else if (start === today) { st.kind = ev.evening ? "tonight" : (end > start ? "now" : "today"); st.days = 0; }
            else { st.kind = "now"; st.days = 0; }
            if (st.kind === "now" || st.kind === "tonight") { st.left = Math.max(0, end - today); st.dayNo = today - mo.start + 1; }
            st.name = pick(ev.names);
            st.hijri = hijriText({ d: ev.d, m: ev.m, y: mo.y }, ev.night ? { night: ev.night } : null);
            var g = gregorian(start);
            st.dateText = g.full + (ev.evening ? " · " + pick(EVENING) : "");
            return st;
        }
        return null;
    }

    /* v1.2.117: voluntary fasts. The White Days (13, 14, 15 of every Hijri month) and Monday / Thursday.
       Not offered where fasting is not open: Ramadan (it is already obligatory), the day of Eid al-Fitr and
       11-13 Dhul-Hijjah with Eid al-Adha; the 13th of Dhul-Hijjah is one of them, so that month has no White Days. */
    var WHITE_NAMES = ["الأيام البيض (13 و14 و15)", "The White Days (13, 14, 15)", "Les jours blancs (13, 14, 15)"];
    var MONTHU_NAMES = [["صيام الاثنين", "Monday fast", "Jeûne du lundi"], ["صيام الخميس", "Thursday fast", "Jeûne du jeudi"]];
    function monthAt(months, j) {
        for (var i = 0; i < months.length; i++) if (j >= months[i].start && j < months[i].start + months[i].len) return months[i];
        return null;
    }
    function fastClosed(months, j) {
        var mo = monthAt(months, j);
        if (!mo) return true;
        var d = j - mo.start + 1;
        return mo.m === 9 || (mo.m === 10 && d === 1) || (mo.m === 12 && d >= 10);
    }
    function whiteDays(months, today) {
        var best = null;
        for (var i = 0; i < months.length; i++) {
            if (months[i].m === 9 || months[i].m === 12) continue;
            var ev = { key: "white", m: months[i].m, d: 13, span: 3, names: WHITE_NAMES };
            var st = place(ev, [months[i]], today);
            if (st && (!best || st.start < best.start)) best = st;
            if (best) break;                                  // months are in order: the first one that is still ahead
        }
        return best;
    }
    function mondayThursday(months, today) {
        for (var j = today, n = 0; n < 21; j++, n++) {
            var wd = weekday(j);
            if (wd !== 1 && wd !== 4) continue;
            if (fastClosed(months, j)) continue;
            var mo = monthAt(months, j), g = gregorian(j);
            var st = { ev: { key: "monthu", names: MONTHU_NAMES[wd === 1 ? 0 : 1] }, start: j, end: j, hy: mo.y, exact: mo.exact };
            st.kind = j === today ? "today" : "soon"; st.days = j - today;
            st.name = pick(st.ev.names);
            st.hijri = hijriText({ d: j - mo.start + 1, m: mo.m, y: mo.y });
            st.dateText = g.full;
            return st;
        }
        return null;
    }

    function occasions() {
        var off = offset(), today = todayJdn() + off, h = hijriOnDay(today), saved = source() === "egypt" ? { last: 0 } : savedMonths(), w = where();
        var sig = [today, off, h.y, h.m, h.d, h.exact ? 1 : 0, saved.last, source(), w.lat.toFixed(2), w.lon.toFixed(2), JSON.stringify(fixes()), version, feedCountry(), APL.lang].join("|");
        if (cache.sig === sig && cache.data) return cache.data;
        var months = monthsFrom(today, 26), all = [], i;
        for (i = 0; i < EVENTS.length; i++) {
            var st = place(EVENTS[i], months, today);
            if (st) { st.order = i; all.push(st); }
        }
        function rank(a) { return a.kind === "now" || a.kind === "today" || a.kind === "tonight" ? -1 : a.days; }
        function byStart(a, b) { return (rank(a) - rank(b)) || (a.start - b.start) || (a.order - b.order); }
        var wd = whiteDays(months, today), mt = mondayThursday(months, today);
        if (wd) { wd.order = EVENTS.length; all.push(wd); }
        if (mt) { mt.order = EVENTS.length + 1; all.push(mt); }
        all.sort(byStart);
        all.forEach(function (st) { var f = FADL[st.ev && st.ev.key]; st.fadl = f ? f.s : ""; st.fadlFull = f ? f.f : ""; });   /* v7.1.2 */
        var core = all.filter(function (e) { return e.ev.core; });
        var rest = all.filter(function (e) { return !e.ev.core; });
        var out = {
            today: today, hijri: h, exact: h.exact, all: all, core: core,
            next: rest[0] || null,
            ramadan: h.m === 9 ? { day: h.d, left: Math.max(0, months[0].len - h.d), length: months[0].len } : null
        };
        cache = { sig: sig, data: out };
        return out;
    }

    /* v8.7.27: Ramadan and the two Eids the way Settings > Correct Ramadan & Eid dates lists them: the next one of each,
       with the Hijri month it belongs to, its date, and the correction made by hand (days). */
    function keyDates() {
        var o = occasions(), fx = fixes(), out = [];
        ["ramadan", "fitr", "adha"].forEach(function (k) {
            for (var i = 0; i < o.all.length; i++) {
                var st = o.all[i];
                if (st.ev.key !== k) continue;
                var d = parseInt(fx[st.hy + "-" + st.ev.m], 10) || 0;
                out.push({ key: k, name: st.name, hy: st.hy, m: st.ev.m, start: st.start, auto: st.start - d, fix: d, exact: st.exact, dateText: st.dateText });
                break;
            }
        });
        return out;
    }
    function setFix(y, m, delta) {
        var cur = fixes(), o = {}, d = Math.max(-2, Math.min(2, parseInt(delta, 10) || 0)), hy = 0;
        try { hy = hijriToday().y; } catch (e) { hy = 0; }
        Object.keys(cur).forEach(function (q) { if (!hy || parseInt(q, 10) >= hy - 1) o[q] = cur[q]; });   // corrections of past years are dropped
        if (d) o[y + "-" + m] = d; else delete o[y + "-" + m];
        APL.sys.setPref("hijriFix", o);
    }
    function clearCache() { cache = { sig: "", data: null }; rule = { sig: "", list: [] }; version++; }
    /* v8.7.50: look for announced dates a little after start-up, then about hourly (a fetch happens at most every 12 hours; a failed one is retried after an hour). */
    try {
        global.setTimeout(function () { feedUpdate(false); }, 25000);
        global.setInterval(function () { feedUpdate(false); }, 3600000);
    } catch (e) {}

    APL.islamic = {
        jdn: jdn, ymd: ymd, isoOf: isoOf, weekday: weekday, today: todayJdn,
        hijriToday: hijriToday, hijriText: hijriText, gregorian: gregorian,
        /* v8.7.22: Hijri date of any Gregorian day (y, m, d), same offset and rules as hijriToday. prayer.js needs it to mark Ramadan Maghrib in the background schedule. */
        toHijri: function (y, m, d) { return hijriOnDay(jdn(y, m, d) + offset()); },
        occasions: occasions,
        monthName: function (m) { return pick(HIJRI_MONTHS)[m - 1]; },
        /* v8.7.27 */
        clearCache: clearCache,
        stateSig: function () { return [source(), offset(), JSON.stringify(fixes()), version, feedCountry()].join(":"); },
        source: source, keyDates: keyDates, setFix: setFix,
        feedUpdate: feedUpdate, feedStatus: feedStatus, feedCountry: feedCountry, _feedSanitize: feedSanitize, _feedUrl: FEED_URL,
        /* for the tests: the pieces that can be checked on their own */
        _newMoon: newMoon, _sunsetJd: sunsetJd, _tabular: tabular, _crescentCounted: crescentCounted, _crescentAge: crescentAge,
        _monthsFrom: monthsFrom, _ruleList: ruleList
    };
})(window);
