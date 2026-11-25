/* ============================================================
   prayer.js — prayer times for the Home Screen, the "Prayer and
   Quran" page, and the 24/7 Vetro background alert supervisor.

   - AlAdhan API (method 5, Egyptian General Authority of Survey,
     timezone Africa/Cairo), cached for current + next month.
   - Syncs a rolling 30-day schedule of exact UTC Unix timestamps
     to Vetro's persistent root daemon (/opt/usr/home/owner/APL/bg/)
     so prayer alerts ALWAYS play on time in the background even
     when Salah Launcher is suspended behind YouTube, Netflix, IPTV,
     or HDMI inputs.
   ============================================================ */
(function (global) {
    "use strict";

    var APL = global.APL, sys = APL && APL.sys;
    if (!APL || !sys) return;

    var SITE = global.APL_SITE || {};
    var CFG = SITE.prayer || {};
    var TZ = CFG.timezone || "Africa/Cairo";
    var NAMES = [
        ["fajr", "Fajr", "الفجر"],
        ["sunrise", "Sunrise", "الشروق"],
        ["dhuhr", "Dhuhr", "الظهر"],
        ["asr", "Asr", "العصر"],
        ["maghrib", "Maghrib", "المغرب"],
        ["isha", "Isha", "العشاء"]
    ];
    var API_KEY = { fajr: "Fajr", sunrise: "Sunrise", dhuhr: "Dhuhr", asr: "Asr", maghrib: "Maghrib", isha: "Isha" };

    var days = {};
    var loadedMonths = {};
    var lastError = "", lastFired = null, tickTimer = null, ready = false;
    var syncedSig = "", syncingVetro = false;

    function cityKey() { return sys.pref("prayerCity") || CFG.city || "cairo"; }
    function city() { return global.APL_CITY ? global.APL_CITY(cityKey()) : { key: "cairo", lat: 30.0444, lon: 31.2357, ar: "القاهرة", en: "Cairo" }; }
    function cityName() { var c = city(); return APL.lang === "ar" ? c.ar : c.en; }
    /* v8.7.21: world support. The time zone, the calculation method, the Asr rule and the high-latitude rule follow the chosen city. */
    function tz() { var c = city(); return (c && c.tz) || CFG.timezone || "Africa/Cairo"; }
    function methodId() {
        var v = sys.pref("prayerMethod"), n = parseInt(v, 10);
        if (v !== undefined && v !== null && v !== "auto" && !isNaN(n)) return n;
        var c = city();
        return (global.APL_METHOD_AUTO && c && c.cc) ? global.APL_METHOD_AUTO(c.cc) : (CFG.method || 5);
    }
    function schoolId() { var n = parseInt(sys.pref("prayerSchool"), 10); return isNaN(n) ? (CFG.school === 1 ? 1 : 0) : (n === 1 ? 1 : 0); }
    function hlNum() { var n = parseInt(sys.pref("prayerHighLat"), 10); return (n >= 1 && n <= 3) ? n : 0; }
    function hlParam() { return hlNum() ? "&latitudeAdjustmentMethod=" + hlNum() : ""; }
    function methodInfo() {
        var id = methodId(), L = global.APL_METHODS || [];
        for (var i = 0; i < L.length; i++) if (L[i].id === id) return L[i];
        return { id: id, en: "Method " + id, ar: "طريقة " + id, fajr: 18, isha: 17, ishaMin: 0, mag: 0 };
    }
    /* What the saved month belongs to: the city, the method, the Asr rule and the high-latitude rule. */
    function locSig() {
        var c = city();
        return c.key + (c.key === "custom" ? "@" + c.lat.toFixed(3) + "," + c.lon.toFixed(3) : "") + "|" + methodId() + "|" + schoolId() + "|" + hlNum() + "|" + calSource();
    }
    /* v8.7.27: the Hijri calendar of this place: the one picked in Settings > Hijri Calendar Source, else the one of the city's country
       (js/cities.js APL_CAL_AUTO: Egypt = Dar al-Ifta's rule worked out in js/islamic.js, Turkey = Diyanet, the rest = Saudi announcements).
       AlAdhan is always asked for a calendarMethod too, so its Hijri dates follow the country (Egypt uses HJCoSA only as the fallback). */
    function calSource() {
        var v = sys.pref("hijriSource");
        if (v && v !== "auto") return String(v);
        var c = city();
        return global.APL_CAL_AUTO ? global.APL_CAL_AUTO(c && c.cc) : "HJCoSA";
    }
    function calParam() { var s = calSource(); return "&calendarMethod=" + (s === "egypt" ? "HJCoSA" : s); }
    function methodNote() {
        var m = methodInfo();
        return APL.t("Times from AlAdhan, {method}. Timezone {tz}.", { method: APL.lang === "ar" ? m.ar : m.en, tz: tz() });
    }
    function tzHours(isoDay) { var o = at(isoDay, "12:00"); return o ? cairoOffset(o) / 3600000 : 2; }
    function alertsOn() { return sys.pref("prayerAlerts") !== false; }
    function nameOf(key) {
        for (var i = 0; i < NAMES.length; i++) if (NAMES[i][0] === key) return APL.lang === "ar" ? NAMES[i][2] : APL.t(NAMES[i][1]);
        return key;
    }

    /* v1.2.96: per-prayer adjustment (minutes) and the summer-time switch. The saved times from AlAdhan
       are never touched: every read goes through view(), which shifts a copy. */
    function pad2(n) { return (n < 10 ? "0" : "") + n; }
    function adjAll() { var a = sys.pref("prayerAdj"); return (a && typeof a === "object") ? a : {}; }
    function adjOf(key) { var v = parseInt(adjAll()[key], 10); return isNaN(v) ? 0 : Math.max(-60, Math.min(60, v)); }
    function summerOn() { return sys.pref("prayerSummer") === true; }
    function namesOn() { return sys.pref("prayerNames") !== false; }
    /* v1.2.105: size of the Home Screen prayer widget, in % above its normal size (0, 25, 50, 75, 100).
       Written once as --pws on <html>; css/custom.css multiplies the widget's sizes by it. */
    function scaleOf() { var v = +sys.pref("prayerWidgetScale"); return (v === 25 || v === 50 || v === 75 || v === 100 || v === 150 || v === 200) ? v : 0; }   /* v7.1.1: up to +200% = 300% of the normal size */
    function applyScale() { try { global.document.documentElement.style.setProperty("--pws", String(1 + scaleOf() / 100)); } catch (e) {} }
    function totalAdj(key) { return adjOf(key) + (summerOn() ? 60 : 0); }
    function anyAdj() { if (summerOn()) return true; var a = adjAll(); for (var k in a) if (parseInt(a[k], 10)) return true; return false; }
    function adjSig() { return JSON.stringify(adjAll()) + (summerOn() ? "S" : ""); }
    function shiftHhmm(hhmm, mins) {
        var m = /^(\d{1,2}):(\d{2})/.exec(String(hhmm || ""));
        if (!m || !mins) return hhmm;
        var t = Math.max(0, Math.min(1439, (+m[1]) * 60 + (+m[2]) + mins));
        return pad2(Math.floor(t / 60)) + ":" + pad2(t % 60);
    }
    function setAdj(key, v) {
        var a = {}, cur = adjAll();
        Object.keys(cur).forEach(function (k) { a[k] = cur[k]; });
        v = Math.max(-60, Math.min(60, v));
        if (v) a[key] = v; else delete a[key];
        sys.setPref("prayerAdj", a);
    }
    function view(dayIso) {
        var d = days[dayIso];
        if (!d || !anyAdj()) return d;
        var o = {};
        Object.keys(d).forEach(function (k) { o[k] = d[k]; });
        NAMES.forEach(function (n) { if (d[n[0]]) o[n[0]] = shiftHhmm(d[n[0]], totalAdj(n[0])); });
        return o;
    }

    /* v8.7.21: one formatter per time zone (the zone of the chosen city), made when first needed. */
    var fmtCache = {};
    function fmtFor(zone) {
        if (fmtCache[zone] !== undefined) return fmtCache[zone];
        var f = null;
        try {
            f = new global.Intl.DateTimeFormat("en-GB", {
                timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit",
                hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false
            });
        } catch (e) { f = null; }
        fmtCache[zone] = f;
        return f;
    }

    function cairoParts(when) {
        var d = when || new Date(), fmt = fmtFor(tz());
        if (!fmt) {
            return { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate(), H: d.getHours(), M: d.getMinutes(), S: d.getSeconds(), month: d.getMonth() + 1 };
        }
        var o = {}, list = fmt.formatToParts ? fmt.formatToParts(d) : null;
        if (list) {
            for (var i = 0; i < list.length; i++) o[list[i].type] = list[i].value;
        } else {
            var s = fmt.format(d);
            var m = /(\d+)\/(\d+)\/(\d+),?\s+(\d+):(\d+):(\d+)/.exec(s);
            if (m) o = { day: m[1], month: m[2], year: m[3], hour: m[4], minute: m[5], second: m[6] };
        }
        var p = {
            y: parseInt(o.year, 10), m: parseInt(o.month, 10), d: parseInt(o.day, 10),
            H: parseInt(o.hour, 10) % 24, M: parseInt(o.minute, 10), S: parseInt(o.second, 10)
        };
        p.month = p.m;
        return p;
    }

    function iso(p) { return p.y + "-" + (p.m < 10 ? "0" : "") + p.m + "-" + (p.d < 10 ? "0" : "") + p.d; }
    function dayPlus(p, offsetDays) {
        var dt = new Date(Date.UTC(p.y, p.m - 1, p.d + offsetDays));
        return dt.getUTCFullYear() + "-" + (dt.getUTCMonth() + 1 < 10 ? "0" : "") + (dt.getUTCMonth() + 1) + "-" + (dt.getUTCDate() < 10 ? "0" : "") + dt.getUTCDate();
    }

    function cairoOffset(when) {
        var d = when || new Date(), p = cairoParts(d);
        var asUTC = global.Date.UTC(p.y, p.m - 1, p.d, p.H, p.M, p.S);
        return asUTC - Math.floor(d.getTime() / 1000) * 1000;
    }

    function at(dayIso, hhmm) {
        var m = /^(\d{1,2}):(\d{2})/.exec(String(hhmm || ""));
        if (!m) return null;
        var parts = dayIso.split("-");
        var probe = new global.Date(global.Date.UTC(+parts[0], +parts[1] - 1, +parts[2], +m[1], +m[2], 0));
        var off = cairoOffset(probe);
        var t = global.Date.UTC(+parts[0], +parts[1] - 1, +parts[2], +m[1], +m[2], 0) - off;
        return new global.Date(t);
    }

    function monthKey(y, m) { return "apl.prayer." + y + "-" + (m < 10 ? "0" : "") + m; }
    function readMonth(y, m) {
        var key = monthKey(y, m), raw = null;
        try { raw = JSON.parse(global.localStorage.getItem(key) || "null"); } catch (e) { raw = null; }
        if (!raw || !raw.days) return false;
        if (raw.city && raw.city !== locSig()) return false;
        Object.keys(raw.days).forEach(function (d) { days[d] = raw.days[d]; });
        loadedMonths[y + "-" + (m < 10 ? "0" : "") + m] = true;
        return true;
    }
    function cleanOld(y, m) {
        var keep = {};
        [[-1, 0], [0, 0], [1, 0]].forEach(function (d) {
            var dt = new Date(y, m - 1 + d[0], 1);
            keep[monthKey(dt.getFullYear(), dt.getMonth() + 1)] = true;
        });
        try {
            for (var i = global.localStorage.length - 1; i >= 0; i--) {
                var k = global.localStorage.key(i);
                if (k && k.indexOf("apl.prayer.") === 0 && !keep[k]) global.localStorage.removeItem(k);
            }
        } catch (e) {}
    }

    /* v8.7.27: the Hijri days of a saved month can change when a moon sighting is announced, so a saved month is renewed after 7 days,
       and after 12 hours in the days around a Hijri month change (day 27 to day 2). What is saved is shown meanwhile and kept if the renewal fails. */
    function staleMs() {
        var d = 7 * 24 * 3600000;
        try { var h = APL.islamic && APL.islamic.hijriToday ? APL.islamic.hijriToday() : null; if (h && (h.d >= 27 || h.d <= 2)) d = 12 * 3600000; } catch (e) {}
        return d;
    }
    function isStale(y, m) {
        try {
            var raw = JSON.parse(global.localStorage.getItem(monthKey(y, m)) || "null");
            return !raw || !raw.at || Date.now() - raw.at > staleMs();
        } catch (e) { return false; }
    }
    function fetchMonth(y, m, force) {
        var mk = y + "-" + (m < 10 ? "0" : "") + m;
        if (!force) {
            if (!loadedMonths[mk]) readMonth(y, m);
            if (loadedMonths[mk] && !isStale(y, m)) return Promise.resolve(true);
        }
        var c = city();
        var url = "https://api.aladhan.com/v1/calendar?latitude=" + c.lat + "&longitude=" + c.lon +
                  "&method=" + methodId() + "&school=" + schoolId() + hlParam() + calParam() +
                  "&month=" + m + "&year=" + y;
        return APL.fetchJSON(url, 15000).then(function (j) {   // v1.2.115: 15 s limit
            var list = (j && j.data) || [];
            if (!list.length) throw new Error("empty answer");
            var store = {};
            list.forEach(function (item) {
                var g = item.date && item.date.gregorian;
                if (!g) return;
                var d = g.date ? String(g.date).substr(0, 10) : "";
                var isoDay;
                if (/^\d{2}-\d{2}-\d{4}$/.test(d)) { var p = d.split("-"); isoDay = p[2] + "-" + p[1] + "-" + p[0]; }
                else if (/^\d{4}-\d{2}-\d{2}$/.test(d)) isoDay = d;
                else return;
                var t = item.timings || {}, out = {};
                Object.keys(API_KEY).forEach(function (k) {
                    out[k] = String(t[API_KEY[k]] || "").replace(/\s*\(.*\)\s*$/, "").trim();
                });
                out.hijri = (item.date.hijri && item.date.hijri.date) || "";
                out.hijriAr = (item.date.hijri && item.date.hijri.month && item.date.hijri.month.ar) || "";
                out.hijriEn = (item.date.hijri && item.date.hijri.month && item.date.hijri.month.en) || "";
                out.hijriDay = (item.date.hijri && item.date.hijri.day) || "";
                out.hijriYear = (item.date.hijri && item.date.hijri.year) || "";
                store[isoDay] = out;
                days[isoDay] = out;
            });
            try { global.localStorage.setItem(monthKey(y, m), JSON.stringify({ at: Date.now(), city: locSig(), days: store })); } catch (e) {}
            loadedMonths[mk] = true;
            lastError = "";
            syncedSig = "";
            cleanOld(y, m);
            return true;
        });
    }

    /* Push rolling 30-day prayer timestamps + alert config to Vetro persistent daemon */
    /* v8.7.22: the Ramadan cannon switch (Ramadan mode panel) now also decides the Maghrib alert key */
    function cannonOn() { try { return !(APL.ramadan && APL.ramadan.cannonOn && !APL.ramadan.cannonOn()); } catch (e) { return true; } }
    var retryAt = 0, retryStep = 0;
    function backOff() { retryStep = Math.min(retryStep + 1, 5); retryAt = Date.now() + Math.min(15000 * Math.pow(2, retryStep - 1), 300000); }
    document.addEventListener("visibilitychange", function () { if (!document.hidden) { retryAt = 0; } });
    function syncToVetro(force) {
        if (!APL.bgAudio || !APL.bgAudio.syncPrayerSchedule || syncingVetro) return;
        var p = cairoParts();
        var minSec = Math.floor(Date.now() / 1000) - 180;
        var entries = [];
        for (var off = 0; off < 30; off++) {
            var dIso = dayPlus(p, off);
            var dMap = view(dIso);
            if (!dMap) continue;
            for (var i = 0; i < NAMES.length; i++) {
                var k = NAMES[i][0];
                if (k === "sunrise" || !dMap[k]) continue;
                var when = at(dIso, dMap[k]);
                if (!when) continue;
                var sec = Math.floor(when.getTime() / 1000);
                if (sec >= minSec) {
                    var isRam = false;
                    try {
                        var q = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dIso);
                        if (q && APL.islamic && APL.islamic.toHijri) {
                            var h = APL.islamic.toHijri(+q[1], +q[2], +q[3]);
                            if (h && h.m === 9) isRam = true;
                        }
                    } catch (e) {}
                    var alertKey = (k === "maghrib" && isRam && cannonOn()) ? "maghrib_ramadan" : k;
                    entries.push({
                        epoch: sec,
                        id: k + "@" + dIso + "_" + dMap[k],
                        key: alertKey
                    });
                }
            }
        }
        var on = alertsOn();
        var pauseRad = sys.pref("radioDuringAlert") !== false;
        var vol = parseFloat(sys.pref("prayerAlertVolume"));
        if (!(vol >= 0.1 && vol <= 1.5)) vol = 0.92;
        var sig = [locSig(), (APL.islamic && APL.islamic.stateSig ? APL.islamic.stateSig() : ""), adjSig(), entries.length, entries[0] ? entries[0].id : "", on ? 1 : 0, pauseRad ? 1 : 0, vol, cannonOn() ? 1 : 0].join("|");
        if (!force && sig === syncedSig && entries.length > 0) return;

        if (!force && Date.now() < retryAt) return;          // Vetro was not ready: wait before asking again
        syncingVetro = true;
        APL.bgAudio.available().then(function (ok) {
            if (!ok) { syncingVetro = false; backOff(); return; }
            return APL.bgAudio.syncPrayerSchedule(entries, {
                prayerAlerts: on,
                pauseRadio: pauseRad,
                alertVol: vol
            }).then(function () {
                syncedSig = sig;
                syncingVetro = false;
                retryStep = 0; retryAt = 0;
            });
        }).catch(function () {
            syncingVetro = false;
            backOff();
        });
    }

    /* v1.2.117: local calculation, ONLY a fallback for the days AlAdhan could not give (no saved month and no
       network). Egyptian General Authority of Survey angles (Fajr 19.5, Isha 17.5), Shafi'i Asr (the site's
       school setting 1 = Hanafi), sunrise/sunset at 0.833 deg, standard time UTC+2: like the AlAdhan data the
       Summer Time switch adds its hour on top (view()). Such a day carries calc:true, is never saved to the
       month cache (so the real times are fetched and replace it as soon as the network is back) and the Prayer
       page says so. It can differ from AlAdhan by a minute or two. */
    function calcDay(isoDay, lat, lon) {
        var q = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDay);
        if (!q) return null;
        var R = Math.PI / 180;
        function sin(x) { return Math.sin(x * R); }
        function cos(x) { return Math.cos(x * R); }
        function fix(x, a) { x = x - a * Math.floor(x / a); return x < 0 ? x + a : x; }
        var d = (Date.UTC(+q[1], +q[2] - 1, +q[3], 12, 0, 0) - Date.UTC(2000, 0, 1, 12, 0, 0)) / 86400000;      // days since J2000.0 at 12:00 UT
        var g = fix(357.529 + 0.98560028 * d, 360), qq = fix(280.459 + 0.98564736 * d, 360);
        var L = fix(qq + 1.915 * sin(g) + 0.020 * sin(2 * g), 360), e = 23.439 - 0.00000036 * d;
        var ra = fix(Math.atan2(cos(e) * sin(L), cos(L)) / R, 360) / 15;
        var eqt = qq / 15 - ra, decl = Math.asin(sin(e) * sin(L)) / R;
        eqt = eqt - 24 * Math.round(eqt / 24);
        var noon = 12 - eqt - lon / 15 + tzHours(isoDay);   // local solar noon in the city's own time zone (v8.7.21)
        function span(angle) {                                                          // hours from noon to the sun at -angle (angle > 0 = below the horizon)
            var c = (-sin(angle) - sin(decl) * sin(lat)) / (cos(decl) * cos(lat));
            if (c < -1 || c > 1) return null;
            return Math.acos(c) / R / 15;
        }
        var P = methodInfo();                                                           // v8.7.21: the method, the Asr rule and far-north cities
        var asrAngle = -Math.atan(1 / ((schoolId() === 1 ? 2 : 1) + Math.tan(Math.abs(lat - decl) * R))) / R;
        var sr = span(0.833);                                                           // sunrise and sunset are symmetrical around noon
        var t = { fajr: span(P.fajr), sunrise: sr, asr: span(asrAngle), maghrib: P.mag ? span(P.mag) : sr, isha: P.ishaMin ? 0 : span(P.isha) };
        if (sr === null || t.asr === null) return null;
        var night = 24 - 2 * sr;                                                        // hours from sunset to the next sunrise
        if (t.fajr === null) t.fajr = sr + night / 7;                                   // the sun never goes deep enough: one-seventh of the night
        if (t.maghrib === null) t.maghrib = sr;
        if (P.ishaMin) {
            var ishaMin = P.ishaMin;                                                    // v8.7.26: Umm Al-Qura (4) is 120 min after Maghrib in Ramadan, like AlAdhan
            if (P.id === 4) { try { var hq = APL.islamic && APL.islamic.toHijri ? APL.islamic.toHijri(+q[1], +q[2], +q[3]) : null; if (hq && hq.m === 9) ishaMin = 120; } catch (e) {} }
            t.isha = t.maghrib + ishaMin / 60;
        }
        else if (t.isha === null) t.isha = sr + night / 7;
        function hm(h) { var m = Math.round(fix(h, 24) * 60) % 1440; return pad2(Math.floor(m / 60)) + ":" + pad2(m % 60); }
        return { fajr: hm(noon - t.fajr), sunrise: hm(noon - t.sunrise), dhuhr: hm(noon), asr: hm(noon + t.asr),
                 maghrib: hm(noon + t.maghrib), isha: hm(noon + t.isha), hijri: "", hijriAr: "", hijriEn: "", hijriDay: "", hijriYear: "", calc: true };
    }
    /* v3.3.3 auto calibration: the local maths (calcDay) is compared with the AlAdhan days saved on the screen
       (up to 30, never the calc days) and the mean gap per prayer, rounded to minutes (max 5), is added to the
       local days made while offline. AlAdhan days are never changed. Untested on the TV. */
    var CAL_KEY = "apl.prayer.calib", CAL_NAMES = ["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"];
    function calib() {
        try { var c = JSON.parse(global.localStorage.getItem(CAL_KEY) || "null"); return c && c.v ? c : null; } catch (e) { return null; }
    }
    function toMin(h) { var m = /^(\d{1,2}):(\d{2})/.exec(String(h || "")); return m ? (+m[1]) * 60 + (+m[2]) : null; }
    function calibrate() {
        var c = city(), keys = Object.keys(days).filter(function (k) { return days[k] && !days[k].calc; }).sort().reverse().slice(0, 30);
        if (keys.length < 5) return null;
        var sum = {}, cnt = {};
        keys.forEach(function (k) {
            var raw = calcDay(k, c.lat, c.lon);
            if (!raw) return;
            CAL_NAMES.forEach(function (n) {
                var a = toMin(days[k][n]), b = toMin(raw[n]);
                if (a === null || b === null) return;
                sum[n] = (sum[n] || 0) + (a - b); cnt[n] = (cnt[n] || 0) + 1;
            });
        });
        var v = {}, any = false;
        CAL_NAMES.forEach(function (n) {
            if (!cnt[n] || cnt[n] < 5) return;
            v[n] = Math.max(-5, Math.min(5, Math.round(sum[n] / cnt[n])));
            any = true;
        });
        if (!any) return null;
        var out = { v: v, n: keys.length, city: c.key, at: Date.now() };
        try { global.localStorage.setItem(CAL_KEY, JSON.stringify(out)); } catch (e) {}
        return out;
    }
    function fillCalc() {
        var c = city(), p = cairoParts(), n = 0, cb = calib();
        if (cb && cb.city !== c.key) cb = null;
        for (var off = -1; off < 31; off++) {                // yesterday too: the night line needs yesterday's Maghrib
            var k = dayPlus(p, off);
            if (days[k]) continue;
            var o = calcDay(k, c.lat, c.lon);
            if (o && cb) CAL_NAMES.forEach(function (nm) { if (cb.v[nm]) o[nm] = shiftHhmm(o[nm], cb.v[nm]); });
            if (o) { days[k] = o; n++; }
        }
        return n;
    }

    function loadAll(force) {
        var p = cairoParts(), jobs = [fetchMonth(p.y, p.m, force)];
        var nextM = new Date(p.y, p.m, 1);
        jobs.push(fetchMonth(nextM.getFullYear(), nextM.getMonth() + 1, force));
        return Promise.all(jobs).then(function () {
            try { calibrate(); } catch (e3) {}
            ready = true;
            render();
            syncToVetro(true);
            return true;
        }, function (e) {
            lastError = (e && e.message) || "network";
            try { calibrate(); } catch (e4) {}
            try { if (fillCalc()) syncedSig = ""; } catch (e2) {}          // v1.2.117: only the days that have nothing saved
            ready = true;
            render();
            syncToVetro(false);
            return false;
        });
    }

    /* The Hijri date AlAdhan sent with a saved day: "05-06-1448" (DD-MM-YYYY) -> { d, m, y }.
       js/islamic.js uses it as the exact starting point of its calendar (v1.2.50). */
    function hijriParts(t) {
        if (!t) return null;
        var a = /^(\d{1,2})-(\d{1,2})-(\d{4})$/.exec(String(t.hijri || "")), r = null;
        if (a) r = { d: +a[1], m: +a[2], y: +a[3] };
        else {
            var b = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(String(t.hijri || ""));
            if (b) r = { d: +b[3], m: +b[2], y: +b[1] };
        }
        if (!r || r.m < 1 || r.m > 12 || r.d < 1 || r.d > 30 || r.y < 1300 || r.y > 1600) return null;
        return r;
    }

    function todayKey() { return iso(cairoParts()); }
    function today() { return view(todayKey()) || null; }
    function tomorrowKey() { return dayPlus(cairoParts(), 1); }

    function listFor(dayIso) {
        var d = view(dayIso);
        if (!d) return [];
        var now = new global.Date();
        return NAMES.map(function (n) {
            var when = at(dayIso, d[n[0]]);
            return { key: n[0], name: nameOf(n[0]), time: d[n[0]] || "", at: when, past: !!(when && when <= now) };
        });
    }

    function next() {
        var p = cairoParts(), now = new global.Date();
        var t = view(iso(p));
        var candidates = NAMES.filter(function (n) { return n[0] !== "sunrise"; });
        if (t) {
            for (var i = 0; i < candidates.length; i++) {
                var when = at(iso(p), t[candidates[i][0]]);
                if (when && when > now) {
                    return { key: candidates[i][0], name: nameOf(candidates[i][0]), time: t[candidates[i][0]],
                             at: when, ms: when - now, today: true };
                }
            }
        }
        var tk = tomorrowKey(), tt = view(tk);
        if (tt) {
            var w = at(tk, tt.fajr);
            if (w) return { key: "fajr", name: nameOf("fajr"), time: tt.fajr, at: w, ms: w - now, today: false, tomorrow: true };
        }
        return null;
    }

    /* v1.2.117: the night, from Maghrib to the next Fajr (the saved, adjusted times), and its last third.
       Before today's Fajr the night is the one that began at yesterday's Maghrib. null when a day is not saved. */
    function night() {
        var p = cairoParts(), now = new global.Date(), tk = iso(p), t = view(tk);
        var fajrToday = t ? at(tk, t.fajr) : null, s = null, e = null, k;
        if (fajrToday && now < fajrToday) {
            k = dayPlus(p, -1);
            var y = view(k);
            s = y ? at(k, y.maghrib) : null; e = fajrToday;
        } else {
            k = tomorrowKey();
            var tm = view(k);
            s = t ? at(tk, t.maghrib) : null; e = tm ? at(k, tm.fajr) : null;
        }
        if (!s || !e || e <= s) return null;
        var len = e.getTime() - s.getTime();
        function hm(d) { var q = cairoParts(d); return (q.H < 10 ? "0" : "") + q.H + ":" + (q.M < 10 ? "0" : "") + q.M; }
        return {
            midnightHM: hm(new global.Date(s.getTime() + len / 2)), lastThirdHM: hm(new global.Date(s.getTime() + len * 2 / 3)), fajrHM: hm(e),
            start: s, end: e,
            midnight: new global.Date(s.getTime() + len / 2),
            lastThird: new global.Date(s.getTime() + len * 2 / 3),
            now: now, inLastThird: now >= new global.Date(s.getTime() + len * 2 / 3) && now < e,
            msToLastThird: Math.max(0, s.getTime() + len * 2 / 3 - now.getTime())
        };
    }

    /* v1.2.117: iqama countdown. Minutes between the adhan and the iqama per prayer (pref iqamaMin, 0 = off,
       default off). iqama() is the prayer whose adhan has passed and whose iqama has not come yet. Reading only:
       no alert, nothing sent to Vetro. */
    function iqamaAll() { var a = sys.pref("iqamaMin"); return (a && typeof a === "object") ? a : {}; }
    function iqamaOf(key) { var v = parseInt(iqamaAll()[key], 10); return isNaN(v) ? 0 : Math.max(0, Math.min(60, v)); }
    function setIqama(key, v) {
        var a = {}, cur = iqamaAll();
        Object.keys(cur).forEach(function (k) { a[k] = cur[k]; });
        v = Math.max(0, Math.min(60, v));
        if (v) a[key] = v; else delete a[key];
        sys.setPref("iqamaMin", a);
    }
    function iqama() {
        var list = listFor(todayKey()), now = new global.Date();
        for (var i = 0; i < list.length; i++) {
            var it = list[i], off = iqamaOf(it.key);
            if (it.key === "sunrise" || !off || !it.at) continue;
            var end = new global.Date(it.at.getTime() + off * 60000);
            if (now >= it.at && now < end) return { key: it.key, name: it.name, at: end, ms: end - now };
        }
        return null;
    }

    function hhmmText(hhmm) {
        var m = /^(\d{1,2}):(\d{2})/.exec(String(hhmm || ""));
        if (!m) return "—";
        var h = +m[1], mm = m[2];
        if (sys.pref("clockFormat") === "24") return digits((h < 10 ? "0" : "") + h + ":" + mm);
        var ampm = h < 12 ? (APL.lang === "ar" ? "ص" : "AM") : (APL.lang === "ar" ? "م" : "PM");
        return digits(((h % 12) || 12) + ":" + mm) + " " + ampm;
    }

    function leftText(ms) {
        var mins = Math.max(0, Math.round(ms / 60000));
        if (mins < 1) return APL.t("now");
        var h = Math.floor(mins / 60), m = mins % 60;
        if (h && m) return APL.t("in {h} h {m} min", { h: digits(h), m: digits(m) });
        if (h) return APL.t("{n} hours left", { n: digits(h) });
        return APL.t("in {n} min", { n: digits(m) });
    }

    function clockParts(hhmm) {
        var m = /^(\d{1,2}):(\d{2})/.exec(String(hhmm || ""));
        if (!m) return { t: "—", s: "" };
        var h = +m[1], mm = m[2];
        if (sys.pref("clockFormat") === "24") return { t: digits((h < 10 ? "0" : "") + h + ":" + mm), s: "" };
        var ar = APL.lang === "ar";
        return { t: digits(((h % 12) || 12) + ":" + mm), s: h < 12 ? (ar ? "ص" : "AM") : (ar ? "م" : "PM") };
    }


    /* ---------- the prayer widget (v1.2.96): the Home Screen and the Prayer page share it ---------- */
    var ICONS = {
        fajr:    '<path d="M18.5 14.2A7.3 7.3 0 1 1 9.8 5.5a5.8 5.8 0 0 0 8.7 8.7z"/><path d="M20 4L4 20"/>',
        sunrise: '<path d="M7 18a5 5 0 0 1 10 0M3 18h18M12 4v6M9.2 6.8L12 4l2.8 2.8M5 13.2l1 1M19 13.2l-1 1"/>',
        dhuhr:   '<circle cx="12" cy="12" r="3.8"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
        asr:     '<path d="M7 15.5a5 5 0 0 1 10 0M3 15.5h18M6 19h12M9 22h6M12 6v2.5M5.2 9.2l1.4 1.4M18.8 9.2l-1.4 1.4"/>',
        maghrib: '<path d="M7 18a5 5 0 0 1 10 0M3 18h18M12 4v6M9.2 7.2L12 10l2.8-2.8M5 13.2l1 1M19 13.2l-1 1"/>',
        isha:    '<path d="M17.5 14.6A7 7 0 1 1 9.4 6.5a5.6 5.6 0 0 0 8.1 8.1z"/><path d="M18 2.5v4M16 4.5h4M21 9v2.4M19.8 10.2h2.4"/>'
    };
    function iconSvg(key) {
        return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + (ICONS[key] || "") + "</svg>";
    }
    function digits(s) { return APL.digits ? APL.digits(s) : String(s); }
    function wTime(hhmm) {
        var m = /^(\d{1,2}):(\d{2})/.exec(String(hhmm || ""));
        if (!m) return { t: "—", s: "" };
        var h = +m[1], mm = m[2], ar = APL.lang === "ar";
        if (sys.pref("clockFormat") === "24") return { t: digits(pad2(h) + ":" + mm), s: "" };
        return { t: digits(pad2((h % 12) || 12) + ":" + mm), s: h < 12 ? (ar ? "ص" : "AM") : (ar ? "م" : "PM") };
    }
    function prevKey() {
        var last = "isha";
        listFor(todayKey()).forEach(function (t) { if (t.past) last = t.key; });
        return last;
    }
    function leftWidget(ms, name) {
        var mins = Math.max(0, Math.round(ms / 60000)), h = Math.floor(mins / 60), m = mins % 60;
        if (mins < 1) return APL.t("now");
        if (h && m) return APL.t("{h}h {m}m until {prayer}", { h: digits(h), m: digits(m), prayer: name });
        if (h) return APL.t("{h}h until {prayer}", { h: digits(h), prayer: name });
        return APL.t("{m}m until {prayer}", { m: digits(m), prayer: name });
    }
    /* The green part of the line: from the prayer that just passed to the next one, by the time gone.
       Computed on every normal refresh (15 s): no timer and no animation of its own. */
    function fillHtml(list, n) {
        if (!n) return "";
        var order = ["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"], pi = -1, prevAt = null, i;
        for (i = 0; i < list.length; i++) if (list[i].past) { pi = order.indexOf(list[i].key); prevAt = list[i].at; }
        if (pi < 0) {
            var isha = list[list.length - 1];
            pi = 5;
            prevAt = isha && isha.at ? new global.Date(isha.at.getTime() - 86400000) : null;
        }
        var ni = order.indexOf(n.key);
        if (!prevAt || ni < 0 || !n.at) return "";
        var span = n.at - prevAt, f = span > 0 ? (new global.Date() - prevAt) / span : 0;
        f = Math.max(0, Math.min(1, f));
        /* v1.2.108: exact positions from the real columns: --pwcol (one column) and --pwcg (the gap) are set in css/custom.css.
           The centre of icon k is k * (col + gap) + col / 2. */
        /* v1.2.108b: physical left / right (the screen's browser does not know inset-inline). The green part is anchored on the side
           of the previous prayer's icon: the right side in Arabic (right-to-left), the left side in English. */
        var step = "(var(--pwcol) + var(--pwcg))", style, rev = ni <= pi, rtl = !!APL.rtl, anchor = rtl ? "right" : "left", len;
        if (rev) { anchor = rtl ? "left" : "right"; style = anchor + ":calc(var(--pwcol) / 2);"; len = 5 * f; }
        else { style = anchor + ":calc(" + step + " * " + pi + " + var(--pwcol) / 2);"; len = (ni - pi) * f; }
        style += "width:calc(" + step + " * " + len.toFixed(4) + ")";
        var cls = "pw__fill " + (anchor === "left" ? "pw__fill--r" : "pw__fill--l") + (rev ? " pw__fill--rev" : "");
        return '<div class="' + cls + '" style="' + style + '"><i class="pw__dot"></i></div>';
    }
    /* v1.2.109: how long ago the prayer that is shown in "Since ..." was (same prayer as fillHtml uses) */
    function sinceWidget(list, name) {
        var prevAt = null, i;
        for (i = 0; i < list.length; i++) if (list[i].past) prevAt = list[i].at;
        if (!prevAt) { var isha = list[list.length - 1]; prevAt = isha && isha.at ? new global.Date(isha.at.getTime() - 86400000) : null; }
        if (!prevAt) return APL.t("Since {prayer}", { prayer: name });
        var mins = Math.max(0, Math.floor((new global.Date() - prevAt) / 60000)), h = Math.floor(mins / 60), m = mins % 60;
        if (mins < 1) return APL.t("Since {prayer}", { prayer: name });
        if (h && m) return APL.t("{h}h {m}m since {prayer}", { h: digits(h), m: digits(m), prayer: name });
        if (h) return APL.t("{h}h since {prayer}", { h: digits(h), prayer: name });
        return APL.t("{m}m since {prayer}", { m: digits(m), prayer: name });
    }
    /* v7.2.1: the widget counts down to the next of the SIX times, sunrise included (next() is for alerts and has no sunrise) */
    function nextW() {
        var p = cairoParts(), now = new global.Date(), t = view(iso(p)), i, when;
        if (t) for (i = 0; i < NAMES.length; i++) {
            when = at(iso(p), t[NAMES[i][0]]);
            if (when && when > now) return { key: NAMES[i][0], name: nameOf(NAMES[i][0]), time: t[NAMES[i][0]], at: when, ms: when - now, today: true };
        }
        return next();
    }
    function widgetHtml(opt) {
        var variant = (opt && opt.variant) || "home";
        var list = listFor(todayKey()), n = nextW();
        if (!list.length) return "";
        var nk = n ? n.key : "", pk = prevKey();
        var head = '<div class="pw__head"><span class="pw__since">' + sinceWidget(list, nameOf(prevKey())) + "</span>" +
                   '<span class="pw__left">' + (n ? leftWidget(n.ms, n.name) : "") + "</span></div>";
        var cols = "";
        list.forEach(function (t) {
            var tp = wTime(t.time);
            var cls = "pw__col" + (t.key === nk ? " is-next" : "") + (t.key === pk && t.key !== nk ? " is-prev" : "") + (t.past && t.key !== nk && t.key !== pk ? " is-past" : "");
            cols += '<div class="' + cls + '"><span class="pw__ico">' + iconSvg(t.key) + "</span>" +
                    (namesOn() ? '<span class="pw__name">' + t.name + "</span>" : "") +
                    '<span class="pw__time"><span class="pw__t">' + tp.t + "</span>" + (tp.s ? '<span class="pw__s">' + tp.s + "</span>" : "") + "</span></div>";
        });
        return '<div class="pw pw--' + variant + (namesOn() ? "" : " pw--nonames") + '">' + head + '<div class="pw__grid">' + fillHtml(list, n) + cols + "</div></div>";
    }

    function render() {
        if (!APL.homeStatus) return;
        var n = next();
        if (!n) {
            APL.homeStatus.set("prayer", ready && lastError
                ? '<div class="statusx__card hc__row"><div class="hc__cell"><span class="hc__time"><span class="hc__t">—:—</span></span><span class="hc__label hc__label--prayer">🕌 ' + APL.t("Next Prayer") + '</span></div><div class="hc__date"><span class="hc__dow">' + APL.t("Prayer Times") + '</span><span class="hc__greg">' + APL.t("Times unavailable: connect the screen to the internet once.") + '</span></div></div>'
                : null, 20);
            return;
        }
        var html = widgetHtml({ variant: "home" });
        APL.homeStatus.set("prayer", html, 20);
    }

    function markFired(stamp) {
        lastFired = stamp;
        try { global.localStorage.setItem("apl.prayer.lastFired", stamp); } catch (e) {}
    }

    function fire(key) {
        if (!alertsOn()) return;
        var t = today() || {};
        var stamp = key + "@" + todayKey() + "_" + (t[key] || "");
        if (lastFired === stamp) return;

        var doPlay = function () {
            if (lastFired === stamp) return;
            markFired(stamp);
            var isRam = false;
            try {
                if (APL.ramadan && APL.ramadan.active && APL.ramadan.active()) isRam = true;
                else if (APL.islamic && APL.islamic.hijriToday) {
                    var h = APL.islamic.hijriToday();
                    if (h && h.m === 9) isRam = true;
                }
            } catch (e) {}
            var alertKey = (key === "maghrib" && isRam && cannonOn()) ? "maghrib_ramadan" : key;
            if (APL.prayerAlert && APL.prayerAlert.play) APL.prayerAlert.play(alertKey);
            if (APL.toast) APL.toast(APL.t("It is time for {prayer}", { prayer: nameOf(key) }) + " — " + hhmmText(t[key]));
        };

        if (APL.bgAudio && APL.bgAudio.lastFired) {
            APL.bgAudio.lastFired().then(function (lf) {
                if (lf && lf.prayer === stamp) { markFired(stamp); return; }
                doPlay();
            }, doPlay);
        } else {
            doPlay();
        }
    }

    function tick() {
        var p = cairoParts(), t = view(iso(p));
        if (!syncedSig) syncToVetro(false);
        if (!t) { render(); return; }
        var now = new global.Date();
        for (var i = 0; i < NAMES.length; i++) {
            var key = NAMES[i][0];
            if (key === "sunrise") continue;
            var when = at(iso(p), t[key]);
            if (!when) continue;
            var delta = now - when;
            if (delta >= 0 && delta < 120000) fire(key);
        }
        render();
    }

    function start() {
        try { lastFired = global.localStorage.getItem("apl.prayer.lastFired"); } catch (e) {}
        var p = cairoParts();
        readMonth(p.y, p.m);
        var nextM = new Date(p.y, p.m, 1);
        readMonth(nextM.getFullYear(), nextM.getMonth() + 1);
        render();
        syncToVetro(false);
        loadAll(false).then(function (ok) {
            if (!ok) setTimeout(function () { loadAll(true); }, 600000);
        });
        APL.timers.every("prayer-tick", 15000, tick);          // v1.2.100: shared timer; skipped while hidden, as before
        setTimeout(tick, 1200);
        APL.timers.every("prayer-load", 6 * 3600000, function () { loadAll(false); }, { hidden: true });   // v1.2.100: shared timer; it ran also while hidden, so it still does
    }

    APL.prayer = {
        start: start,
        today: today,
        todayTimes: today,
        todayKey: todayKey,
        list: function (dayIso) { return listFor(dayIso || todayKey()); },
        next: next,
        night: night,
        calibration: calib,
        isCalc: function () { var d = days[todayKey()]; return !!(d && d.calc); },
        source: function () { var d = days[todayKey()], cb = calib(), c = city(); return { kind: !d ? "none" : (d.calc ? "calc" : "aladhan"), calibrated: !!(d && d.calc && cb && c && cb.city === c.key), n: cb ? cb.n : 0, adjusted: anyAdj() }; },   // v3.4.1
        _calcDay: calcDay,
        city: city,
        cityKey: cityKey,
        cityName: cityName,
        tz: tz,
        methodId: methodId,
        methodNote: methodNote,
        calendarSource: calSource,
        reload: function () {
            loadedMonths = {};
            days = {};
            syncedSig = "";
            try { if (APL.islamic && APL.islamic.clearCache) APL.islamic.clearCache(); } catch (e) {}
            return loadAll(true).then(function () { render(); if (APL.prayerPage && APL.prayerPage.refresh) APL.prayerPage.refresh(); });
        },
        /* v8.7.27: opts.auto = chosen by js/auto-location.js. Any other call is a choice by hand and turns the automatic mode off. */
        setCity: function (key, opts) {
            loadedMonths = {};
            days = {};
            syncedSig = "";
            sys.setPref("prayerCity", key);
            if (!(opts && opts.auto)) sys.setPref("prayerAuto", false);
            try { if (APL.islamic && APL.islamic.clearCache) APL.islamic.clearCache(); } catch (e) {}
            loadAll(true).then(function () { render(); if (APL.prayerPage && APL.prayerPage.refresh) APL.prayerPage.refresh(); });
        },
        alertsOn: alertsOn,
        widgetHtml: widgetHtml,
        adjOf: adjOf,
        iqamaOf: iqamaOf,
        setIqama: setIqama,
        iqama: iqama,
        setAdj: function (key, v) { setAdj(key, v); },
        resetAdj: function () { sys.setPref("prayerAdj", {}); },
        summerOn: summerOn,
        namesOn: namesOn,
        scaleOf: scaleOf,
        setAlerts: function (on) { sys.setPref("prayerAlerts", !!on); syncToVetro(true); },
        refresh: function () { return loadAll(true); },
        hhmm: hhmmText,
        left: leftText,
        nameOf: nameOf,
        names: function () { return NAMES.map(function (n) { return { key: n[0], name: nameOf(n[0]) }; }); },
        hijri: function () {
            try {                                               // v8.7.27: the same date as the Home Screen (offset, month corrections, calendar of the place)
                if (APL.islamic && APL.islamic.hijriToday) {
                    var hh = APL.islamic.hijriToday();
                    if (hh && hh.m >= 1 && hh.m <= 12) return (hh.exact ? "" : "\u2248 ") + APL.islamic.hijriText(hh);
                }
            } catch (e) {}
            var t = days[todayKey()];
            if (!t) return "";
            var month = APL.lang === "ar" ? t.hijriAr : t.hijriEn;
            if (!month) return t.hijri || "";
            return APL.lang === "ar"
                ? (t.hijriDay ? t.hijriDay + " " : "") + month + (t.hijriYear ? " " + t.hijriYear + "هـ" : "")
                : (t.hijriDay ? t.hijriDay + " " : "") + month + (t.hijriYear ? " " + t.hijriYear + " AH" : "");
        },
        state: function () { return { ready: ready, error: lastError, months: Object.keys(loadedMonths) }; },
        /* v1.2.50: the saved Hijri dates (read only) for js/islamic.js */
        hijriOf: function (dayIso) { return hijriParts(days[dayIso]); },
        hijriDays: function () {
            var out = [];
            Object.keys(days).sort().forEach(function (k) {
                var h = hijriParts(days[k]);
                if (h) out.push({ iso: k, d: h.d, m: h.m, y: h.y });
            });
            return out;
        }
    };

    sys.onPref("clockFormat", render);
    sys.onPref("digitStyle", function () { render(); if (APL.prayerPage && APL.prayerPage.refresh) APL.prayerPage.refresh(); });
    ["prayerAdj", "prayerSummer", "prayerNames"].forEach(function (k) {
        sys.onPref(k, function () { render(); syncToVetro(true); if (APL.prayerPage && APL.prayerPage.refresh) APL.prayerPage.refresh(); });
    });
    sys.onPref("iqamaMin", function () { render(); if (APL.prayerPage && APL.prayerPage.refresh) APL.prayerPage.refresh(); });     // v1.2.117: display only, nothing goes to Vetro
    applyScale();
    sys.onPref("prayerWidgetScale", function () { applyScale(); render(); if (APL.prayerPage && APL.prayerPage.refresh) APL.prayerPage.refresh(); });
    /* v8.7.27: the Hijri offset, the month corrections and the calendar source change the Ramadan marks of the background schedule and the pages */
    ["hijriOffset", "hijriFix", "hijriSource", "hijriCountry", "hijriFeedStamp"].forEach(function (k) {
        sys.onPref(k, function () {
            try { if (APL.islamic && APL.islamic.clearCache) APL.islamic.clearCache(); } catch (e) {}
            if (k === "hijriSource") { if (APL.prayer && APL.prayer.reload) APL.prayer.reload(); return; }
            syncedSig = ""; syncToVetro(true); render();
            if (APL.prayerPage && APL.prayerPage.refresh) APL.prayerPage.refresh();
        });
    });
    sys.onPref("prayerAlerts", function () { syncToVetro(true); });
    sys.onPref("radioDuringAlert", function () { syncToVetro(true); });
    sys.onPref("prayerAlertVolume", function () { syncToVetro(true); });
    setTimeout(start, 1800);
})(window);
