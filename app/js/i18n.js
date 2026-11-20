/* ============================================================
   i18n.js — interface language.

   The launcher is written in English. Other languages come from a
   table keyed by the English text: js/lang-fr.js for French,
   js/lang-ar.js for Arabic.
     APL.t("Settings")                          -> "الإعدادات" in Arabic
     APL.t("Version {v} available", { v: "2" }) -> placeholders
   Text without a translation stays in English.
     APL.t("content|Movie")                     -> "Movie", "Film" in French
   A "context|" prefix tells apart two meanings of the same English
   word; it is never shown.

   The language follows the screen's (an Arabic screen gets Arabic),
   unless Settings › General & Privacy › Language picks one. It is
   fixed when the launcher starts: changing it reloads the launcher.

   This build adds Arabic, right-to-left: <html dir="rtl"> and the
   "lang-ar" class, which css/custom.css uses for the fonts and for
   the few places where the layout must flip.
   ============================================================ */
(function (global) {
    "use strict";

    var APL = global.APL = global.APL || {};
    /* Arabic arrives in two tables: the interface and the Settings tree (lang-ar.js) */
    var AR = {};
    (function () {
        var extra = global.APL_LANG_AR_EXTRA || {};
        Object.keys(extra).forEach(function (k) { AR[k] = extra[k]; });
        var base = global.APL_LANG_AR || {};
        Object.keys(base).forEach(function (k) { if (!(k in AR)) AR[k] = base[k]; });
    })();
    var TABLES = { ar: AR };            /* v7.0.3: French removed (no lang-fr.js ever shipped); only Arabic and English remain */
    var RTL = { ar: true };

    /* The choice saved in Settings (screen-wide, not per profile): "auto", "en" or "ar". */
    function saved() {
        try { return (JSON.parse(global.localStorage.getItem("apl.prefs") || "null") || {}).language; } catch (e) { return null; }
    }
    function screenLanguage() {
        var l = String((global.navigator && (global.navigator.language || global.navigator.userLanguage)) || "en").toLowerCase();
        if (l.indexOf("ar") === 0) return "ar";
        return "en";
    }

    var choice = saved();
    var lang = (choice === "en" || TABLES[choice]) ? choice : screenLanguage();
    var table = TABLES[lang] || {};

    function t(text, vars) {
        var key = String(text);
        var s = Object.prototype.hasOwnProperty.call(table, key) ? table[key] : key.replace(/^[a-z]+\|/, "");
        if (vars) {
            s = String(s).replace(/\{(\w+)\}/g, function (m, k) {
                return Object.prototype.hasOwnProperty.call(vars, k) ? String(vars[k]) : m;
            });
        }
        return s;
    }

    /* Numbers in Arabic (v1.2.97): ONE setting, Settings > General & Privacy > Digits ("digitStyle"),
       for the prayer widget, the clock card, the second clock, the screen saver clock and the weather:
       "west" (1 2 3, the default: the digits of the remote and of the screen's own menus) or "arabic"
       (١ ٢ ٣). Only in Arabic; English and French never change. */
    function digits(s) {
        s = String(s);
        try {
            if (lang === "ar" && APL.sys && APL.sys.pref("digitStyle") === "arabic") {
                return s.replace(/\d/g, function (d) { return "٠١٢٣٤٥٦٧٨٩".charAt(+d); });
            }
            if (lang === "ar") return s.replace(/[٠-٩]/g, function (d) { return String(d.charCodeAt(0) - 1632); });
        } catch (e) {}
        return s;
    }
    function num(n) { return digits(n); }
    APL.digits = digits;
    /* v1.2.99: a number with its degree sign kept together, in this order, inside Arabic text.
       Without the isolate, the sign next to Arabic digits is placed on the wrong side of the number. */
    APL.deg = function (x) {
        var s = digits(x) + "\u00b0";
        return lang === "ar" ? "\u2066" + s + "\u2069" : s;
    };

    APL.t = t;
    APL.num = num;
    APL.lang = lang;                                   // "en" or "ar"
    APL.rtl = !!RTL[lang];
    APL.locale = lang === "ar" ? "ar-EG" : "en-US";   // for dates, sorting and TMDB
    try {
        document.documentElement.lang = lang;
        document.documentElement.setAttribute("dir", APL.rtl ? "rtl" : "ltr");
        document.documentElement.className = (document.documentElement.className + " lang-" + lang).replace(/^\s+/, "");
    } catch (e) {}
})(window);
