/* ============================================================
   home-clock.js — the clock card at the top of the Home Screen (v1.2.50).

     [ time of the screen ]  [ weekday / date / Hijri date ]  [ time of another country ]

   - The time is the screen's own (the same as before), large, with ص/م (AM/PM) small.
   - Beside it: the weekday, the day, the month and the year, and the Hijri date
     (Settings › General & Privacy › Date on Home Screen).
   - Optional, off by default (Settings › General & Privacy › Second Clock): the time of another
     country, across the card from the screen's own time, with "tomorrow" / "yesterday" when its
     date is not the same.
   The elements are in index.html. Only text is written, and only when it changed, so the
   10-second tick of js/launcher.js costs nothing when nothing moved. No network, no image.
   ============================================================ */
(function (global) {
    "use strict";

    var APL = global.APL, sys = APL && APL.sys;
    if (!APL || !sys) return;

    /* key, Arabic, English, French, IANA zone, standard offset in minutes, uses summer time.
       The zone is read with Intl; the offset is only the fallback when the screen's engine cannot
       do that zone (and only for zones without summer time: the others are then hidden). */
    var ZONES = [
        ["sa",    "السعودية", "Saudi Arabia", "Arabie saoudite", "Asia/Riyadh", 180, false],
        ["ae",    "الإمارات", "United Arab Emirates", "Émirats arabes unis", "Asia/Dubai", 240, false],
        ["kw",    "الكويت", "Kuwait", "Koweït", "Asia/Kuwait", 180, false],
        ["qa",    "قطر", "Qatar", "Qatar", "Asia/Qatar", 180, false],
        ["bh",    "البحرين", "Bahrain", "Bahreïn", "Asia/Bahrain", 180, false],
        ["om",    "عُمان", "Oman", "Oman", "Asia/Muscat", 240, false],
        ["iq",    "العراق", "Iraq", "Irak", "Asia/Baghdad", 180, false],
        ["jo",    "الأردن", "Jordan", "Jordanie", "Asia/Amman", 180, false],
        ["ps",    "فلسطين", "Palestine", "Palestine", "Asia/Gaza", 120, true],
        ["lb",    "لبنان", "Lebanon", "Liban", "Asia/Beirut", 120, true],
        ["sy",    "سوريا", "Syria", "Syrie", "Asia/Damascus", 180, false],
        ["ye",    "اليمن", "Yemen", "Yémen", "Asia/Aden", 180, false],
        ["ly",    "ليبيا", "Libya", "Libye", "Africa/Tripoli", 120, false],
        ["tn",    "تونس", "Tunisia", "Tunisie", "Africa/Tunis", 60, false],
        ["dz",    "الجزائر", "Algeria", "Algérie", "Africa/Algiers", 60, false],
        ["ma",    "المغرب", "Morocco", "Maroc", "Africa/Casablanca", 60, true],
        ["sd",    "السودان", "Sudan", "Soudan", "Africa/Khartoum", 120, false],
        ["tr",    "تركيا", "Türkiye", "Turquie", "Europe/Istanbul", 180, false],
        ["ir",    "إيران", "Iran", "Iran", "Asia/Tehran", 210, false],
        ["gb",    "بريطانيا", "United Kingdom", "Royaume-Uni", "Europe/London", 0, true],
        ["fr",    "فرنسا", "France", "France", "Europe/Paris", 60, true],
        ["de",    "ألمانيا", "Germany", "Allemagne", "Europe/Berlin", 60, true],
        ["it",    "إيطاليا", "Italy", "Italie", "Europe/Rome", 60, true],
        ["es",    "إسبانيا", "Spain", "Espagne", "Europe/Madrid", 60, true],
        ["ru",    "روسيا (موسكو)", "Russia (Moscow)", "Russie (Moscou)", "Europe/Moscow", 180, false],
        ["us-ny", "أمريكا (نيويورك)", "USA (New York)", "États-Unis (New York)", "America/New_York", -300, true],
        ["us-ch", "أمريكا (شيكاغو)", "USA (Chicago)", "États-Unis (Chicago)", "America/Chicago", -360, true],
        ["us-la", "أمريكا (لوس أنجلوس)", "USA (Los Angeles)", "États-Unis (Los Angeles)", "America/Los_Angeles", -480, true],
        ["ca",    "كندا (تورونتو)", "Canada (Toronto)", "Canada (Toronto)", "America/Toronto", -300, true],
        ["br",    "البرازيل", "Brazil", "Brésil", "America/Sao_Paulo", -180, false],
        ["ng",    "نيجيريا", "Nigeria", "Nigéria", "Africa/Lagos", 60, false],
        ["za",    "جنوب أفريقيا", "South Africa", "Afrique du Sud", "Africa/Johannesburg", 120, false],
        ["in",    "الهند", "India", "Inde", "Asia/Kolkata", 330, false],
        ["pk",    "باكستان", "Pakistan", "Pakistan", "Asia/Karachi", 300, false],
        ["bd",    "بنغلاديش", "Bangladesh", "Bangladesh", "Asia/Dhaka", 360, false],
        ["id",    "إندونيسيا", "Indonesia", "Indonésie", "Asia/Jakarta", 420, false],
        ["my",    "ماليزيا", "Malaysia", "Malaisie", "Asia/Kuala_Lumpur", 480, false],
        ["cn",    "الصين", "China", "Chine", "Asia/Shanghai", 480, false],
        ["jp",    "اليابان", "Japan", "Japon", "Asia/Tokyo", 540, false],
        ["kr",    "كوريا الجنوبية", "South Korea", "Corée du Sud", "Asia/Seoul", 540, false],
        ["au",    "أستراليا (سيدني)", "Australia (Sydney)", "Australie (Sydney)", "Australia/Sydney", 600, true]
    ];
    /* The screen's own country: this is the Egypt build (js/site-config.js, Africa/Cairo). */
    var HOME_NAME = ["مصر", "Egypt", "Égypte"];
    var TOMORROW = ["غدًا", "tomorrow", "demain"], YESTERDAY = ["أمس", "yesterday", "hier"];

    var R = null;                                   // the elements, found once
    var formatters = {};
    var BORN = new Date().getTime();                // when this file ran

    function lang() { return APL.lang === "ar" ? 0 : APL.lang === "fr" ? 2 : 1; }          // ar, en, fr
    function $(id) { return document.getElementById(id); }
    function zoneByKey(key) {
        for (var i = 0; i < ZONES.length; i++) if (ZONES[i][0] === key) return ZONES[i];
        return null;
    }
    function zoneName(z) { return z[1 + lang()]; }

    function refs() {
        if (R) return R;
        var root = document.querySelector(".status");
        if (!root || !$("hcT")) return null;
        R = {
            root: root, t: $("hcT"), s: $("hcS"), local: $("hcLocalLabel"),
            dow: $("hcDow"), greg: $("hcGreg"), hijri: $("hcHijri"),
            t2: $("hcT2"), s2: $("hcS2"), other: $("hcOtherLabel")
        };
        return R;
    }
    function setText(el, text) {
        if (text != null && APL.digits) text = APL.digits(text);   // v1.2.97: Settings > Digits (time, dates, second clock)
        if (el && el.textContent !== text) el.textContent = text;
    }
    function setClass(el, name, on) { if (el && el.classList.contains(name) !== on) el.classList.toggle(name, on); }

    /* Settings › General & Privacy › Clock Format: 12 hours (default, with ص/م) or 24 */
    function timeParts(h, m) {
        var mm = (m < 10 ? "0" : "") + m;
        if (sys.pref("clockFormat") === "24") return { t: (h < 10 ? "0" : "") + h + ":" + mm, s: "" };
        var ar = APL.lang === "ar";
        return { t: ((h % 12) || 12) + ":" + mm, s: h < 12 ? (ar ? "ص" : "AM") : (ar ? "م" : "PM") };
    }
    function dayNumber(y, m, d) { return Math.round(Date.UTC(y, m - 1, d) / 86400000); }

    /* The time and the date in another zone: { h, m, day } or null when it cannot be known. */
    function formatterFor(tz) {
        if (formatters[tz] !== undefined) return formatters[tz];
        var f = null;
        try {
            f = new global.Intl.DateTimeFormat("en-GB", { timeZone: tz, year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", hour12: false });
            if (!f.formatToParts) f = null;
        } catch (e) { f = null; }
        formatters[tz] = f;
        return f;
    }
    function zoneNow(z, now) {
        var f = formatterFor(z[4]);
        if (f) {
            var o = {}, list = f.formatToParts(now);
            for (var i = 0; i < list.length; i++) o[list[i].type] = list[i].value;
            var y = parseInt(o.year, 10), mo = parseInt(o.month, 10), d = parseInt(o.day, 10);
            if (y && mo && d) return { h: parseInt(o.hour, 10) % 24, m: parseInt(o.minute, 10), day: dayNumber(y, mo, d) };
        }
        if (z[6]) return null;                                              // summer time and no Intl: better nothing than a wrong hour
        var t = new Date(now.getTime() + z[5] * 60000);
        return { h: t.getUTCHours(), m: t.getUTCMinutes(), day: dayNumber(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate()) };
    }

    function update() {
        var r = refs();
        if (!r) return;
        var now = new Date(), L = lang(), I = APL.islamic;

        /* the screen's own time */
        var lt = timeParts(now.getHours(), now.getMinutes());
        setText(r.t, lt.t);
        setText(r.s, lt.s);

        /* the date: weekday, day month year, Hijri. Whatever goes wrong here, the time above stays. */
        try {
            var mode = sys.pref("homeDate") || "full";
            var showDate = mode !== "off" && !!I;
            setClass(r.root, "no-date", !showDate);
            if (showDate) {
                var g = I.gregorian(now);
                setText(r.dow, g.weekday);
                setText(r.greg, g.date);
                /* The saved prayer times (the exact Hijri date) are read about 2 seconds after the start
                   (js/prayer.js). Until then only the calendar estimate is known, which can be a day off:
                   it is not shown in those first seconds, so the Hijri day never changes under the eye. */
                var h = mode === "full" ? I.hijriToday() : null;
                setText(r.hijri, h && (h.exact || now.getTime() - BORN > 5000) ? (h.exact ? "" : "≈ ") + I.hijriText(h) : "");
            }
        } catch (e) { setClass(r.root, "no-date", true); }

        /* the second clock */
        try {
            var key = sys.pref("secondClock"), z = key && key !== "off" ? zoneByKey(key) : null;
            var zn = z ? zoneNow(z, now) : null;
            setClass(r.root, "has-other", !!zn);
            if (zn) {
                var zt = timeParts(zn.h, zn.m);
                setText(r.t2, zt.t);
                setText(r.s2, zt.s);
                var diff = zn.day - dayNumber(now.getFullYear(), now.getMonth() + 1, now.getDate());
                setText(r.other, zoneName(z) + (diff > 0 ? " · " + TOMORROW[L] : diff < 0 ? " · " + YESTERDAY[L] : ""));
                setText(r.local, HOME_NAME[L]);
            } else {
                setText(r.local, "");
            }
        } catch (e2) { setClass(r.root, "has-other", false); setText(r.local, ""); }
    }

    APL.homeClock = {
        update: update,
        zones: ZONES,
        /* [value, label] for Settings › General & Privacy › Second Clock */
        zoneOptions: function () {
            var list = [["off", APL.t("Off")]];
            for (var i = 0; i < ZONES.length; i++) list.push([ZONES[i][0], zoneName(ZONES[i])]);
            return list;
        }
    };

    sys.onPref("homeDate", update);
    sys.onPref("digitStyle", update);
    sys.onPref("secondClock", update);
    /* two early looks, after the saved prayer times are read, so the card is complete within seconds
       and not at the next 10-second tick */
    global.setTimeout(update, 2300);
    global.setTimeout(update, 5600);
})(window);
