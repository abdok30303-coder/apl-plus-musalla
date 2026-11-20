/* ============================================================
   site-config.js — this build's own defaults (APL Launcher — Egypt).

   Everything the custom build adds reads its defaults from here:
   the prayer times city, the weather place, the radio station.
   Nothing personal is hidden anywhere else, so one file can be
   swapped for the public copy (tools/make-public.sh turns this file
   into the Cairo defaults).

   CUSTOM  : this package is a custom build. It is never updated from
             the original project on GitHub (boot.js / updater.js).
   ============================================================ */
(function (global) {
    "use strict";

    global.APL_SITE = {
        custom: true,                 // custom build: no automatic updates from the original repo
        buildName: "APL+ Musalla",

        /* Prayer times: AlAdhan API, Egyptian General Authority of Survey (method 5),
           Asr at the usual time (school 0), Africa/Cairo. */
        prayer: {
            method: 5,                // Egyptian General Authority of Survey
            school: 0,                // Shafi'i (the usual Asr)
            timezone: "Africa/Cairo",
            city: "cairo",            // key in cities.js
            alerts: true,             // spoken short alert at prayer time
            pauseRadio: true,         // pause the radio while the alert plays, then resume
            days: 45                 // cache this many days of times locally
        },

        /* Weather: Open-Meteo, no key, no device location. */
        weather: {
            place: "cairo",           // key in cities.js (lat/lon in cities.js)
            units: "metric",
            refreshMinutes: 15
        },

        /* Radio: Egyptian Qur'an Radio (Cairo), over the internet. AVPlay needs a DIRECT
           MP3 stream, not a web page, so these are stream addresses, tried in this order
           (the one that worked last is tried first). Add more at the end if needed. */
        radio: {
            urls: [
                "https://stream.radiojar.com/8s5u5tpdtwzuv",
                "https://n12.radiojar.com/8s5u5tpdtwzuv",
                "http://n12.radiojar.com/8s5u5tpdtwzuv",
                "http://stream.radiojar.com/8s5u5tpdtwzuv"
            ],
            name: "إذاعة القرآن الكريم من القاهرة",
            background: false         // the radio plays only while APL Launcher is in front
        },

        /* Home wallpapers: the 20 compact local wallpapers, one every five minutes. */
        wallpapers: {
            every: 5,                 // minutes
            on: true
        },

        /* Support: the page shown as a QR code in Settings > Support.
           Put your own donation / support link here (Ko-fi, PayPal.Me, Buy Me a Coffee ...).
           Up to 216 characters. Empty = the Support item only says the link is not set. */
        support: {
            url: "https://ko-fi.com/abdulrahmankhalid32781"
        }
    };
})(window);
