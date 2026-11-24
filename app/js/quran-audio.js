/* ============================================================
   quran-audio.js — Standalone Online Quran Listening Page & Widget.
   Faithful to reference image-1.png:
     - Top pill buttons: Right = Search (البحث في الآيات), Center = Reciter (اسم القارئ), Left = Surah (سورة ...).
     - Middle area: King Fahd Hafs calligraphy font (UthmanicHafs) + Ayah end marker ﴿١٧﴾ + Saadi/Muyassar Tafsir.
     - Bottom audio controls: Repeat mode, Prev ayah, Play/Pause, Next ayah, More options.
     - Streaming: EveryAyah CDN per-ayah high-quality MP3 audio (42 top reciters).
     - Perfect TV remote navigation with programmatic auto-scroll for Reciters and Surahs list!

   Chromium 76 compatible (no ?. / ??).
   ============================================================ */
(function (global) {
    "use strict";

    var APL = global.APL, sys = APL && APL.sys, K = APL && APL.KEY;
    if (!APL || !sys) return;

    /* --- Reciters Catalog (42 verified reciters) --- */
    var RECITERS = [
        { key: "Minshawy_Murattal_128kbps", name_ar: "محمد صديق المنشاوي مرتل", name_en: "Minshawy Murattal" },
        { key: "Minshawy_Mujawwad_192kbps", name_ar: "محمد صديق المنشاوي مجود", name_en: "Minshawy Mujawwad" },
        { key: "Abdul_Basit_Murattal_64kbps", name_ar: "عبد الباسط مرتل", name_en: "Abdul Basit Murattal" },
        { key: "Abdul_Basit_Mujawwad_128kbps", name_ar: "عبد الباسط مجود", name_en: "Abdul Basit Mujawwad" },
        { key: "Husary_64kbps", name_ar: "محمود خليل الحصري", name_en: "Mahmoud Khalil Al-Husary" },
        { key: "Husary_Mujawwad_64kbps", name_ar: "محمود خليل الحصري - مجود", name_en: "Husary Mujawwad" },
        { key: "Husary_Muallim_128kbps", name_ar: "محمود خليل الحصري (المعلم)", name_en: "Husary Muallim" },
        { key: "Alafasy_64kbps", name_ar: "مشاري بن راشد العفاسي", name_en: "Mishary Alafasy" },
        { key: "Abdurrahmaan_As-Sudais_64kbps", name_ar: "عبد الرحمن السديس", name_en: "Abdurrahmaan As-Sudais" },
        { key: "Saood_ash-Shuraym_64kbps", name_ar: "سعود بن إبراهيم الشريم", name_en: "Saood ash-Shuraym" },
        { key: "Maher_AlMuaiqly_64kbps", name_ar: "ماهر المعيقلي", name_en: "Maher Al Muaiqly" },
        { key: "Yasser_Ad-Dussary_128kbps", name_ar: "ياسر الدوسري", name_en: "Yasser Ad-Dussary" },
        { key: "Mohammad_al_Tablaway_64kbps", name_ar: "محمد الطبلاوي", name_en: "Mohammad al Tablaway" },
        { key: "Mahmoud_Ali_Al_Banna_32kbps", name_ar: "محمود علي البنا", name_en: "Mahmoud Ali Al Banna" },
        { key: "Ahmed_Ibn_Ali_Al_Ajamy_128kbps", name_ar: "أحمد بن علي العجمي", name_en: "Ahmed Ibn Ali Al Ajamy" },
        { key: "Abu_Bakr_Ash-Shaatree_64kbps", name_ar: "أبو بكر الشاطري", name_en: "Abu Bakr Ash-Shaatree" },
        { key: "Abdullaah_3awwaad_Al-Juhaynee_128kbps", name_ar: "عبد الله عواد الجهني", name_en: "Abdullah Al-Juhaynee" },
        { key: "Abdullah_Basfar_64kbps", name_ar: "عبد الله باسفر", name_en: "Abdullah Basfar" },
        { key: "Abdullah_Matroud_128kbps", name_ar: "عبد الله مطرود", name_en: "Abdullah Matroud" },
        { key: "Fares_Abbad_64kbps", name_ar: "فارس عباد", name_en: "Fares Abbad" },
        { key: "Hani_Rifai_64kbps", name_ar: "هاني الرفاعي", name_en: "Hani Rifai" },
        { key: "Ali_Jaber_64kbps", name_ar: "علي جابر", name_en: "Ali Jaber" },
        { key: "Ali_Hajjaj_AlSuesy_128kbps", name_ar: "علي حجاج السوسي", name_en: "Ali Hajjaj AlSuesy" },
        { key: "Muhammad_Jibreel_64kbps", name_ar: "محمد جبريل", name_en: "Muhammad Jibreel" },
        { key: "Muhammad_Ayyoub_64kbps", name_ar: "محمد أيوب", name_en: "Muhammad Ayyoub" },
        { key: "Nasser_Alqatami_128kbps", name_ar: "ناصر القطامي", name_en: "Nasser Alqatami" },
        { key: "Nabil_Rifa3i_48kbps", name_ar: "نبيل الرفاعي", name_en: "Nabil Rifa3i" },
        { key: "Khaalid_Abdullaah_al-Qahtaanee_192kbps", name_ar: "خالد عبد الله القحطاني", name_en: "Khalid Abdullah al-Qahtanee" },
        { key: "khalefa_al_tunaiji_64kbps", name_ar: "خليفة الطنيجي", name_en: "Khalefa Al-Tunaiji" },
        { key: "Ayman_Sowaid_64kbps", name_ar: "أيمن سويد", name_en: "Ayman Sowaid" },
        { key: "Ibrahim_Akhdar_32kbps", name_ar: "إبراهيم أخضر", name_en: "Ibrahim Akhdar" },
        { key: "Ahmed_Neana_128kbps", name_ar: "أحمد نعينع", name_en: "Ahmed Neana" },
        { key: "Salah_Al_Budair_128kbps", name_ar: "صلاح البدير", name_en: "Salah Al Budair" },
        { key: "Salaah_AbdulRahman_Bukhatir_128kbps", name_ar: "صلاح عبد الرحمن بوخاطر", name_en: "Salah Bukhatir" },
        { key: "Sahl_Yassin_128kbps", name_ar: "سهل ياسين", name_en: "Sahl Yassin" },
        { key: "Aziz_Alili_128kbps", name_ar: "عزيز العللي", name_en: "Aziz Alili" },
        { key: "Akram_AlAlaqimy_128kbps", name_ar: "أكرم العلاقمي", name_en: "Akram Al Alaqimy" },
        { key: "Muhsin_Al_Qasim_192kbps", name_ar: "محسن القاسم", name_en: "Muhsin Al Qasim" },
        { key: "Muhammad_AbdulKareem_128kbps", name_ar: "محمد عبد الكريم", name_en: "Muhammad AbdulKareem" },
        { key: "Yaser_Salamah_128kbps", name_ar: "ياسر سلامة", name_en: "Yaser Salamah" },
        { key: "Hudhaify_64kbps", name_ar: "علي الحذيفي", name_en: "Hudhaify" }
    ];

    /* --- Surahs Basic Metadata (114 surahs) --- */
    var SURAHS = [];
    var S_NAMES = [
        "الفاتحة","البقرة","آل عمران","النساء","المائدة","الأنعام","الأعراف","الأنفال","التوبة","يونس",
        "هود","يوسف","الرعد","إبراهيم","الحجر","النحل","الإسراء","الكهف","مريم","طه",
        "الأنبياء","الحج","المؤمنون","النور","الفرقان","الشعراء","النمل","القصص","العنكبوت","الروم",
        "لقمان","السجدة","الأحزاب","سبأ","فاطر","يس","الصافات","ص","الزمر","غافر",
        "فصلت","الشورى","الزخرف","الدخان","الجاثية","الأحقاف","محمد","الفتح","الحجرات","ق",
        "الذاريات","الطور","النجم","القمر","الرحمن","الواقعة","الحديد","المجادلة","الحشر","الممتحنة",
        "الصف","الجمعة","المنافقون","التغابن","الطلاق","التحريم","الملك","القلم","الحاقة","المعارج",
        "نوح","الجن","المزمل","المدثر","القيامة","الإنسان","المرسلات","النبأ","النازعات","عبس",
        "التكوير","الانفطار","المطففين","الانشقاق","البروج","الطارق","الأعلى","الغاشية","الفجر","البلد",
        "الشمس","الليل","الضحى","الشرح","التين","العلق","القدر","البينة","الزلزلة","العاديات",
        "القارعة","التكاثر","العصر","الهمزة","الفيل","قريش","الماعون","الكوثر","الكافرون","النصر",
        "المسد","الإخلاص","الفلق","الناس"
    ];
    var S_COUNTS = [
        7,286,200,176,120,165,206,75,129,109,
        123,111,43,52,99,128,111,110,98,135,
        112,78,118,64,77,227,93,88,69,60,
        34,30,73,54,45,83,182,88,75,85,
        54,53,89,59,37,35,38,29,18,45,
        60,49,62,55,78,96,29,22,24,13,
        14,11,11,18,12,12,30,52,52,44,
        28,28,20,56,40,31,50,40,46,42,
        29,19,36,25,22,17,19,26,30,20,
        15,21,11,8,8,19,5,8,8,11,
        11,8,3,9,5,4,7,3,6,3,
        5,4,5,6
    ];
    var S_TYPES = [
        "مكية","مدنية","مدنية","مدنية","مدنية","مكية","مكية","مدنية","مدنية","مكية",
        "مكية","مكية","مدنية","مكية","مكية","مكية","مكية","مكية","مكية","مكية",
        "مكية","مدنية","مكية","مدنية","مكية","مكية","مكية","مكية","مكية","مكية",
        "مكية","مكية","مدنية","مكية","مكية","مكية","مكية","مكية","مكية","مكية",
        "مكية","مكية","مكية","مكية","مكية","مكية","مدنية","مدنية","مدنية","مكية",
        "مكية","مكية","مكية","مكية","مدنية","مكية","مدنية","مدنية","مدنية","مدنية",
        "مدنية","مدنية","مدنية","مدنية","مدنية","مدنية","مكية","مكية","مكية","مكية",
        "مكية","مكية","مكية","مكية","مكية","مدنية","مكية","مكية","مكية","مكية",
        "مكية","مكية","مكية","مكية","مكية","مكية","مكية","مكية","مكية","مكية",
        "مكية","مكية","مكية","مكية","مكية","مكية","مكية","مدنية","مدنية","مكية",
        "مكية","مكية","مكية","مكية","مكية","مكية","مكية","مكية","مكية","مدنية",
        "مكية","مكية","مكية","مكية"
    ];

    /* v8.7.24: English surah names and display helper (Arabic stays when the language is Arabic) */
    var S_NAMES_EN = ["Al-Fatihah", "Al-Baqarah", "Aal-Imran", "An-Nisa", "Al-Ma'idah", "Al-An'am", "Al-A'raf", "Al-Anfal", "At-Tawbah", "Yunus", "Hud", "Yusuf", "Ar-Ra'd", "Ibrahim", "Al-Hijr", "An-Nahl", "Al-Isra", "Al-Kahf", "Maryam", "Ta-Ha", "Al-Anbiya", "Al-Hajj", "Al-Mu'minun", "An-Nur", "Al-Furqan", "Ash-Shu'ara", "An-Naml", "Al-Qasas", "Al-Ankabut", "Ar-Rum", "Luqman", "As-Sajdah", "Al-Ahzab", "Saba", "Fatir", "Ya-Sin", "As-Saffat", "Sad", "Az-Zumar", "Ghafir", "Fussilat", "Ash-Shura", "Az-Zukhruf", "Ad-Dukhan", "Al-Jathiyah", "Al-Ahqaf", "Muhammad", "Al-Fath", "Al-Hujurat", "Qaf", "Adh-Dhariyat", "At-Tur", "An-Najm", "Al-Qamar", "Ar-Rahman", "Al-Waqi'ah", "Al-Hadid", "Al-Mujadilah", "Al-Hashr", "Al-Mumtahanah", "As-Saff", "Al-Jumu'ah", "Al-Munafiqun", "At-Taghabun", "At-Talaq", "At-Tahrim", "Al-Mulk", "Al-Qalam", "Al-Haqqah", "Al-Ma'arij", "Nuh", "Al-Jinn", "Al-Muzzammil", "Al-Muddaththir", "Al-Qiyamah", "Al-Insan", "Al-Mursalat", "An-Naba", "An-Nazi'at", "Abasa", "At-Takwir", "Al-Infitar", "Al-Mutaffifin", "Al-Inshiqaq", "Al-Buruj", "At-Tariq", "Al-A'la", "Al-Ghashiyah", "Al-Fajr", "Al-Balad", "Ash-Shams", "Al-Layl", "Ad-Duha", "Ash-Sharh", "At-Tin", "Al-Alaq", "Al-Qadr", "Al-Bayyinah", "Az-Zalzalah", "Al-Adiyat", "Al-Qari'ah", "At-Takathur", "Al-Asr", "Al-Humazah", "Al-Fil", "Quraysh", "Al-Ma'un", "Al-Kawthar", "Al-Kafirun", "An-Nasr", "Al-Masad", "Al-Ikhlas", "Al-Falaq", "An-Nas"];
    function NM(o) { return (APL.lang === "ar" || !o) ? (o && o.name_ar) : (o.name_en || o.name_ar); }
    /* v8.7.25: English for the Quran player. In English mode every label, tooltip and placeholder inside the player is translated
       (exact texts, surah and reciter names, a few phrases); verse and tafsir text is never touched. */
    var QA_D = {"تشغيل متواصل": "Continuous play", "تكرار الآية الحالية": "Repeat the current verse", "تكرار السورة كاملة": "Repeat the whole surah", "إيقاف التكرار": "Repeat off", "البحث في الآيات": "Search verses", "إذاعة القرآن الكريم من القاهرة": "Holy Quran Radio from Cairo", "إذاعة القرآن": "Quran Radio", "إذاعة القرآن · مباشر": "Quran Radio · Live", "وضع التكرار": "Repeat mode", "الآية السابقة": "Previous verse", "تشغيل / إيقاف مؤقت": "Play / Pause", "الآية التالية": "Next verse", "سرعة التلاوة": "Recitation speed", "خيارات إضافية": "More options", "جاري تحميل نص الآية الكريمة…": "Loading the verse…", "جاري تحميل التفسير…": "Loading the tafsir…", "جاري الاتصال…": "Connecting…", "اختر سورة من المصحف الشريف": "Choose a surah", "تنقل بالأسهم واضغط OK للاختيار والاستماع": "Move with the arrows and press OK to choose and listen", "السورة المحددة بالريموت:": "Surah selected with the remote:", "اضغط زر [ OK ] لتشغيل السورة والاستماع فوراً ◀": "Press [ OK ] to play the surah now ◀", "اختر القارئ (٤٢ قارئ معتمد)": "Choose a reciter (42 approved reciters)", "القارئ المحدد بالريموت:": "Reciter selected with the remote:", "اضغط زر [ OK ] لتشغيل القارئ والاستماع فوراً ◀": "Press [ OK ] to play with this reciter now ◀", "البحث الفوري في نصوص الآيات": "Instant search in the verses", "اكتب كلمة أو جزءاً من الآية للبحث...": "Type a word or part of a verse to search...", "أدخل كلمتين على الأقل لبدء البحث الفوري": "Enter at least two letters to start the instant search", "جاري تحميل فهرس وبيانات البحث…": "Loading the search index and data…", "تعذر تحميل بيانات البحث": "Could not load the search data", "لم يتم العثور على نتائج مطابقة": "No matching results", "خيارات مشغل القرآن الكريم": "Quran player options", "سرعة التلاوة:": "Recitation speed:", "1.0× (عادي)": "1.0× (normal)", "مفعّل": "On", "معطّل": "Off", "إظهار التفسير أسفل الآية:": "Show the tafsir under the verse:", "حفظ وإغلاق": "Save and close"};
    var QA_FR = {"سورة ": "Surah ", "الآية ": "Verse ", " آية": " verses", "مكية": "Meccan", "مدنية": "Medinan", "القارئ رقم ": "Reciter no. ", "رقم ": "No. ", " من ١١٤ · ": " of 114 · ", " من ٤٢ قارئاً معتمداً": " of 42 approved reciters"};
    function qaMaps() {
        if (QA_D._ready) return;
        QA_D._ready = true;
        for (var i = 0; i < SURAHS.length; i++) QA_D[SURAHS[i].name_ar] = SURAHS[i].name_en;
        for (var j = 0; j < RECITERS.length; j++) if (RECITERS[j].name_en) QA_D[RECITERS[j].name_ar] = RECITERS[j].name_en;
    }
    function qaText(s) {
        var t = s.replace(/^\s+|\s+$/g, "");
        if (!t || !/[\u0600-\u06FF\u0660-\u0669]/.test(t) || t.length > 90) return s;
        qaMaps();
        if (Object.prototype.hasOwnProperty.call(QA_D, t)) return s.replace(t, QA_D[t]);
        var out = s, k;
        for (k in QA_FR) if (out.indexOf(k) >= 0) out = out.split(k).join(QA_FR[k]);
        for (var i = 0; i < SURAHS.length; i++) if (out.indexOf("Surah " + SURAHS[i].name_ar) >= 0) out = out.split("Surah " + SURAHS[i].name_ar).join("Surah " + SURAHS[i].name_en);
        return out.replace(/[\u0660-\u0669]/g, function (d) { return String(d.charCodeAt(0) - 1632); });
    }
    function qaSkip(n) {
        var e = n.nodeType === 1 ? n : n.parentNode;
        if (!e) return true;
        if ((verseTextEl && verseTextEl.contains(e)) || (tafsirTextEl && tafsirTextEl.contains(e))) return true;
        return !!(e.closest && e.closest(".qa-sr-body, .qa-verse-main, .qa-tafsir-main"));
    }
    function qaWalk(n) {
        if (n.nodeType === 3) { if (!qaSkip(n)) { var v = qaText(n.nodeValue); if (v !== n.nodeValue) n.nodeValue = v; } return; }
        if (n.nodeType !== 1 || qaSkip(n)) return;
        var at = ["title", "placeholder", "aria-label"];
        for (var a = 0; a < at.length; a++) { var av = n.getAttribute(at[a]); if (av) { var nv = qaText(av); if (nv !== av) n.setAttribute(at[a], nv); } }
        for (var c = n.firstChild; c; c = c.nextSibling) qaWalk(c);
    }
    function qaWatch(el) {
        if (APL.lang === "ar" || !global.MutationObserver) return;
        var busy = false;
        var mo = new global.MutationObserver(function (recs) {
            if (busy) return;
            busy = true;
            try {
                for (var i = 0; i < recs.length; i++) {
                    var r = recs[i];
                    if (r.type === "childList") { for (var j = 0; j < r.addedNodes.length; j++) qaWalk(r.addedNodes[j]); }
                    else if (r.type === "characterData") qaWalk(r.target);
                    else qaWalk(r.target);
                }
            } catch (e) {}
            busy = false;
        });
        mo.observe(el, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["title", "placeholder", "aria-label"] });
        qaWalk(el);
    }
    for (var sIdx = 0; sIdx < 114; sIdx++) {
        SURAHS.push({
            id: sIdx + 1,
            name_ar: S_NAMES[sIdx],
            name_en: S_NAMES_EN[sIdx],
            verses: S_COUNTS[sIdx],
            type: S_TYPES[sIdx]
        });
    }

    /* --- State & Preferences --- */
    var audioEl = null;
    var isOpen = false;
    var curSurah = parseInt(sys.pref("quran_audio_surah"), 10) || 16;
    var curAyah = parseInt(sys.pref("quran_audio_ayah"), 10) || 23;
    var curReciter = sys.pref("quran_audio_reciter") || "Minshawy_Murattal_128kbps";
    var curMode = sys.pref("quran_audio_mode") || "continuous"; // "continuous" | "repeat_verse" | "repeat_surah" | "off"
    var curSpeed = sys.pref("quran_audio_speed") || 1;
    var showTafsir = sys.pref("quran_audio_tafsir") !== false;
    var favReciters = sys.pref("quran_audio_fav_reciters") || ["Minshawy_Murattal_128kbps", "Husary_64kbps", "Abdul_Basit_Murattal_64kbps", "Alafasy_64kbps"];

    var isPlaying = false;
    var isLoading = false;
    var activeModal = null; // null | "surah" | "reciter" | "search" | "more"
    var verseCache = {};
    var tafsirCache = {};
    var tafsirSurahCache = {};
    var tafsirOrder = [];
    var metaData = null;
    var searchData = null;
    var normalizedSearchData = null;
    var searchDebounceTimer = null;
    var searchInFlight = false;
    var juzCache = {};
    var juzOrder = [];
    var overlayEl = null;
    var wasPlayingBeforeHidden = false;
    var qaNav = null;
    var preferredBase = "";
    var preferredBaseTimer = null;
    var stallWatchdog = null;
    var verseReq = 0;
    var verseOrder = [];
    var tafsirAyahOrder = [];
    var wasPlayingBeforeAlert = false;
    var endedAdvanceTimer = null;

    function lruSet(cache, order, key, val, max) {
        var sKey = String(key);
        var idx = order.indexOf(sKey);
        if (idx !== -1) order.splice(idx, 1);
        order.push(sKey);
        cache[sKey] = val;
        while (order.length > max) {
            var oldKey = order.shift();
            delete cache[oldKey];
        }
    }

    function lruGet(cache, order, key) {
        var sKey = String(key);
        if (!cache || !cache[sKey]) return null;
        var idx = order.indexOf(sKey);
        if (idx !== -1) {
            order.splice(idx, 1);
            order.push(sKey);
        }
        return cache[sKey];
    }

    function setPreferredMirror() {
        preferredBase = "https://mirrors.quranicaudio.com/everyayah/";
        if (preferredBaseTimer) clearTimeout(preferredBaseTimer);
        preferredBaseTimer = setTimeout(function () {
            preferredBase = "";
        }, 10 * 60 * 1000);
    }

    function normalizeArabic(s) {
        return String(s || "").replace(/[أإآ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه").replace(/[ًٌٍَُِّْٰۖۗۘۙۚۛ]/g, "").toLowerCase();
    }

    /* DOM elements */
    var rootEl = null;
    var btnSurah = null, btnReciter = null, btnSearch = null, btnRadio = null;
    var verseTextEl = null, tafsirTextEl = null;
    var btnMode = null, btnPrev = null, btnPlay = null, btnNext = null, btnSpeed = null, btnMore = null;
    var modalOverlay = null, modalContent = null;
    var focusArea = "player"; // "top" | "verse" | "player" | "modal"
    var focusIdx = 2; // player controls: 0=mode, 1=prev, 2=play, 3=next, 4=speed, 5=more
    var topFocusIdx = 0; // 0=search (right), 1=reciter (center), 2=surah (left)
    var modalFocusIdx = 0;

    /* Helpers */
    function pad3(n) {
        var s = String(n);
        while (s.length < 3) s = "0" + s;
        return s;
    }

    function toEastern(n) {
        return String(n).replace(/[0-9]/g, function (d) {
            return "٠١٢٣٤٥٦٧٨٩"[parseInt(d, 10)];
        });
    }

    function getReciterObj(key) {
        for (var i = 0; i < RECITERS.length; i++) {
            if (RECITERS[i].key === key) return RECITERS[i];
        }
        return RECITERS[0];
    }

    function getSurahObj(id) {
        if (id >= 1 && id <= 114) return SURAHS[id - 1];
        return SURAHS[0];
    }

    function buildAudioUrl(reciterKey, surah, ayah) {
        var rec = getReciterObj(reciterKey);
        var base = rec.audioBaseUrl || ("https://everyayah.com/data/" + reciterKey);
        if (preferredBase && base.indexOf("https://everyayah.com/data/") === 0) {
            base = base.replace("https://everyayah.com/data/", preferredBase);
        }
        return base + "/" + pad3(parseInt(surah, 10) || 1) + pad3(parseInt(ayah, 10) || 1) + ".mp3";
    }

    /* Initialize Audio element */
    function initAudio() {
        if (audioEl) return audioEl;
        audioEl = new Audio();
        audioEl.preload = "auto";
        audioEl.defaultPlaybackRate = curSpeed;
        var fallbackTried = false;

        function tryFallback(reason) {
            if (fallbackTried || !audioEl || !audioEl.src) return false;
            fallbackTried = true;
            var cur = audioEl.src;
            var target = "";
            if (cur.indexOf("https://everyayah.com/data/") !== -1) {
                target = cur.replace("https://everyayah.com/data/", "https://mirrors.quranicaudio.com/everyayah/");
                setPreferredMirror();
            } else if (cur.indexOf("https://mirrors.quranicaudio.com/everyayah/") !== -1) {
                target = cur.replace("https://mirrors.quranicaudio.com/everyayah/", "https://everyayah.com/data/");
                preferredBase = "";
                if (preferredBaseTimer) { clearTimeout(preferredBaseTimer); preferredBaseTimer = null; }
            }
            if (target && target !== cur) {
                console.warn("[QuranAudio] Fallback triggered (" + reason + ") -> " + target);
                audioEl.src = target;
                audioEl.defaultPlaybackRate = curSpeed;
                try { audioEl.load(); } catch (e) {}
                audioEl.playbackRate = curSpeed;
                var p = audioEl.play();
                if (p && p.catch) p.catch(function () {});
                return true;
            }
            return false;
        }

        audioEl.addEventListener("loadedmetadata", function () {
            audioEl.playbackRate = curSpeed;
        });

        audioEl.addEventListener("playing", function () {
            if (stallWatchdog) { clearTimeout(stallWatchdog); stallWatchdog = null; }
            fallbackTried = false;
            isPlaying = true;
            isLoading = false;
            updateControlsUI();
        });
        audioEl.addEventListener("pause", function () {
            if (endedAdvanceTimer) { clearTimeout(endedAdvanceTimer); endedAdvanceTimer = null; }
            isPlaying = false;
            updateControlsUI();
        });
        audioEl.addEventListener("loadstart", function () {
            isLoading = true;
            updateControlsUI();
            if (stallWatchdog) clearTimeout(stallWatchdog);
            stallWatchdog = setTimeout(function () {
                if (isLoading && audioEl && audioEl.src && !fallbackTried) {
                    tryFallback("12s stall watchdog");
                }
            }, 12000);
        });
        audioEl.addEventListener("waiting", function () {
            if (stallWatchdog) clearTimeout(stallWatchdog);
            stallWatchdog = setTimeout(function () {
                if (audioEl && !fallbackTried && !audioEl.paused) {
                    tryFallback("waiting stall");
                }
            }, 10000);
        });
        audioEl.addEventListener("canplay", function () {
            if (stallWatchdog) { clearTimeout(stallWatchdog); stallWatchdog = null; }
            isLoading = false;
            updateControlsUI();
        });
        audioEl.addEventListener("ended", onAudioEnded);
        audioEl.addEventListener("error", function () {
            if (stallWatchdog) { clearTimeout(stallWatchdog); stallWatchdog = null; }
            if (tryFallback("audio error")) return;
            fallbackTried = false;
            isLoading = false;
            isPlaying = false;
            updateControlsUI();
            if (APL.toast) APL.toast(APL.lang === "ar" ? "تعذر تشغيل تلاوة الآية من المصدر" : "Failed to stream ayah audio", true);
        });
        return audioEl;
    }

    function onAudioEnded() {
        if (endedAdvanceTimer) clearTimeout(endedAdvanceTimer);
        endedAdvanceTimer = setTimeout(function () {
            endedAdvanceTimer = null;
            if (!isOpen && !sys.pref("quran_bg_playback")) return;
            var sNum = parseInt(curSurah, 10) || 1;
            var aNum = parseInt(curAyah, 10) || 1;
            if (curMode === "repeat_verse") {
                playCurrentAyah();
            } else if (curMode === "repeat_surah") {
                var surahObj = getSurahObj(sNum);
                if (aNum < surahObj.verses) {
                    stepAyah(1);
                } else {
                    curSurah = sNum;
                    curAyah = 1;
                    loadAndPlayCurrent();
                }
            } else if (curMode === "continuous") {
                var sObj = getSurahObj(sNum);
                if (aNum < sObj.verses) {
                    stepAyah(1);
                } else if (sNum < 114) {
                    curSurah = sNum + 1;
                    curAyah = 1;
                    loadAndPlayCurrent();
                } else {
                    isPlaying = false;
                    updateControlsUI();
                }
            } else {
                isPlaying = false;
                updateControlsUI();
            }
        }, 50);
    }

    /* Fetch Verse Text & Tafsir */
    function loadVerseData(surah, ayah, cb) {
        var key = surah + ":" + ayah;
        var cv = lruGet(verseCache, verseOrder, key);
        var ct = lruGet(tafsirCache, tafsirAyahOrder, key);
        if (cv && ct) {
            if (cb) cb(cv, ct);
            return;
        }

        loadOfflineVerseAndTafsir(surah, ayah, function (vText, tText) {
            if (vText) lruSet(verseCache, verseOrder, key, vText, 50);
            if (tText) lruSet(tafsirCache, tafsirAyahOrder, key, tText, 50);

            // Only attempt online fetch if offline tafsir or verse was completely missing
            if (!tText || !vText) {
                tryFetchMuyassarTafsir(surah, ayah, function (onlineMuyassar, onlineUthmani) {
                    if (onlineUthmani && !verseCache[key]) lruSet(verseCache, verseOrder, key, onlineUthmani, 50);
                    if (onlineMuyassar && !tafsirCache[key]) lruSet(tafsirCache, tafsirAyahOrder, key, onlineMuyassar, 50);
                    if (isOpen && curSurah === surah && curAyah === ayah) {
                        renderVerseArea();
                    }
                });
            }

            if (cb) cb(verseCache[key] || "", tafsirCache[key] || "");
        });
    }

    function loadOfflineVerseAndTafsir(surah, ayah, cb) {
        var vText = "", tText = "";
        var cachedSurahTafsir = lruGet(tafsirSurahCache, tafsirOrder, surah);
        if (cachedSurahTafsir) {
            var tf = cachedSurahTafsir[String(ayah)];
            if (tf) {
                tText = String(tf).replace(/\{[0-9]+\}\s*/g, "").replace(/\{([^}]+)\}/g, "$1").trim();
            }
            loadOfflineVerseText(surah, ayah, function (vt) {
                cb(vt || "", tText);
            });
            return;
        }
        var xhrT = new XMLHttpRequest();
        xhrT.open("GET", "data/tafsir/" + surah + ".json", true);
        xhrT.responseType = "json";
        xhrT.onload = function () {
            if (xhrT.status === 200 && xhrT.response && xhrT.response.ayahs) {
                lruSet(tafsirSurahCache, tafsirOrder, surah, xhrT.response.ayahs, 2);
                var tf = xhrT.response.ayahs[String(ayah)];
                if (tf) {
                    tText = String(tf).replace(/\{[0-9]+\}\s*/g, "").replace(/\{([^}]+)\}/g, "$1").trim();
                }
            }
            loadOfflineVerseText(surah, ayah, function (vt) {
                vText = vt || "";
                cb(vText, tText);
            });
        };
        xhrT.onerror = function () {
            loadOfflineVerseText(surah, ayah, function (vt) {
                cb(vt || "", "");
            });
        };
        xhrT.send();
    }

    function loadOfflineVerseText(surah, ayah, cb) {
        if (metaData) {
            getVerseFromJuz(surah, ayah, cb);
            return;
        }
        var xhrM = new XMLHttpRequest();
        xhrM.open("GET", "data/quran/meta.json", true);
        xhrM.responseType = "json";
        xhrM.onload = function () {
            if (xhrM.status === 200 && xhrM.response) {
                metaData = xhrM.response;
                getVerseFromJuz(surah, ayah, cb);
            } else {
                cb("");
            }
        };
        xhrM.onerror = function () { cb(""); };
        xhrM.send();
    }

    function getVerseFromJuz(surah, ayah, cb) {
        try {
            var surahMeta = metaData.surahs[surah - 1];
            var globalIdx = surahMeta[1] + (ayah - 1);
            var juzNum = 1;
            for (var i = 0; i < metaData.juz.length - 1; i++) {
                if (metaData.juz[i] <= globalIdx && globalIdx < metaData.juz[i + 1]) {
                    juzNum = i + 1;
                    break;
                }
            }
            var cachedJuz = lruGet(juzCache, juzOrder, juzNum);
            if (cachedJuz) {
                var vInJuz = globalIdx - metaData.juz[juzNum - 1];
                cb(cachedJuz.verses[vInJuz] || "");
                return;
            }
            var padJuz = juzNum < 10 ? "0" + juzNum : String(juzNum);
            var xhrJ = new XMLHttpRequest();
            xhrJ.open("GET", "data/quran/juz/" + padJuz + ".json", true);
            xhrJ.responseType = "json";
            xhrJ.onload = function () {
                if (xhrJ.status === 200 && xhrJ.response) {
                    lruSet(juzCache, juzOrder, juzNum, xhrJ.response, 3);
                    var vInJuz = globalIdx - metaData.juz[juzNum - 1];
                    cb(xhrJ.response.verses[vInJuz] || "");
                } else {
                    cb("");
                }
            };
            xhrJ.onerror = function () { cb(""); };
            xhrJ.send();
        } catch (e) { cb(""); }
    }

    function tryFetchMuyassarTafsir(surah, ayah, cb) {
        var url = "https://quranenc.com/api/v1/translation/aya/arabic_moyassar/" + surah + "/" + ayah + "/";
        var xhr = new XMLHttpRequest();
        xhr.open("GET", url, true);
        xhr.timeout = 5000;
        xhr.responseType = "json";
        xhr.onload = function () {
            if (xhr.status === 200 && xhr.response && xhr.response.result) {
                var res = xhr.response.result;
                cb(res.translation || "", res.arabic_text || "");
            }
        };
        xhr.onerror = function () {};
        try { xhr.send(); } catch (e) {}
    }

    /* Playback Operations */
    function playCurrentAyah() {
        initAudio();
        if (APL.radio && APL.radio.stop) APL.radio.stop();
        if (APL.audioPack && APL.audioPack.stop) APL.audioPack.stop();

        curSurah = parseInt(curSurah, 10) || 1;
        curAyah = parseInt(curAyah, 10) || 1;

        var src = buildAudioUrl(curReciter, curSurah, curAyah);
        audioEl.src = src;
        audioEl.defaultPlaybackRate = curSpeed;
        try { audioEl.load(); } catch (e) {}
        audioEl.playbackRate = curSpeed;
        isLoading = true;
        updateControlsUI();

        var playPromise = audioEl.play();
        if (playPromise && playPromise.catch) {
            playPromise.catch(function (err) {
                console.warn("[QuranAudio] Playback interrupted:", err);
                isLoading = false;
                isPlaying = false;
                updateControlsUI();
            });
        }
    }

    function loadAndPlayCurrent() {
        curSurah = parseInt(curSurah, 10) || 1;
        curAyah = parseInt(curAyah, 10) || 1;
        sys.setPref("quran_audio_surah", curSurah);
        sys.setPref("quran_audio_ayah", curAyah);
        renderHeader();
        renderVerseArea();
        var reqId = ++verseReq;
        loadVerseData(curSurah, curAyah, function () {
            if (reqId === verseReq) {
                renderVerseArea();
            }
        });
        playCurrentAyah();
    }

    function togglePlay() {
        initAudio();
        if (endedAdvanceTimer) { clearTimeout(endedAdvanceTimer); endedAdvanceTimer = null; }
        if (isPlaying) {
            audioEl.pause();
            isPlaying = false;
            updateControlsUI();
        } else {
            if (!audioEl.src || audioEl.ended || audioEl.error) {
                playCurrentAyah();
            } else {
                audioEl.play().catch(function () {
                    playCurrentAyah();
                });
            }
        }
    }

    function stepAyah(dir) {
        var sNum = parseInt(curSurah, 10) || 1;
        var aNum = parseInt(curAyah, 10) || 1;
        var dNum = parseInt(dir, 10) || 1;
        var surahObj = getSurahObj(sNum);
        var nextAyah = aNum + dNum;
        if (nextAyah >= 1 && nextAyah <= surahObj.verses) {
            curSurah = sNum;
            curAyah = nextAyah;
            loadAndPlayCurrent();
        } else if (dNum > 0 && sNum < 114) {
            curSurah = sNum + 1;
            curAyah = 1;
            loadAndPlayCurrent();
        } else if (dNum < 0 && sNum > 1) {
            curSurah = sNum - 1;
            curAyah = getSurahObj(curSurah).verses;
            loadAndPlayCurrent();
        } else {
            isPlaying = false;
            updateControlsUI();
            if (APL.toast) APL.toast(dNum > 0 ? "نهاية المصحف الشريف" : "بداية المصحف الشريف", true);
        }
    }

    function cycleRepeatMode() {
        var modes = ["continuous", "repeat_verse", "repeat_surah", "off"];
        var idx = modes.indexOf(curMode);
        curMode = modes[(idx + 1) % modes.length];
        sys.setPref("quran_audio_mode", curMode);
        updateControlsUI();
        var label = "تشغيل متواصل";
        if (curMode === "repeat_verse") label = "تكرار الآية الحالية";
        else if (curMode === "repeat_surah") label = "تكرار السورة كاملة";
        else if (curMode === "off") label = "إيقاف التكرار";
        if (APL.toast) APL.toast(label, true);
    }

    /* Build DOM styled exactly as image-1.png */
    function buildUI() {
        if (rootEl) return rootEl;

        if (!overlayEl) {
            overlayEl = document.createElement("div");
            overlayEl.id = "quran-audio-overlay";
            overlayEl.className = "quran-audio-overlay";
            overlayEl.addEventListener("click", function () {
                if (!activeModal) closePage();
            });
            document.body.appendChild(overlayEl);
        }

        rootEl = document.createElement("div");
        rootEl.id = "quran-audio-page";
        rootEl.className = "quran-audio-screen";

        /* --- Header Row with 3 pill buttons (ordered right-to-left as image-1.png) --- */
        var headRow = document.createElement("div");
        headRow.className = "qa-top-bar";

        // Right button (in RTL): Search (البحث في الآيات)
        btnSearch = document.createElement("button");
        btnSearch.type = "button";
        btnSearch.className = "qa-pill qa-pill--search";
        btnSearch.innerHTML = '<svg class="qa-pill-ic" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg><span class="qa-pill-txt">البحث في الآيات</span>';
        btnSearch.addEventListener("click", openSearchModal);

        // Center button: Reciter (اسم القارئ)
        btnReciter = document.createElement("button");
        btnReciter.type = "button";
        btnReciter.className = "qa-pill qa-pill--reciter";
        btnReciter.innerHTML = '<svg class="qa-pill-ic" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3M8 22h8"/></svg><span class="qa-pill-txt"></span>';
        btnReciter.addEventListener("click", openReciterPicker);

        // Left button: Surah (سورة ...)
        btnSurah = document.createElement("button");
        btnSurah.type = "button";
        btnSurah.className = "qa-pill qa-pill--surah";
        btnSurah.innerHTML = '<svg class="qa-pill-ic" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 6h10M6 10h10M6 14h6"/></svg><span class="qa-pill-txt"></span>';
        btnSurah.addEventListener("click", openSurahPicker);

        // Radio button: Egyptian Quran Radio from Cairo (إذاعة القرآن الكريم من القاهرة)
        btnRadio = document.createElement("button");
        btnRadio.type = "button";
        btnRadio.className = "qa-pill qa-pill--radio";
        btnRadio.title = "إذاعة القرآن الكريم من القاهرة";
        btnRadio.innerHTML = '<svg class="qa-pill-ic" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="2"/><path d="M7.8 7.8a6 6 0 0 0 0 8.4M16.2 7.8a6 6 0 0 1 0 8.4M4.9 4.9a10 10 0 0 0 0 14.2M19.1 4.9a10 10 0 0 1 0 14.2"/></svg><span class="qa-pill-txt">إذاعة القرآن</span><span class="qa-live-dot"></span>';
        btnRadio.addEventListener("click", function () {
            if (APL.radio) {
                var r = APL.radio;
                var st = r.state ? r.state() : {};
                var active = r.isPlaying() || st.playing || st.starting || (r.wanted && r.wanted());
                if (active) {
                    r.stop();
                    updateRadioPill();
                    if (APL.toast) APL.toast(APL.lang === "ar" ? "تم إيقاف إذاعة القرآن الكريم فوراً" : "Quran Radio stopped", true);
                } else {
                    if (audioEl) {
                        try { audioEl.pause(); } catch (e) {}
                        isPlaying = false;
                        updateControlsUI();
                    }
                    r.play().then(function () {
                        updateRadioPill();
                    });
                }
            }
        });

        // In RTL flexbox: 1st is on the right, 2nd is in center, 3rd is surah, 4th is radio
        headRow.appendChild(btnSearch);
        headRow.appendChild(btnReciter);
        headRow.appendChild(btnSurah);
        headRow.appendChild(btnRadio);
        rootEl.appendChild(headRow);

        /* --- Middle Verse Area --- */
        var verseWrap = document.createElement("div");
        verseWrap.className = "qa-center-area";

        verseTextEl = document.createElement("div");
        verseTextEl.className = "qa-verse-main";

        tafsirTextEl = document.createElement("div");
        tafsirTextEl.className = "qa-tafsir-main";

        verseWrap.appendChild(verseTextEl);
        verseWrap.appendChild(tafsirTextEl);
        rootEl.appendChild(verseWrap);

        /* --- Bottom Player Controls Bar (clean 5 icons matching image-1.png) --- */
        var ctrlBar = document.createElement("div");
        ctrlBar.className = "qa-bottom-bar";

        // Repeat mode
        btnMode = document.createElement("button");
        btnMode.type = "button";
        btnMode.className = "qa-btn qa-btn--mode";
        btnMode.title = "وضع التكرار";
        btnMode.innerHTML = '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2.2"><path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14M7 22l-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/></svg><span class="qa-badge"></span>';
        btnMode.addEventListener("click", cycleRepeatMode);

        // Previous
        btnPrev = document.createElement("button");
        btnPrev.type = "button";
        btnPrev.className = "qa-btn qa-btn--prev";
        btnPrev.title = "الآية السابقة";
        btnPrev.innerHTML = '<svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><path d="M6 6h2.5v12H6zm3.5 6 9 6V6z"/></svg>';
        btnPrev.addEventListener("click", function () { stepAyah(-1); });

        // Play / Pause
        btnPlay = document.createElement("button");
        btnPlay.type = "button";
        btnPlay.className = "qa-btn qa-btn--play";
        btnPlay.title = "تشغيل / إيقاف مؤقت";
        btnPlay.innerHTML = '<svg class="qa-play-ic" viewBox="0 0 24 24" width="34" height="34" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
        btnPlay.addEventListener("click", togglePlay);

        // Next
        btnNext = document.createElement("button");
        btnNext.type = "button";
        btnNext.className = "qa-btn qa-btn--next";
        btnNext.title = "الآية التالية";
        btnNext.innerHTML = '<svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><path d="m5.5 18 9-6-9-6v12zM15.5 6H18v12h-2.5z"/></svg>';
        btnNext.addEventListener("click", function () { stepAyah(1); });

        // Speed quick-cycle button
        btnSpeed = document.createElement("button");
        btnSpeed.type = "button";
        btnSpeed.className = "qa-btn qa-btn--speed";
        btnSpeed.title = "سرعة التلاوة";
        btnSpeed.textContent = curSpeed + "×";
        btnSpeed.addEventListener("click", cycleSpeed);

        // More Options
        btnMore = document.createElement("button");
        btnMore.type = "button";
        btnMore.className = "qa-btn qa-btn--more";
        btnMore.title = "خيارات إضافية";
        btnMore.innerHTML = '<svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><circle cx="12" cy="12" r="2.2"/><circle cx="19" cy="12" r="2.2"/><circle cx="5" cy="12" r="2.2"/></svg>';
        btnMore.addEventListener("click", openMoreOptions);

        ctrlBar.appendChild(btnMode);
        ctrlBar.appendChild(btnPrev);
        ctrlBar.appendChild(btnPlay);
        ctrlBar.appendChild(btnNext);
        ctrlBar.appendChild(btnSpeed);
        ctrlBar.appendChild(btnMore);
        rootEl.appendChild(ctrlBar);

        /* --- Modal Backdrop Overlay for Pickers --- */
        modalOverlay = document.createElement("div");
        modalOverlay.className = "qa-modal-box";
        modalOverlay.addEventListener("click", function (e) {
            if (e.target === modalOverlay) closeModal();
        });

        modalContent = document.createElement("div");
        modalContent.className = "qa-modal-inner";
        modalOverlay.appendChild(modalContent);
        rootEl.appendChild(modalOverlay);

        document.body.appendChild(rootEl);
        qaWatch(rootEl);
        return rootEl;
    }

    function renderHeader() {
        if (!btnSurah || !btnReciter) return;
        var sObj = getSurahObj(curSurah);
        var rObj = getReciterObj(curReciter);

        var surahLabel = "سورة " + sObj.name_ar + " (" + sObj.type + " - " + toEastern(sObj.verses) + " آية)";
        btnSurah.querySelector(".qa-pill-txt").textContent = surahLabel;
        btnReciter.querySelector(".qa-pill-txt").textContent = rObj.name_ar;
    }

    function renderVerseArea() {
        if (!verseTextEl || !tafsirTextEl) return;
        if (widgetSlot) window.setTimeout(placeWidget, 0);
        var key = curSurah + ":" + curAyah;
        var vText = verseCache[key] || "جاري تحميل نص الآية الكريمة…";
        var tText = tafsirCache[key] || "";

        var ayahSign = " ﴿" + toEastern(curAyah) + "﴾";
        verseTextEl.innerHTML = esc(vText) + '<span class="qa-ayah-sign">' + ayahSign + '</span>';

        if (showTafsir && tText) {
            tafsirTextEl.style.display = "block";
            tafsirTextEl.textContent = tText;
        } else if (!showTafsir) {
            tafsirTextEl.style.display = "none";
        } else {
            tafsirTextEl.style.display = "block";
            tafsirTextEl.textContent = "جاري تحميل التفسير…";
        }
    }

    function updateRadioPill() {
        if (!btnRadio || !APL.radio) return;
        var st = APL.radio.state();
        var isLive = st.playing;
        var isStart = st.starting;
        btnRadio.classList.toggle("is-active", isLive || isStart);
        var txt = btnRadio.querySelector(".qa-pill-txt");
        if (txt) {
            txt.textContent = isStart ? "جاري الاتصال…" : (isLive ? "إذاعة القرآن · مباشر" : "إذاعة القرآن");
        }
    }

    function updateControlsUI() {
        if (!btnPlay || !btnMode) return;

        if (isLoading) {
            btnPlay.innerHTML = '<div class="qa-spin"></div>';
        } else if (isPlaying) {
            btnPlay.innerHTML = '<svg viewBox="0 0 24 24" width="34" height="34" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';
        } else {
            btnPlay.innerHTML = '<svg viewBox="0 0 24 24" width="34" height="34" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
        }

        btnMode.classList.toggle("is-active", curMode !== "off");
        var badge = btnMode.querySelector(".qa-badge");
        if (badge) {
            if (curMode === "repeat_verse") badge.textContent = "١";
            else if (curMode === "repeat_surah") badge.textContent = "س";
            else if (curMode === "continuous") badge.textContent = "∞";
            else badge.textContent = "";
        }
        if (btnSpeed) {
            btnSpeed.textContent = curSpeed + "×";
        }
        updateRadioPill();
    }

    function cycleSpeed() {
        var speeds = [0.75, 1, 1.25, 1.5];
        var idx = speeds.indexOf(curSpeed);
        if (idx === -1) idx = 1;
        var nextIdx = (idx + 1) % speeds.length;
        curSpeed = speeds[nextIdx];
        sys.setPref("quran_audio_speed", curSpeed);
        if (audioEl) {
            audioEl.defaultPlaybackRate = curSpeed;
            audioEl.playbackRate = curSpeed;
        }
        if (btnSpeed) btnSpeed.textContent = curSpeed + "×";
        if (APL.toast) APL.toast("سرعة التلاوة: " + curSpeed + "×", true);
    }

    function esc(s) {
        return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    /* Modal dialogs */
    function closeModal() {
        activeModal = null;
        if (modalOverlay) modalOverlay.classList.remove("is-open");
        focusArea = "player";
        updateFocus();
    }

    function openSurahPicker() {
        activeModal = "surah";
        buildUI();
        modalContent.innerHTML = "";

        var head = document.createElement("div");
        head.className = "qa-modal-header";
        head.innerHTML = '<div><h3>اختر سورة من المصحف الشريف</h3><div class="qa-modal-subhead">تنقل بالأسهم واضغط OK للاختيار والاستماع</div></div><button type="button" class="qa-modal-x">✕</button>';
        head.querySelector(".qa-modal-x").addEventListener("click", closeModal);
        modalContent.appendChild(head);

        var activeBanner = document.createElement("div");
        activeBanner.className = "qa-active-banner";
        activeBanner.id = "qa-surah-banner";
        activeBanner.innerHTML = '<div class="qa-ab-tag">السورة المحددة بالريموت:</div>' +
            '<div class="qa-ab-name" id="qa-sb-title"></div>' +
            '<div class="qa-ab-meta" id="qa-sb-meta"></div>' +
            '<div class="qa-ab-hint">اضغط زر [ OK ] لتشغيل السورة والاستماع فوراً ◀</div>';
        modalContent.appendChild(activeBanner);

        var list = document.createElement("div");
        list.className = "qa-surah-grid";

        for (var i = 0; i < SURAHS.length; i++) {
            (function (s) {
                var item = document.createElement("div");
                item.className = "qa-surah-item" + (s.id === curSurah ? " is-active" : "");
                item.tabIndex = 0;
                item.innerHTML = '<span class="qa-item-num">' + toEastern(s.id) + '</span><span class="qa-item-name">' + s.name_ar + '</span><span class="qa-item-meta">' + s.type + ' · ' + toEastern(s.verses) + ' آية</span>';
                item.addEventListener("click", function () {
                    curSurah = parseInt(s.id, 10) || 1;
                    curAyah = 1;
                    closeModal();
                    loadAndPlayCurrent();
                    if (APL.toast) APL.toast(APL.lang === "ar" ? "سورة " + s.name_ar : "Surah " + NM(s), true);
                });
                list.appendChild(item);
            })(SURAHS[i]);
        }

        modalContent.appendChild(list);
        modalOverlay.classList.add("is-open");
        modalFocusIdx = curSurah - 1;
        focusArea = "modal";
        scrollModalItemIntoView();
        setTimeout(scrollModalItemIntoView, 60);
    }

    function openReciterPicker() {
        activeModal = "reciter";
        buildUI();
        modalContent.innerHTML = "";

        var head = document.createElement("div");
        head.className = "qa-modal-header";
        head.innerHTML = '<div><h3>اختر القارئ (٤٢ قارئ معتمد)</h3><div class="qa-modal-subhead">تنقل بالأسهم واضغط OK للاختيار والاستماع</div></div><button type="button" class="qa-modal-x">✕</button>';
        head.querySelector(".qa-modal-x").addEventListener("click", closeModal);
        modalContent.appendChild(head);

        var activeBanner = document.createElement("div");
        activeBanner.className = "qa-active-banner";
        activeBanner.id = "qa-reciter-banner";
        activeBanner.innerHTML = '<div class="qa-ab-tag">القارئ المحدد بالريموت:</div>' +
            '<div class="qa-ab-name" id="qa-rb-title"></div>' +
            '<div class="qa-ab-meta" id="qa-rb-meta"></div>' +
            '<div class="qa-ab-hint">اضغط زر [ OK ] لتشغيل القارئ والاستماع فوراً ◀</div>';
        modalContent.appendChild(activeBanner);

        var list = document.createElement("div");
        list.className = "qa-reciter-grid";

        var curIdx = 0;
        for (var i = 0; i < RECITERS.length; i++) {
            if (RECITERS[i].key === curReciter) curIdx = i;
            (function (r, idx) {
                var item = document.createElement("div");
                item.className = "qa-reciter-item" + (r.key === curReciter ? " is-active" : "");
                item.tabIndex = 0;
                var isFav = favReciters.indexOf(r.key) !== -1;
                item.innerHTML = '<div class="qa-rec-info"><span class="qa-item-num">' + toEastern(idx + 1) + '</span><span class="qa-rec-name">' + r.name_ar + '</span></div><button type="button" class="qa-fav' + (isFav ? " is-fav" : "") + '">♥</button>';
                item.addEventListener("click", function (e) {
                    if (e.target.classList.contains("qa-fav")) {
                        toggleFavReciter(r.key, e.target);
                        e.stopPropagation();
                        return;
                    }
                    curReciter = r.key;
                    sys.setPref("quran_audio_reciter", curReciter);
                    closeModal();
                    renderHeader();
                    playCurrentAyah();
                    if (APL.toast) APL.toast(APL.lang === "ar" ? "القارئ: " + r.name_ar : "Reciter: " + (r.name_en || r.name_ar), true);
                });
                list.appendChild(item);
            })(RECITERS[i], i);
        }

        modalContent.appendChild(list);
        modalOverlay.classList.add("is-open");
        focusArea = "modal";
        modalFocusIdx = curIdx;
        scrollModalItemIntoView();
        setTimeout(scrollModalItemIntoView, 60);
    }

    function toggleFavReciter(key, btn) {
        var idx = favReciters.indexOf(key);
        if (idx !== -1) {
            favReciters.splice(idx, 1);
            btn.classList.remove("is-fav");
        } else {
            favReciters.push(key);
            btn.classList.add("is-fav");
        }
        sys.setPref("quran_audio_fav_reciters", favReciters);
    }

    function openSearchModal() {
        activeModal = "search";
        buildUI();
        modalContent.innerHTML = "";

        var head = document.createElement("div");
        head.className = "qa-modal-header";
        head.innerHTML = '<h3>البحث الفوري في نصوص الآيات</h3><button type="button" class="qa-modal-x">✕</button>';
        head.querySelector(".qa-modal-x").addEventListener("click", closeModal);
        modalContent.appendChild(head);

        var searchBox = document.createElement("div");
        searchBox.className = "qa-search-container";
        searchBox.innerHTML = '<input type="text" class="qa-search-inp" placeholder="اكتب كلمة أو جزءاً من الآية للبحث..." autofocus><div class="qa-search-results"></div>';
        modalContent.appendChild(searchBox);

        var inp = searchBox.querySelector(".qa-search-inp");
        var resList = searchBox.querySelector(".qa-search-results");

        inp.addEventListener("input", function () {
            if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
            searchDebounceTimer = setTimeout(function () {
                var q = inp.value.trim();
                if (q.length < 2) {
                    resList.innerHTML = '<div class="qa-search-msg">أدخل كلمتين على الأقل لبدء البحث الفوري</div>';
                    return;
                }
                executeSearch(q, resList);
            }, 220);
        });

        modalOverlay.classList.add("is-open");
        focusArea = "modal";
        setTimeout(function () { inp.focus(); }, 120);
    }

    function executeSearch(query, container) {
        if (!searchData || !metaData) {
            container.innerHTML = '<div class="qa-search-msg">جاري تحميل فهرس وبيانات البحث…</div>';
            if (searchInFlight) return;
            searchInFlight = true;
            var needed = 2;
            function checkDone() {
                needed--;
                if (needed === 0) {
                    searchInFlight = false;
                    if (searchData && metaData) executeSearch(query, container);
                    else container.innerHTML = '<div class="qa-search-msg">تعذر تحميل بيانات البحث</div>';
                }
            }
            if (!searchData) {
                var xhrS = new XMLHttpRequest();
                xhrS.open("GET", "data/quran/search.json", true);
                xhrS.responseType = "json";
                xhrS.onload = function () {
                    if (xhrS.status === 200 && xhrS.response && xhrS.response.search) {
                        searchData = xhrS.response.search;
                        normalizedSearchData = [];
                        for (var si = 0; si < searchData.length; si++) {
                            normalizedSearchData.push(normalizeArabic(searchData[si]));
                        }
                    }
                    checkDone();
                };
                xhrS.onerror = checkDone;
                xhrS.send();
            } else {
                needed--;
            }
            if (!metaData) {
                var xhrM = new XMLHttpRequest();
                xhrM.open("GET", "data/quran/meta.json", true);
                xhrM.responseType = "json";
                xhrM.onload = function () {
                    if (xhrM.status === 200 && xhrM.response) {
                        metaData = xhrM.response;
                    }
                    checkDone();
                };
                xhrM.onerror = checkDone;
                xhrM.send();
            } else {
                needed--;
            }
            return;
        }

        if (!normalizedSearchData && searchData) {
            normalizedSearchData = [];
            for (var k = 0; k < searchData.length; k++) {
                normalizedSearchData.push(normalizeArabic(searchData[k]));
            }
        }

        var cleanQ = normalizeArabic(query);
        var matches = [];

        for (var i = 0; i < normalizedSearchData.length; i++) {
            if (normalizedSearchData[i].indexOf(cleanQ) !== -1) {
                var sId = 1, aId = 1;
                for (var s = 0; s < metaData.surahs.length; s++) {
                    var start = metaData.surahs[s][1];
                    var cnt = metaData.surahs[s][2];
                    if (start <= i && i < start + cnt) {
                        sId = s + 1;
                        aId = i - start + 1;
                        break;
                    }
                }
                matches.push({ surah: sId, ayah: aId, text: searchData[i] });
                if (matches.length >= 30) break;
            }
        }

        if (matches.length === 0) {
            container.innerHTML = '<div class="qa-search-msg">لم يتم العثور على نتائج مطابقة</div>';
            return;
        }

        container.innerHTML = "";
        for (var m = 0; m < matches.length; m++) {
            (function (match) {
                var row = document.createElement("div");
                row.className = "qa-sr-item";
                row.tabIndex = 0;
                var sObj = getSurahObj(match.surah);
                row.innerHTML = '<div class="qa-sr-bar"><span class="qa-sr-name">سورة ' + sObj.name_ar + '</span><span class="qa-sr-num">الآية ' + toEastern(match.ayah) + '</span></div><div class="qa-sr-body">' + esc(match.text) + '</div>';
                row.addEventListener("click", function () {
                    curSurah = parseInt(match.surah, 10) || 1;
                    curAyah = parseInt(match.ayah, 10) || 1;
                    closeModal();
                    loadAndPlayCurrent();
                });
                container.appendChild(row);
            })(matches[m]);
        }
    }

    function openMoreOptions() {
        activeModal = "more";
        buildUI();
        modalContent.innerHTML = "";

        var head = document.createElement("div");
        head.className = "qa-modal-header";
        head.innerHTML = '<h3>خيارات مشغل القرآن الكريم</h3><button type="button" class="qa-modal-x">✕</button>';
        head.querySelector(".qa-modal-x").addEventListener("click", closeModal);
        modalContent.appendChild(head);

        var opts = document.createElement("div");
        opts.className = "qa-more-list";

        // Speed options
        var spRow = document.createElement("div");
        spRow.className = "qa-more-row";
        spRow.innerHTML = '<span class="qa-more-lbl">سرعة التلاوة:</span><div class="qa-spd-pills">' +
            '<button type="button" class="qa-spd-btn' + (curSpeed === 0.75 ? ' is-on' : '') + '" data-spd="0.75">0.75×</button>' +
            '<button type="button" class="qa-spd-btn' + (curSpeed === 1 ? ' is-on' : '') + '" data-spd="1">1.0× (عادي)</button>' +
            '<button type="button" class="qa-spd-btn' + (curSpeed === 1.25 ? ' is-on' : '') + '" data-spd="1.25">1.25×</button>' +
            '<button type="button" class="qa-spd-btn' + (curSpeed === 1.5 ? ' is-on' : '') + '" data-spd="1.5">1.5×</button>' +
            '</div>';
        var pills = spRow.querySelectorAll(".qa-spd-btn");
        for (var p = 0; p < pills.length; p++) {
            pills[p].addEventListener("click", function () {
                var spd = parseFloat(this.getAttribute("data-spd"));
                curSpeed = spd;
                sys.setPref("quran_audio_speed", curSpeed);
                if (audioEl) audioEl.playbackRate = curSpeed;
                if (btnSpeed) btnSpeed.textContent = curSpeed + "×";
                for (var j = 0; j < pills.length; j++) {
                    pills[j].classList.toggle("is-on", parseFloat(pills[j].getAttribute("data-spd")) === curSpeed);
                }
                if (APL.toast) APL.toast("سرعة التلاوة: " + curSpeed + "×", true);
            });
        }
        opts.appendChild(spRow);

        // Tafsir toggle
        var tfRow = document.createElement("div");
        tfRow.className = "qa-more-row";
        var tglBtn = document.createElement("button");
        tglBtn.type = "button";
        tglBtn.className = "qa-tgl" + (showTafsir ? " is-on" : "");
        tglBtn.textContent = showTafsir ? "مفعّل" : "معطّل";
        tglBtn.addEventListener("click", function () {
            showTafsir = !showTafsir;
            sys.setPref("quran_audio_tafsir", showTafsir);
            tglBtn.className = "qa-tgl" + (showTafsir ? " is-on" : "");
            tglBtn.textContent = showTafsir ? "مفعّل" : "معطّل";
            renderVerseArea();
            if (APL.toast) APL.toast(showTafsir ? "تم تفعيل التفسير" : "تم إخفاء التفسير", true);
        });
        var tfLbl = document.createElement("span");
        tfLbl.className = "qa-more-lbl";
        tfLbl.textContent = "إظهار التفسير أسفل الآية:";
        tfRow.appendChild(tfLbl);
        tfRow.appendChild(tglBtn);
        opts.appendChild(tfRow);

        // Done button row
        var doneRow = document.createElement("div");
        doneRow.style.display = "flex";
        doneRow.style.justifyContent = "center";
        doneRow.style.paddingTop = "10px";
        var doneBtn = document.createElement("button");
        doneBtn.type = "button";
        doneBtn.className = "qa-more-done-btn";
        doneBtn.textContent = "حفظ وإغلاق";
        doneBtn.addEventListener("click", closeModal);
        doneRow.appendChild(doneBtn);
        opts.appendChild(doneRow);

        modalContent.appendChild(opts);
        modalOverlay.classList.add("is-open");
        focusArea = "modal";

        var spdBtns = opts.querySelectorAll(".qa-spd-btn");
        modalFocusIdx = 1;
        for (var b = 0; b < spdBtns.length; b++) {
            if (spdBtns[b].classList.contains("is-on")) {
                modalFocusIdx = b;
                break;
            }
        }

        scrollModalItemIntoView();
    }

    /* TV Remote Navigation Handler */
    function onKeyDown(e) {
        if (!isOpen) return;

        var code = e.keyCode;

        // Volume Up, Volume Down, Mute: pass directly to system without blocking!
        if (code === 447 || code === 448 || code === 449) {
            return;
        }

        // Block propagation so background launcher / prayer screen NEVER receives keys while this window is open
        if (e.stopPropagation) e.stopPropagation();
        if (e.stopImmediatePropagation) e.stopImmediatePropagation();

        var tag = (e.target && e.target.tagName) ? e.target.tagName.toUpperCase() : "";
        var isInput = tag === "INPUT" || tag === "TEXTAREA";

        if (isInput) {
            // Space (32) and Backspace (8) belong to text editing: never intercept them!
            if (code === 32 || code === 8) {
                return;
            }
            // Down Arrow (40): move from input field to first search result item
            if (code === 40 || code === (K && K.DOWN)) {
                var items = modalContent.querySelectorAll(".qa-sr-item");
                if (items && items.length > 0) {
                    e.target.blur();
                    modalFocusIdx = 0;
                    scrollModalItemIntoView();
                    e.preventDefault();
                    if (e.stopPropagation) e.stopPropagation();
                    return;
                }
            }
            // Enter key (13): finish typing and jump into search results
            if (code === 13 || code === (K && K.ENTER)) {
                var firstItem = modalContent.querySelector(".qa-sr-item");
                if (firstItem) {
                    e.target.blur();
                    modalFocusIdx = 0;
                    scrollModalItemIntoView();
                    e.preventDefault();
                    if (e.stopPropagation) e.stopPropagation();
                    return;
                }
            }
            // Return / Back key: first press blurs input (dismisses on-screen keyboard); second press closes modal
            if (code === (K && K.RETURN) || code === (K && K.ESC) || code === 27 || code === 10009) {
                if (document.activeElement === e.target) {
                    e.target.blur();
                    e.preventDefault();
                    if (e.stopPropagation) e.stopPropagation();
                    return;
                }
                if (activeModal) closeModal();
                else closePage();
                e.preventDefault();
                if (e.stopPropagation) e.stopPropagation();
                return;
            }
            // Let normal character typing pass
            return;
        }

        // Global Media keys
        // Play / Pause / Toggle
        if (code === (K && K.MEDIA_PLAY) || code === (K && K.MEDIA_PLAY_PAUSE) || code === 415 || code === 10252 || code === 19 /* Pause */ || code === 32 /* Space */ || code === 463) {
            togglePlay();
            e.preventDefault();
            if (e.stopPropagation) e.stopPropagation();
            return;
        }
        // Stop key (413): pauses and resets audio without dismissing the player UI
        if (code === (K && K.MEDIA_STOP) || code === 413) {
            if (endedAdvanceTimer) { clearTimeout(endedAdvanceTimer); endedAdvanceTimer = null; }
            wasPlayingBeforeAlert = false;
            if (audioEl) {
                audioEl.pause();
                try { audioEl.currentTime = 0; } catch (eStop) {}
            }
            isPlaying = false;
            isLoading = false;
            updateControlsUI();
            e.preventDefault();
            if (e.stopPropagation) e.stopPropagation();
            return;
        }
        // Fast-Forward / Next
        if (code === (K && K.MEDIA_FAST_FORWARD) || code === 417) {
            stepAyah(1);
            e.preventDefault();
            if (e.stopPropagation) e.stopPropagation();
            return;
        }
        // Rewind / Prev
        if (code === (K && K.MEDIA_REWIND) || code === 412) {
            stepAyah(-1);
            e.preventDefault();
            if (e.stopPropagation) e.stopPropagation();
            return;
        }

        // Back / Return key
        if (code === (K && K.RETURN) || code === (K && K.ESC) || code === 27 || code === 10009 || code === 8) {
            if (activeModal) {
                closeModal();
            } else {
                closePage();
            }
            e.preventDefault();
            if (e.stopPropagation) e.stopPropagation();
            return;
        }

        if (activeModal) {
            handleModalNavigation(code, e);
            return;
        }

        if (code === (K && K.LEFT) || code === 37) {
            if (focusArea === "player") {
                // LTR player order: Mode(0) -> Prev(1) -> Play(2) -> Next(3) -> Speed(4) -> More(5)
                focusIdx = Math.max(0, focusIdx - 1);
                updateFocus();
            } else if (focusArea === "top") {
                // RTL top bar: Search(0, right) -> Reciter(1) -> Surah(2) -> Radio(3, left)
                topFocusIdx = Math.min(3, topFocusIdx + 1);
                updateFocus();
            }
            e.preventDefault();
            if (e.stopPropagation) e.stopPropagation();
        } else if (code === (K && K.RIGHT) || code === 39) {
            if (focusArea === "player") {
                focusIdx = Math.min(5, focusIdx + 1);
                updateFocus();
            } else if (focusArea === "top") {
                topFocusIdx = Math.max(0, topFocusIdx - 1);
                updateFocus();
            }
            e.preventDefault();
            if (e.stopPropagation) e.stopPropagation();
        } else if (code === (K && K.UP) || code === 38) {
            if (focusArea === "player") {
                focusArea = "top";
                if (focusIdx <= 0) topFocusIdx = 3; // Mode -> Radio (left)
                else if (focusIdx <= 2) topFocusIdx = 2; // Prev/Play -> Surah
                else if (focusIdx <= 3) topFocusIdx = 1; // Next -> Reciter
                else topFocusIdx = 0; // Speed/More -> Search (right)
                updateFocus();
            }
            e.preventDefault();
            if (e.stopPropagation) e.stopPropagation();
        } else if (code === (K && K.DOWN) || code === 40) {
            if (focusArea === "top") {
                focusArea = "player";
                if (topFocusIdx === 3) focusIdx = 0; // Radio -> Mode
                else if (topFocusIdx === 2) focusIdx = 1; // Surah -> Prev
                else if (topFocusIdx === 1) focusIdx = 2; // Reciter -> Play
                else focusIdx = 4; // Search -> Speed
                updateFocus();
            }
            e.preventDefault();
            if (e.stopPropagation) e.stopPropagation();
        } else {
            var isEnterKey = (code === 13 || code === 65385 || code === 29443 || code === (K && K.ENTER));
            if (isEnterKey) {
                activateFocusedItem();
                e.preventDefault();
                if (e.stopPropagation) e.stopPropagation();
            }
        }
    }

    /* Programmatic scrolling guaranteeing 100% visible movement on TV */
    function handleModalNavigation(code, e) {
        var items = modalContent.querySelectorAll(".qa-surah-item, .qa-reciter-item, .qa-sr-item, .qa-spd-btn, .qa-tgl, .qa-more-done-btn");
        if (!items || !items.length) return;

        if (activeModal === "more") {
            if (code === (K && K.DOWN) || code === 40) {
                if (modalFocusIdx <= 3) modalFocusIdx = 4; // speed pills -> tafsir toggle
                else if (modalFocusIdx === 4) modalFocusIdx = 5; // tafsir -> done button
                else modalFocusIdx = 5;
                scrollModalItemIntoView();
                e.preventDefault();
                if (e.stopPropagation) e.stopPropagation();
                return;
            } else if (code === (K && K.UP) || code === 38) {
                if (modalFocusIdx === 5) modalFocusIdx = 4; // done -> tafsir
                else if (modalFocusIdx === 4) {
                    var spdBtns = modalContent.querySelectorAll(".qa-spd-btn");
                    var targetIdx = 1;
                    for (var b = 0; b < spdBtns.length; b++) {
                        if (spdBtns[b].classList.contains("is-on")) {
                            targetIdx = b;
                            break;
                        }
                    }
                    modalFocusIdx = targetIdx;
                }
                scrollModalItemIntoView();
                e.preventDefault();
                if (e.stopPropagation) e.stopPropagation();
                return;
            } else if (code === (K && K.LEFT) || code === 37) {
                if (modalFocusIdx < 3) {
                    modalFocusIdx++;
                    scrollModalItemIntoView();
                }
                e.preventDefault();
                if (e.stopPropagation) e.stopPropagation();
                return;
            } else if (code === (K && K.RIGHT) || code === 39) {
                if (modalFocusIdx > 0 && modalFocusIdx <= 3) {
                    modalFocusIdx--;
                    scrollModalItemIntoView();
                }
                e.preventDefault();
                if (e.stopPropagation) e.stopPropagation();
                return;
            } else {
                var isEnter = (code === 13 || code === 65385 || code === 29443 || code === (K && K.ENTER));
                if (isEnter) {
                    if (items[modalFocusIdx]) items[modalFocusIdx].click();
                    e.preventDefault();
                    if (e.stopPropagation) e.stopPropagation();
                    return;
                }
            }
        }

        var step = (activeModal === "surah" ? 4 : (activeModal === "reciter" ? 2 : 1));

        if (code === (K && K.DOWN) || code === 40) {
            modalFocusIdx = Math.min(items.length - 1, modalFocusIdx + step);
            scrollModalItemIntoView();
            e.preventDefault();
            if (e.stopPropagation) e.stopPropagation();
        } else if (code === (K && K.UP) || code === 38) {
            modalFocusIdx = Math.max(0, modalFocusIdx - step);
            scrollModalItemIntoView();
            e.preventDefault();
            if (e.stopPropagation) e.stopPropagation();
        } else if (code === (K && K.LEFT) || code === 37) {
            modalFocusIdx = Math.min(items.length - 1, modalFocusIdx + 1);
            scrollModalItemIntoView();
            e.preventDefault();
            if (e.stopPropagation) e.stopPropagation();
        } else if (code === (K && K.RIGHT) || code === 39) {
            modalFocusIdx = Math.max(0, modalFocusIdx - 1);
            scrollModalItemIntoView();
            e.preventDefault();
            if (e.stopPropagation) e.stopPropagation();
        } else {
            var isEnter = (code === 13 || code === 65385 || code === 29443 || code === (K && K.ENTER) || code === (K && K.MEDIA_PLAY) || code === (K && K.MEDIA_PLAY_PAUSE));
            if (isEnter) {
                if (items[modalFocusIdx]) items[modalFocusIdx].click();
                e.preventDefault();
                if (e.stopPropagation) e.stopPropagation();
            }
        }
    }

    function scrollModalItemIntoView() {
        var items = modalContent.querySelectorAll(".qa-surah-item, .qa-reciter-item, .qa-sr-item, .qa-spd-btn, .qa-tgl, .qa-more-done-btn");
        if (!items || !items.length) return;

        if (modalFocusIdx < 0) modalFocusIdx = 0;
        if (modalFocusIdx >= items.length) modalFocusIdx = items.length - 1;

        for (var i = 0; i < items.length; i++) {
            items[i].classList.toggle("is-focused", i === modalFocusIdx);
        }

        var targetItem = items[modalFocusIdx];
        if (!targetItem) return;

        try {
            targetItem.focus();
        } catch (e) {}

        // Update live banner for active modal
        if (activeModal === "surah") {
            var s = SURAHS[modalFocusIdx];
            if (s) {
                var sTitle = document.getElementById("qa-sb-title");
                var sMeta = document.getElementById("qa-sb-meta");
                if (sTitle) sTitle.textContent = APL.lang === "ar" ? "سورة " + s.name_ar : "Surah " + NM(s);
                if (sMeta) sMeta.textContent = "رقم " + toEastern(s.id) + " من ١١٤ · " + s.type + " · " + toEastern(s.verses) + " آية";
            }
        } else if (activeModal === "reciter") {
            var r = RECITERS[modalFocusIdx];
            if (r) {
                var rTitle = document.getElementById("qa-rb-title");
                var rMeta = document.getElementById("qa-rb-meta");
                if (rTitle) rTitle.textContent = APL.lang === "ar" ? r.name_ar : (r.name_en || r.name_ar);
                if (rMeta) rMeta.textContent = "القارئ رقم " + toEastern(modalFocusIdx + 1) + " من ٤٢ قارئاً معتمداً";
            }
        }

        // Direct programmatic scroll on the scrolling container
        var container = modalContent.querySelector(".qa-surah-grid, .qa-reciter-grid, .qa-search-results");
        if (container) {
            try {
                var cRect = container.getBoundingClientRect();
                var tRect = targetItem.getBoundingClientRect();
                var diff = tRect.top - cRect.top;
                var delta = diff - (container.clientHeight / 2) + (targetItem.offsetHeight / 2);
                container.scrollTop += delta;
            } catch (err) {
                var itemTop = targetItem.offsetTop;
                var itemH = targetItem.offsetHeight || 55;
                var contH = container.clientHeight || 480;
                var desiredScroll = itemTop - (contH / 2) + (itemH / 2);
                if (desiredScroll < 0) desiredScroll = 0;
                container.scrollTop = desiredScroll;
            }
        }

        // Native scrollIntoView fallback
        if (typeof targetItem.scrollIntoViewIfNeeded === "function") {
            try { targetItem.scrollIntoViewIfNeeded(true); } catch (e) {}
        } else if (typeof targetItem.scrollIntoView === "function") {
            try {
                targetItem.scrollIntoView({ block: "center", behavior: "auto" });
            } catch (e) {
                try { targetItem.scrollIntoView(false); } catch (e2) {}
            }
        }
    }

    function updateFocus() {
        if (!rootEl) return;
        var allBtns = rootEl.querySelectorAll(".qa-pill, .qa-btn");
        for (var i = 0; i < allBtns.length; i++) allBtns[i].classList.remove("is-focused");

        if (focusArea === "top") {
            // 0=search (right), 1=reciter (center-right), 2=surah (center-left), 3=radio (left)
            var topBtns = [btnSearch, btnReciter, btnSurah, btnRadio];
            if (topBtns[topFocusIdx]) {
                topBtns[topFocusIdx].classList.add("is-focused");
                try { topBtns[topFocusIdx].focus(); } catch (e) {}
            }
        } else if (focusArea === "player") {
            var playerBtns = [btnMode, btnPrev, btnPlay, btnNext, btnSpeed, btnMore];
            if (playerBtns[focusIdx]) {
                playerBtns[focusIdx].classList.add("is-focused");
                try { playerBtns[focusIdx].focus(); } catch (e) {}
            }
        }
    }

    function activateFocusedItem() {
        if (focusArea === "top") {
            var topBtns = [btnSearch, btnReciter, btnSurah, btnRadio];
            if (topBtns[topFocusIdx]) topBtns[topFocusIdx].click();
        } else if (focusArea === "player") {
            var playerBtns = [btnMode, btnPrev, btnPlay, btnNext, btnSpeed, btnMore];
            if (playerBtns[focusIdx]) playerBtns[focusIdx].click();
        }
    }

    /* Open / Close Page */
    /* v8.7.14: the full-screen prayer widget under the player card (same widget as the Home "full view"), refreshed while the page is open */
    var widgetSlot = null;
    function placeWidget() {
        if (!widgetSlot || !rootEl) return;
        try {
            var r = rootEl.getBoundingClientRect();
            widgetSlot.style.top = Math.round(r.bottom + 16) + "px";
        } catch (e) {}
    }
    function refreshWidget() {
        if (!isOpen || sys.pref("qaPrayerWidget") === false) { removeWidget(); return; }
        var node = APL.homeStatus && APL.homeStatus.wideNode ? APL.homeStatus.wideNode() : null;
        if (!node) { if (widgetSlot) widgetSlot.style.display = "none"; return; }
        if (!widgetSlot) {
            widgetSlot = document.createElement("div");
            widgetSlot.className = "qa-widget-slot";
            document.body.appendChild(widgetSlot);
        }
        widgetSlot.style.display = "block";
        widgetSlot.innerHTML = "";
        widgetSlot.appendChild(node);
        placeWidget();
    }
    function removeWidget() {
        if (APL.timers && APL.timers.cancel) APL.timers.cancel("qa_widget");
        if (widgetSlot && widgetSlot.parentNode) widgetSlot.parentNode.removeChild(widgetSlot);
        widgetSlot = null;
    }
    function armWidget() {
        if (sys.pref("qaPrayerWidget") === false) return;
        refreshWidget();
        if (APL.timers && APL.timers.every) APL.timers.every("qa_widget", 15000, refreshWidget);
        window.setTimeout(placeWidget, 400);
    }

    function openPage(surah, ayah, reciter) {
        if (surah) curSurah = parseInt(surah, 10) || 1;
        if (ayah) curAyah = parseInt(ayah, 10) || 1;
        if (reciter) curReciter = reciter;

        buildUI();
        if (activeModal) closeModal();
        isOpen = true;
        if (overlayEl) overlayEl.classList.add("is-open");
        rootEl.classList.add("is-open");
        document.body.classList.add("quran-audio-active");

        if (!qaNav) {
            qaNav = {
                handleKey: function (e) {
                    onKeyDown(e);
                },
                rawArrowKeys: true
            };
        }
        if (APL.pushNav) APL.pushNav(qaNav);

        renderHeader();
        renderVerseArea();
        updateControlsUI();

        var reqId = ++verseReq;
        loadVerseData(curSurah, curAyah, function () {
            if (reqId === verseReq) {
                renderVerseArea();
            }
        });

        focusArea = "player";
        focusIdx = 2; // on Play button
        updateFocus();

        if (APL.lifecycle && APL.lifecycle.scopeFor && qaNav) {
            var S = APL.lifecycle.scopeFor(qaNav, "quran-audio");
            S.on(window, "keydown", onKeyDown, true);
        } else {
            window.removeEventListener("keydown", onKeyDown, true);
            window.addEventListener("keydown", onKeyDown, true);
        }

        armWidget();
        playCurrentAyah();
    }

    function closePage() {
        isOpen = false;
        removeWidget();
        activeModal = null;
        if (!sys.pref("quran_bg_playback")) wasPlayingBeforeAlert = false;
        if (endedAdvanceTimer) { clearTimeout(endedAdvanceTimer); endedAdvanceTimer = null; }
        if (qaNav && APL.popNav) APL.popNav(qaNav);
        if (modalOverlay) modalOverlay.classList.remove("is-open");
        if (rootEl) rootEl.classList.remove("is-open");
        if (overlayEl) overlayEl.classList.remove("is-open");
        document.body.classList.remove("quran-audio-active");
        window.removeEventListener("keydown", onKeyDown, true);
        if (stallWatchdog) { clearTimeout(stallWatchdog); stallWatchdog = null; }
        if (sys.pref("quran_bg_playback")) {
            return;
        }
        if (audioEl) {
            try { audioEl.pause(); } catch (e) {}
            try {
                audioEl.removeAttribute("src");
                audioEl.load();
            } catch (e) {}
        }
        isPlaying = false;
    }

    // Tizen / Browser Lifecycle: pause audio when app loses focus or is hidden
    document.addEventListener("visibilitychange", function () {
        if (document.hidden) {
            if (isOpen && isPlaying) {
                if (sys.pref("quran_bg_playback") !== true) {
                    wasPlayingBeforeHidden = true;
                    if (audioEl) audioEl.pause();
                    isPlaying = false;
                    updateControlsUI();
                }
            }
        } else {
            // Returning from background
            if (isOpen && wasPlayingBeforeHidden) {
                wasPlayingBeforeHidden = false;
                if (audioEl) {
                    var pv = null;
                    try { pv = audioEl.play(); } catch (ePv) {}
                    if (pv && pv.then) pv.then(function () { isPlaying = true; updateControlsUI(); }, function () { isPlaying = false; updateControlsUI(); });
                    else { isPlaying = true; updateControlsUI(); }
                }
            }
        }
    });

    window.addEventListener("pagehide", function () {
        if (isOpen && isPlaying) {
            if (sys.pref("quran_bg_playback") !== true) {
                if (audioEl) audioEl.pause();
                isPlaying = false;
                updateControlsUI();
            }
        }
    });

    function checkAlertAdhanSync() {
        if (!isPlaying && !wasPlayingBeforeAlert) return;
        var alertActive = false;
        if (APL.prayerAlert && APL.prayerAlert.isPlaying && APL.prayerAlert.isPlaying()) {
            alertActive = true;
        }
        if (alertActive && isPlaying && !wasPlayingBeforeAlert) {
            APL.quranAudio.pauseForAlert();
        } else if (!alertActive && wasPlayingBeforeAlert) {
            APL.quranAudio.resumeAfterAlert();
        }
    }

    if (APL.timers && APL.timers.every) {
        APL.timers.every("quran-audio-alert-sync", 1500, checkAlertAdhanSync, { hidden: true });
    }

    /* Public API */
    APL.quranAudio = {
        open: openPage,
        close: closePage,
        isOpen: function () { return isOpen; },
        isPlaying: function () { return isPlaying; },
        play: loadAndPlayCurrent,
        pause: function () {
            if (endedAdvanceTimer) { clearTimeout(endedAdvanceTimer); endedAdvanceTimer = null; }
            if (audioEl) audioEl.pause();
        },
        pauseForAlert: function () {
            if (!isPlaying) return Promise.resolve(false);
            wasPlayingBeforeAlert = true;
            if (endedAdvanceTimer) { clearTimeout(endedAdvanceTimer); endedAdvanceTimer = null; }
            if (audioEl) audioEl.pause();
            return Promise.resolve(true);
        },
        resumeAfterAlert: function () {
            if (!wasPlayingBeforeAlert) return Promise.resolve(false);
            if (!audioEl || !audioEl.src) { wasPlayingBeforeAlert = false; return Promise.resolve(false); }
            if (!isOpen && !sys.pref("quran_bg_playback")) { wasPlayingBeforeAlert = false; return Promise.resolve(false); }
            /* the intent is cleared only after play() really succeeded; up to 3 tries, 800 ms apart */
            function attempt(n) {
                if (!wasPlayingBeforeAlert) return Promise.resolve(false);   /* Stop / close in between */
                var p;
                try { p = audioEl.play(); } catch (e) { p = null; }
                if (!p || !p.then) {
                    wasPlayingBeforeAlert = false; isPlaying = true; updateControlsUI(); return Promise.resolve(true);
                }
                return p.then(function () {
                    wasPlayingBeforeAlert = false; isPlaying = true; updateControlsUI(); return true;
                }, function () {
                    if (n >= 3) { wasPlayingBeforeAlert = false; return false; }
                    return new Promise(function (res) { setTimeout(res, 800); }).then(function () { return attempt(n + 1); });
                });
            }
            return attempt(1);
        },
        togglePlay: togglePlay,
        nextAyah: function () { stepAyah(1); },
        prevAyah: function () { stepAyah(-1); },
        setReciter: function (k) { curReciter = k; renderHeader(); playCurrentAyah(); },
        setSurah: function (s) { curSurah = parseInt(s, 10) || 1; curAyah = 1; loadAndPlayCurrent(); },
        setAyah: function (a) { curAyah = parseInt(a, 10) || 1; loadAndPlayCurrent(); },
        setMode: function (m) { curMode = m; updateControlsUI(); },
        getReciters: function () { return RECITERS; },
        getSurahs: function () { return SURAHS; },
        getState: function () {
            return {
                isOpen: isOpen,
                isPlaying: isPlaying,
                isLoading: isLoading,
                surah: curSurah,
                ayah: curAyah,
                reciter: curReciter,
                mode: curMode,
                speed: curSpeed
            };
        }
    };

    if (APL.radio && typeof APL.radio.onChange === "function") {
        APL.radio.onChange(function () {
            if (isOpen && btnRadio) updateRadioPill();
        });
    }

    if (APL.lifecycle && typeof APL.lifecycle.onTrim === "function") {
        APL.lifecycle.onTrim(function (why) {
            verseCache = {};
            verseOrder = [];
            tafsirCache = {};
            tafsirOrder = [];
            tafsirSurahCache = {};
            tafsirSurahOrder = [];
            juzCache = {};
            juzOrder = [];
        });
    }
})(window);
