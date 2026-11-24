/* ============================================================
   quran.js v7.0.0 - Offline Hafs reader, separate surah/juz indexes,
   live Arabic substring search from the FIRST letter, in Mushaf order.
   Data: Tanzil Uthmani 1.1 (verbatim), Simple Clean search spelling,
   Medina 604-page metadata. Source/license: data/quran/.
   Lazy local XHR only; bounded result DOM; no worker, timer or network at Home.
   v7.0.6: lighter load. data/quran/meta.json (~8 KB tables) + ONLY the juz file of the page being read
   (data/quran/juz/NN.json, ~47 KB); search.json + all 30 juz are read on the FIRST search letter.
   The files are slices of the same Tanzil arrays (tools/quran-split.py --check rebuilds the old hafs.json
   byte-for-byte). Everything is released on close, as before.
   Uses the existing khatma position/counters; browsing never counts as reading.
   v7.2.0: the page is shown WHOLE on the screen (auto-fit font, no scrolling); every top/bottom option moved into a small
   side panel that is hidden while reading (RIGHT on the page opens it, LEFT/Back closes it); UP = previous page, DOWN = next page.
   Chromium 76 compatible. Untested on the TV.
   ============================================================ */
(function (global) {
    "use strict";
    var APL = global.APL, K = APL && APL.KEY;
    if (!APL || !APL.Nav || !APL.khatma) return;
    var STORE = "apl.quran.ui", LIMIT = 20, TOTAL = 6236;
    var data = null, pending = null, index = null, basmalaEnd = "";
    var DIR = "data/quran/", reqs = [], juzReq = {}, juzHave = {}, allPending = null;   /* v7.0.6 split files */
    var root = null, nav = null, main = null, title = null, sub = null, footer = null, brandTitle = null, brandSub = null, brandWird = null;
    var side = false, lastSide = "", fitSize = 0, toolsEl = null;      /* v7.2.0/v8.4.1: side panel open (read & books), last panel item, size chosen by auto-fit */
    var opened = false, view = "read", target = -1, returnTo = null, generation = 0;
    var query = "", matches = [], previousQuery = "", resultPage = 0;
    var field = null, resultList = null, resultCount = null, pager = null, readBody = null;
    var SIZES = [26, 30, 34, 38, 42, 48, 54, 60, 66, 72], LH = [2.0, 2.2, 2.5, 2.8], lastFlip = 0, lastContent = "";   /* v7.0.3: sizes up to 72, 4 line spacings, paper theme */
    /* v7.1.0: text colour of the page (dark theme / paper theme palettes, same order, 6 each) */
    /* v8.7.22: English text for strings that were written in Arabic only */
    var QEN = {
        "قراءة المصحف": "Read the Mushaf",
        "كمّل من آخر آية": "Continue from last verse",
        "فهرس السور": "Surah index",
        "تفسير السعدي": "Tafsir al-Saadi",
        "بحث تفسير السعدي": "Search Tafsir al-Saadi",
        "إذاعة القرآن الكريم": "Holy Quran Radio",
        "حكم ومواعظ الكلم الطيب": "Wisdom & Sermons (Kalem Tayeb)",
        "فهرس الأجزاء": "Juz index",
        "بحث في الآيات": "Search verses",
        "الختمة والورد": "Khatma & daily portion",
        "المصدر والرواية": "Source & riwaya",
        "رجوع للّانشر": "Back to launcher",
        "المصحف الشريف": "The Noble Mushaf",
        "رواية حفص عن عاصم": "Riwayat Hafs 'an 'Asim",
        "● أوفلاين بالكامل": "● Fully offline",
        "حفص": "Hafs",
        "١١٤ سورة · ٣٠ جزءًا\nنص مُشكّل من مشروع تنزيل": "114 surahs · 30 juz\nVocalized text from the Tanzil Project",
        "◄ التالية": "◄ Next",
        "السابقة ►": "Previous ►",
        "− أ": "− A",
        "+ أ": "+ A",
        "⤢ ملء الشاشة": "⤢ Fit screen",
        "↕ تباعد": "↕ Spacing",
        "◐ ورقي": "◐ Paper",
        "◉ لون": "◉ Color",
        "⇔ حواف الشاشة": "⇔ Screen margins",
        "✓ قرأت الصفحة": "✓ Mark page read",
        "بحث التفسير": "Search tafsir",
        "فتح في المصحف": "Open in Mushaf",
        "إذاعة القرآن الكريم تعمل في الخلفية بدون انقطاع": "Quran Radio is playing in the background",
        "تم إيقاف إذاعة القرآن الكريم": "Quran Radio stopped",
        "السور الـ ١١٤ بالترتيب · افتح السورة من أول آية": "The 114 surahs in order · open a surah from its first verse",
        "٣٠ جزءًا بالترتيب · انتقال لأول آية في الجزء بدقة": "The 30 juz in order · jumps to the first verse of the juz",
        "الأسهم للتنقّل  ·  OK لفتح الاختيار  ·  رجوع من القراءة يرجّعك لنفس مكانك في الفهرس": "Arrows to move · OK to open · Back from reading returns you to the same place in the index",
        "بحث في المصحف": "Search the Mushaf",
        "اكتب حرف أو كلمة أو جملة · النتايج فورًا وبترتيب المصحف، مش بترتيب التشابه": "Type a letter, word or phrase · results appear at once, in Mushaf order",
        "لوحة الحروف بالريموت أو كيبورد · النتيجة بـ OK تفتح الصفحة وتعلّم على الآية · البحث بيتجاهل التشكيل واختلاف الألف": "Use the letter pad with the remote or a keyboard · OK on a result opens the page and marks the verse · search ignores diacritics and alef forms (Arabic letters only)",
        "مسح الكل": "Clear all",
        "مسافة": "Space",
        "⌫ حذف": "⌫ Delete",
        "النتايج ◄": "Results ◄",
        "◄ المزيد": "◄ More",
        "✕ إغلاق": "✕ Close",
        "إعادة المحاولة": "Retry",
        "نص محلي موثّق · مش صور · مش نص مولّد": "Verified local text · not images · not generated text",
        "رجوع: خروج  ·  تقدر تراجع بيانات المصدر والترخيص جوّه الحزمة": "Back: exit · source and license details are inside the package",
        "بحث في تفسير السعدي": "Search Tafsir al-Saadi",
        "بحث فوري من أول حرف في تفسير السعدي كاملاً لجميع السور الـ ١١٤": "Instant search from the first letter across the whole Tafsir al-Saadi, all 114 surahs",
        "لوحة الحروف بالريموت أو كيبورد · OK على النتيجة تفتح الآية وتفسيرها مباشرة · رجوع للقائمة": "Letter pad with the remote or a keyboard · OK on a result opens the verse and its tafsir · Back for the menu",
        "تيسير الكريم الرحمن في تفسير كلام المنان · نص مدقّق وموثّق": "Taysir al-Karim al-Rahman fi Tafsir Kalam al-Mannan · verified text",
        "▲▼ للتمرير · ◄ التالية · السابقة ► · ► الأدوات والقائمة · رجوع للخروج": "▲▼ scroll · ◄ Next · Previous ► · ► tools and menu · Back to exit",
        "▲▼ للتمرير · ◄ التالية · السابقة ► · ► الأدوات": "▲▼ scroll · ◄ Next · Previous ► · ► tools",
        "بنفتح النص المحلي…": "Opening the local text…",
        "النص موجود جوّه الحزمة؛ مش محتاج إنترنت": "The text is inside the package; no internet needed",
        "جارٍ فتح مصحف حفص…": "Opening the Hafs Mushaf…",
        "جارٍ تحميل تفسير السعدي…": "Loading Tafsir al-Saadi…",
        "جارٍ تجهيز فهرس تفسير السعدي…": "Preparing the Tafsir al-Saadi index…",
        "مفيش آيات مطابقة.\nجرّب كلمة أقصر أو راجع الكتابة.": "No matching verses.\nTry a shorter word or check the spelling.",
        "مفيش نتائج مطابقة.\nجرّب كلمة تانية أو راجع الحروف.": "No matching results.\nTry another word or check the letters.",
        "اكتب أول حرف عشان تظهر الآيات": "Type the first letter to see verses",
        "اكتب أول حرف عشان تبدأ البحث في تفسير السعدي": "Type the first letter to start searching Tafsir al-Saadi",
        "كل حرف بتكتبه بيحدّث النتايج فورًا.\nتقدر تكتب من لوحة الحروف اللي جنبك.": "Every letter you type updates the results.\nUse the letter pad next to you.",
        "كل حرف بتكتبه بيحدّث النتايج فورًا في تفسير السعدي.\nتقدر تكتب من لوحة الحروف بالريموت.": "Every letter you type updates the results.\nUse the letter pad with the remote.",
        "▲▼ للتمرير · ◄ التالية · السابقة ► · OK أو رجوع للإغلاق": "▲▼ scroll · ◄ Next · Previous ► · OK or Back to close",
        "تفسير السعدي (تيسير الكريم الرحمن)": "Tafsir al-Saadi (Taysir al-Karim al-Rahman)",
        "تفسير هذه الآية غير متوفر": "No tafsir available for this verse"
    };
    function T(s) { return (APL.lang !== "ar" && Object.prototype.hasOwnProperty.call(QEN, s)) ? QEN[s] : s; }

    var COLORS_DARK = [["تلقائي", ""], ["أبيض", "#ffffff"], ["ذهبي", "#ffd36b"], ["أخضر فاتح", "#b9f27a"], ["سماوي", "#9fe3ff"], ["كريمي", "#f6e9c8"]];
    var COLORS_PAPER = [["تلقائي", ""], ["أسود", "#000000"], ["بني", "#4a2f0c"], ["أخضر غامق", "#14501f"], ["كحلي", "#14285a"], ["عنابي", "#6a1420"]];
    var prefs = readPrefs(), savedScroll = 0;
    var tfSurah = 0, tfPick = false, tfCache = {}, tfIndex = null, tfBody = null;
    var tafModal = null, tfModalSurah = 1, tfModalAyah = 1, activeVerseIdx = 0;
    var sbQuery = "", sbMatches = [], sbPage = 0, sbIndexTafsir = null, sbLoading = false;
    var sbField = null, sbResultList = null, sbResultCount = null, sbPager = null;
    var MENU = [
        ["read", T("قراءة المصحف"), "book"],
        ["resume", T("كمّل من آخر آية"), "back"],
        ["surahs", T("فهرس السور"), "list"],
        ["tafsir", T("تفسير السعدي"), "book"],
        ["search-book", T("بحث تفسير السعدي"), "search"],
        ["radio", T("إذاعة القرآن الكريم"), "radio"],
        ["hekam", T("حكم ومواعظ الكلم الطيب"), "book"],
        ["juz", T("فهرس الأجزاء"), "parts"],
        ["search", T("بحث في الآيات"), "search"],
        ["tracker", T("الختمة والورد"), "check"],
        ["source", T("المصدر والرواية"), "info"],
        ["close", T("رجوع للّانشر"), "back"]
    ];
    var ICON = {
        book: '<path d="M12 5v15M3 4c4-1 6 0 9 2 3-2 5-3 9-2v14c-4-1-6 0-9 2-3-2-5-3-9-2z"/>',
        list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.1M3 12h.1M3 18h.1"/>',
        parts: '<path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z"/>',
        search: '<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/>',
        check: '<path d="m4 12 5 5L20 6"/>', info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.1"/>',
        radio: '<circle cx="12" cy="12" r="2"/><path d="M7.8 7.8a6 6 0 0 0 0 8.4M16.2 7.8a6 6 0 0 1 0 8.4M4.9 4.9a10 10 0 0 0 0 14.2M19.1 4.9a10 10 0 0 1 0 14.2"/>',
        back: '<path d="M4 12h16m-6-6 6 6-6 6"/>', menu: '<path d="M4 7h16M4 12h16M4 17h16"/>'
    };
    function dg(n) { return APL.digits ? APL.digits(String(n)) : String(n); }
    function el(tag, cls, text) {
        var n = document.createElement(tag);
        if (cls) n.className = cls;
        if (text !== undefined) n.textContent = T(text);
        return n;
    }
    function svg(name) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICON[name] || ICON.book) + '</svg>'; }
    function button(text, id, run, cls) {
        var n = el("div", "mq__focus mq__button" + (cls ? " " + cls : ""), text);
        n.setAttribute("role", "button"); n._qid = id; n._run = run;
        n.addEventListener("click", function () { if (n._run) n._run(); });
        return n;
    }
    function readPrefs() {
        var p = {};
        try { p = JSON.parse(global.localStorage.getItem(STORE) || "{}"); } catch (e) {}
        if (!p || typeof p !== "object") p = {};
        if (SIZES.indexOf(p.font) < 0) p.font = 42;
        if (typeof p.lh !== "number" || p.lh < 0 || p.lh >= LH.length) p.lh = 0;
        p.fit = p.fit !== false;      /* v7.2.0: the whole page fits the screen (auto font size) unless the size was set by hand */
        p.paper = p.paper === true;
        if (typeof p.color !== "number" || p.color < 0 || p.color >= 6) p.color = 0;   /* v7.1.0 text colour */
        p.ayah = typeof p.ayah === "number" && p.ayah >= 0 && p.ayah < TOTAL ? p.ayah : -1;
        return p;
    }
    function savePrefs() { try { global.localStorage.setItem(STORE, JSON.stringify(prefs)); } catch (e) {} }
    /* v7.0.3: the verse at the top of the reading area is the "last verse" bookmark. */
    function firstVisibleAyah() {
        if (!readBody) return -1;
        var list = readBody.querySelectorAll(".mq__ayah"), top = readBody.getBoundingClientRect().top + 20, i, r;
        for (i = 0; i < list.length; i++) {
            r = list[i].getBoundingClientRect();
            if (r.bottom > top) return parseInt(list[i].getAttribute("data-ayah-index"), 10);
        }
        return list.length ? parseInt(list[list.length - 1].getAttribute("data-ayah-index"), 10) : -1;
    }
    function rememberScroll() {
        if (readBody && view === "read") {
            prefs.page = APL.khatma.state().page; prefs.scroll = readBody.scrollTop; prefs.ayah = firstVisibleAyah(); savePrefs();
        }
    }
    function norm(s) {
        s = String(s || "");
        if (s.normalize) s = s.normalize("NFKC");
        return s.replace(/[\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed\u0640\u200b-\u200f\u202a-\u202e]/g, "")
            .replace(/[أإآٱ]/g, "ا").replace(/ى/g, "ي").replace(/ؤ/g, "و").replace(/ئ/g, "ي")
            .replace(/\s+/g, " ").trim();
    }
    function boundary(arr, n) {
        var lo = 0, hi = arr.length - 2, mid;
        while (lo <= hi) { mid = (lo + hi) >> 1; if (arr[mid] <= n) lo = mid + 1; else hi = mid - 1; }
        return Math.max(0, hi);
    }
    function meta(n) {
        var s = 0, lo = 0, hi = 113, mid;
        while (lo <= hi) { mid = (lo + hi) >> 1; if (data.surahs[mid][1] <= n) { s = mid; lo = mid + 1; } else hi = mid - 1; }
        return { index: n, surah: s + 1, name: data.surahs[s][0], ayah: n - data.surahs[s][1] + 1,
            page: boundary(data.pages, n) + 1, juz: boundary(data.juz, n) + 1 };
    }
    function validMeta(d) {
        if (!d || d.format !== 1 || d.riwaya !== "حفص عن عاصم" || typeof d.opening !== "string" || !d.surahs || d.surahs.length !== 114 ||
            !d.pages || d.pages.length !== 605 || !d.juz || d.juz.length !== 31) return false;
        var sets = [d.pages, d.juz], i, j;
        for (i = 0; i < sets.length; i++) {
            if (sets[i][0] !== 0 || sets[i][sets[i].length - 1] !== TOTAL) return false;
            for (j = 1; j < sets[i].length; j++) if (sets[i][j] <= sets[i][j - 1]) return false;
        }
        return true;
    }
    /* One local file, read with XHR (file:// on the TV answers status 0). Every request is kept so close() can abort it. */
    function getJSON(path, check) {
        return new Promise(function (resolve, reject) {
            var r = new XMLHttpRequest(), done = false;
            reqs.push(r);
            function finish(err, d) {
                if (done) return; done = true;
                var k = reqs.indexOf(r); if (k >= 0) reqs.splice(k, 1);
                if (err) reject(err); else resolve(d);
            }
            var full = (path.indexOf("tafsir/") === 0) ? "data/" + path : DIR + path;      /* v7.2.1/v8.5.0: data/tafsir/N.json */
            r.open("GET", global.APL_ASSET ? global.APL_ASSET(full) : full, true);
            r.timeout = 15000;
            r.onload = function () {
                try {
                    if (r.status !== 0 && (r.status < 200 || r.status >= 300)) throw new Error("HTTP " + r.status);
                    var d = JSON.parse(r.responseText);
                    if (check && !check(d)) throw new Error("invalid " + path);
                    finish(null, d);
                } catch (e) { finish(e); }
            };
            r.onerror = r.ontimeout = r.onabort = function () { finish(new Error("local Quran unavailable: " + path)); };
            r.send();
        });
    }
    function load() {
        if (data) return Promise.resolve(data);
        if (pending) return pending;
        var token = generation;
        pending = getJSON("meta.json", validMeta).then(function (d) {
            if (token !== generation) throw new Error("closed");
            data = { surahs: d.surahs, pages: d.pages, juz: d.juz, verses: new Array(TOTAL), search: null, have: 0 };
            basmalaEnd = d.opening.split(" ").pop();
            return data;
        }, function (e) { if (token === generation) pending = null; throw e; });
        return pending;
    }
    function pad2(n) { return (n < 10 ? "0" : "") + n; }
    /* Verses of juz n (1..30) go into their places in data.verses; nothing else is kept from the file. */
    function loadJuz(n) {
        if (juzHave[n]) return Promise.resolve();
        if (juzReq[n]) return juzReq[n];
        var token = generation, d0 = data, a = data.juz[n - 1], b = data.juz[n];
        juzReq[n] = getJSON("juz/" + pad2(n) + ".json", function (j) {
            return j && j.format === 1 && j.juz === n && j.start === a && j.verses && j.verses.length === b - a;
        }).then(function (j) {
            if (token !== generation || data !== d0) throw new Error("closed");
            for (var i = 0; i < j.verses.length; i++) data.verses[a + i] = j.verses[i];
            data.have += j.verses.length; juzHave[n] = true; delete juzReq[n];
        }, function (e) { if (token === generation) delete juzReq[n]; throw e; });
        return juzReq[n];
    }
    function juzRange(from, end) { return [boundary(data.juz, from) + 1, boundary(data.juz, Math.max(from, end - 1)) + 1]; }
    function rangeReady(from, end) {
        var r = juzRange(from, end);
        for (var n = r[0]; n <= r[1]; n++) if (!juzHave[n]) return false;
        return true;
    }
    function loadRange(from, end) {
        var r = juzRange(from, end), list = [];
        for (var n = r[0]; n <= r[1]; n++) list.push(loadJuz(n));
        return Promise.all(list);
    }
    /* First search letter: Simple Clean + every juz (the index also matches the Uthmani spelling). */
    function loadAll() {
        if (data.search && data.have === TOTAL) return Promise.resolve();
        if (allPending) return allPending;
        var token = generation, d0 = data, list = [];
        for (var n = 1; n <= 30; n++) list.push(loadJuz(n));
        if (!data.search) list.push(getJSON("search.json", function (d) { return d && d.format === 1 && d.search && d.search.length === TOTAL; })
            .then(function (d) { if (token !== generation || data !== d0) throw new Error("closed"); data.search = d.search; }));
        allPending = Promise.all(list).then(function () { allPending = null; }, function (e) { if (token === generation) allPending = null; throw e; });
        return allPending;
    }
    /* The source includes the unnumbered opening basmala before verse 1.
       Separate it for layout only (Fatihah 1:1 remains a numbered verse).
       No string in the distributed corpus is changed. */
    function splitOpening(n, m) {
        var text = data.verses[n], at;
        if (m.ayah === 1 && m.surah !== 1 && m.surah !== 9) {
            at = text.indexOf(basmalaEnd + " ");
            if (at >= 0 && at < 90) return { opening: text.slice(0, at + basmalaEnd.length), body: text.slice(at + basmalaEnd.length + 1) };
        }
        return { opening: "", body: text };
    }
    function ensureIndex() {
        if (index) return true;
        if (!data.search || data.have !== TOTAL) return false;
        index = new Array(TOTAL);
        var b = data.search[0] + " ", i, s, u, at;
        for (i = 0; i < TOTAL; i++) {
            s = data.search[i]; u = data.verses[i];
            /* Only the first verse of surahs other than 1/9 carries this prefix. */
            if (i > 6 && s.indexOf(b) === 0) {
                s = s.slice(b.length); at = u.indexOf(basmalaEnd + " ");
                if (at >= 0 && at < 90) u = u.slice(at + basmalaEnd.length + 1);
            }
            /* Both ordinary Imlaei typing and copied Uthmani spelling work.
               A newline prevents matches from crossing between the two copies. */
            index[i] = norm(s) + "\n" + norm(u);
        }
        return true;
    }
    function find(q) {
        var needle = norm(q), out = [], i, pool = null, n;
        /* v7.0.6: the search files are read on the first letter only; results follow when they are in. */
        if (needle && !ensureIndex()) { matches = []; previousQuery = ""; prepareSearch(); return; }
        if (needle && previousQuery && needle.indexOf(previousQuery) === 0) pool = matches;
        if (needle) {
            if (pool) { for (i = 0; i < pool.length; i++) { n = pool[i]; if (index[n].indexOf(needle) >= 0) out.push(n); } }
            else { for (i = 0; i < TOTAL; i++) if (index[i].indexOf(needle) >= 0) out.push(i); }
        }
        previousQuery = needle; matches = out;
    }
    var TOOLBAR = [
        "next", "prev", "font-smaller", "font-larger", "fit", "spacing", "paper", "color", "mark-read",
        "tf-next", "tf-prev", "tf-pick", "tf-search", "tf-mushaf", "tf-smaller", "tf-larger", "tf-spacing", "tf-paper", "tf-color"
    ];
    var TOOL_ROWS = [["next", "prev"], ["font-smaller", "font-larger"], ["fit", "spacing"], ["paper", "color"], ["mark-read"]];
    var TF_SAADI_ROWS = [["tf-next", "tf-prev"], ["tf-pick", "tf-search"], ["tf-mushaf"], ["tf-smaller", "tf-larger"], ["tf-spacing", "tf-paper"], ["tf-color"]];

    function buildSideTools(mode) {
        if (!toolsEl) return;
        toolsEl.textContent = "";
        if (mode === "read") {
            toolsEl.appendChild(button(T("◄ التالية"), "next", function () { changePage(1); }));
            toolsEl.appendChild(button(T("السابقة ►"), "prev", function () { changePage(-1); }));
            toolsEl.appendChild(button(T("− أ"), "font-smaller", function () { setSize(-1); }));
            toolsEl.appendChild(button(T("+ أ"), "font-larger", function () { setSize(1); }));
            toolsEl.appendChild(button(T("⤢ ملء الشاشة"), "fit", toggleFit));
            toolsEl.appendChild(button(T("↕ تباعد"), "spacing", cycleSpacing));
            toolsEl.appendChild(button(T("◐ ورقي"), "paper", togglePaper));
            toolsEl.appendChild(button(T("◉ لون"), "color", cycleColor));
            toolsEl.appendChild(button(T("⇔ حواف الشاشة"), "safe", cycleSafe));
            toolsEl.appendChild(button(T("✓ قرأت الصفحة"), "mark-read", markRead, "mq__button--green mq__tool--wide"));
        } else if (mode === "tafsir") {
            toolsEl.appendChild(button(T("◄ التالية"), "tf-next", function () { tfGo(1); }));
            toolsEl.appendChild(button(T("السابقة ►"), "tf-prev", function () { tfGo(-1); }));
            toolsEl.appendChild(button(T("فهرس السور"), "tf-pick", function () { setSide(false); tfPick = true; returnTo = null; show("surahs"); }));
            toolsEl.appendChild(button(T("بحث التفسير"), "tf-search", function () { setSide(false); show("search-book"); }));
            toolsEl.appendChild(button(T("فتح في المصحف"), "tf-mushaf", function () { setSide(false); var s = data.surahs[tfSurah - 1][1]; jump(s, "tafsir", "tf-mushaf"); }, "mq__tool--wide"));
            toolsEl.appendChild(button(T("− أ"), "tf-smaller", function () { tfSize(-1); }));
            toolsEl.appendChild(button(T("+ أ"), "tf-larger", function () { tfSize(1); }));
            toolsEl.appendChild(button(T("↕ تباعد"), "tf-spacing", function () {
                prefs.lh = (prefs.lh + 1) % LH.length; savePrefs(); tfLook();
                if (APL.toast) APL.toast(APL.enx("تباعد السطور ") + dg(prefs.lh + 1) + (APL.lang === "ar" ? " من " : " of ") + dg(LH.length), true);
            }));
            toolsEl.appendChild(button(T("◐ ورقي"), "tf-paper", function () {
                prefs.paper = !prefs.paper; savePrefs(); tfLook();
                if (APL.toast) APL.toast(prefs.paper ? "الوضع الورقي مفعّل" : "الوضع الليلي مفعّل", true);
            }));
            toolsEl.appendChild(button(T("◉ لون"), "tf-color", function () {
                prefs.color = (prefs.color + 1) % COLORS_DARK.length; savePrefs(); tfLook();
                if (APL.toast) APL.toast(APL.enx("لون الخط: ") + APL.enx((prefs.paper ? COLORS_PAPER : COLORS_DARK)[prefs.color][0]), true);
            }, "mq__tool--wide"));
            toolsEl.appendChild(button(T("⇔ حواف الشاشة"), "tf-safe", cycleSafe, "mq__tool--wide"));
        }
    }
    function step(id) { if (focusID(id) && APL.sound && APL.sound.tick) APL.sound.tick(); }
    function currentID() { var c = nav && nav.current(); return c ? c._qid : ""; }
    function refreshNav(focus) {
        if (!nav || !root) return;
        var items = Array.prototype.slice.call(root.querySelectorAll(".mq__focus")).filter(function (n) { return n.offsetWidth > 0 || n.offsetHeight > 0; }), i;
        nav.setTiles(items);
        for (i = 0; i < items.length; i++) if (items[i]._qid === focus) { nav.focus(i); break; }
    }
    function focusID(id) {
        for (var i = 0; nav && i < nav.tiles.length; i++) if (nav.tiles[i]._qid === id) { nav.focus(i); return true; }
        return false;
    }
    function build() {
        root = el("section", "mq"); root.setAttribute("dir", "rtl"); root.setAttribute("aria-label", "المصحف الشريف برواية حفص");
        var aside = el("aside", "mq__side"), brand = el("div", "mq__brand");
        brand.innerHTML = '<div class="mq__emblem">' + svg("book") + '</div>';
        brandTitle = el("div", "mq__brand-title", T("المصحف الشريف")); brand.appendChild(brandTitle);
        brandSub = el("div", "mq__brand-sub", T("رواية حفص عن عاصم")); brand.appendChild(brandSub);
        brandWird = el("div", "mq__brand-wird", ""); brand.appendChild(brandWird);
        brand.appendChild(el("span", "mq__offline", T("● أوفلاين بالكامل"))); aside.appendChild(brand);
        var menus = el("div", "mq__menus");
        MENU.forEach(function (m) {
            var b = button("", "menu-" + m[0], function () {
                if (m[0] === "close") { close(); return; }
                if (m[0] === "radio") {
                    if (APL.radio) {
                        APL.radio.toggle().then(function () {
                            var isLive = APL.radio.isPlaying();
                            if (APL.toast) APL.toast(isLive ? T("إذاعة القرآن الكريم تعمل في الخلفية بدون انقطاع") : T("تم إيقاف إذاعة القرآن الكريم"), true);
                        });
                    }
                    return;
                }
                if (m[0] === "tracker") { close(); APL.khatma.panel(); return; }
                if (m[0] === "resume") { returnTo = null; resumeNow(); return; }
                if (m[0] === "tafsir") { tfSurah = 0; tfIndex = null; }
                if (m[0] === "hekam") { close(); if (APL.prayerPage && APL.prayerPage.openHekam) { APL.prayerPage.open(); APL.prayerPage.openHekam(); } return; }
                if (m[0] === "search-book") { returnTo = null; show("search-book"); return; }
                returnTo = null; target = -1; show(m[0]);
            }, "mq__menu");
            b.innerHTML = svg(m[2]); b.appendChild(el("span", "", m[1])); b._view = m[0]; menus.appendChild(b);
        });
        aside.appendChild(menus);
        if (APL.lang !== "ar") aside.setAttribute("dir", "ltr");   /* v8.7.22: English labels read left to right; the Quran text itself stays right to left */
        /* v7.2.0/v8.4.1: reading controls live here; shown in read and book views */
        toolsEl = el("div", "mq__tools");
        aside.appendChild(toolsEl);
        aside.appendChild(el("div", "mq__side-foot", T("١١٤ سورة · ٣٠ جزءًا\nنص مُشكّل من مشروع تنزيل")));
        var pane = el("div", "mq__pane"), head = el("header", "mq__head"), h = el("div", "");
        title = el("h1", "mq__title"); sub = el("div", "mq__subtitle"); h.appendChild(title); h.appendChild(sub); head.appendChild(h);
        var badge = el("div", "mq__edition", T("حفص")); head.appendChild(badge); pane.appendChild(head);
        main = el("div", "mq__main"); pane.appendChild(main);
        footer = el("footer", "mq__footer"); pane.appendChild(footer);
        var handle = el("div", "mq__handle"); handle.innerHTML = svg("menu"); handle.setAttribute("aria-hidden", "true");
        handle.onclick = function () { setSide(!side); };
        root.appendChild(aside); root.appendChild(pane); root.appendChild(handle); document.body.appendChild(root);
        nav = new APL.Nav({ rawArrowKeys: true,
            /* v7.0.5: remember the last focus inside the page, so LEFT from the sidebar comes back to it */
            onFocus: function (i, n) {
                if (!n || !n._qid) return;
                if ((view === "read" || view === "tafsir") && (n._qid.indexOf("menu-") === 0 || TOOLBAR.indexOf(n._qid) >= 0)) lastSide = n._qid;
                else if (n._qid.indexOf("menu-") !== 0) lastContent = n._qid;
            },
            onSelect: function (i, n) { if (n && n._run) n._run(); },
            onBack: back,
            onKey: onKey
        });
    }
    function header(a, b, hint) { title.textContent = T(a); sub.textContent = T(b); footer.textContent = T(hint); if (APL.lang !== "ar") { title.setAttribute("dir", "auto"); sub.setAttribute("dir", "auto"); footer.setAttribute("dir", "auto"); } }
    function clearMain() { main.textContent = ""; field = resultList = resultCount = pager = readBody = null; }
    function activeMenu() {
        var list = root.querySelectorAll(".mq__menu");
        for (var i = 0; i < list.length; i++) {
            list[i].classList.toggle("is-active", list[i]._view === view);
        }
    }
    /* v7.0.6: wait for a local file, then run again (only if the reader is still open and the same session). */
    function whenLoaded(promise, again) {
        var token = generation;
        promise.then(function () { if (opened && token === generation && data) again(); },
            function () { if (opened && token === generation) failScreen(view); });
    }
    function prepareSearch() {
        if (allPending) return;
        whenLoaded(loadAll(), function () {
            if (view === "search") setQuery(query, !!(field && document.activeElement === field));
        });
    }
    function show(name, focus) {
        if (!data || !opened) return;
        if (name === "read") {
            var pg = APL.khatma.state().page;
            if (!rangeReady(data.pages[pg - 1], data.pages[pg])) {
                whenLoaded(loadRange(data.pages[pg - 1], data.pages[pg]), function () { show(name, focus); });
                return;
            }
        }
        if (name !== "surahs") tfPick = false; if (name !== "tafsir") tfBody = null;
        rememberScroll(); view = name; clearMain(); activeMenu(); lastContent = "";
        side = false; root.classList.remove("mq--side"); if (name === "read" || name === "tafsir") lastSide = "";
        root.classList.toggle("mq--read", name === "read" || name === "tafsir");   /* v7.1.0/v8.4.1: full screen reader for Mushaf and books */
        if (name !== "read" && name !== "tafsir" && brandTitle) { brandTitle.textContent = T("المصحف الشريف"); brandSub.textContent = T("رواية حفص عن عاصم"); brandWird.textContent = ""; }
        if (name === "read") renderReader();
        else if (name === "surahs" || name === "juz") renderIndex(name);
        else if (name === "search") renderSearch();
        else if (name === "search-book") renderSearchBook();
        else if (name === "tafsir") renderTafsir();
        else renderSource();
        refreshNav(focus || (name === "read" ? "reading" : name === "search" ? "letter-0" : name === "search-book" ? "sb-letter-0" : name === "source" ? "source-text" : name === "tafsir" ? "tafsir-body" : "entry-0"));
    }
    function changePage(delta, toEnd) {
        var np = APL.khatma.state().page + delta;
        if (np < 1 || np > 604) return;
        lastFlip = Date.now();
        rememberScroll(); target = -1; savedScroll = toEnd ? 1e7 : 0;
        APL.khatma.goTo(APL.khatma.state().page + delta, true); show("read");
    }
    function markRead() { rememberScroll(); target = -1; savedScroll = 0; APL.khatma.readPage(); show("read"); }
    function nearestSize(px) {
        var best = 0, i;
        for (i = 0; i < SIZES.length; i++) if (SIZES[i] <= px) best = i;
        return best;
    }
    function setSize(delta) {
        var at = prefs.fit !== false && fitSize ? nearestSize(fitSize) : SIZES.indexOf(prefs.font);
        prefs.fit = false;      /* a size chosen by hand: the page may scroll again */
        prefs.font = SIZES[Math.max(0, Math.min(SIZES.length - 1, at + delta))]; savePrefs();
        applyLook();
        if (APL.toast) APL.toast(APL.enx("حجم الخط ") + dg(prefs.font) + APL.enx(" (يدوي)"), true);
    }
    function toggleFit() {
        prefs.fit = prefs.fit === false; savePrefs(); applyLook();
        if (APL.toast) APL.toast(prefs.fit ? "الصفحة كاملة على الشاشة" : "حجم الخط يدوي، والصفحة بتتمرّر", true);
    }
    /* v7.2.0: the largest font size at which the WHOLE page (headings included) fits the reading area without scrolling. */
    function fit() {
        if (!readBody || prefs.fit === false || !readBody.firstChild) return;
        var lo = 16, hi = 72, best = 16, mid;
        readBody.style.overflowY = "hidden";
        while (lo <= hi) {
            mid = (lo + hi) >> 1; readBody.style.fontSize = mid + "px";
            if (readBody.scrollHeight <= readBody.clientHeight + 1) { best = mid; lo = mid + 1; } else hi = mid - 1;
        }
        readBody.style.fontSize = best + "px"; fitSize = best; readBody.scrollTop = 0;
    }
    /* v8.8.1: a margin from the screen's edges (TVs hide a few pixels at the sides), shared by the Mushaf and the tafsir. */
    var SAFE = [0, 24, 44, 64, 88];
    function safeIdx() { var v = prefs.safe; return (typeof v === "number" && v >= 0 && v < SAFE.length) ? v : 1; }
    function applySafe() {
        if (!root) return;
        var x = SAFE[safeIdx()];
        root.style.setProperty("--mq-safe-x", x + "px");
        root.style.setProperty("--mq-safe-y", Math.round(x * 0.6) + "px");
    }
    function cycleSafe() {
        prefs.safe = (safeIdx() + 1) % SAFE.length; savePrefs(); applySafe();
        if (readBody && prefs.fit !== false) fit();
        if (APL.toast) APL.toast(APL.enx("حواف الشاشة: ") + (SAFE[safeIdx()] ? SAFE[safeIdx()] + APL.enx(" بكسل") : APL.enx("بدون")), true);
    }
    function applyLook() {
        applySafe();
        if (!readBody) return;
        readBody.style.lineHeight = String(LH[prefs.lh]);
        readBody.classList.toggle("is-paper", !!prefs.paper);
        var hex = (prefs.paper ? COLORS_PAPER : COLORS_DARK)[prefs.color][1];
        readBody.style.color = hex; readBody.classList.toggle("has-color", !!hex);
        if (prefs.fit !== false) fit();
        else { readBody.style.fontSize = prefs.font + "px"; readBody.style.overflowY = "auto"; }
    }
    function cycleColor() {
        prefs.color = (prefs.color + 1) % COLORS_DARK.length; savePrefs(); applyLook();
        if (APL.toast) APL.toast(APL.enx("لون الخط: ") + APL.enx((prefs.paper ? COLORS_PAPER : COLORS_DARK)[prefs.color][0]), true);
    }
    function cycleSpacing() {
        prefs.lh = (prefs.lh + 1) % LH.length; savePrefs(); applyLook();
        if (APL.toast) APL.toast(APL.enx("تباعد السطور ") + dg(prefs.lh + 1) + (APL.lang === "ar" ? " من " : " of ") + dg(LH.length), true);
    }
    function togglePaper() {
        prefs.paper = !prefs.paper; savePrefs(); applyLook();
        if (APL.toast) APL.toast(prefs.paper ? "ثيم ورقي هادي" : "ثيم داكن", true);
    }
    /* "Continue from the last verse": open the page of the saved verse and mark it. */
    function resumeNow() {
        if (!data) return;
        var a = prefs.ayah;
        if (a < 0 || a >= TOTAL) { target = -1; show("read"); return; }
        APL.khatma.goTo(boundary(data.pages, a) + 1, true); target = a; savedScroll = 0; show("read");
    }
    function setSide(on, focus) {
        if (!root || (view !== "read" && view !== "tafsir")) return;
        side = !!on; root.classList.toggle("mq--side", side);
        if (side) focusID(focus || lastSide || (view === "tafsir" ? "menu-tafsir" : "menu-surahs"));
        else focusID(view === "tafsir" ? "tafsir-body" : "reading");
    }

    function updateActiveAyahHighlight() {
        if (!readBody) return;
        var list = readBody.querySelectorAll(".mq__ayah");
        for (var i = 0; i < list.length; i++) {
            var idx = parseInt(list[i].getAttribute("data-ayah-index"), 10);
            var active = (idx === activeVerseIdx);
            list[i].classList.toggle("is-active-ayah", active);
            if (active && prefs.fit === false) {
                var r = list[i].getBoundingClientRect(), b = readBody.getBoundingClientRect();
                if (r.top < b.top || r.bottom > b.bottom) {
                    readBody.scrollTop += (r.top - b.top - 40);
                }
            }
        }
    }

    function renderReader() {
        buildSideTools("read");
        var page = APL.khatma.state().page, from = data.pages[page - 1], end = data.pages[page], m = meta(from);
        header("سورة " + m.name, "صفحة " + dg(page) + " من " + dg(604) + " · الجزء " + dg(m.juz) + " · حفص عن عاصم", "");
        if (brandTitle) {
            brandTitle.textContent = "سورة " + m.name;
            brandSub.textContent = "صفحة " + dg(page) + " من " + dg(604) + " · الجزء " + dg(m.juz);
            brandWird.textContent = "ورد النهارده: " + dg(APL.khatma.today()) + " / " + dg(APL.khatma.state().plan) + " صفحة";
        }

        if (target >= from && target < end) {
            activeVerseIdx = target;
        } else if (activeVerseIdx < from || activeVerseIdx >= end) {
            activeVerseIdx = from;
        }

        readBody = el("article", "mq__paper mq__focus"); readBody._qid = "reading";
        readBody._run = function () {
            var v = meta(activeVerseIdx);
            var elAyah = readBody ? readBody.querySelector('.mq__ayah[data-ayah-index="' + activeVerseIdx + '"]') : null;
            var txt = elAyah ? elAyah.textContent : "";
            openAyahTafsir(v.surah, v.ayah, v.name, txt);
        };
        readBody.setAttribute("aria-label", "نص الصفحة؛ أعلى وأسفل للتنقل بين الآيات، OK لتفسير السعدي، ويسار للصفحة التالية، ويمين للقائمة");
        var flow = null, last = -1, i;
        for (i = from; i < end; i++) {
            var info = meta(i), split = splitOpening(i, info);
            if (info.surah !== last) {
                var heading = el("div", "mq__surah-title", "سورة " + info.name);
                heading.appendChild(el("span", "mq__surah-note", "الجزء " + dg(info.juz) + " · " + dg(data.surahs[info.surah - 1][2]) + " آية"));
                readBody.appendChild(heading);
                if (split.opening) readBody.appendChild(el("div", "mq__basmala", split.opening));
                flow = el("div", "mq__flow"); readBody.appendChild(flow); last = info.surah;
            }
            var isActive = (i === activeVerseIdx);
            var verse = el("span", "mq__ayah" + (i === target ? " is-target" : "") + (isActive ? " is-active-ayah" : ""));
            verse.setAttribute("data-ayah-index", String(i));
            verse.style.cursor = "pointer";
            (function (ayahIdx, sNum, aNum, sName, aText) {
                verse.onclick = function (e) {
                    if (e) { e.stopPropagation(); e.preventDefault(); }
                    activeVerseIdx = ayahIdx;
                    updateActiveAyahHighlight();
                    openAyahTafsir(sNum, aNum, sName, aText);
                };
            })(i, info.surah, info.ayah, info.name, split.body);
            verse.appendChild(document.createTextNode(split.body));
            verse.appendChild(el("span", "mq__ayah-number", " ﴿" + dg(info.ayah) + "﴾ "));
            flow.appendChild(verse); flow.appendChild(document.createTextNode(" "));
        }
        main.appendChild(readBody);
        var progress = el("div", "mq__progress"), fill = el("i", ""); fill.style.width = (page/604*100).toFixed(2) + "%"; progress.appendChild(fill); main.appendChild(progress);
        var stat = el("div", "mq__reading-stat");
        stat.appendChild(el("span", "mq__stat-main", "سورة " + m.name + " · صفحة " + dg(page) + " من " + dg(604) + " · الجزء " + dg(m.juz)));
        stat.appendChild(el("span", "mq__stat-hint", "▲▼ تنقّل بين الآيات · OK تفسير السعدي · ◄ التالية · ► القائمة"));
        main.appendChild(stat);
        applyLook();      /* needs the text and the final size of the area: auto-fit happens here */
        var token = generation, currentBody = readBody;
        function scrollToTarget() {
            if (!opened || generation !== token || readBody !== currentBody) return;
            if (prefs.fit !== false) { fit(); return; }      /* the whole page is visible: nothing to scroll to */
            var hit = currentBody.querySelector(".is-target");
            if (hit) {
                var a = hit.getBoundingClientRect(), b = currentBody.getBoundingClientRect();
                currentBody.scrollTop += a.top - b.top - 45;
            } else currentBody.scrollTop = savedScroll || 0;
        }
        global.requestAnimationFrame(scrollToTarget);
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(scrollToTarget);
    }
    function jump(n, origin, originFocus) {
        if (!data || n < 0 || n >= TOTAL) return;
        if (origin) returnTo = { view: origin, focus: originFocus };
        target = n; savedScroll = 0;
        APL.khatma.goTo(meta(n).page, true); show("read");
    }
    function renderIndex(kind) {
        var surahs = kind === "surahs", count = surahs ? 114 : 30;
        header(surahs ? T("فهرس السور") : T("فهرس الأجزاء"), surahs ? T("السور الـ ١١٤ بالترتيب · افتح السورة من أول آية") : T("٣٠ جزءًا بالترتيب · انتقال لأول آية في الجزء بدقة"),
            T("الأسهم للتنقّل  ·  OK لفتح الاختيار  ·  رجوع من القراءة يرجّعك لنفس مكانك في الفهرس"));
        var grid = el("div", "mq__index");
        for (var i = 0; i < count; i++) (function (n) {
            var start = surahs ? data.surahs[n][1] : data.juz[n], m = meta(start);
            var card = button("", "entry-" + n, function () { if (tfPick && surahs) { tfPick = false; tfSurah = n + 1; show("tafsir"); return; } jump(start, kind, "entry-" + n); }, "mq__index-card");
            card.appendChild(el("span", "mq__index-num", dg(n + 1)));
            var content = el("div", "mq__index-copy");
            content.appendChild(el("div", "mq__index-name", surahs ? "سورة " + m.name : "الجزء " + dg(n + 1)));
            content.appendChild(el("div", "mq__index-meta", surahs ? dg(data.surahs[n][2]) + " آية · صفحة " + dg(m.page) : "سورة " + m.name + " · آية " + dg(m.ayah) + " · ص " + dg(m.page)));
            card.appendChild(content); card.appendChild(el("span", "mq__index-arrow", "‹")); grid.appendChild(card);
        })(i);
        main.appendChild(grid);
    }
    function renderSearch() {
        header(T("بحث في المصحف"), T("اكتب حرف أو كلمة أو جملة · النتايج فورًا وبترتيب المصحف، مش بترتيب التشابه"),
            T("لوحة الحروف بالريموت أو كيبورد · النتيجة بـ OK تفتح الصفحة وتعلّم على الآية · البحث بيتجاهل التشكيل واختلاف الألف"));
        var searchbar = el("div", "mq__searchbar");
        field = el("input", "mq__input mq__focus"); field.type = "text"; field.dir = "rtl"; field.maxLength = 180;
        field.placeholder = "ابحث في آيات القرآن…"; field.value = query; field.autocomplete = "off";
        field.setAttribute("aria-label", "البحث الفوري في آيات القرآن"); field._qid = "query"; field._run = function () { field.focus(); };
        field.addEventListener("input", function () { setQuery(field.value, true); });
        field.addEventListener("keydown", function (e) {
            if (e.keyCode === K.ENTER || e.keyCode === K.RETURN || e.keyCode === K.ESC || e.keyCode === K.DOWN) {
                e.preventDefault(); e.stopPropagation(); field.blur(); focusID(matches.length ? "result-" + matches[resultPage * LIMIT] : "letter-0");
            }
        });
        searchbar.appendChild(field);
        searchbar.appendChild(button(T("مسح الكل"), "clear-query", function () { setQuery(""); })); main.appendChild(searchbar);
        var split = el("div", "mq__search-layout"), keys = el("div", "mq__keyboard"), chars = "ابتثجحخدذرزسشصضطظعغفقكلمنهويءأإآؤئةى".split("");
        chars.forEach(function (c, i) { keys.appendChild(button(c, "letter-" + i, function () { setQuery(query + c); }, "mq__key")); });
        keys.appendChild(button(T("مسافة"), "space", function () { setQuery(query + " "); }, "mq__key mq__key--wide"));
        keys.appendChild(button(T("⌫ حذف"), "erase", function () { setQuery(query.slice(0, -1)); }, "mq__key mq__key--wide"));
        keys.appendChild(button(T("النتايج ◄"), "go-results", function () { focusID(matches.length ? "result-" + matches[resultPage * LIMIT] : "clear-query"); }, "mq__key mq__key--wide"));
        split.appendChild(keys);
        var results = el("div", "mq__results-wrap"); resultCount = el("div", "mq__result-count");
        resultList = el("div", "mq__results"); pager = el("div", "mq__pager"); results.appendChild(resultCount); results.appendChild(resultList); results.appendChild(pager);
        split.appendChild(results); main.appendChild(split); find(query); paintResults();
    }
    function setQuery(s, fromField) {
        if (!opened || view !== "search" || !data) return;
        var focus = fromField ? "query" : currentID(); query = String(s || "").slice(0,180);
        if (field && !fromField) field.value = query;
        find(query); resultPage = 0; paintResults(); refreshNav(focus);
    }
    function resultText(n) { return splitOpening(n, meta(n)).body; }
    function paintResults() {
        if (!resultList) return;
        resultList.textContent = ""; pager.textContent = "";
        var total = matches.length, first = resultPage * LIMIT, end = Math.min(total, first + LIMIT), q = norm(query);
        if (q && !index) {
            resultCount.textContent = "بنجهّز البحث من الملفات المحلية…";
            resultList.appendChild(el("div", "mq__empty", "أول حرف بيقرا ملفات البحث مرة واحدة.\nالنتايج هتظهر لوحدها."));
            return;
        }
        resultCount.textContent = !q ? T("اكتب أول حرف عشان تظهر الآيات") : dg(total) + " آية" + (total ? " · عرض " + dg(first + 1) + "–" + dg(end) + " · بترتيب المصحف" : "");
        if (!q || !total) {
            var empty = el("div", "mq__empty", !q ? T("كل حرف بتكتبه بيحدّث النتايج فورًا.\nتقدر تكتب من لوحة الحروف اللي جنبك.") : T("مفيش آيات مطابقة.\nجرّب كلمة أقصر أو راجع الكتابة."));
            resultList.appendChild(empty);
        }
        for (var i = first; i < end; i++) (function (n) {
            var m = meta(n), row = button("", "result-" + n, function () { jump(n, "search", "result-" + n); }, "mq__result");
            row.appendChild(el("div", "mq__result-ref", "سورة " + m.name + " · آية " + dg(m.ayah) + " · الجزء " + dg(m.juz) + " · ص " + dg(m.page)));
            row.appendChild(el("div", "mq__result-text", resultText(n))); resultList.appendChild(row);
        })(matches[i]);
        if (total > LIMIT) {
            if (resultPage > 0) pager.appendChild(button(T("السابقة ►"), "results-prev", function () { resultPage--; paintResults(); refreshNav("result-" + matches[resultPage * LIMIT]); }));
            pager.appendChild(el("span", "mq__pager-count", dg(resultPage + 1) + " / " + dg(Math.ceil(total / LIMIT))));
            if (end < total) pager.appendChild(button(T("◄ المزيد"), "results-next", function () { resultPage++; paintResults(); refreshNav("result-" + matches[resultPage * LIMIT]); }));
        }
        resultList.scrollTop = 0;
    }
    function renderSource() {
        header(T("المصدر والرواية"), T("نص محلي موثّق · مش صور · مش نص مولّد"), T("رجوع: خروج  ·  تقدر تراجع بيانات المصدر والترخيص جوّه الحزمة"));
        var box = button("", "source-text", function () {}, "mq__source");
        box.appendChild(el("h2", "", T("رواية حفص عن عاصم")));
        box.appendChild(el("p", "", "القرآن كامل: ١١٤ سورة، ٦٢٣٦ آية، ٣٠ جزءًا، بترقيم مصحف المدينة ٦٠٤ صفحات. النص العثماني المُشكّل من مشروع تنزيل، الإصدار 1.1، من غير إعادة صياغة أو تعديل الآيات."));
        box.appendChild(el("p", "", "المصدر: Tanzil Project · https://tanzil.net/\nتوثيق حفص: https://tanzil.net/docs/Medina_Mushaf\nالترخيص: Creative Commons Attribution 3.0 · النص يُوزّع كما هو."));
        box.appendChild(el("p", "", "البحث يستخدم نسخة إملائية موازية من نفس المصدر، وبيتجاهل التشكيل واختلاف الألف في فهرس بحث مؤقت بس. عرض الآيات دايمًا بالتشكيل الأصلي. البسملة الافتتاحية منفصلة عن ترقيم الآيات إلا الفاتحة."));
        box.appendChild(el("p", "", "الخط: Amiri Quran · SIL Open Font License. كل النص والخط داخل الحزمة؛ مفيش تنزيل أو اتصال بالإنترنت أثناء القراءة أو البحث. الصفحات النصية قابلة للتمرير وليست صورة مطابقة لتخطيط الصفحة المطبوعة."));
        box.appendChild(el("p", "mq__source-note", "الملف المرفوع باسم warshData رواية ورش، عشان كده ما اتستخدمش.\nUntested on the TV — اختبارات المتصفح مش بديل تجربة الشاشة."));
        main.appendChild(box);
    }

    /* ===== v8.5.0: search in Tafsir al-Saadi (live substring across all 114 surahs, temporary index released on close) ===== */
    function sbBuildIndex(onReady, onProgress) {
        if (sbIndexTafsir) { onReady(sbIndexTafsir); return; }
        sbLoading = true;
        var total = 114, loaded = 0, records = [];
        var batchSize = 12, current = 1, token = generation;

        function loadBatch() {
            if (!opened || generation !== token) { sbLoading = false; return; }
            var end = Math.min(total, current + batchSize - 1);
            var promises = [];
            for (var i = current; i <= end; i++) {
                (function (n) {
                    var sName = (data && data.surahs && data.surahs[n - 1]) ? data.surahs[n - 1][0] : ("سورة " + dg(n));
                    promises.push(getJSON("tafsir/" + n + ".json", function (d) { return d && d.ayahs; }).then(function (d) {
                        loaded++;
                        if (onProgress) onProgress(Math.floor((loaded / total) * 100));
                        var ayahs = (d && d.ayahs) || {};
                        var prev = "";
                        for (var k in ayahs) {
                            if (ayahs.hasOwnProperty(k)) {
                                var txt = ayahs[k] || "";
                                if (txt && txt !== prev && txt.length >= 10) {
                                    prev = txt;
                                    records.push({
                                        surah: n,
                                        title: sName,
                                        ayah: parseInt(k, 10),
                                        raw: txt,
                                        norm: norm(txt)
                                    });
                                }
                            }
                        }
                    }, function () {
                        loaded++;
                        if (onProgress) onProgress(Math.floor((loaded / total) * 100));
                    }));
                })(i);
            }
            Promise.all(promises).then(function () {
                if (!opened || generation !== token) { sbLoading = false; return; }
                if (end < total) {
                    current = end + 1;
                    setTimeout(loadBatch, 10);
                } else {
                    sbLoading = false;
                    sbIndexTafsir = records;
                    onReady(records);
                }
            });
        }
        loadBatch();
    }

    function sbFind(q) {
        sbMatches = [];
        var nq = norm(q);
        if (!nq || !sbIndexTafsir) return;
        for (var i = 0; i < sbIndexTafsir.length; i++) {
            if (sbIndexTafsir[i].norm.indexOf(nq) !== -1) {
                sbMatches.push(sbIndexTafsir[i]);
            }
        }
    }

    function sbSnippet(raw, normText, queryNorm) {
        var at = normText.indexOf(queryNorm);
        if (at === -1) return raw.slice(0, 160) + (raw.length > 160 ? "…" : "");
        var ratio = raw.length / Math.max(1, normText.length);
        var rawAt = Math.floor(at * ratio);
        var start = Math.max(0, rawAt - 40);
        while (start > 0 && raw.charAt(start) !== " " && raw.charAt(start) !== "،") start--;
        var end = Math.min(raw.length, start + 170);
        while (end < raw.length && raw.charAt(end) !== " " && raw.charAt(end) !== "،") end++;
        return (start > 0 ? "… " : "") + raw.substring(start, end).trim() + (end < raw.length ? " …" : "");
    }

    function renderSearchBook() {
        header(T("بحث في تفسير السعدي"),
            T("بحث فوري من أول حرف في تفسير السعدي كاملاً لجميع السور الـ ١١٤"),
            T("لوحة الحروف بالريموت أو كيبورد · OK على النتيجة تفتح الآية وتفسيرها مباشرة · رجوع للقائمة"));

        var bar = el("div", "mq__searchbar");
        bar.style.gridTemplateColumns = "1fr auto";

        sbField = el("input", "mq__input mq__focus");
        sbField.type = "text"; sbField.dir = "rtl"; sbField.maxLength = 180;
        sbField.placeholder = "ابحث في تفسير السعدي…";
        sbField.value = sbQuery; sbField.autocomplete = "off";
        sbField._qid = "sb-query";
        sbField._run = function () { sbField.focus(); };
        sbField.addEventListener("input", function () { sbSetQuery(sbField.value, true); });
        sbField.addEventListener("keydown", function (e) {
            if (e.keyCode === K.ENTER || e.keyCode === K.RETURN || e.keyCode === K.ESC || e.keyCode === K.DOWN) {
                e.preventDefault(); e.stopPropagation(); sbField.blur();
                focusID(sbMatches.length ? "sb-result-0" : "sb-letter-0");
            }
        });
        bar.appendChild(sbField);
        bar.appendChild(button(T("مسح الكل"), "sb-clear-query", function () { sbSetQuery(""); }));
        main.appendChild(bar);

        var split = el("div", "mq__search-layout");
        var keys = el("div", "mq__keyboard");
        var chars = "ابتثجحخدذرزسشصضطظعغفقكلمنهويءأإآؤئةى".split("");
        chars.forEach(function (c, i) {
            keys.appendChild(button(c, "sb-letter-" + i, function () { sbSetQuery(sbQuery + c); }, "mq__key"));
        });
        keys.appendChild(button(T("مسافة"), "sb-space", function () { sbSetQuery(sbQuery + " "); }, "mq__key mq__key--wide"));
        keys.appendChild(button(T("⌫ حذف"), "sb-erase", function () { sbSetQuery(sbQuery.slice(0, -1)); }, "mq__key mq__key--wide"));
        keys.appendChild(button(T("النتايج ◄"), "sb-go-results", function () { focusID(sbMatches.length ? "sb-result-0" : "sb-clear-query"); }, "mq__key mq__key--wide"));
        split.appendChild(keys);

        var results = el("div", "mq__results-wrap");
        sbResultCount = el("div", "mq__result-count");
        sbResultList = el("div", "mq__results");
        sbPager = el("div", "mq__pager");
        results.appendChild(sbResultCount);
        results.appendChild(sbResultList);
        results.appendChild(sbPager);
        split.appendChild(results);
        main.appendChild(split);

        if (!sbIndexTafsir) {
            sbResultCount.textContent = T("جارٍ تجهيز فهرس تفسير السعدي…");
            sbResultList.appendChild(el("div", "mq__empty", "جارٍ قراءة التفسير وبناء الفهرس…"));
            sbBuildIndex(function () {
                if (view !== "search-book") return;
                sbFind(sbQuery);
                sbPaintResults();
            }, function (pct) {
                if (view !== "search-book") return;
                if (sbResultCount) sbResultCount.textContent = "جارٍ تجهيز فهرس تفسير السعدي… " + dg(pct) + "٪";
            });
        } else {
            sbFind(sbQuery);
            sbPaintResults();
        }
    }

    function sbSetQuery(s, fromField) {
        if (!opened || view !== "search-book") return;
        var focus = fromField ? "sb-query" : currentID();
        sbQuery = String(s || "").slice(0, 180);
        if (sbField && !fromField) sbField.value = sbQuery;
        sbFind(sbQuery);
        sbPage = 0;
        sbPaintResults();
        refreshNav(focus);
    }

    function sbPaintResults() {
        if (!sbResultList) return;
        sbResultList.textContent = ""; if (sbPager) sbPager.textContent = "";
        var total = sbMatches.length, first = sbPage * LIMIT, end = Math.min(total, first + LIMIT);
        var q = norm(sbQuery);

        if (!sbIndexTafsir && sbLoading) {
            if (sbResultCount) sbResultCount.textContent = "جارٍ تجهيز فهرس البحث…";
            return;
        }
        if (sbResultCount) {
            sbResultCount.textContent = !q ? T("اكتب أول حرف عشان تبدأ البحث في تفسير السعدي") : dg(total) + " نتيجة" + (total ? " · عرض " + dg(first + 1) + "–" + dg(end) : "");
        }
        if (!q || !total) {
            var empty = el("div", "mq__empty", !q ? T("كل حرف بتكتبه بيحدّث النتايج فورًا في تفسير السعدي.\nتقدر تكتب من لوحة الحروف بالريموت.") : T("مفيش نتائج مطابقة.\nجرّب كلمة تانية أو راجع الحروف."));
            sbResultList.appendChild(empty);
            return;
        }
        for (var i = first; i < end; i++) {
            (function (rec, idxInPage) {
                var row = button("", "sb-result-" + idxInPage, function () {
                    returnTo = { view: "search-book", focus: "sb-result-" + idxInPage };
                    openAyahTafsir(rec.surah, rec.ayah, rec.title, "");
                }, "mq__result");
                var refText = "تفسير السعدي · سورة " + rec.title + " · الآية " + dg(rec.ayah);
                row.appendChild(el("div", "mq__result-ref", refText));
                row.appendChild(el("div", "mq__result-text mq__result-text--book", sbSnippet(rec.raw, rec.norm, q)));
                sbResultList.appendChild(row);
            })(sbMatches[i], i - first);
        }
        if (total > LIMIT && sbPager) {
            if (sbPage > 0) sbPager.appendChild(button(T("السابقة ►"), "sb-prev", function () { sbPage--; sbPaintResults(); refreshNav("sb-result-0"); }));
            sbPager.appendChild(el("span", "mq__pager-count", dg(sbPage + 1) + " / " + dg(Math.ceil(total / LIMIT))));
            if (end < total) sbPager.appendChild(button(T("◄ المزيد"), "sb-next", function () { sbPage++; sbPaintResults(); refreshNav("sb-result-0"); }));
        }
        sbResultList.scrollTop = 0;
    }

    /* ===== v8.5.0: Verified, compact Tafsir al-Saadi per surah and per ayah ===== */
    function loadSurahTafsir(surah, cb) {
        var s = parseInt(surah, 10);
        if (tfCache[s]) { cb(tfCache[s]); return; }
        getJSON("tafsir/" + s + ".json", function (d) {
            return d && d.ayahs;
        }).then(function (d) {
            tfCache[s] = d; cb(d);
        }, function () {
            cb(null);
        });
    }

    function tfSurahOfPage() {
        var pg = APL.khatma.state().page; return meta(data.pages[pg - 1]).surah;
    }
    function tfLook() {
        if (!tfBody) return;
        tfBody.style.fontFamily = global.getComputedStyle(document.body).fontFamily;
        tfBody.style.fontSize = (prefs.tfont || 34) + "px"; tfBody.style.lineHeight = String(LH[prefs.lh]); tfBody.style.overflowY = "auto"; applySafe();
        tfBody.classList.toggle("is-paper", !!prefs.paper);
        var hex = (prefs.paper ? COLORS_PAPER : COLORS_DARK)[prefs.color][1];
        tfBody.style.color = hex; tfBody.classList.toggle("has-color", !!hex);
    }
    function tfSize(d) {
        var at = SIZES.indexOf(prefs.tfont || 34); if (at < 0) at = 2;
        prefs.tfont = SIZES[Math.max(0, Math.min(SIZES.length - 1, at + d))]; savePrefs(); tfLook();
        if (APL.toast) APL.toast(APL.enx("حجم خط التفسير ") + dg(prefs.tfont), true);
    }
    function tfGo(d) {
        var n = tfSurah + d;
        if (n < 1 || n > 114) { if (APL.sound && APL.sound.edge) APL.sound.edge(); return; }
        lastFlip = Date.now();
        tfSurah = n; show("tafsir", "tafsir-body");
    }

    function renderTafsir() {
        buildSideTools("tafsir");
        if (!tfSurah) tfSurah = tfSurahOfPage();
        var name = (data && data.surahs && data.surahs[tfSurah - 1]) ? data.surahs[tfSurah - 1][0] : ("سورة " + dg(tfSurah));
        header("تفسير السعدي · سورة " + name, T("تيسير الكريم الرحمن في تفسير كلام المنان · نص مدقّق وموثّق"),
            T("▲▼ للتمرير · ◄ التالية · السابقة ► · ► الأدوات والقائمة · رجوع للخروج"));
        if (brandTitle) {
            brandTitle.textContent = "سورة " + name;
            brandSub.textContent = "تفسير السعدي · سورة " + dg(tfSurah);
            brandWird.textContent = "تيسير الكريم الرحمن";
        }
        tfBody = el("article", "mq__paper mq__focus"); tfBody._qid = "tafsir-body"; tfBody._run = function () { setSide(true); };
        tfBody.setAttribute("aria-label", "تفسير السعدي لسورة " + name + "؛ أعلى وأسفل للتمرير، ويمين للأدوات والقائمة");
        tfBody.appendChild(el("div", "mq__empty", T("جارٍ تحميل تفسير السعدي…")));
        main.appendChild(tfBody);
        var progress = el("div", "mq__progress"), fill = el("i", "");
        fill.style.width = ((tfSurah / 114) * 100).toFixed(2) + "%";
        progress.appendChild(fill);
        main.appendChild(progress);
        var stat = el("div", "mq__reading-stat");
        var statMain = el("span", "mq__stat-main", "تفسير السعدي · سورة " + name + " (" + dg(tfSurah) + " من ١١٤)");
        stat.appendChild(statMain);
        stat.appendChild(el("span", "mq__stat-hint", T("▲▼ للتمرير · ◄ التالية · السابقة ► · ► الأدوات")));
        main.appendChild(stat);
        tfLook();
        var token = generation, mine = tfBody, n = tfSurah;
        loadSurahTafsir(n, function (d) {
            if (!opened || generation !== token || tfBody !== mine || view !== "tafsir") return;
            mine.textContent = "";
            var heading = el("div", "mq__surah-title", "تفسير سورة " + name);
            mine.appendChild(heading);
            if (!d || !d.ayahs) {
                mine.appendChild(el("div", "mq__empty", "تفسير سورة " + name + " غير متوفر حالياً"));
                return;
            }
            var vCount = d.verses || (data && data.surahs && data.surahs[n - 1] ? data.surahs[n - 1][2] : 0) || Object.keys(d.ayahs).length;
            var prevText = "";
            for (var a = 1; a <= vCount; a++) {
                var aKey = String(a);
                var txt = d.ayahs[aKey];
                if (!txt || txt === prevText) continue;
                prevText = txt;

                var blockWrap = el("div", "mq__tafsir-block");
                var badge = el("div", "mq__surah-note", "الآية ﴿" + dg(a) + "﴾");
                blockWrap.appendChild(badge);

                txt.split("\n").forEach(function (para) {
                    var pt = para.trim();
                    if (pt) {
                        var pEl = el("p", "", pt);
                        pEl.style.margin = "0 0 .8em";
                        blockWrap.appendChild(pEl);
                    }
                });
                mine.appendChild(blockWrap);
            }
            mine.scrollTop = 0;
            tfLook();
        });
    }

    /* ===== v8.5.0: Direct Verse Tafsir modal overlay ===== */
    function openAyahTafsir(surah, ayah, surahName, ayahText) {
        if (tafModal && tafModal.parentNode) {
            if (tafModal._nav) APL.popNav(tafModal._nav);
            tafModal.parentNode.removeChild(tafModal);
            tafModal = null;
        }
        tfModalSurah = parseInt(surah, 10) || 1;
        tfModalAyah = parseInt(ayah, 10) || 1;
        var sName = surahName || (data && data.surahs && data.surahs[tfModalSurah - 1] ? data.surahs[tfModalSurah - 1][0] : ("سورة " + dg(tfModalSurah)));

        var modal = el("div", "mq__tafsir-modal is-open");
        modal.style.display = "flex";
        modal.style.zIndex = "999999";
        tafModal = modal;

        var head = el("div", "mq__tf-head");
        var titleWrap = el("div");
        titleWrap.appendChild(el("div", "mq__tf-title", T("تفسير السعدي (تيسير الكريم الرحمن)")));
        titleWrap.appendChild(el("div", "mq__tf-meta", "سورة " + sName + " · الآية " + dg(tfModalAyah)));
        head.appendChild(titleWrap);

        var actions = el("div", "mq__tf-btns");
        var btnPrev = button(T("السابقة ►"), "modal-prev", function () { stepAyahTafsir(-1); }, "mq__button mq__tafsir-btn");
        var btnNext = button(T("◄ التالية"), "modal-next", function () { stepAyahTafsir(1); }, "mq__button mq__tafsir-btn");
        var btnClose = button(T("✕ إغلاق"), "modal-close", closeAyahTafsir, "mq__button mq__button--red mq__tafsir-btn");
        actions.appendChild(btnPrev);
        actions.appendChild(btnNext);
        actions.appendChild(btnClose);
        head.appendChild(actions);
        modal.appendChild(head);

        var body = el("div", "mq__tf-body");

        var verseCard = el("div", "mq__tf-verse-card");
        var aText = ayahText;
        if (!aText && data && data.surahs) {
            var sInfo = data.surahs[tfModalSurah - 1];
            if (sInfo) {
                var vIdx = sInfo[1] + (tfModalAyah - 1);
                var vMeta = meta(vIdx);
                var split = splitOpening(vIdx, vMeta);
                aText = split.body;
            }
        }
        var verseTextEl = el("div", "mq__tf-verse-text", (aText ? aText + " ﴿" + dg(tfModalAyah) + "﴾" : "الآية " + dg(tfModalAyah)));
        verseCard.appendChild(verseTextEl);
        body.appendChild(verseCard);

        var contentBox = el("div", "mq__tf-content");
        contentBox.tabIndex = 0;
        contentBox.appendChild(el("div", "mq__empty", T("جارٍ تحميل تفسير السعدي…")));
        body.appendChild(contentBox);
        modal.appendChild(body);

        var foot = el("div", "mq__tf-foot");
        foot.appendChild(el("div", "mq__stat-hint", T("▲▼ للتمرير · ◄ التالية · السابقة ► · OK أو رجوع للإغلاق")));
        modal.appendChild(foot);

        modal.onclick = function (e) {
            if (e.target === modal) closeAyahTafsir();
        };

        document.body.appendChild(modal);

        loadSurahTafsir(tfModalSurah, function (d) {
            if (!tafModal || tafModal !== modal) return;
            contentBox.textContent = "";
            var text = (d && d.ayahs && d.ayahs[String(tfModalAyah)]) || "";
            if (!text) {
                contentBox.appendChild(el("div", "mq__empty", T("تفسير هذه الآية غير متوفر")));
                return;
            }
            var paras = text.split("\n");
            paras.forEach(function (p) {
                var pt = p.trim();
                if (pt) {
                    var paraEl = el("p", "mq__tafsir-para", pt);
                    contentBox.appendChild(paraEl);
                }
            });
            body.scrollTop = 0;
        });

        var modalNav = new APL.Nav({
            tiles: [btnClose, btnNext, btnPrev],
            onBack: closeAyahTafsir,
            onSelect: function (i, n) {
                if (n && n._run) n._run();
                else closeAyahTafsir();
            },
            onKey: function (code) {
                if (code === K.RETURN || code === K.ESC || code === K.BACKSPACE) {
                    closeAyahTafsir();
                    return true;
                }
                if (code === K.LEFT) {
                    stepAyahTafsir(1);
                    return true;
                }
                if (code === K.RIGHT) {
                    stepAyahTafsir(-1);
                    return true;
                }
                if (code === K.UP || code === K.DOWN) {
                    body.scrollTop += (code === K.DOWN ? 1 : -1) * 140;
                    return true;
                }
                return false;
            }
        });
        modal._nav = modalNav;
        APL.pushNav(modalNav);
        modalNav.focus(0);
    }

    function closeAyahTafsir() {
        if (tafModal) {
            if (tafModal._nav) APL.popNav(tafModal._nav);
            if (tafModal.parentNode) tafModal.parentNode.removeChild(tafModal);
            tafModal = null;
        }
        if (view === "read") {
            if (data && data.pages) {
                var neededPage = boundary(data.pages, activeVerseIdx) + 1;
                if (neededPage !== APL.khatma.state().page) {
                    APL.khatma.goTo(neededPage, true);
                    show("read");
                    return;
                }
            }
            updateActiveAyahHighlight();
            focusID("reading");
        }
    }

    function stepAyahTafsir(delta) {
        if (!data || !data.surahs) return;
        var sInfo = data.surahs[tfModalSurah - 1];
        var totalInSurah = sInfo ? sInfo[2] : 1;
        var nextAyah = tfModalAyah + delta;
        var nextSurah = tfModalSurah;

        if (nextAyah > totalInSurah) {
            if (tfModalSurah < 114) {
                nextSurah = tfModalSurah + 1;
                nextAyah = 1;
            } else {
                if (APL.sound && APL.sound.edge) APL.sound.edge();
                return;
            }
        } else if (nextAyah < 1) {
            if (tfModalSurah > 1) {
                nextSurah = tfModalSurah - 1;
                var prevSInfo = data.surahs[nextSurah - 1];
                nextAyah = prevSInfo ? prevSInfo[2] : 1;
            } else {
                if (APL.sound && APL.sound.edge) APL.sound.edge();
                return;
            }
        }

        if (APL.sound && APL.sound.tick) APL.sound.tick();

        var nSInfo = data.surahs[nextSurah - 1];
        if (nSInfo) {
            activeVerseIdx = nSInfo[1] + (nextAyah - 1);
        }

        openAyahTafsir(nextSurah, nextAyah);
    }

    function back() {
        if (tafModal) { closeAyahTafsir(); return; }
        if ((view === "read" || view === "tafsir") && side) { setSide(false); return; }
        if (returnTo) {
            var r = returnTo; returnTo = null; target = -1; show(r.view, r.focus); return;
        }
        close();
    }

    function onKey(code, e) {
        var c = nav.current(), id = c && c._qid;
        if (view === "source" && id === "source-text" && (code === K.UP || code === K.DOWN)) {
            if (code === K.UP && c.scrollTop <= 2) focusID("menu-source");
            else c.scrollTop += (code === K.DOWN ? 1 : -1) * Math.max(100, c.clientHeight * 0.62);
            return true;
        }
        if (view === "tafsir" && id === "tafsir-body") {
            if (code === K.RIGHT) { setSide(true); return true; }
            if (code === K.LEFT) { if (Date.now() - lastFlip > 350) tfGo(1); return true; }
            if (code === K.UP || code === K.DOWN) {
                var tb = nav.current();
                var overflow = tb && (tb.scrollHeight > tb.clientHeight + 3);
                if (!overflow) {
                    if (Date.now() - lastFlip > 350) tfGo(code === K.DOWN ? 1 : -1);
                    return true;
                }
                var atTop = tb.scrollTop <= 2;
                var atEnd = tb.scrollTop + tb.clientHeight >= tb.scrollHeight - 3;
                if (code === K.DOWN && atEnd) { if (Date.now() - lastFlip > 450) tfGo(1); }
                else if (code === K.UP && atTop) { if (Date.now() - lastFlip > 450) tfGo(-1); }
                else { tb.scrollTop += (code === K.DOWN ? 1 : -1) * Math.max(100, tb.clientHeight * 0.62); }
                return true;
            }
        }
        if (view === "search") {
            if (code === K.BACKSPACE && e.key === "Backspace") { setQuery(query.slice(0, -1)); return true; }
            if (e.key && e.key.length === 1 && /[\u0621-\u064a\u0671\u064b-\u065f ]/.test(e.key)) { setQuery(query + e.key); return true; }
            if (code === 46) { setQuery(""); return true; }
            if (id && id.indexOf("result-") === 0) {
                if (code === K.DOWN || code === K.UP) {
                    var at = matches.indexOf(parseInt(id.slice(7), 10)), next = at + (code === K.DOWN ? 1 : -1);
                    if (next >= resultPage * LIMIT && next < Math.min(matches.length, (resultPage + 1) * LIMIT)) focusID("result-" + matches[next]);
                    else if (code === K.DOWN && next < matches.length) focusID("results-next");
                    else if (code === K.UP && resultPage > 0) focusID("results-prev");
                    else if (code === K.UP) focusID("query");
                    return true;
                }
                if (code === K.RIGHT) { focusID("go-results"); return true; }
            }
        }
        if (view === "search-book") {
            if (code === K.BACKSPACE && e.key === "Backspace") { sbSetQuery(sbQuery.slice(0, -1)); return true; }
            if (e.key && e.key.length === 1 && /[\u0621-\u064a\u0671\u064b-\u065f ]/.test(e.key)) { sbSetQuery(sbQuery + e.key); return true; }
            if (code === 46) { sbSetQuery(""); return true; }
            if (id && id.indexOf("sb-result-") === 0) {
                if (code === K.DOWN || code === K.UP) {
                    var curIdx = parseInt(id.slice(10), 10);
                    var nextIdx = curIdx + (code === K.DOWN ? 1 : -1);
                    var pageCount = Math.min(LIMIT, sbMatches.length - sbPage * LIMIT);
                    if (nextIdx >= 0 && nextIdx < pageCount) focusID("sb-result-" + nextIdx);
                    else if (code === K.DOWN && (sbPage + 1) * LIMIT < sbMatches.length) focusID("sb-next");
                    else if (code === K.UP && sbPage > 0) focusID("sb-prev");
                    else if (code === K.UP) focusID("sb-query");
                    return true;
                }
                if (code === K.RIGHT) { focusID("sb-go-results"); return true; }
            }
        }
        /* Side panel key handling */
        if ((view === "read" || view === "tafsir") && side && id) {
            var rows = [], r, c, row = -1, col = 0, nr;
            MENU.forEach(function (mm) { rows.push(["menu-" + mm[0]]); });
            var curTools = view === "read" ? TOOL_ROWS : TF_SAADI_ROWS;
            curTools.forEach(function (tr) { rows.push(tr); });
            for (r = 0; r < rows.length; r++) { c = rows[r].indexOf(id); if (c >= 0) { row = r; col = c; break; } }
            if (row < 0) { setSide(false); return true; }
            if (code === K.LEFT) { if (rows[row].length === 2 && col === 0) step(rows[row][1]); else setSide(false); return true; }
            if (code === K.RIGHT) { if (col === 1) step(rows[row][0]); return true; }
            if (code === K.UP || code === K.DOWN) {
                nr = row + (code === K.DOWN ? 1 : -1);
                if (nr >= 0 && nr < rows.length) step(rows[nr][Math.min(col, rows[nr].length - 1)]);
                return true;
            }
        }
        if (view === "read" && id === "reading") {
            if (code === K.ENTER) {
                if (readBody && readBody._run) readBody._run();
                return true;
            }
            if (code === K.LEFT) { changePage(1); return true; }
            if (code === K.RIGHT) { setSide(true); return true; }
            if (code === K.UP || code === K.DOWN) {
                var p = APL.khatma.state().page;
                var pFrom = data.pages[p - 1], pEnd = data.pages[p];
                if (code === K.DOWN) {
                    if (activeVerseIdx + 1 < pEnd) {
                        activeVerseIdx++;
                        updateActiveAyahHighlight();
                    } else {
                        if (p < 604) {
                            if (Date.now() - lastFlip > 350) {
                                lastFlip = Date.now();
                                changePage(1);
                            }
                        } else if (APL.sound && APL.sound.edge) {
                            APL.sound.edge();
                        }
                    }
                } else if (code === K.UP) {
                    if (activeVerseIdx - 1 >= pFrom) {
                        activeVerseIdx--;
                        updateActiveAyahHighlight();
                    } else {
                        if (p > 1) {
                            if (Date.now() - lastFlip > 350) {
                                lastFlip = Date.now();
                                changePage(-1);
                                setTimeout(function () {
                                    var prevP = APL.khatma.state().page;
                                    activeVerseIdx = data.pages[prevP] - 1;
                                    updateActiveAyahHighlight();
                                }, 50);
                            }
                        } else if (APL.sound && APL.sound.edge) {
                            APL.sound.edge();
                        }
                    }
                }
                return true;
            }
        }
        if (id && id.indexOf("menu-") === 0 && code === K.LEFT) {
            if (lastContent && focusID(lastContent)) return true;
            focusID(view === "read" ? "reading" : view === "search" ? "letter-0" : view === "search-book" ? "sb-letter-0" : view === "source" ? "source-text" : view === "tafsir" ? "tafsir-body" : "entry-0");
            return true;
        }
        return false;
    }
    function open(page, mode) {
        try { if (APL.settings && APL.settings.close) APL.settings.close(); } catch (e) {}
        if (page) APL.khatma.goTo(page, true);
        if (opened) { if (data) { target = -1; returnTo = null; show(mode || "read"); } return; }
        opened = true; generation++; var token = generation;
        savedScroll = !page && prefs.page === APL.khatma.state().page ? Number(prefs.scroll) || 0 : 0;
        build(); APL.pushNav(nav); root.classList.add("is-open");
        header(T("المصحف الشريف"), T("بنفتح النص المحلي…"), T("النص موجود جوّه الحزمة؛ مش محتاج إنترنت"));
        main.appendChild(el("div", "mq__empty", T("جارٍ فتح مصحف حفص…"))); refreshNav("menu-read");
        load().then(function () {
            if (!opened || generation !== token) return;
            target = -1; returnTo = null;
            if (!page && (!mode || mode === "read") && prefs.ayah >= 0 && prefs.page === APL.khatma.state().page &&
                prefs.ayah >= data.pages[prefs.page - 1] && prefs.ayah < data.pages[prefs.page]) target = prefs.ayah;
            show(mode || "read");
        }, function () {
            if (!opened || generation !== token) return;
            failScreen(mode);
        });
    }
    function failScreen(mode) {
        if (!opened || !main) return;
        clearMain(); header("النص المحلي مش متاح", "ملفات data/quran ناقصة أو ما اتقرتش", "جرّب تفتح تاني؛ مفيش نص بديل أو قرآن من الإنترنت");
        main.appendChild(button(T("إعادة المحاولة"), "retry", function () { var p = APL.khatma.state().page; close(); open(p, mode); })); refreshNav("retry");
    }
    function close() {
        if (!opened) return;
        rememberScroll(); opened = false; generation++; returnTo = null; target = -1;
        if (field) field.blur();
        if (tafModal && tafModal.parentNode) {
            if (tafModal._nav) APL.popNav(tafModal._nav);
            tafModal.parentNode.removeChild(tafModal);
        }
        tafModal = null;
        if (nav) APL.popNav(nav);
        if (root && root.parentNode) root.parentNode.removeChild(root);
        var list = reqs.slice(); reqs = []; juzReq = {}; juzHave = {}; allPending = null;
        for (var i = 0; i < list.length; i++) { try { list[i].abort(); } catch (e) {} }
        tfBody = null; tfPick = false; tfCache = {}; root = main = nav = title = sub = footer = readBody = field = resultList = resultCount = pager = brandTitle = brandSub = brandWird = toolsEl = null; side = false; fitSize = 0;
        data = pending = index = null; matches = []; previousQuery = ""; resultPage = 0;
        sbIndexTafsir = null; sbMatches = [];
        sbQuery = ""; sbPage = 0; sbField = sbResultList = sbResultCount = sbPager = null;
    }
    APL.quran = {
        open: open, close: close,
        tafsir: function (n) { if (n >= 1 && n <= 114) tfSurah = n; open(null, "tafsir"); },
        ayahTafsir: openAyahTafsir,
        searchBook: function (s) { sbQuery = String(s || "").slice(0, 180); open(null, "search-book"); },
        surahs: function () { open(null, "surahs"); }, juz: function () { open(null, "juz"); },
        search: function (s) { query = String(s || "").slice(0, 180); open(null, "search"); },
        diagnostics: function () { return { opened: opened, loaded: !!data, view: view, page: APL.khatma.state().page,
            verses: data ? data.have : 0, juzLoaded: Object.keys(juzHave).length, searchLoaded: !!(data && data.search), indexed: !!index, results: matches.length, resultPage: resultPage,
            matchedIndices: matches.slice(), query: query, source: "https://tanzil.net/", riwaya: "حفص عن عاصم" }; }
    };
})(window);
