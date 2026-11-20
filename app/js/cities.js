/* ============================================================
   cities.js — the Egyptian places the prayer times and the weather
   can use. Coordinates only: the AlAdhan API is asked by position,
   so no city name has to match its database.

   key, Arabic name, English name, latitude, longitude
   ============================================================ */
(function (global) {
    "use strict";

    var LIST = [
        ["belqas",   "بلقاس",            "Belqas",           31.3567, 31.3936],
        ["mansoura", "المنصورة",          "Mansoura",         31.0409, 31.3785],
        ["mitghamr", "ميت غمر",           "Mit Ghamr",        30.7185, 31.2596],
        ["zagazig",  "الزقازيق",          "Zagazig",          30.5877, 31.5020],
        ["tanta",    "طنطا",              "Tanta",            30.7865, 31.0004],
        ["damanhur", "دمنهور",            "Damanhur",         31.0340, 30.4682],
        ["kafrelsh", "كفر الشيخ",          "Kafr El Sheikh",   31.1117, 30.9398],
        ["damietta", "دمياط",             "Damietta",         31.4165, 31.8133],
        ["portsaid", "بورسعيد",           "Port Said",        31.2653, 32.3019],
        ["ismailia", "الإسماعيلية",        "Ismailia",         30.6043, 32.2715],
        ["suez",     "السويس",            "Suez",             29.9668, 32.5498],
        ["cairo",    "القاهرة",           "Cairo",            30.0444, 31.2357],
        ["giza",     "الجيزة",            "Giza",             30.0131, 31.2089],
        ["shubra",   "شبرا الخيمة",        "Shubra El Kheima", 30.1286, 31.2422],
        ["banha",    "بنها",              "Banha",            30.4647, 31.1848],
        ["shebin",   "شبين الكوم",         "Shebin El Kom",    30.5503, 31.0100],
        ["fayoum",   "الفيوم",            "Fayoum",           29.3084, 30.8428],
        ["benisuef", "بني سويف",          "Beni Suef",        29.0661, 31.0994],
        ["minya",    "المنيا",            "Minya",            28.1099, 30.7503],
        ["asyut",    "أسيوط",             "Asyut",            27.1809, 31.1837],
        ["sohag",    "سوهاج",             "Sohag",            26.5591, 31.6957],
        ["qena",     "قنا",               "Qena",             26.1551, 32.7160],
        ["luxor",    "الأقصر",            "Luxor",            25.6872, 32.6396],
        ["aswan",    "أسوان",             "Aswan",            24.0889, 32.8998],
        ["hurghada", "الغردقة",           "Hurghada",         27.2579, 33.8116],
        ["sharm",    "شرم الشيخ",         "Sharm El Sheikh",  27.9158, 34.3300],
        ["matruh",   "مرسى مطروح",        "Marsa Matruh",     31.3543, 27.2373],
        ["arish",    "العريش",            "El Arish",         31.1316, 33.7984],
        ["kharga",   "الخارجة",           "Kharga",           25.4514, 30.5464]
    ];

    var CITIES = LIST.map(function (c) {
        return { key: c[0], ar: c[1], en: c[2], lat: c[3], lon: c[4] };
    });
    var BY_KEY = {};
    CITIES.forEach(function (c) { BY_KEY[c.key] = c; });

    global.APL_CITIES = CITIES;
    global.APL_CITY = function (key) { return BY_KEY[key] || BY_KEY.cairo; };
    /* The name in the launcher's language (Arabic names in Arabic). */
    global.APL_CITY_NAME = function (key) {
        var c = global.APL_CITY(key);
        return (global.APL && global.APL.lang === "ar") ? c.ar : c.en;
    };
})(window);
