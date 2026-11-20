/* ============================================================
   islamic.js — the Hijri date and the Islamic occasions (v1.2.50).

   What it gives the rest of the launcher:
     APL.islamic.hijriToday()      today's Hijri date { y, m, d, exact }
     APL.islamic.hijriText(h)      "5 جمادى الآخرة 1448 هـ" in the launcher's language
     APL.islamic.gregorian(j|date) the weekday, day, month and year in the launcher's language
     APL.islamic.occasions()       the next dates: Ramadan, the last ten nights, Eid al-Fitr,
                                   Eid al-Adha and the other occasions, with the days left
                                   (v1.2.117: also the voluntary fasts: White Days, Monday/Thursday, six of Shawwal)

   Where the dates come from, in this order:
     1. The Hijri date that AlAdhan sends with the prayer times (already saved on the screen for
        this month and the next one, see js/prayer.js). These days are exact: the page shows
        the same Hijri date as the prayer page.
     2. Beyond them, the months are worked out from the astronomical new moon (Meeus, chapter 49),
        starting from the last exact month: a month begins the next day when the new moon is at
        least 5 hours old at sunset in Cairo (the rule the Egyptian authorities use, in short).
        These dates can be one day off from the announcement of the moon sighting: they are shown
        with a "≈" in the launcher, and replaced by exact ones as the days come within the saved
        prayer times.
     3. With no saved prayer times at all (first start, no network ever): the plain tabular
        Islamic calendar, also marked "≈".
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
    function todayJdn() {
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

    /* ---------- the sunset in Cairo (NOAA's short formula, good to a minute or two) ---------- */
    var LAT = 30.0444, LON = 31.2357;
    function sunsetJd(j) {
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
       comes after sunset, or only a few hours before it, does not count: the month then has 30 days. */
    var MIN_AGE = 5;
    function crescentCounted(j) {
        var ss = sunsetJd(j), nm = nearestNewMoon(ss);
        return (ss - nm) * 24 >= MIN_AGE;
    }

    /* ---------- the Hijri months ---------- */
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

    function hijriFor(j) {
        var h = null;
        try { h = APL.prayer && APL.prayer.hijriOf ? APL.prayer.hijriOf(isoOf(j)) : null; } catch (e) { h = null; }
        if (h) return { y: h.y, m: h.m, d: h.d, exact: true };
        var t = tabular(j);
        return { y: t.y, m: t.m, d: t.d, exact: false };
    }

    /* count months from the one that holds day j, each with its first day and its length */
    function monthsFrom(j, h, saved, count) {
        var out = [], y = h.y, m = h.m, start = j - (h.d - 1), i, key;
        if (saved.known[y + "-" + m] !== undefined) start = saved.known[y + "-" + m];
        for (i = 0; i < count; i++) {
            var ny = y, nm = m + 1;
            if (nm > 12) { nm = 1; ny++; }
            var nextKey = ny + "-" + nm, len, nextStart;
            if (saved.known[nextKey] !== undefined) { nextStart = saved.known[nextKey]; len = nextStart - start; }
            else { len = crescentCounted(start + 28) ? 29 : 30; nextStart = start + len; }
            out.push({ y: y, m: m, start: start, len: len });
            y = ny; m = nm; start = nextStart;
        }
        return out;
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
    function hijriToday() {
        var off = 0;
        try { off = parseInt(APL.sys && APL.sys.pref("hijriOffset"), 10) || 0; } catch (e) { off = 0; }
        return hijriFor(todayJdn() + off);
    }

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
    function place(ev, months, today, lastExact) {
        for (var i = 0; i < months.length; i++) {
            var mo = months[i];
            if (mo.m !== ev.m) continue;
            var start = mo.start + ev.d - 1, end = start;
            if (ev.span === "month") end = mo.start + mo.len - 1;
            else if (typeof ev.span === "number") end = start + ev.span - 1;
            if (end < today) continue;
            var st = { ev: ev, start: start, end: end, hy: mo.y, exact: lastExact >= start };
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
            var st = place(ev, [months[i]], today, 0);
            if (st && (!best || st.start < best.start)) best = st;
            if (best) break;                                  // months are in order: the first one that is still ahead
        }
        return best;
    }
    function mondayThursday(months, today, lastExact) {
        for (var j = today, n = 0; n < 21; j++, n++) {
            var wd = weekday(j);
            if (wd !== 1 && wd !== 4) continue;
            if (fastClosed(months, j)) continue;
            var mo = monthAt(months, j), g = gregorian(j);
            var st = { ev: { key: "monthu", names: MONTHU_NAMES[wd === 1 ? 0 : 1] }, start: j, end: j, hy: mo.y, exact: lastExact >= j };
            st.kind = j === today ? "today" : "soon"; st.days = j - today;
            st.name = pick(st.ev.names);
            st.hijri = hijriText({ d: j - mo.start + 1, m: mo.m, y: mo.y });
            st.dateText = g.full;
            return st;
        }
        return null;
    }

    function occasions() {
        var off = 0;
        try { off = parseInt(APL.sys && APL.sys.pref("hijriOffset"), 10) || 0; } catch (e) { off = 0; }
        var today = todayJdn() + off, h = hijriFor(today), saved = savedMonths();
        var sig = [today, off, h.y, h.m, h.d, h.exact ? 1 : 0, saved.last, APL.lang].join("|");
        if (cache.sig === sig && cache.data) return cache.data;
        var months = monthsFrom(today, h, saved, 26), all = [], i;
        for (i = 0; i < EVENTS.length; i++) {
            var st = place(EVENTS[i], months, today, saved.last);
            if (st) { st.order = i; all.push(st); }
        }
        function rank(a) { return a.kind === "now" || a.kind === "today" || a.kind === "tonight" ? -1 : a.days; }
        function byStart(a, b) { return (rank(a) - rank(b)) || (a.start - b.start) || (a.order - b.order); }
        var wd = whiteDays(months, today), mt = mondayThursday(months, today, saved.last);
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

    APL.islamic = {
        jdn: jdn, ymd: ymd, isoOf: isoOf, weekday: weekday, today: todayJdn,
        hijriToday: hijriToday, hijriText: hijriText, gregorian: gregorian,
        occasions: occasions,
        monthName: function (m) { return pick(HIJRI_MONTHS)[m - 1]; },
        /* for the tests: the pieces that can be checked on their own */
        _newMoon: newMoon, _sunsetJd: sunsetJd, _tabular: tabular, _crescentCounted: crescentCounted,
        _monthsFrom: function (j, h, saved, count) { return monthsFrom(j, h, saved, count); }
    };
})(window);
