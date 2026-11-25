/* ============================================================
   cities.js: the places the prayer times and the weather can use.
   Coordinates only: the AlAdhan API is asked by position, so no city
   name has to match its database. Each city also carries its country
   code and its IANA time zone, so the times, the countdown and the
   weather follow the city (and not Egypt) when you pick another one.

   v8.7.21: world cities (not only Egypt), the usual calculation method
   of each country, and "custom": any city found with Settings > Search
   for a city anywhere (Open-Meteo geocoding, needs internet).

   key, Arabic name, English name, latitude, longitude, country, time zone
   ============================================================ */
(function (global) {
    "use strict";

    var EGYPT = [
        ["alexandria", "الإسكندرية",    "Alexandria",       31.2001, 29.9187],
        ["mansoura", "المنصورة",          "Mansoura",         31.0409, 31.3785],
        ["mitghamr", "ميت غمر",           "Mit Ghamr",        30.7185, 31.2596],
        ["zagazig",  "الزقازيق",          "Zagazig",          30.5877, 31.5020],
        ["belqas",   "بلقاس",            "Belqas",           31.3567, 31.3936],      // v8.7.28: 5th of Egypt
        ["abutaha",  "أبو طه",            "Abu Taha",         31.28,   31.42],
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

    /* key, Arabic, English, latitude, longitude, country, IANA time zone */
    var WORLD = [
        ["makkah",   "مكة المكرمة",   "Makkah",          21.3891,  39.8579, "SA", "Asia/Riyadh"],
        ["madinah",  "المدينة المنورة", "Madinah",        24.4686,  39.6142, "SA", "Asia/Riyadh"],
        ["riyadh",   "الرياض",        "Riyadh",          24.7136,  46.6753, "SA", "Asia/Riyadh"],
        ["jeddah",   "جدة",           "Jeddah",          21.4858,  39.1925, "SA", "Asia/Riyadh"],
        ["dammam",   "الدمام",        "Dammam",          26.4207,  50.0888, "SA", "Asia/Riyadh"],
        ["dubai",    "دبي",           "Dubai",           25.2048,  55.2708, "AE", "Asia/Dubai"],
        ["abudhabi", "أبو ظبي",       "Abu Dhabi",       24.4539,  54.3773, "AE", "Asia/Dubai"],
        ["sharjah",  "الشارقة",       "Sharjah",         25.3463,  55.4209, "AE", "Asia/Dubai"],
        ["kuwait",   "مدينة الكويت",   "Kuwait City",     29.3759,  47.9774, "KW", "Asia/Kuwait"],
        ["doha",     "الدوحة",        "Doha",            25.2854,  51.5310, "QA", "Asia/Qatar"],
        ["manama",   "المنامة",       "Manama",          26.2285,  50.5860, "BH", "Asia/Bahrain"],
        ["muscat",   "مسقط",          "Muscat",          23.5880,  58.3829, "OM", "Asia/Muscat"],
        ["sanaa",    "صنعاء",         "Sanaa",           15.3694,  44.1910, "YE", "Asia/Aden"],
        ["aden",     "عدن",           "Aden",            12.7855,  45.0187, "YE", "Asia/Aden"],
        ["amman",    "عمّان",          "Amman",           31.9454,  35.9284, "JO", "Asia/Amman"],
        ["jerusalem", "القدس",        "Jerusalem",       31.7683,  35.2137, "PS", "Asia/Jerusalem"],
        ["gaza",     "غزة",           "Gaza",            31.5017,  34.4668, "PS", "Asia/Hebron"],
        ["ramallah", "رام الله",      "Ramallah",        31.9038,  35.2034, "PS", "Asia/Hebron"],
        ["beirut",   "بيروت",         "Beirut",          33.8938,  35.5018, "LB", "Asia/Beirut"],
        ["damascus", "دمشق",          "Damascus",        33.5138,  36.2765, "SY", "Asia/Damascus"],
        ["aleppo",   "حلب",           "Aleppo",          36.2021,  37.1343, "SY", "Asia/Damascus"],
        ["baghdad",  "بغداد",         "Baghdad",         33.3152,  44.3661, "IQ", "Asia/Baghdad"],
        ["basra",    "البصرة",        "Basra",           30.5085,  47.7804, "IQ", "Asia/Baghdad"],
        ["mosul",    "الموصل",        "Mosul",           36.3400,  43.1300, "IQ", "Asia/Baghdad"],
        ["tripoli",  "طرابلس",        "Tripoli",         32.8872,  13.1913, "LY", "Africa/Tripoli"],
        ["benghazi", "بنغازي",        "Benghazi",        32.1167,  20.0667, "LY", "Africa/Tripoli"],
        ["tunis",    "تونس",          "Tunis",           36.8065,  10.1815, "TN", "Africa/Tunis"],
        ["algiers",  "الجزائر",       "Algiers",         36.7538,   3.0588, "DZ", "Africa/Algiers"],
        ["casablanca", "الدار البيضاء", "Casablanca",    33.5731,  -7.5898, "MA", "Africa/Casablanca"],
        ["rabat",    "الرباط",        "Rabat",           34.0209,  -6.8416, "MA", "Africa/Casablanca"],
        ["marrakesh", "مراكش",        "Marrakesh",       31.6295,  -7.9811, "MA", "Africa/Casablanca"],
        ["khartoum", "الخرطوم",       "Khartoum",        15.5007,  32.5599, "SD", "Africa/Khartoum"],
        ["nouakchott", "نواكشوط",     "Nouakchott",      18.0735, -15.9582, "MR", "Africa/Nouakchott"],
        ["mogadishu", "مقديشو",       "Mogadishu",        2.0469,  45.3182, "SO", "Africa/Mogadishu"],
        ["istanbul", "إسطنبول",       "Istanbul",        41.0082,  28.9784, "TR", "Europe/Istanbul"],
        ["ankara",   "أنقرة",         "Ankara",          39.9334,  32.8597, "TR", "Europe/Istanbul"],
        ["izmir",    "إزمير",         "Izmir",           38.4237,  27.1428, "TR", "Europe/Istanbul"],
        ["tehran",   "طهران",         "Tehran",          35.6892,  51.3890, "IR", "Asia/Tehran"],
        ["mashhad",  "مشهد",          "Mashhad",         36.2972,  59.6067, "IR", "Asia/Tehran"],
        ["qom",      "قم",            "Qom",             34.6416,  50.8746, "IR", "Asia/Tehran"],
        ["karachi",  "كراتشي",        "Karachi",         24.8607,  67.0011, "PK", "Asia/Karachi"],
        ["lahore",   "لاهور",         "Lahore",          31.5497,  74.3436, "PK", "Asia/Karachi"],
        ["islamabad", "إسلام آباد",   "Islamabad",       33.6844,  73.0479, "PK", "Asia/Karachi"],
        ["delhi",    "دلهي",          "Delhi",           28.6139,  77.2090, "IN", "Asia/Kolkata"],
        ["mumbai",   "مومباي",        "Mumbai",          19.0760,  72.8777, "IN", "Asia/Kolkata"],
        ["hyderabad", "حيدر آباد",    "Hyderabad",       17.3850,  78.4867, "IN", "Asia/Kolkata"],
        ["dhaka",    "دكا",           "Dhaka",           23.8103,  90.4125, "BD", "Asia/Dhaka"],
        ["kabul",    "كابل",          "Kabul",           34.5553,  69.2075, "AF", "Asia/Kabul"],
        ["colombo",  "كولومبو",       "Colombo",          6.9271,  79.8612, "LK", "Asia/Colombo"],
        ["jakarta",  "جاكرتا",        "Jakarta",         -6.2088, 106.8456, "ID", "Asia/Jakarta"],
        ["surabaya", "سورابايا",      "Surabaya",        -7.2575, 112.7521, "ID", "Asia/Jakarta"],
        ["kualalumpur", "كوالالمبور", "Kuala Lumpur",     3.1390, 101.6869, "MY", "Asia/Kuala_Lumpur"],
        ["singapore", "سنغافورة",     "Singapore",        1.3521, 103.8198, "SG", "Asia/Singapore"],
        ["tashkent", "طشقند",         "Tashkent",        41.2995,  69.2401, "UZ", "Asia/Tashkent"],
        ["baku",     "باكو",          "Baku",            40.4093,  49.8671, "AZ", "Asia/Baku"],
        ["moscow",   "موسكو",         "Moscow",          55.7558,  37.6173, "RU", "Europe/Moscow"],
        ["kazan",    "قازان",         "Kazan",           55.7887,  49.1221, "RU", "Europe/Moscow"],
        ["london",   "لندن",          "London",          51.5074,  -0.1278, "GB", "Europe/London"],
        ["birmingham", "برمنغهام",    "Birmingham",      52.4862,  -1.8904, "GB", "Europe/London"],
        ["manchester", "مانشستر",     "Manchester",      53.4808,  -2.2426, "GB", "Europe/London"],
        ["paris",    "باريس",         "Paris",           48.8566,   2.3522, "FR", "Europe/Paris"],
        ["marseille", "مرسيليا",      "Marseille",       43.2965,   5.3698, "FR", "Europe/Paris"],
        ["berlin",   "برلين",         "Berlin",          52.5200,  13.4050, "DE", "Europe/Berlin"],
        ["frankfurt", "فرانكفورت",    "Frankfurt",       50.1109,   8.6821, "DE", "Europe/Berlin"],
        ["madrid",   "مدريد",         "Madrid",          40.4168,  -3.7038, "ES", "Europe/Madrid"],
        ["rome",     "روما",          "Rome",            41.9028,  12.4964, "IT", "Europe/Rome"],
        ["amsterdam", "أمستردام",     "Amsterdam",       52.3676,   4.9041, "NL", "Europe/Amsterdam"],
        ["brussels", "بروكسل",        "Brussels",        50.8503,   4.3517, "BE", "Europe/Brussels"],
        ["stockholm", "ستوكهولم",     "Stockholm",       59.3293,  18.0686, "SE", "Europe/Stockholm"],
        ["sarajevo", "سراييفو",       "Sarajevo",        43.8563,  18.4131, "BA", "Europe/Sarajevo"],
        ["newyork",  "نيويورك",       "New York",        40.7128, -74.0060, "US", "America/New_York"],
        ["chicago",  "شيكاغو",        "Chicago",         41.8781, -87.6298, "US", "America/Chicago"],
        ["houston",  "هيوستن",        "Houston",         29.7604, -95.3698, "US", "America/Chicago"],
        ["detroit",  "ديترويت",       "Detroit",         42.3314, -83.0458, "US", "America/Detroit"],
        ["losangeles", "لوس أنجلوس",  "Los Angeles",     34.0522,-118.2437, "US", "America/Los_Angeles"],
        ["toronto",  "تورنتو",        "Toronto",         43.6532, -79.3832, "CA", "America/Toronto"],
        ["montreal", "مونتريال",      "Montreal",        45.5017, -73.5673, "CA", "America/Toronto"],
        ["vancouver", "فانكوفر",      "Vancouver",       49.2827,-123.1207, "CA", "America/Vancouver"],
        ["saopaulo", "ساو باولو",     "Sao Paulo",      -23.5505, -46.6333, "BR", "America/Sao_Paulo"],
        ["sydney",   "سيدني",         "Sydney",         -33.8688, 151.2093, "AU", "Australia/Sydney"],
        ["melbourne", "ملبورن",       "Melbourne",      -37.8136, 144.9631, "AU", "Australia/Melbourne"],
        ["auckland", "أوكلاند",       "Auckland",       -36.8485, 174.7633, "NZ", "Pacific/Auckland"],
        ["johannesburg", "جوهانسبرغ", "Johannesburg",   -26.2041,  28.0473, "ZA", "Africa/Johannesburg"],
        ["capetown", "كيب تاون",      "Cape Town",      -33.9249,  18.4241, "ZA", "Africa/Johannesburg"],
        ["lagos",    "لاغوس",         "Lagos",            6.5244,   3.3792, "NG", "Africa/Lagos"],
        ["kano",     "كانو",          "Kano",            12.0022,   8.5920, "NG", "Africa/Lagos"],
        ["dakar",    "داكار",         "Dakar",           14.7167, -17.4677, "SN", "Africa/Dakar"],
        ["addisababa", "أديس أبابا",  "Addis Ababa",      9.0300,  38.7400, "ET", "Africa/Addis_Ababa"],
        ["nairobi",  "نيروبي",        "Nairobi",         -1.2921,  36.8219, "KE", "Africa/Nairobi"],
        ["daressalaam", "دار السلام", "Dar es Salaam",   -6.7924,  39.2083, "TZ", "Africa/Dar_es_Salaam"]
    ];

    /* Country names (code, Arabic, English), for the label after each city. */
    var COUNTRY = {
        EG: ["مصر", "Egypt"], SA: ["السعودية", "Saudi Arabia"], AE: ["الإمارات", "UAE"], KW: ["الكويت", "Kuwait"],
        QA: ["قطر", "Qatar"], BH: ["البحرين", "Bahrain"], OM: ["عُمان", "Oman"], YE: ["اليمن", "Yemen"],
        JO: ["الأردن", "Jordan"], PS: ["فلسطين", "Palestine"], LB: ["لبنان", "Lebanon"], SY: ["سوريا", "Syria"],
        IQ: ["العراق", "Iraq"], LY: ["ليبيا", "Libya"], TN: ["تونس", "Tunisia"], DZ: ["الجزائر", "Algeria"],
        MA: ["المغرب", "Morocco"], SD: ["السودان", "Sudan"], MR: ["موريتانيا", "Mauritania"], SO: ["الصومال", "Somalia"],
        TR: ["تركيا", "Turkey"], IR: ["إيران", "Iran"], PK: ["باكستان", "Pakistan"], IN: ["الهند", "India"],
        BD: ["بنغلاديش", "Bangladesh"], AF: ["أفغانستان", "Afghanistan"], LK: ["سريلانكا", "Sri Lanka"],
        ID: ["إندونيسيا", "Indonesia"], MY: ["ماليزيا", "Malaysia"], SG: ["سنغافورة", "Singapore"],
        UZ: ["أوزبكستان", "Uzbekistan"], AZ: ["أذربيجان", "Azerbaijan"], RU: ["روسيا", "Russia"],
        GB: ["بريطانيا", "United Kingdom"], FR: ["فرنسا", "France"], DE: ["ألمانيا", "Germany"], ES: ["إسبانيا", "Spain"],
        IT: ["إيطاليا", "Italy"], NL: ["هولندا", "Netherlands"], BE: ["بلجيكا", "Belgium"], SE: ["السويد", "Sweden"],
        BA: ["البوسنة", "Bosnia"], US: ["أمريكا", "USA"], CA: ["كندا", "Canada"], BR: ["البرازيل", "Brazil"],
        AU: ["أستراليا", "Australia"], NZ: ["نيوزيلندا", "New Zealand"], ZA: ["جنوب أفريقيا", "South Africa"],
        NG: ["نيجيريا", "Nigeria"], SN: ["السنغال", "Senegal"], ET: ["إثيوبيا", "Ethiopia"], KE: ["كينيا", "Kenya"],
        TZ: ["تنزانيا", "Tanzania"]
    };

    /* AlAdhan calculation methods. id, English, Arabic, Fajr angle, Isha angle, Isha minutes after Maghrib (0 = by angle),
       Maghrib angle (0 = at sunset). The angles are only used for the offline fallback (calcDay in prayer.js);
       online, AlAdhan applies the method by its id. */
    var METHODS = [
        [3,  "Muslim World League",                          "رابطة العالم الإسلامي",                 18,   17,   0, 0],
        [5,  "Egyptian General Authority of Survey",         "الهيئة المصرية العامة للمساحة",         19.5, 17.5, 0, 0],
        [4,  "Umm Al-Qura University, Makkah",               "جامعة أم القرى، مكة المكرمة",           18.5, 0,    90, 0],
        [2,  "Islamic Society of North America (ISNA)",      "الجمعية الإسلامية لأمريكا الشمالية",    15,   15,   0, 0],
        [1,  "University of Islamic Sciences, Karachi",      "جامعة العلوم الإسلامية، كراتشي",        18,   18,   0, 0],
        [15, "Moonsighting Committee Worldwide",             "لجنة رؤية الهلال العالمية",              18,   18,   0, 0],
        [8,  "Gulf Region",                                  "منطقة الخليج",                          19.5, 0,    90, 0],
        [9,  "Kuwait",                                       "الكويت",                                18,   17.5, 0, 0],
        [10, "Qatar",                                        "قطر",                                   18,   0,    90, 0],
        [16, "Dubai (experimental)",                         "دبي (تجريبي)",                          18.2, 18.2, 0, 0],
        [23, "Jordan (Ministry of Awqaf)",                   "الأردن (وزارة الأوقاف)",                 18,   18,   0, 0],
        [18, "Tunisia",                                      "تونس",                                  18,   18,   0, 0],
        [19, "Algeria",                                      "الجزائر",                               18,   17,   0, 0],
        [21, "Morocco",                                      "المغرب",                                19,   17,   0, 0],
        [13, "Diyanet, Turkey (experimental)",               "ديانت، تركيا (تجريبي)",                 18,   17,   0, 0],
        [7,  "Institute of Geophysics, University of Tehran", "معهد الجيوفيزياء، جامعة طهران",         17.7, 14,   0, 4.5],
        [0,  "Shia Ithna-Ashari, Leva Institute, Qum",       "الشيعة الإثنا عشرية، معهد ليفا، قم",     16,   14,   0, 4],
        [11, "Majlis Ugama Islam Singapura, Singapore",      "مجلس الشؤون الإسلامية، سنغافورة",        20,   18,   0, 0],
        [17, "JAKIM, Malaysia",                              "جاكيم، ماليزيا",                        20,   18,   0, 0],
        [20, "Kemenag, Indonesia",                           "وزارة الشؤون الدينية، إندونيسيا",        20,   18,   0, 0],
        [12, "Union des organisations islamiques de France", "اتحاد المنظمات الإسلامية في فرنسا",     12,   12,   0, 0],
        [14, "Spiritual Administration of Muslims of Russia", "الإدارة الروحية لمسلمي روسيا",          16,   15,   0, 0],
        [22, "Comunidade Islamica de Lisboa, Portugal",      "الجالية الإسلامية في لشبونة",           18,   17,   0, 0]
    ];
    /* The usual method of a country (country code -> AlAdhan id). Everything else: Muslim World League. */
    var METHOD_BY_CC = {
        EG: 5, SD: 5, LY: 5, IQ: 5, SY: 5, LB: 5, PS: 5, SA: 4, YE: 4, AE: 16, KW: 9, QA: 10, BH: 8, OM: 8,
        JO: 23, TN: 18, DZ: 19, MA: 21, TR: 13, IR: 7, PK: 1, IN: 1, BD: 1, AF: 1, LK: 1, ID: 20, MY: 17, SG: 11,
        FR: 12, RU: 14, PT: 22, US: 2, CA: 2
    };

    var CITIES = EGYPT.map(function (c) {
        return { key: c[0], ar: c[1], en: c[2], lat: c[3], lon: c[4], cc: "EG", tz: "Africa/Cairo" };
    }).concat(WORLD.map(function (c) {
        return { key: c[0], ar: c[1], en: c[2], lat: c[3], lon: c[4], cc: c[5], tz: c[6] };
    }));
    var BY_KEY = {};
    CITIES.forEach(function (c) { BY_KEY[c.key] = c; });

    /* The place found with "Search for a city anywhere" (saved as the setting customPlace). */
    function custom() {
        var o = null;
        try { o = global.APL && global.APL.sys && global.APL.sys.pref("customPlace"); } catch (e) { o = null; }
        if (!o || typeof o.lat !== "number" || typeof o.lon !== "number") return null;
        return { key: "custom", ar: o.name || "", en: o.name || "", lat: o.lat, lon: o.lon, cc: o.cc || "", tz: o.tz || "" };
    }

    global.APL_CITIES = CITIES;
    global.APL_CITY = function (key) { return (key === "custom" && custom()) || BY_KEY[key] || BY_KEY.cairo; };
    global.APL_CITY_CUSTOM = custom;
    /* The name in the launcher's language (Arabic names in Arabic). */
    global.APL_CITY_NAME = function (key) {
        var c = global.APL_CITY(key);
        return (global.APL && global.APL.lang === "ar") ? c.ar : c.en;
    };
    global.APL_COUNTRY_NAME = function (cc) {
        var n = COUNTRY[cc];
        return n ? ((global.APL && global.APL.lang === "ar") ? n[0] : n[1]) : "";
    };
    global.APL_METHODS = METHODS.map(function (m) {
        return { id: m[0], en: m[1], ar: m[2], fajr: m[3], isha: m[4], ishaMin: m[5], mag: m[6] };
    });
    global.APL_METHOD_AUTO = function (cc) { return METHOD_BY_CC[cc] || 3; };

    /* ---------- v8.7.27: what follows the country (location, Hijri calendar) ---------- */

    /* The Hijri calendar a country follows. "egypt": Dar al-Ifta's astronomical rule, worked out on the screen (js/islamic.js).
       The others are AlAdhan's calendarMethod: HJCoSA (Saudi announcements, adjusted after each sighting), UAQ, DIYANET.
       Every other country: HJCoSA, the nearest regional announcement. Settings > Hijri Calendar Source can pick another one. */
    var CAL_BY_CC = { EG: "egypt", TR: "DIYANET" };
    global.APL_CAL_AUTO = function (cc) { return CAL_BY_CC[String(cc || "").toUpperCase()] || "HJCoSA"; };

    /* The main city of a country, for when the screen only tells us the country (no internet, no position). */
    var MAIN_CITY = {
        EG: "cairo", SA: "riyadh", AE: "dubai", KW: "kuwait", QA: "doha", BH: "manama", OM: "muscat", YE: "sanaa",
        JO: "amman", PS: "jerusalem", LB: "beirut", SY: "damascus", IQ: "baghdad", LY: "tripoli", TN: "tunis", DZ: "algiers",
        MA: "rabat", SD: "khartoum", MR: "nouakchott", SO: "mogadishu", TR: "istanbul", IR: "tehran", PK: "karachi",
        IN: "delhi", BD: "dhaka", AF: "kabul", LK: "colombo", ID: "jakarta", MY: "kualalumpur", SG: "singapore",
        UZ: "tashkent", AZ: "baku", RU: "moscow", GB: "london", FR: "paris", DE: "berlin", ES: "madrid", IT: "rome",
        NL: "amsterdam", BE: "brussels", SE: "stockholm", BA: "sarajevo", US: "newyork", CA: "toronto", BR: "saopaulo",
        AU: "sydney", NZ: "auckland", ZA: "johannesburg", NG: "lagos", SN: "dakar", ET: "addisababa", KE: "nairobi", TZ: "daressalaam"
    };
    /* A city for a country and/or a time zone (either may be empty): the one that matches both, else the country's main city. */
    global.APL_CITY_FOR = function (cc, tz) {
        cc = String(cc || "").toUpperCase();
        var main = MAIN_CITY[cc] && BY_KEY[MAIN_CITY[cc]], i, c;
        if (cc && tz) {
            if (main && main.tz === tz) return main;
            for (i = 0; i < CITIES.length; i++) { c = CITIES[i]; if (c.cc === cc && c.tz === tz) return c; }
        }
        if (cc && main) return main;
        if (tz) { for (i = 0; i < CITIES.length; i++) if (CITIES[i].tz === tz) return CITIES[i]; }
        return null;
    };

    /* A country code from whatever the screen gives: "EG", "EGY", "ar_EG", "ar-EG". "" when it is not one we know. */
    var ALPHA3 = {
        EGY: "EG", SAU: "SA", ARE: "AE", KWT: "KW", QAT: "QA", BHR: "BH", OMN: "OM", YEM: "YE", JOR: "JO", PSE: "PS",
        LBN: "LB", SYR: "SY", IRQ: "IQ", LBY: "LY", TUN: "TN", DZA: "DZ", MAR: "MA", SDN: "SD", MRT: "MR", SOM: "SO",
        TUR: "TR", IRN: "IR", PAK: "PK", IND: "IN", BGD: "BD", AFG: "AF", LKA: "LK", IDN: "ID", MYS: "MY", SGP: "SG",
        UZB: "UZ", AZE: "AZ", RUS: "RU", GBR: "GB", FRA: "FR", DEU: "DE", ESP: "ES", ITA: "IT", NLD: "NL", BEL: "BE",
        SWE: "SE", BIH: "BA", USA: "US", CAN: "CA", BRA: "BR", AUS: "AU", NZL: "NZ", ZAF: "ZA", NGA: "NG", SEN: "SN",
        ETH: "ET", KEN: "KE", TZA: "TZ"
    };
    global.APL_CC_FROM = function (v) {
        var s = String(v || "").toUpperCase().replace(/[^A-Z_\-]/g, "");
        if (!s) return "";
        var m = /[_\-]([A-Z]{2,3})$/.exec(s);
        if (m) s = m[1];
        if (s.length === 3) s = ALPHA3[s] || "";
        return (s.length === 2 && COUNTRY[s]) ? s : "";
    };
})(window);
