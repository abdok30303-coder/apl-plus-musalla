/* ============================================================
   prayer-page.js — the "Prayer and Quran" page.

   One full-screen page, opened from its own tile on the Home
   Screen (the tile is added by launcher.js):

     - the next prayer and the time left, with the Hijri date;
     - today's six times, the next one lit, the past ones dimmed;
     - the Islamic occasions (v1.2.50): Ramadan, the last ten nights, Eid al-Fitr and Eid al-Adha,
       with the days left; OK on one opens the list of all the occasions;
     - the radio: play / stop, background audio, pause during the alert;
     - the alerts: on / off, and the Isha one to try;
     - the city, in a list of Egyptian places;
     - the black screen.

   The black screen is a black LAYER inside the launcher, not the
   television's own backlight going off: pressing any button brings
   the picture back. It is made for listening to the radio at night.
   ============================================================ */
(function (global) {
    "use strict";

    var APL = global.APL, sys = APL && APL.sys;
    if (!APL || !sys) return;

    var root, titleEl, subEl, bodyEl, hintEl, nav, tiles = [];
    var mode = "main", openFlag = false, blackout = null, blackoutArmed = false, blackoutHint = null, tickTimer = null;
    var focusIndex = 0, mainReturn = 0;      // v1.2.108: the tile to come back to from the City and Auto Off lists
    var wxDay = 0, wxReturn = 0;      // v1.2.99: the day opened in the hour-by-hour page, and the row to come back to

    function el(tag, cls, html) {
        var e = document.createElement(tag);
        if (cls) e.className = cls;
        if (html !== undefined) e.innerHTML = html;
        return e;
    }
    function p() { return APL.prayer; }
    function dg(x) { return APL.digits ? APL.digits(x) : String(x); }     // v1.2.97: Settings > Digits

    /* ---------- the black layer ---------- */
    function ensureBlackout() {
        if (blackout) return blackout;
        blackout = el("div", "blackout");
        blackoutHint = el("div", "blackout__hint", APL.t("Any button brings the picture back"));
        blackout.appendChild(blackoutHint);
        blackout.addEventListener("click", function () { leaveBlackout(); });
        document.body.appendChild(blackout);
        // Any key of the remote: the black layer goes, the key is used up
        APL.addHotkey(function () {
            if (!blackoutArmed) return false;
            leaveBlackout();
            return true;
        });
        return blackout;
    }
    function enterBlackout() {
        ensureBlackout();
        blackoutArmed = true;
        blackout.classList.add("is-on");
        blackout.classList.remove("is-armed");
        document.body.classList.add("has-blackout");
        // The hint fades out after a few seconds: the screen is black, not decorated
        setTimeout(function () { if (blackoutArmed) blackout.classList.add("is-armed"); }, 4000);
        if (APL.toast) APL.toast(APL.t("Black Screen") + " — " + APL.t("Any button brings the picture back"), true);
    }
    function leaveBlackout() {
        if (!blackoutArmed) return;
        blackoutArmed = false;
        if (blackout) { blackout.classList.remove("is-on", "is-armed"); }
        document.body.classList.remove("has-blackout");
        if (nav && openFlag) APL.pushNav(nav);      // the page keeps the keys
    }

    /* ---------- rows ---------- */
    function timeText(hhmm) { return p().hhmm(hhmm); }
    function nextCard() {
        var n = p().next();
        if (!n) {
            return el("div", "praynext",
                '<div><div class="praynext__label">' + APL.t("Prayer Times") + "</div>" +
                '<div class="praynext__name">' + (p().state().error ? APL.t("Times unavailable: connect the screen to the internet once.")
                    : APL.t("Loading…")) + "</div></div>");
        }
        var hijri = p().hijri();
        var card = el("div", "praynext",
            '<div><div class="praynext__label">' + APL.t("Next Prayer") + "</div>" +
            '<div class="praynext__name">' + n.name + '</div>' +
            '<div class="praynext__date">' + hijri + "</div></div>" +
            '<div class="praynext__time num">' + timeText(n.time) + "</div>" +
            '<div class="praynext__left">' + p().left(n.ms) + "</div>");
        return card;
    }

    function timesStrip() {
        var strip = el("div", "ptimes");
        var list = p().list();
        var nx = p().next();
        list.forEach(function (t) {
            var cls = "ptime" + (t.past ? " is-past" : "") + (nx && nx.key === t.key && nx.today ? " is-next" : "");
            var card = el("div", cls,
                '<span class="ptime__name">' + t.name + '</span><span class="ptime__time num">' + timeText(t.time) + "</span>");
            strip.appendChild(card);
        });
        return strip;
    }

    function card(label, value, note, onClick, badge) {
        var c = el("div", "aplx-card",
            '<div class="aplx-card__label">' + label + "</div>" +
            '<div class="aplx-card__value">' + value + (badge ? ' <span class="aplx-badge ' + badge.cls + '">' + badge.text + "</span>" : "") + "</div>" +
            (note ? '<div class="aplx-card__note">' + note + "</div>" : ""));
        c.addEventListener("click", function () { if (onClick) onClick(); });
        tiles.push({ el: c, run: onClick || function () {} });
        return c;
    }

    function radioState() {
        var s = APL.radio.state();
        var text = s.starting ? APL.t("Preparing…") : (s.playing ? (APL.lang === "ar" ? "يعمل في الخلفية · مباشر" : "Playing in background · LIVE") : APL.t("Stopped"));
        var note = s.playing ? (s.mode === "background" || s.solid === "background" ? (APL.lang === "ar" ? "إذاعة القرآن الكريم من القاهرة تعمل في الخلفية بدون انقطاع عبر التطبيقات والمداخل" : "Playing continuously in background across apps & inputs") : APL.t("Playing in the launcher only")) :
            (s.why || (APL.lang === "ar" ? "إذاعة القرآن الكريم من القاهرة — تشغيل مستمر في الخلفية" : "Cairo Quran Radio — Continuous background playback"));
        return { text: text, note: note, playing: s.playing, starting: s.starting };
    }

    /* ---------- the Islamic occasions (v1.2.50, js/islamic.js) ---------- */
    function openOccasions() {
        mainReturn = focusIndex;
        mode = "events";
        focusIndex = 0;
        render();
    }

    /* ---------- Morning & Evening Adhkar (v1.2.121, js/adhkar.js) ---------- */
    var adhkarTab = "";
    var adhkarCounts = { date: "", morning: {}, evening: {} };

    function adhkarKey() {
        var d = new Date();
        return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
    }

    function getAdhkarRemaining(tab, idx, target) {
        var k = adhkarKey();
        if (adhkarCounts.date !== k) {
            adhkarCounts = { date: k, morning: {}, evening: {} };
        }
        var m = adhkarCounts[tab];
        if (m[idx] === undefined) {
            m[idx] = target;
        }
        return m[idx];
    }

    function decrementAdhkar(tab, idx, target) {
        var rem = getAdhkarRemaining(tab, idx, target);
        if (rem > 0) {
            rem--;
        } else {
            rem = target;
        }
        adhkarCounts[tab][idx] = rem;
        return rem;
    }

    function resetAdhkar(tab) {
        var k = adhkarKey();
        adhkarCounts.date = k;
        adhkarCounts[tab] = {};
    }

    function openAdhkar(tab) {
        if (!root) buildDom();
        mainReturn = focusIndex;
        if (tab === "morning" || tab === "evening") {
            adhkarTab = tab;
        } else if (!adhkarTab) {
            var h = new Date().getHours();
            adhkarTab = (h >= 4 && h < 15) ? "morning" : "evening";
        }
        mode = "adhkar";
        focusIndex = 0;
        render();
    }

    function buildAdhkar() {
        bodyEl.innerHTML = "";
        tiles = [];
        if (!adhkarTab) {
            var h = new Date().getHours();
            adhkarTab = (h >= 4 && h < 15) ? "morning" : "evening";
        }
        var listData = (APL.adhkar && APL.adhkar[adhkarTab]) || [];
        var total = listData.length;
        var done = 0;
        for (var i = 0; i < total; i++) {
            if (getAdhkarRemaining(adhkarTab, i, listData[i].count) === 0) done++;
        }

        titleEl.textContent = APL.t("Morning & Evening Adhkar");
        subEl.textContent = (adhkarTab === "morning" ? APL.t("Morning Adhkar") : APL.t("Evening Adhkar")) +
            " · " + dg(done) + " / " + dg(total) + " " + APL.t("Completed");

        var tabs = el("div", "pw-btns adhkar-tabs");
        var morningBtn = pwBtn(APL.t("Morning Adhkar") + " (" + dg(21) + ")", "sun", adhkarTab === "morning", false, function () {
            if (adhkarTab !== "morning") {
                adhkarTab = "morning";
                focusIndex = 0;
                render();
            }
        });
        var eveningBtn = pwBtn(APL.t("Evening Adhkar") + " (" + dg(20) + ")", "moon", adhkarTab === "evening", false, function () {
            if (adhkarTab !== "evening") {
                adhkarTab = "evening";
                focusIndex = 1;
                render();
            }
        });
        var resetBtn = pwBtn(APL.t("Reset Counter"), "refresh", false, false, function () {
            resetAdhkar(adhkarTab);
            if (APL.toast) APL.toast(APL.t("Counter reset"), true);
            render();
        });
        tabs.appendChild(morningBtn);
        tabs.appendChild(eveningBtn);
        tabs.appendChild(resetBtn);
        bodyEl.appendChild(tabs);

        var list = el("div", "aplx-list adhkar-list");
        listData.forEach(function (item, idx) {
            var target = item.count || 1;
            var rem = getAdhkarRemaining(adhkarTab, idx, target);
            var isDone = rem === 0;

            var chipHtml = "";
            if (isDone) {
                chipHtml = '<span class="adhkar__chip-done">✓</span>';
            } else {
                chipHtml = '<span class="adhkar__chip-num">' + dg(rem) + '</span>' +
                    (target > 1 ? '<span class="adhkar__chip-target">/' + dg(target) + '</span>' : '');
            }

            var metaHtml = "";
            if (target > 1) {
                metaHtml += '<span class="adhkar__meta-rep">' + APL.t("Target:") + " " + dg(target) + " " + (target <= 10 ? APL.t("times") : APL.t("time")) + '</span>';
            }
            if (isDone) {
                metaHtml += '<span class="aplx-badge aplx-badge--on">' + APL.t("Completed") + '</span>';
            }

            var row = el("div", "aplx-row adhkar-row" + (isDone ? " is-done" : ""),
                '<div class="adhkar__chip' + (isDone ? " is-done" : "") + '">' + chipHtml + '</div>' +
                '<div class="aplx-row__main adhkar__main">' +
                    '<div class="adhkar__text">' + item.text + '</div>' +
                    (metaHtml ? '<div class="adhkar__meta">' + metaHtml + '</div>' : '') +
                '</div>'
            );

            (function (index, tgt, rowEl) {
                var run = function () {
                    var before = getAdhkarRemaining(adhkarTab, index, tgt);
                    var after = decrementAdhkar(adhkarTab, index, tgt);
                    if (APL.sound) APL.sound.tick();
                    /* v8.1.0: when this dhikr reaches its count, focus moves to the next one still open */
                    if (before === 1 && after === 0) {
                        var nxt = -1, n = listData.length, j;
                        for (j = index + 1; j < n && nxt < 0; j++) {
                            if (getAdhkarRemaining(adhkarTab, j, listData[j].count || 1) > 0) nxt = j;
                        }
                        for (j = 0; j < index && nxt < 0; j++) {
                            if (getAdhkarRemaining(adhkarTab, j, listData[j].count || 1) > 0) nxt = j;
                        }
                        if (nxt >= 0) focusIndex = 3 + nxt;
                        else if (APL.toast) APL.toast(APL.t("Completed"), true);
                    }
                    render();
                };
                rowEl.addEventListener("click", run);
                tiles.push({ el: rowEl, run: run });
            })(idx, target, row);

            list.appendChild(row);
        });

        bodyEl.appendChild(list);
        hintEl.textContent = APL.t("OK: count dhikr") + " · " + APL.t("◄ / ► switch Morning / Evening") + " · " + APL.t("Back to return");
    }

    /* ---------- Hekam & Mawaez - Kalem Tayeb (v8.5.0) ---------- */
    var hekamSectionsData = null, hekamSecCache = {}, hekamCurSec = null, hekamPage = 0;
    var hekamReturn = 0, hekamRandomList = null, hekamRandomCur = null;
    /* v8.6.5: at most 3 opened sections stay in memory (a section file is up to 1.8 MB of JSON); the oldest one is dropped */
    var hekamSecOrder = [];
    function hekamCacheSet(id, d) {
        var i = hekamSecOrder.indexOf(id);
        if (i !== -1) hekamSecOrder.splice(i, 1);
        hekamSecOrder.push(id);
        hekamSecCache[id] = d;
        while (hekamSecOrder.length > 3) { delete hekamSecCache[hekamSecOrder.shift()]; }
    }
    function hekamCacheClear() { hekamSecCache = {}; hekamSecOrder = []; hekamCurSec = null; hekamRandomList = null; hekamRandomCur = null; hekamSectionsData = null; }

    function loadHekamJSON(path, cb) {
        if (APL.fetchJSON) {
            APL.fetchJSON(path, 10000).then(function (d) { cb(null, d); }, function () {
                var r = new XMLHttpRequest();
                r.open("GET", path, true);
                r.onload = function () {
                    try { cb(null, JSON.parse(r.responseText)); } catch (err) { cb(err); }
                };
                r.onerror = function () { cb(new Error("XHR failed")); };
                r.send();
            });
        } else {
            var r = new XMLHttpRequest();
            r.open("GET", path, true);
            r.onload = function () {
                try { cb(null, JSON.parse(r.responseText)); } catch (err) { cb(err); }
            };
            r.onerror = function () { cb(new Error("XHR failed")); };
            r.send();
        }
    }

    function openHekam() {
        if (!root) buildDom();
        mainReturn = focusIndex;
        mode = "hekam";
        focusIndex = 0;
        render();
    }

    function buildHekamSections() {
        bodyEl.innerHTML = "";
        tiles = [];
        titleEl.textContent = "حكم ومواعظ الكلم الطيب";
        subEl.textContent = "موسوعة الحكم والمواعظ والفوائد والأقوال المأثورة · أوفلاين بالكامل (٣٥ ألف مادة عبر ٥٣ قسماً)";

        var topBar = el("div", "pw-btns");
        var rndBtn = pwBtn("🎲 حكمة اليوم العشوائية", "sparkle", false, false, function () {
            mode = "hekam-random";
            focusIndex = 0;
            render();
        });
        topBar.appendChild(rndBtn);
        bodyEl.appendChild(topBar);

        if (!hekamSectionsData) {
            var loadingEl = el("div", "aplx-row", '<div class="aplx-row__main"><span class="aplx-row__label">جارٍ قراءة قائمة الأقسام من الحزمة…</span></div>');
            bodyEl.appendChild(loadingEl);
            loadHekamJSON("data/hekam/sections.json", function (e, d) {
                if (!e && d && d.length) {
                    hekamSectionsData = d;
                    if (mode === "hekam") render();
                }
            });
            hintEl.textContent = "رجوع للقائمة الرئيسية";
            return;
        }

        var list = el("div", "aplx-list");
        hekamSectionsData.forEach(function (sec, idx) {
            var row = el("div", "aplx-row",
                '<div class="aplx-row__main">' +
                    '<span class="aplx-row__label">' + sec.name + '</span>' +
                    '<span class="aplx-row__sub num">' + dg(sec.count) + " مادة وفائدة · " + dg(sec.subs) + " باب" + '</span>' +
                '</div>' +
                '<span class="aplx-badge aplx-badge--on num">‹</span>');
            var run = function () {
                hekamCurSec = sec;
                hekamPage = 0;
                hekamReturn = idx + 1; // offset by topBar rndBtn
                mode = "hekam-items";
                focusIndex = 0;
                render();
            };
            row.addEventListener("click", run);
            tiles.push({ el: row, run: run });
            list.appendChild(row);
        });

        bodyEl.appendChild(list);
        hintEl.textContent = "OK لفتح القسم وقراءة الحكم · 🎲 حكمة عشوائية · رجوع للصلاة والقرآن";
    }

    function buildHekamItems() {
        bodyEl.innerHTML = "";
        tiles = [];
        if (!hekamCurSec) { mode = "hekam"; render(); return; }

        var sid = hekamCurSec.id;
        var cached = hekamSecCache[sid];

        titleEl.textContent = hekamCurSec.name;

        var navRow = el("div", "pw-btns");
        var backBtn = pwBtn("◄ رجوع للأقسام", "back", false, false, function () {
            mode = "hekam";
            focusIndex = hekamReturn;
            render();
        });
        navRow.appendChild(backBtn);

        if (!cached) {
            subEl.textContent = "جارٍ تحميل المواد والفوائد أوفلاين…";
            bodyEl.appendChild(navRow);
            var loadingEl = el("div", "aplx-row", '<div class="aplx-row__main"><span class="aplx-row__label">جارٍ قراءة الملف data/hekam/' + hekamCurSec.file + '…</span></div>');
            bodyEl.appendChild(loadingEl);
            loadHekamJSON("data/hekam/" + hekamCurSec.file, function (e, d) {
                if (!e && d && d.items) {
                    hekamCacheSet(sid, d);
                    if (mode === "hekam-items") render();
                }
            });
            hintEl.textContent = "رجوع لقائمة الأقسام";
            return;
        }

        var items = cached.items || [];
        var total = items.length;
        var pageSize = 20;
        var totalPages = Math.ceil(total / pageSize) || 1;
        var start = hekamPage * pageSize;
        var pageItems = items.slice(start, start + pageSize);

        subEl.textContent = hekamCurSec.name + " · " + dg(total) + " مادة · صفحة " + dg(hekamPage + 1) + " من " + dg(totalPages);

        if (hekamPage > 0) {
            var prevBtn = pwBtn("السابقة ►", "prev", false, false, function () {
                hekamPage--;
                focusIndex = 1;
                render();
            });
            navRow.appendChild(prevBtn);
        }
        if (start + pageSize < total) {
            var nextBtn = pwBtn("◄ المزيد (" + dg(total - start - pageSize) + ")", "next", false, false, function () {
                hekamPage++;
                focusIndex = 1;
                render();
            });
            navRow.appendChild(nextBtn);
        }
        bodyEl.appendChild(navRow);

        var list = el("div", "aplx-list");
        pageItems.forEach(function (it) {
            var badgeText = it.ref || it.title || hekamCurSec.name;
            var row = el("div", "aplx-row hekam-row",
                '<div class="hekam__head">' +
                    '<span class="hekam__badge">' + badgeText + '</span>' +
                '</div>' +
                '<div class="hekam__text">' + it.text + '</div>');
            var run = function () {
                if (APL.toast) APL.toast(badgeText, true);
            };
            row.addEventListener("click", run);
            tiles.push({ el: row, run: run });
            list.appendChild(row);
        });

        bodyEl.appendChild(list);
        hintEl.textContent = "▲▼ للتمرير · ◄ المزيد للصفحة التالية · رجوع للأقسام";
    }

    function buildHekamRandom() {
        bodyEl.innerHTML = "";
        tiles = [];
        titleEl.textContent = "حكمة اليوم · الكلم الطيب";
        subEl.textContent = "مقتطفات مختارة من أقوال أئمة السلف وحكم العلماء والمواعظ";

        var navRow = el("div", "pw-btns");
        var rndBtn = pwBtn("🔄 حكمة أخرى", "refresh", false, false, function () {
            if (hekamRandomList && hekamRandomList.length) {
                var rIdx = Math.floor(Math.random() * hekamRandomList.length);
                hekamRandomCur = hekamRandomList[rIdx];
                focusIndex = 0;
                render();
                if (APL.sound) APL.sound.tick();
            }
        });
        navRow.appendChild(rndBtn);
        var secBtn = pwBtn("📚 تصفح كل الأقسام", "book", false, false, function () {
            mode = "hekam";
            focusIndex = 0;
            render();
        });
        navRow.appendChild(secBtn);
        bodyEl.appendChild(navRow);

        if (!hekamRandomList) {
            var loadingEl = el("div", "aplx-row", '<div class="aplx-row__main"><span class="aplx-row__label">جارٍ تحميل المقتطفات…</span></div>');
            bodyEl.appendChild(loadingEl);
            loadHekamJSON("data/hekam/excerpts.json", function (e, d) {
                if (!e && d && d.length) {
                    hekamRandomList = d;
                    var rIdx = Math.floor(Math.random() * d.length);
                    hekamRandomCur = d[rIdx];
                    if (mode === "hekam-random") render();
                }
            });
            hintEl.textContent = "رجوع للصلاة والقرآن";
            return;
        }

        var it = hekamRandomCur || hekamRandomList[0];
        var card = el("div", "hekam-featured-card",
            '<div class="hekam-featured__text">' + it.text + '</div>' +
            '<div class="hekam-featured__ref">' +
                '<span>' + (it.ref || "الكلم الطيب") + '</span>' +
                '<span style="opacity:0.75; font-size:16px;">' + (it.sec || "") + '</span>' +
            '</div>');
        bodyEl.appendChild(card);
        hintEl.textContent = "OK لتغيير الحكمة · 📚 لتصفح الأقسام الـ ٥٣ · رجوع للخروج";
    }

    /* what the big figure of a card says: the days left, or a word */
    function occasionValue(st) {
        if (st.kind === "soon") return { num: st.days, unit: APL.t("days") };
        if (st.kind === "today") return { word: APL.t("Today"), now: true };
        if (st.kind === "tonight") return { word: APL.t("Tonight"), now: true };
        return { num: st.left, unit: APL.t("days left"), now: true };           // under way: days to its end
    }
    function occasionNote(st) {
        if (st.kind === "now" && st.dayNo) {
            if (st.ev.key === "ramadan" || st.ev.key === "last10") return APL.t("Day {d} of Ramadan", { d: dg(st.dayNo) });
            if (st.ev.key === "first10") return APL.t("Day {d} of Dhul-Hijjah", { d: dg(st.dayNo) });
        }
        return (st.exact ? "" : "≈ ") + dg(st.dateText);
    }
    function occasionCard(st) {
        var v = occasionValue(st);
        var c = el("div", "aplx-card evt" + (v.now ? " is-now" : ""),
            '<div class="evt__name">' + st.name + "</div>" +
            '<div class="evt__val">' +
                (v.num !== undefined ? '<span class="evt__num num">' + dg(v.num) + "</span>" : '<span class="evt__word">' + v.word + "</span>") +
                (v.unit ? '<span class="evt__unit">' + v.unit + "</span>" : "") +
            "</div>" +
            '<div class="evt__date">' + occasionNote(st) + "</div>" +
            (st.fadl && APL.lang === "ar" ? '<div class="evt__fadl">' + st.fadl + "</div>" : ""));
        c.addEventListener("click", openOccasions);
        tiles.push({ el: c, run: openOccasions });
        return c;
    }
    /* Ramadan, the last ten nights, Eid al-Fitr and Eid al-Adha, the nearest first. Four cards, so that they
       sit exactly above the four columns of buttons: the remote's arrows (js/navigation.js looks at the
       geometry) then go left, right, up and down without jumping from one row to another. */
    function occasionsStrip() {
        var row = el("div", "aplx-cards evt-strip");
        var o = null;
        try { o = APL.islamic ? APL.islamic.occasions() : null; } catch (e) { o = null; }
        if (!o) return row;
        /* v7.0.9: the four occasions that come first from today, nearest first (before: always the same four, Ramadan,
           the last ten nights and the two Eids, wherever they were in the year). The Monday/Thursday fast and the
           White Days repeat all the time, so they stay in the full list only. */
        o.all.filter(function (st) { return st.ev && st.ev.key !== "white" && st.ev.key !== "monthu"; })
            .slice(0, 4).forEach(function (st) { row.appendChild(occasionCard(st)); });
        return row;
    }

    /* v1.2.99: OK on an occasion puts it in Tasks (a reminder on its day: 8:00, or 18:00 for a night that starts
       at sunset); OK again takes it out. Only for an occasion that is still ahead. */
    function reminderDate(st) {
        try { return APL.islamic.isoOf(st.start); } catch (e) { return ""; }
    }
    function findReminder(st) {
        if (!APL.tasks) return null;
        var iso = reminderDate(st), all = APL.tasks.list();
        for (var i = 0; i < all.length; i++) {
            if (all[i].repeat === "once" && all[i].date === iso && all[i].title === String(st.name).slice(0, 80)) return all[i];
        }
        return null;
    }
    function markReminder(row, on) {
        var b = row.querySelector(".occ__bell");
        if (on && !b) {
            b = el("span", "aplx-badge occ__bell", "🔔 " + APL.t("Reminder"));
            row.appendChild(b);
        } else if (!on && b) {
            b.parentNode.removeChild(b);
        }
    }
    function toggleReminder(st, row) {
        if (!APL.tasks) return;
        if (st.kind !== "soon") { APL.toast(APL.t("This occasion is already under way"), true); return; }
        var have = findReminder(st);
        if (have) {
            APL.tasks.remove(have.id);
            markReminder(row, false);
            APL.toast(APL.t("Reminder removed"), true);
            return;
        }
        var iso = reminderDate(st);
        if (!iso) return;
        APL.tasks.add({ title: st.name, date: iso, time: st.ev.evening ? "18:00" : "08:00", repeat: "once" });
        markReminder(row, true);
        APL.toast(APL.t("Reminder added: {name}", { name: st.name }), true);
    }

    function buildEvents() {
        bodyEl.innerHTML = "";
        tiles = [];
        titleEl.textContent = APL.t("Islamic Occasions");
        subEl.textContent = APL.t("Dates follow the Hijri calendar and are confirmed by the moon sighting. ≈ marks an estimate.");
        var o = null;
        try { o = APL.islamic ? APL.islamic.occasions() : null; } catch (e) { o = null; }
        var list = el("div", "aplx-list evt-list");
        (o ? o.all : []).forEach(function (st) {
            var chip, cls = "", extra = "";
            if (st.kind === "soon") {
                chip = '<span class="occ__num num">' + dg(st.days) + '</span><span class="occ__unit">' + APL.t("days") + "</span>";
                if (st.days <= 7) cls = " is-soon";
            } else {
                cls = " is-now";
                chip = '<span class="occ__word">' + (st.kind === "now" ? APL.t("Under way") : st.kind === "tonight" ? APL.t("Tonight") : APL.t("Today")) + "</span>";
                if (st.kind === "now") extra = '<span class="aplx-badge aplx-badge--on">' + dg(st.left) + " " + APL.t("days left") + "</span>";
            }
            var r = el("div", "aplx-row occ" + cls,
                '<div class="occ__chip">' + chip + "</div>" +
                '<div class="aplx-row__main"><span class="aplx-row__label">' + st.name + "</span>" +
                '<span class="aplx-row__sub">' + dg(st.hijri) + "</span>" +
                '<span class="aplx-row__sub">' + (st.exact ? "" : "≈ ") + dg(st.dateText) + "</span>" +
                (st.fadlFull && APL.lang === "ar" ? '<span class="aplx-row__sub occ__fadl">' + st.fadlFull + "</span>" : "") + "</div>" + extra);
            (function (st, row) {
                var go = function () { toggleReminder(st, row); };
                row.addEventListener("click", go);
                tiles.push({ el: row, run: go });
                if (findReminder(st)) markReminder(row, true);
            })(st, r);
            list.appendChild(r);
        });
        bodyEl.appendChild(list);
        hintEl.textContent = APL.t("OK on an occasion: add / remove a reminder") + " · " + APL.t("Back to return");
    }

    /* v1.2.96: the pills under the prayer widget: adjust the times, summer time, the names, the occasions.
       They are created last, so the remote's list keeps the Radio button first (see moveVertical). */
    var PW_ICO = {
        cloud:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 18a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 10.6 3.7 3.7 0 0 1 17.4 18z"/></svg>',
        adjust: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9.5 2h5"/></svg>',
        summer: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
        names:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.2"/></svg>',
        size:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/><rect x="9" y="9" width="6" height="6" rx="1.5"/></svg>',
        pin:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
        cal:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18"/></svg>',
        quran:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v15M3 4c4-1 6 0 9 2 3-2 5-3 9-2v14c-4-1-6 0-9 2-3-2-5-3-9-2z"/></svg>',
        book:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
        sun:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
        moon:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.6A8.2 8.2 0 0 1 9.4 4 8.2 8.2 0 1 0 20 14.6z"/></svg>',
        back:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>',
        prev:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>',
        next:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
        sparkle:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l2.4 7.2L21 12l-6.6 2.8L12 22l-2.4-7.2L3 12l6.6-2.8z"/></svg>',
        refresh:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/></svg>',
        headphones: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14v-2a8 8 0 0 1 16 0v2"/><path d="M4 14h3v6H5a1 1 0 0 1-1-1zM20 14h-3v6h2a1 1 0 0 0 1-1z"/></svg>'
    };
    /* v1.2.108: the radio, alert, auto-off, black screen and refresh buttons are small icon tiles (one short row) */
    function ic(path) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + path + "</svg>"; }
    var ACT_ICO = {
        radio:   ic('<circle cx="12" cy="12" r="2"/><path d="M7.8 7.8a6 6 0 0 0 0 8.4M16.2 7.8a6 6 0 0 1 0 8.4M4.9 4.9a10 10 0 0 0 0 14.2M19.1 4.9a10 10 0 0 1 0 14.2"/>'),
        bell:    ic('<path d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 21h4"/>'),
        bellOff: ic('<path d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 21h4M4 4l16 16"/>'),
        pause:   ic('<circle cx="12" cy="12" r="9"/><path d="M10 9v6M14 9v6"/>'),
        test:    ic('<circle cx="12" cy="12" r="9"/><path d="M10 8.5l5.5 3.5-5.5 3.5z"/>'),
        sleep:   ic('<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>'),
        power:   ic('<path d="M12 3v8M6.3 6.6a8 8 0 1 0 11.4 0"/>'),
        refresh: ic('<path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/>'),
        kahf:    ic('<path d="M4 5a2 2 0 0 1 2-2h13v15H6a2 2 0 0 0-2 2z"/><path d="M4 20a2 2 0 0 0 2 2h13v-4M9 7.5h6M9 11h6"/>'),
        resume:  ic('<path d="M8 5.5v13l10-6.5z"/>'),
        restart: ic('<path d="M4 12a8 8 0 1 1 2.4 5.7M4 19v-5.5h5.5"/>'),
        takbeer: ic('<path d="M4 10v4h3.5L13 18V6L7.5 10z"/><path d="M16 9.2a4 4 0 0 1 0 5.6M18.8 6.8a7.5 7.5 0 0 1 0 10.4"/>'),
        quranOnline: ic('<path d="M4 14v-2a8 8 0 0 1 16 0v2"/><path d="M4 14h3v6H5a1 1 0 0 1-1-1zM20 14h-3v6h2a1 1 0 0 0 1-1z"/>')
    };
    function actBtn(ico, label, on, run) {
        var b = el("div", "pw-ic" + (on ? " is-on" : ""), (ACT_ICO[ico] || "") + "<span>" + label + "</span>");
        b.addEventListener("click", run);
        tiles.push({ el: b, run: run });
        return b;
    }
    /* auto screen off: 30 min, then every 10 min up to 3 hours (the Sleep Timer of the Control Center) */
    var SLEEP_STEPS = (function () { var a = [0], m; for (m = 30; m <= 180; m += 10) a.push(m); return a; })();
    function sleepOn() { return (sys.pref("sleepAt") || 0) > Date.now() && sys.pref("sleepTimer") > 0; }
    function minText(n) {
        var h = Math.floor(n / 60), m = n % 60;
        if (!n) return APL.t("Off");
        if (h && m) return APL.t("{h} h {m} min", { h: dg(h), m: dg(m) });
        if (h) return APL.t("{h} h", { h: dg(h) });
        return dg(n) + " " + APL.t("min");
    }
    function openSleep() {
        mainReturn = focusIndex;
        var cur = sleepOn() ? sys.pref("sleepTimer") : 0, i = SLEEP_STEPS.indexOf(cur);
        focusIndex = i < 0 ? 0 : i;
        mode = "sleep"; render();
    }
    function buildSleep() {
        bodyEl.innerHTML = "";
        tiles = [];
        titleEl.textContent = APL.t("Auto Screen Off");
        subEl.textContent = APL.t("Choose when the screen goes to sleep by itself. It is the same timer as the Sleep Timer of the Control Center.");
        var list = el("div", "aplx-list"), cur = sleepOn() ? sys.pref("sleepTimer") : 0;
        SLEEP_STEPS.forEach(function (n) {
            var row = el("div", "aplx-row",
                '<div class="aplx-row__main"><span class="aplx-row__label num">' + (n ? dg(n) + " " + APL.t("min") + (n >= 60 ? " · " + minText(n) : "") : APL.t("Off")) + "</span></div>" +
                (n === cur ? '<span class="aplx-badge aplx-badge--on">✓</span>' : ""));
            var run = function () {
                sys.armSleepTimer(n);
                mode = "main"; focusIndex = mainReturn; render();
                if (APL.toast) APL.toast(n ? APL.t("Going to sleep in {n} min", { n: n }) : APL.t("Sleep Timer off"), true);
            };
            row.addEventListener("click", run);
            tiles.push({ el: row, run: run });
            list.appendChild(row);
        });
        bodyEl.appendChild(list);
        hintEl.textContent = APL.t("OK to choose · Back to cancel");
    }
    function pwBtn(label, ico, on, round, run) {
        var b = el("div", "pw-btn" + (on ? " is-on" : "") + (round ? " pw-btn--round" : ""),
            (PW_ICO[ico] || "") + (label ? "<span>" + label + "</span>" : ""));
        b.addEventListener("click", run);
        tiles.push({ el: b, run: run });
        return b;
    }
    /* v1.2.105: size of the Home Screen prayer widget: OK goes to the next size, after +100% back to the current size */
    var WIDGET_SCALES = [0, 25, 50, 75, 100, 150, 200];
    function scaleText(v) { return v ? "\u2066" + dg(String(100 + v)) + "%\u2069" : APL.t("Current size"); }
    sys.onPref("prayerWidgetFull", function () { if (APL.prayerPage && APL.prayerPage.refresh) APL.prayerPage.refresh(); });
    function nextScale() {
        var cur = p().scaleOf(), i = WIDGET_SCALES.indexOf(cur);
        sys.setPref("prayerWidgetScale", WIDGET_SCALES[(i + 1) % WIDGET_SCALES.length]);
    }
    function contentButtons() {
        var row = el("div", "pw-btns");
        /* v7.0.1: the Mushaf opens from this page too */
        var quranEntry = pwBtn(APL.lang === "ar" ? "المصحف" : "Quran", "quran", false, false, openQuran);
        quranEntry.classList.add("pw-btn--adhkar", "pw-btn--quran");
        row.appendChild(quranEntry);

        var quranAudioEntry = pwBtn(APL.lang === "ar" ? "استماع القرآن" : "Listen", "headphones", false, false, function () {
            if (APL.quranAudio) APL.quranAudio.open();
        });
        quranAudioEntry.classList.add("pw-btn--adhkar", "pw-btn--quran-audio");
        row.appendChild(quranAudioEntry);

        var adhkarEntry = pwBtn(APL.t("Adhkar"), "book", false, false, function () { openAdhkar(); });
        adhkarEntry.classList.add("pw-btn--adhkar");
        row.appendChild(adhkarEntry);

        var hekamEntry = pwBtn(APL.lang === "ar" ? "حكم ومواعظ" : "Hekam", "sparkle", false, false, function () { openHekam(); });
        hekamEntry.classList.add("pw-btn--adhkar", "pw-btn--hekam");
        row.appendChild(hekamEntry);

        if (APL.personal) {
            row.appendChild(pwBtn(APL.lang === "ar" ? "مناسباتي" : "My Occasions", "cal", false, false, function () { mainReturn = focusIndex; APL.personal.open(); }));
        }

        if (APL.tasks && APL.tasks.setFriday) {
            row.appendChild(pwBtn(APL.t("Friday Reminders"), "cal", APL.tasks.fridayOn(), false, function () {
                var on = !APL.tasks.fridayOn();
                APL.tasks.setFriday(on);
                if (APL.toast) APL.toast(on ? APL.t("Friday reminders added to Tasks: Al-Kahf 9:00, blessings 10:00, 30 min before Dhuhr") : APL.t("Friday reminders removed"), true);
                render();
            }));
        }

        row.appendChild(pwBtn(p().cityName(), "pin", false, false, function () { mainReturn = focusIndex; mode = "city"; render(); }));
        row.appendChild(pwBtn(weatherText() === "\u2014" ? L("\u0627\u0644\u0637\u0642\u0633", "Weather") : weatherText(), weatherText() === "\u2014" ? "cloud" : "", false, false, function () { openWeather(); }));

        return row;
    }

    function openAdjust() {
        mainReturn = focusIndex;
        mode = "adjust";
        focusIndex = 0;
        render();
    }

    function prayerSettingsButtons() {
        var row = el("div", "pw-btns");
        row.appendChild(pwBtn(APL.t("Adjust Prayer Times"), "adjust", false, false, openAdjust));
        row.appendChild(pwBtn(APL.t("Summer Time"), "summer", p().summerOn(), false, function () {
            var on = !p().summerOn();
            sys.setPref("prayerSummer", on);
            if (on && APL.toast) APL.toast(APL.t("Summer Time is on: the times are one hour later"), true);
            render();
        }));
        row.appendChild(pwBtn(APL.t("Names"), "names", p().namesOn(), false, function () {
            sys.setPref("prayerNames", !p().namesOn());
            render();
        }));
        row.appendChild(pwBtn(APL.t("Widget Size") + (p().scaleOf() ? " · " + scaleText(p().scaleOf()) : ""), "size", p().scaleOf() > 0, false, function () {
            nextScale();
            render();
        }));
        row.appendChild(pwBtn("عرض كامل بالرئيسية", "size", !!sys.pref("prayerWidgetFull"), false, function () {
            sys.setPref("prayerWidgetFull", !sys.pref("prayerWidgetFull"));
            render();
        }));

        var curShow = sys.pref("prayerWidgetShow");
        var showLabel = curShow === "ayah" ? "آية اليوم" :
            curShow === "tafsir" ? "آية وتفسير" :
            curShow === "hekam" ? "حكمة اليوم" :
            curShow === "pers" ? "مناسبتي القادمة" : "المناسبات";
        row.appendChild(pwBtn("يعرض: " + showLabel, "sparkle", curShow !== "occ", false, function () {
            var cur = sys.pref("prayerWidgetShow");
            var nxt = cur === "ayah" ? "tafsir" :
                cur === "tafsir" ? "hekam" :
                cur === "hekam" ? "pers" :
                cur === "pers" ? "occ" : "ayah";
            sys.setPref("prayerWidgetShow", nxt);
            render();
        }));

        return row;
    }

    function hekamSettingsButtons() {
        var row = el("div", "pw-btns");
        var hekamOn = !!sys.pref("hekamWidget");
        row.appendChild(pwBtn("ويدجت الحكمة: " + (hekamOn ? "شغال" : "مغلق"), "sparkle", hekamOn, false, function () {
            var nxt = !hekamOn;
            sys.setPref("hekamWidget", nxt);
            if (APL.toast) APL.toast(nxt ? "تم تفعيل ويدجت الحكمة على الرئيسية" : "تم إيقاف ويدجت الحكمة", true);
            render();
        }));

        var curHekamPos = sys.pref("hekamPos") || "above-dock";
        var posMap = {
            "above-dock": "فوق التطبيقات",
            "top-center": "أعلى المنتصف",
            "top-right": "أعلى اليمين",
            "top-left": "أعلى اليسار",
            "bottom-center": "أسفل المنتصف",
            "bottom-right": "أسفل اليمين",
            "bottom-left": "أسفل اليسار",
            "inline": "بشريط الصلاة"
        };
        var posKeys = ["above-dock", "top-center", "top-right", "top-left", "bottom-center", "bottom-right", "bottom-left", "inline"];
        row.appendChild(pwBtn("الموضع: " + (posMap[curHekamPos] || "فوق التطبيقات"), "pin", hekamOn, false, function () {
            var idx = posKeys.indexOf(sys.pref("hekamPos") || "above-dock");
            var nxtPos = posKeys[(idx + 1) % posKeys.length];
            sys.setPref("hekamPos", nxtPos);
            if (!sys.pref("hekamWidget")) sys.setPref("hekamWidget", true);
            render();
        }));

        var HEKAM_SCALES = [100, 125, 150, 175, 200];
        var curHekamScale = Number(sys.pref("hekamScale")) || 100;
        row.appendChild(pwBtn("الحجم: \u2066" + dg(curHekamScale) + "%\u2069", "size", curHekamScale > 100, false, function () {
            var sidx = HEKAM_SCALES.indexOf(curHekamScale);
            var nxtScale = HEKAM_SCALES[(sidx + 1) % HEKAM_SCALES.length];
            sys.setPref("hekamScale", nxtScale);
            render();
        }));

        var HEKAM_COLORS = [
            { key: "gold", label: "ذهبي ملكي" },
            { key: "white", label: "أبيض كريستال" },
            { key: "sky", label: "أزرق سماوي" },
            { key: "galaxy", label: "موف المجرة" },
            { key: "green", label: "أخضر فسفوري" }
        ];
        var curColor = sys.pref("hekamColor") || "white";
        var curColorObj = HEKAM_COLORS[1];
        for (var c = 0; c < HEKAM_COLORS.length; c++) {
            if (HEKAM_COLORS[c].key === curColor) { curColorObj = HEKAM_COLORS[c]; break; }
        }
        row.appendChild(pwBtn("اللون: " + curColorObj.label, "sparkle", false, false, function () {
            var cidx = 0;
            for (var i = 0; i < HEKAM_COLORS.length; i++) {
                if (HEKAM_COLORS[i].key === (sys.pref("hekamColor") || "white")) { cidx = i; break; }
            }
            var nxtColor = HEKAM_COLORS[(cidx + 1) % HEKAM_COLORS.length];
            sys.setPref("hekamColor", nxtColor.key);
            if (APL.toast) APL.toast("لون خط الحكمة: " + nxtColor.label, true);
            render();
        }));

        return row;
    }

    function buildAdjust() {
        bodyEl.innerHTML = "";
        tiles = [];
        titleEl.textContent = APL.t("Adjust Prayer Times");
        subEl.textContent = APL.t("Move a prayer earlier or later, in minutes. The alerts follow the adjusted time.");
        var list = el("div", "aplx-list");
        var byKey = {};
        p().list().forEach(function (t) { byKey[t.key] = t; });
        p().names().forEach(function (n) {
            var v = p().adjOf(n.key), t = byKey[n.key];
            var tp = t ? p().hhmm(t.time) : "—";
            var row = el("div", "aplx-row",
                '<div class="aplx-row__main"><span class="aplx-row__label">' + n.name + "</span>" +
                '<span class="aplx-row__sub num">' + tp + "</span></div>" +
                '<span class="aplx-badge ' + (v ? "aplx-badge--on" : "aplx-badge--off") + ' num">◀ ' + (v > 0 ? "+" : "") + v + " " + APL.t("min") + " ▶</span>");
            var run = function () { p().setAdj(n.key, 0); };
            row.addEventListener("click", run);
            tiles.push({ el: row, run: run, key: n.key });
            list.appendChild(row);
        });
        /* v1.2.117: minutes from the adhan to the iqama (0 = no countdown) */
        p().names().forEach(function (n) {
            if (n.key === "sunrise") return;
            var iv = p().iqamaOf(n.key);
            var irow = el("div", "aplx-row",
                '<div class="aplx-row__main"><span class="aplx-row__label">' + APL.t("Iqama after the adhan") + " · " + n.name + "</span></div>" +
                '<span class="aplx-badge ' + (iv ? "aplx-badge--on" : "aplx-badge--off") + ' num">◀ ' + (iv ? dg(iv) + " " + APL.t("min") : APL.t("Off")) + " ▶</span>");
            var irun = function () { p().setIqama(n.key, 0); };
            irow.addEventListener("click", irun);
            tiles.push({ el: irow, run: irun, iqama: n.key });
            list.appendChild(irow);
        });
        var rst = el("div", "aplx-row", '<div class="aplx-row__main"><span class="aplx-row__label">' + APL.t("Reset all adjustments") + "</span></div>");
        var runAll = function () { p().resetAdj(); };
        rst.addEventListener("click", runAll);
        tiles.push({ el: rst, run: runAll });
        list.appendChild(rst);
        bodyEl.appendChild(list);
        hintEl.textContent = "◀ ▶ " + APL.t("change by one minute") + " (" + APL.t("Iqama: 0 = off") + ")" + " · OK " + APL.t("Reset") + " · " + APL.t("Back to return");
    }

    function nightText() {
        var n = null;
        try { n = p().night ? p().night() : null; } catch (e) { n = null; }
        if (!n) return null;
        if (n.inLastThird) return { on: true, text: "\u2605 " + APL.t("Last third of the night now · until Fajr {f}", { f: p().hhmm(n.fajrHM) }) };
        return { on: false, text: APL.t("Last third of the night starts {t} · midnight {m}", { t: p().hhmm(n.lastThirdHM), m: p().hhmm(n.midnightHM) }) };
    }

    /* v3.4.1: where today's times come from: saved AlAdhan day, or calculated here (with or without the learned minute offsets); manual / Summer Time shift noted. Untested on the TV. */
    function badge() {
        try {
            var s = p().source ? p().source() : null; if (!s) return "";
            var t = s.kind === "aladhan" ? "\u25CF \u0627\u0644\u0645\u0635\u062F\u0631: AlAdhan (\u0645\u062D\u0641\u0648\u0638\u0629)"
                  : s.kind === "calc" ? "\u2248 \u0627\u0644\u0645\u0635\u062F\u0631: \u0645\u062D\u0633\u0648\u0628\u0629 \u0639\u0644\u0649 \u0627\u0644\u0634\u0627\u0634\u0629" + (s.calibrated ? " (\u0645\u0639\u0627\u064A\u064E\u0631\u0629 \u0639\u0644\u0649 " + APL.digits(String(s.n)) + " \u064A\u0648\u0645)" : " (\u0628\u062F\u0648\u0646 \u0645\u0639\u0627\u064A\u0631\u0629)")
                  : "\u0627\u0644\u0645\u0635\u062F\u0631: \u063A\u064A\u0631 \u0645\u062A\u0627\u062D";
            if (s.adjusted) t += " \u00B7 \u0645\u0639 \u062A\u0639\u062F\u064A\u0644 \u064A\u062F\u0648\u064A/\u062A\u0648\u0642\u064A\u062A \u0635\u064A\u0641\u064A";
            return "\n" + t;
        } catch (e) { return ""; }
    }

    /* v7.0.1: opens the offline Hafs reader on top of this page (the page stays open underneath; Back in the reader returns here) */
    function openQuran() {
        mainReturn = focusIndex;
        try {
            if (APL.khatma && APL.khatma.open) { APL.khatma.open(); return; }
        } catch (e) {}
        if (APL.toast) APL.toast(APL.lang === "ar" ? "\u0627\u0644\u0645\u0635\u062D\u0641 \u063A\u064A\u0631 \u0645\u062A\u0627\u062D" : "The Mushaf is not available", true);
    }

    function audioIcons() {
        var icons = el("div", "pw-ics");
        var rs = radioState(), alertsOn = p().alertsOn(), pauseOn = sys.pref("radioDuringAlert") !== false, sl = sleepOn();
        icons.appendChild(actBtn("radio", APL.t("Radio") + (rs.playing ? " · LIVE" : (rs.starting ? " …" : "")), rs.playing || rs.starting, function () { toggleRadio(); }));
        /* v1.2.116: Surat Al-Kahf and the Eid takbeer, played from the APL-Audio folder on the TV (not inside the package) */
        icons.appendChild(audioBtn("kahf", "kahf", APL.t("Al-Kahf")));
        icons.appendChild(kahfMini());      /* v7.2.0: Resume / Restart, two small buttons stacked beside the Al-Kahf tile */
        icons.appendChild(audioBtn("takbeer", "takbeer", APL.t("Eid Takbeer")));
        icons.appendChild(actBtn(alertsOn ? "bell" : "bellOff", APL.t("Alerts"), alertsOn, function () { p().setAlerts(!p().alertsOn()); render(); }));
        icons.appendChild(actBtn("pause", APL.t("Pause on alert"), pauseOn, function () { sys.setPref("radioDuringAlert", sys.pref("radioDuringAlert") === false); render(); }));
        icons.appendChild(actBtn("test", APL.t("Test Alert"), false, function () { if (APL.prayerAlert) APL.prayerAlert.test(); }));
        icons.appendChild(actBtn("sleep", sl ? minText(sys.pref("sleepTimer")) : APL.t("Auto Off"), sl, openSleep));
        icons.appendChild(actBtn("power", APL.t("Black Screen"), false, function () { enterBlackout(); }));
        icons.appendChild(actBtn("refresh", APL.t("Refresh"), false, function () {
            p().refresh(); render();
            if (APL.toast) APL.toast(APL.t("Updated {time}", { time: new Date().toLocaleTimeString(APL.locale) }), true);
        }));
        return icons;
    }

    /* v8.7.0: each button row gets a small label at its start (listen / services / prayer / wisdom): the same rows, the same tiles,
       the same remote order; only the grouping is visible now. */
    function ppRow(label, kind, rowEl) {
        var r = el("div", "pp-row pp-row--" + kind);
        r.appendChild(el("div", "pp-row__lab", "<span>" + label + "</span>"));
        r.appendChild(rowEl);
        return r;
    }

    function buildMain() {
        bodyEl.innerHTML = "";
        tiles = [];
        titleEl.textContent = APL.t("Prayer and Quran");
        subEl.textContent = (p().hijri() ? p().hijri() + " \u00B7 " : "") + p().cityName() + badge();

        var wrap = el("div", "pw-wrap", p().widgetHtml({ variant: "page" }));
        if (!wrap.firstChild) { wrap = nextCard(); }
        bodyEl.appendChild(wrap);
        bodyEl.appendChild(ppRow(L("\u0627\u0644\u0627\u0633\u062A\u0645\u0627\u0639", "Listen"), "audio", audioIcons()));
        bodyEl.appendChild(ppRow(L("\u0627\u0644\u062E\u062F\u0645\u0627\u062A", "Services"), "serv", contentButtons()));
        bodyEl.appendChild(ppRow(L("\u0627\u0644\u0635\u0644\u0627\u0629", "Prayer"), "pray", prayerSettingsButtons()));
        bodyEl.appendChild(ppRow(L("\u0627\u0644\u062D\u0643\u0645\u0629", "Wisdom"), "wis", hekamSettingsButtons()));
        bodyEl.appendChild(occasionsStrip());
        var iq = null;                                  // v1.2.117: iqama countdown (set in Adjust Prayer Times)
        try { iq = p().iqama ? p().iqama() : null; } catch (e) { iq = null; }
        if (iq) bodyEl.appendChild(el("div", "pw-night is-on", APL.t("Iqama of {prayer} {left}", { prayer: iq.name, left: p().left(iq.ms) })));
        var nightLine = nightText();                    // v1.2.117: last third of the night (plain text, not a tile: the remote's order is unchanged)
        if (nightLine) bodyEl.appendChild(el("div", "pw-night" + (nightLine.on ? " is-on" : ""), nightLine.text));

        hintEl.textContent = APL.t("OK to choose · Back to cancel") + " · ⏯ " + APL.t("Control Center") +
                             " · " + APL.t("OK on an occasion: all occasions") +
                             " · ≈ " + APL.t("estimated until the moon sighting");
    }

    function buildWeather() {
        bodyEl.innerHTML = "";
        tiles = [];
        var w = APL.weather && APL.weather.get();
        titleEl.textContent = APL.t("Weather Forecast");
        var pName = (APL.weather && APL.weather.placeName && APL.weather.placeName()) || "";
        subEl.textContent = APL.t("Detailed live conditions and 7-day forecast from Open-Meteo") + (pName ? " · " + pName : "");

        var wapi = APL.weather;
        function retry() {
            if (!wapi) return;
            APL.toast(APL.t("Updating weather…"), true);
            wapi.refresh().then(function () {
                if (!(openFlag && mode === "weather")) return;
                if (wapi.failed()) APL.toast(APL.t("No connection"), true);
                else APL.toast(APL.t("Weather updated successfully"), true);
                render();
            });
        }
        /* v1.2.99: no data at all: say why, and offer to try again (it was "loading" for ever) */
        if (!w) {
            var offline = !!(wapi && wapi.failed());
            var empty = el("div", "aplx-list",
                '<div class="aplx-row' + (offline ? " wx-offline" : "") + '"><span class="aplx-row__label">' +
                (offline ? APL.t("Can't reach the weather service. Check the internet and try again.") : APL.t("Weather data loading…")) +
                "</span></div>");
            var rr = el("div", "aplx-row wx-retry", '<span class="aplx-row__label">↻ ' + APL.t("Retry") + "</span>");
            rr.addEventListener("click", retry);
            tiles.push({ el: rr, run: retry });
            empty.appendChild(rr);
            bodyEl.appendChild(empty);
            hintEl.textContent = APL.t("OK to retry · Back to return");
            /* the very first visit, before the launcher has tried at all: try now (once; a failure sets the flag) */
            if (wapi && !wapi.busy() && !wapi.failed()) {
                setTimeout(function () {
                    wapi.refresh().then(function () { if (openFlag && mode === "weather") render(); });
                }, 50);
            }
            return;
        }

        /* data on the screen but the last try failed, or it is old: say so, with the time of the data */
        if (wapi && (wapi.failed() || Date.now() - w.at > 7200000)) {
            var stale = el("div", "aplx-list",
                '<div class="aplx-row wx-offline"><span class="aplx-row__label">' +
                APL.t("No connection · last updated {time}", { time: wapi.clock(w.at) }) + "</span></div>");
            bodyEl.appendChild(stale);
        }

        var mainRow = el("div", "aplx-cards");
        var curText = APL.lang === "ar" ? w.textAr : w.textEn;
        var curCard = card(
            APL.t("Current Weather"),
            w.icon + ' <span dir="ltr">' + dg(w.temp) + "°</span>",
            curText + (w.apparent !== undefined ? " · " + APL.t("Feels like {t}", { t: APL.deg(w.apparent) }) : ""),
            function () {
                APL.toast(APL.t("Updating weather…"), true);
                if (APL.weather) APL.weather.refresh().then(render);
            },
            { cls: "aplx-badge--on", text: APL.t("Live") }
        );
        curCard.classList.add("wx-cur");
        mainRow.appendChild(curCard);

        var humCard = card(
            APL.t("Humidity"),
            (w.humidity !== undefined ? '<span dir="ltr">' + dg(w.humidity) + "%</span>" : "—"),
            APL.t("Relative air humidity"),
            function () {}
        );
        mainRow.appendChild(humCard);

        var windCard = card(
            APL.t("Wind"),
            (w.wind !== undefined ? '<span dir="ltr">' + dg(w.wind) + " km/h</span>" : "—"),
            APL.t("Surface wind speed"),
            function () {}
        );
        mainRow.appendChild(windCard);

        var refCard = card(
            APL.t("Refresh"),
            "↻",
            APL.t("Update weather now"),
            function () {
                APL.toast(APL.t("Updating weather…"), true);
                if (APL.weather) {
                    APL.weather.refresh().then(function () {
                        APL.toast(APL.t("Weather updated successfully"), true);
                        render();
                    });
                }
            }
        );
        mainRow.appendChild(refCard);
        bodyEl.appendChild(mainRow);

        if (w.days && w.days.length) {
            var fHead = el("h2", "praynext__label wx-head", APL.t("7-Day Forecast"));
            bodyEl.appendChild(fHead);
            var fList = el("div", "aplx-list wx-list");
            var gMin = 99, gMax = -99, DROP = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.5C9 7 6 10.2 6 14.2a6 6 0 0 0 12 0C18 10.2 15 7 12 2.5z"/></svg>';
            w.days.forEach(function (d) { if (d.min < gMin) gMin = d.min; if (d.max > gMax) gMax = d.max; });
            var span = Math.max(1, gMax - gMin);
            w.days.forEach(function (d, i) {
                var dText = APL.lang === "ar" ? d.textAr : d.textEn, dayA = String(d.date), dayB = "";
                var dm = /^(\d{4})-(\d{2})-(\d{2})/.exec(dayA);
                if (dm && APL.islamic) {
                    try {
                        var g = APL.islamic.gregorian(new Date(+dm[1], +dm[2] - 1, +dm[3]));
                        dayA = i === 0 ? APL.t("Today") : i === 1 ? APL.t("Tomorrow") : g.weekday;
                        dayB = g.day + " " + g.month;
                    } catch (e) {}
                }
                var left = Math.round((d.min - gMin) / span * 100), wid = Math.max(8, Math.round((d.max - d.min) / span * 100));
                var row = el("div", "aplx-row wx-row",
                    '<div class="wx-day"><span class="wx-day__n">' + dayA + '</span><span class="wx-day__d">' + dg(dayB) + "</span></div>" +
                    '<span class="wx-ico">' + d.icon + "</span>" +
                    '<span class="wx-txt">' + dText + "</span>" +
                    '<span dir="ltr" class="wx-meta wx-rain' + (d.rainProb >= 50 ? " is-wet" : "") + '">' + DROP + dg(d.rainProb) + "%</span>" +
                    '<span dir="ltr" class="wx-meta wx-uv">UV ' + dg(Math.round(d.uv)) + "</span>" +
                    '<span class="wx-range"><span class="wx-lo">' + dg(d.min) + '°</span><span class="wx-track"><i style="margin-inline-start:' + left + "%;width:" + wid + '%"></i></span><span class="wx-hi">' + dg(d.max) + "°</span></span>"
                );
                (function (idx) {
                    var go = function () { openWxDay(idx); };
                    row.addEventListener("click", go);
                    tiles.push({ el: row, run: go });
                })(i);
                fList.appendChild(row);
            });
            bodyEl.appendChild(fList);
        }

        hintEl.textContent = APL.t("OK on a day: hour by hour") + " · " + APL.t("Back to return") + " · " + APL.t("OK on Refresh to update live weather");
    }

    function openWeather() {
        mainReturn = focusIndex;
        mode = "weather";
        focusIndex = 0;
        render();
    }

    /* ---------- v1.2.99: the hours of one day (OK on a day of the forecast) ---------- */
    function hourText(t) {
        var h = parseInt(String(t).slice(0, 2), 10) || 0;
        if (sys.pref("clockFormat") === "24") return dg((h < 10 ? "0" : "") + h + ":00");
        return dg((h % 12) || 12) + " " + (h < 12 ? (APL.lang === "ar" ? "ص" : "AM") : (APL.lang === "ar" ? "م" : "PM"));
    }
    function openWxDay(i) {
        var w = APL.weather && APL.weather.get();
        if (!w) return;
        if (!w.hoursAll || !w.hoursAll.length) {
            APL.toast(APL.t("Refresh the weather to see the hours"), true);
            if (APL.weather) APL.weather.refresh().then(function () { if (openFlag && mode === "weather") render(); });
            return;
        }
        wxDay = i;
        wxReturn = focusIndex;
        mode = "wxday";
        /* today: the remote starts on the hour it is now */
        var d = w.days && w.days[i], list = d ? w.hoursAll.filter(function (x) { return x.d === d.date; }) : [], at = 0;
        if (i === 0 && w.curTime) {
            var nowH = w.curTime.slice(11, 13);
            list.forEach(function (x, k) { if (x.t.slice(0, 2) === nowH) at = k; });
        }
        focusIndex = at;
        render();
    }
    function buildWxDay() {
        bodyEl.innerHTML = "";
        tiles = [];
        var w = APL.weather && APL.weather.get();
        var d = w && w.days && w.days[wxDay];
        titleEl.textContent = APL.t("Hourly Forecast");
        var pName = (APL.weather && APL.weather.placeName && APL.weather.placeName()) || "";
        var dayName = "", dm = d && /^(\d{4})-(\d{2})-(\d{2})/.exec(String(d.date));
        if (dm && APL.islamic) {
            try {
                var g = APL.islamic.gregorian(new Date(+dm[1], +dm[2] - 1, +dm[3]));
                dayName = (wxDay === 0 ? APL.t("Today") : wxDay === 1 ? APL.t("Tomorrow") : g.weekday) + " " + dg(g.day) + " " + g.month;
            } catch (e) {}
        }
        subEl.textContent = dayName + (pName ? " · " + pName : "");
        var list = d ? w.hoursAll.filter(function (x) { return x.d === d.date; }) : [];
        var DROP = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.5C9 7 6 10.2 6 14.2a6 6 0 0 0 12 0C18 10.2 15 7 12 2.5z"/></svg>';
        var nowKey = w && w.curTime ? w.curTime.slice(0, 13) : "";
        var fList = el("div", "aplx-list wx-list");
        list.forEach(function (x) {
            var desc = APL.weather.describe(x.code), past = nowKey && (x.d + "T" + x.t.slice(0, 2)) < nowKey;
            var row = el("div", "aplx-row wx-row" + (past ? " is-past" : ""),
                '<div class="wx-day"><span class="wx-day__n">' + hourText(x.t) + "</span></div>" +
                '<span class="wx-ico">' + desc.icon + "</span>" +
                '<span class="wx-txt">' + (APL.lang === "ar" ? desc.ar : desc.en) + "</span>" +
                '<span dir="ltr" class="wx-meta wx-rain' + (x.rain >= 50 ? " is-wet" : "") + '">' + DROP + dg(x.rain) + "%</span>" +
                '<span class="wx-meta wx-hum">' + APL.t("Humidity") + " " + dg(x.hum) + "%</span>" +
                '<span dir="ltr" class="wx-temp">' + dg(x.temp) + "°</span>");
            tiles.push({ el: row, run: function () {} });
            fList.appendChild(row);
        });
        bodyEl.appendChild(fList);
        hintEl.textContent = APL.t("Back to return");
    }

    function weatherText() {
        var w = APL.weather && APL.weather.get();
        if (!w) return "—";
        return w.icon + " " + APL.deg(w.temp) + " " + (APL.lang === "ar" ? w.textAr : w.textEn);
    }

    function buildCity() {
        bodyEl.innerHTML = "";
        tiles = [];
        titleEl.textContent = APL.t("Choose City");
        subEl.textContent = APL.t("Times from AlAdhan, Egyptian General Authority of Survey. Timezone Africa/Cairo.");
        var list = el("div", "aplx-list");
        (global.APL_CITIES || []).forEach(function (c) {
            var on = c.key === p().cityKey();
            var row = el("div", "aplx-row",
                '<div class="aplx-row__main"><span class="aplx-row__label">' + (APL.lang === "ar" ? c.ar : c.en) + "</span>" +
                '<span class="aplx-row__sub num">' + c.lat.toFixed(3) + ", " + c.lon.toFixed(3) + "</span></div>" +
                (on ? '<span class="aplx-badge aplx-badge--on">' + APL.t("On") + "</span>" : ""));
            row.addEventListener("click", function () { choose(c.key); });
            tiles.push({ el: row, run: function () { choose(c.key); } });
            list.appendChild(row);
        });
        bodyEl.appendChild(list);
        hintEl.textContent = APL.t("OK to choose · Back to cancel");
    }

    function choose(key) {
        p().setCity(key);
        mode = "main"; focusIndex = mainReturn;
        render();
        if (APL.toast) APL.toast(p().cityName(), true);
    }

    /* The main Prayer and Quran page is visually a 3 × 4 card grid, but its
       action list intentionally starts with Radio (then the second row) before
       the visually first occasions row. Geometry-only focus therefore becomes
       unreliable as cards are redrawn or the page scrolls. Route vertical keys
       by the visible rows; LEFT/RIGHT remain the standard geometric behaviour. */
    function moveVertical(code) {
        if (mode === "adjust" && nav && tiles.length && (code === APL.KEY.LEFT || code === APL.KEY.RIGHT)) {
            var tl = tiles[nav.index];
            if (tl && tl.key) { p().setAdj(tl.key, p().adjOf(tl.key) + (code === APL.KEY.RIGHT ? 1 : -1)); if (APL.sound) APL.sound.tick(); }
            else if (tl && tl.iqama) { p().setIqama(tl.iqama, p().iqamaOf(tl.iqama) + (code === APL.KEY.RIGHT ? 1 : -1)); if (APL.sound) APL.sound.tick(); }
            return true;
        }
        if (mode === "adhkar" && nav && tiles.length) {
            if (code === APL.KEY.LEFT || code === APL.KEY.RIGHT) {
                if (nav.index < 3) {
                    var nextTab = nav.index + (code === APL.KEY.RIGHT ? -1 : 1);
                    if (nextTab >= 0 && nextTab < 3) {
                        nav.focus(nextTab);
                        if (APL.sound) APL.sound.tick();
                    }
                } else {
                    adhkarTab = (adhkarTab === "morning" ? "evening" : "morning");
                    focusIndex = (adhkarTab === "morning" ? 0 : 1);
                    if (APL.sound) APL.sound.tick();
                    render();
                }
                return true;
            }
            if (code === APL.KEY.UP) {
                if (nav.index <= 0) return true;
                if (nav.index === 3) {
                    nav.focus(adhkarTab === "morning" ? 0 : 1);
                } else if (nav.index > 3) {
                    nav.focus(nav.index - 1);
                }
                if (APL.sound) APL.sound.tick();
                return true;
            }
            if (code === APL.KEY.DOWN) {
                if (nav.index < 3) {
                    if (nav.tiles.length > 3) nav.focus(3);
                } else if (nav.index < nav.tiles.length - 1) {
                    nav.focus(nav.index + 1);
                }
                if (APL.sound) APL.sound.tick();
                return true;
            }
            return false;
        }
        if (mode === "main" && nav && nav.tiles && nav.tiles.length &&
            (code === APL.KEY.UP || code === APL.KEY.DOWN || code === APL.KEY.LEFT || code === APL.KEY.RIGHT)) {
            /* v7.0.1: all four arrows follow the VISIBLE rows. The tiles are clustered by their vertical centre
               (so a wrapped row is two rows, and a focused tile that grows does not change its row); inside a row
               LEFT/RIGHT go to the neighbour by on-screen x (correct in RTL too) and STOP at the row's end instead of
               jumping to another row; UP/DOWN go to the tile of the next row nearest in x. The key is always used up. */
            var items = [], i, j, rows = [], cur = -1, r, c, dir;
            for (i = 0; i < nav.tiles.length; i++) {
                var b = nav.tiles[i].getBoundingClientRect(), cy = b.top + b.height / 2, host = nav.tiles[i].parentNode;
                /* v7.2.0: the two small stacked buttons belong to the row of the icon tiles (not a row of their own) */
                if (nav.tiles[i].classList && nav.tiles[i].classList.contains("pw-ic--mini") && host && host.parentNode) {
                    var hb = host.parentNode.getBoundingClientRect(); cy = hb.top + hb.height / 2;
                }
                items.push({ i: i, x: b.left + b.width / 2, y: cy, ry: b.top });
            }
            items.slice().sort(function (a, b2) { return a.y - b2.y; }).forEach(function (t) {
                var last = rows[rows.length - 1];
                if (last && Math.abs(t.y - last.y) < 22) last.t.push(t);
                else rows.push({ y: t.y, t: [t] });
            });
            rows.forEach(function (row) { row.t.sort(function (a, b2) { return (a.x - b2.x) || (b2.ry - a.ry); }); });
            for (r = 0; r < rows.length && cur < 0; r++) {
                for (c = 0; c < rows[r].t.length; c++) if (rows[r].t[c].i === nav.index) { cur = r; break; }
            }
            if (cur < 0) return true;
            if (code === APL.KEY.LEFT || code === APL.KEY.RIGHT) {
                for (c = 0; c < rows[cur].t.length; c++) if (rows[cur].t[c].i === nav.index) break;
                dir = code === APL.KEY.LEFT ? -1 : 1;
                var nx = rows[cur].t[c + dir];
                if (nx) { nav.focus(nx.i); if (APL.sound) APL.sound.tick(); }
                else if (APL.sound && APL.sound.edge) APL.sound.edge();
                return true;
            }
            dir = code === APL.KEY.UP ? -1 : 1;
            var tr = rows[cur + dir];
            if (tr) {
                var me = items[nav.index], best = tr.t[0];
                for (j = 1; j < tr.t.length; j++) if (Math.abs(tr.t[j].x - me.x) < Math.abs(best.x - me.x)) best = tr.t[j];
                nav.focus(best.i);
                if (cur + dir === 0 && bodyEl) bodyEl.scrollTop = 0;        // the first row: show the widget and the title again
                if (APL.sound) APL.sound.tick();
            } else if (APL.sound && APL.sound.edge) APL.sound.edge();
            return true;
        }
        if (!nav || !nav.tiles || !nav.tiles.length || (code !== APL.KEY.UP && code !== APL.KEY.DOWN)) return false;
        var delta = code === APL.KEY.UP ? -1 : 1;
        /* City, occasions, weather and hekam use true vertical lists. */
        if (mode === "city" || mode === "events" || mode === "weather" || mode === "wxday" || mode === "adjust" || mode === "sleep" || mode === "hekam" || mode === "hekam-items" || mode === "hekam-random") {
            var next = nav.index + delta;
            if (next >= 0 && next < nav.tiles.length) {
                nav.focus(next);
                if (APL.sound) APL.sound.tick();
            }
            return true;
        }
        return false;
    }

    /* v1.2.116: the two recordings kept outside the package (js/audio-pack.js) */
    function audioBtn(id, ico, label) {
        var a = APL.audioPack, st = a ? a.state() : {};
        var on = !!(st.id === id && (st.playing || st.preparing || st.paused));
        var mark = on ? (st.playing ? " \u25B6" : (st.paused ? " \u23F8" : " \u2026")) : "";
        return actBtn(ico, label + mark, on, function () { toggleAudio(id); });
    }
    /* v7.2.0: two half-size buttons, one above the other, between the Al-Kahf and the Eid Takbeer tiles */
    function L(ar, en) { return APL.lang === "ar" ? ar : en; }
    function miniBtn(ico, label, run) {
        var b = el("div", "pw-ic pw-ic--mini", (ACT_ICO[ico] || "") + "<span>" + label + "</span>");
        b.addEventListener("click", run);
        tiles.push({ el: b, run: run });
        return b;
    }
    function audioRun(promise) {
        promise.then(function () { render(); }, function (e) {
            var m = e && e.message;
            if (m === "stopped") return;
            if (APL.toast) {
                APL.toast(e && e.noFile
                    ? APL.t("File not found. Copy it into a folder named APL-Audio on the TV or on a USB stick.")
                    : APL.t("Could not play the file: {why}", { why: m || "?" }));
            }
            render();
        });
    }
    function kahfMini() {
        var col = el("div", "pw-mini"), a = APL.audioPack;
        if (!a) return col;
        col.appendChild(miniBtn("resume", L("استئناف", "Resume"), function () {
            var st = a.state();
            if (st.id === "kahf" && st.playing) { if (APL.toast) APL.toast(L("سورة الكهف شغّالة دلوقتي", "Al-Kahf is playing now"), true); return; }
            if (APL.toast) APL.toast(a.hasResume("kahf") ? L("بنكمّل سورة الكهف من آخر مكان…", "Resuming Al-Kahf…") : L("مفيش مكان محفوظ، هتبدأ من الأول…", "No saved place, starting from the beginning…"), true);
            audioRun(a.resume("kahf"));
        }));
        col.appendChild(miniBtn("restart", L("من الأول", "Restart"), function () {
            if (APL.toast) APL.toast(L("سورة الكهف من الأول…", "Al-Kahf from the beginning…"), true);
            audioRun(a.restart("kahf"));
        }));
        return col;
    }
    function toggleAudio(id) {
        var a = APL.audioPack;
        if (!a) return;
        var st = a.state();
        if (st.id === id && (st.playing || st.preparing || st.paused)) {
            a.stop().then(function () { if (APL.toast) APL.toast(APL.t("Stopped"), true); render(); });
            return;
        }
        if (APL.toast) APL.toast(APL.t("Opening {name}\u2026", { name: APL.t(a.items[id].name) }), true);
        a.play(id).then(function () { render(); }, function (e) {
            var m = e && e.message;
            if (m === "stopped") return;
            if (APL.toast) {
                APL.toast(e && e.noFile
                    ? APL.t("File not found. Copy it into a folder named APL-Audio on the TV or on a USB stick.")
                    : APL.t("Could not play the file: {why}", { why: m || "?" }));
            }
            render();
        });
    }

    function toggleRadio() {
        var r = APL.radio;
        if (!r) return;
        var st = r.state ? r.state() : {};
        var active = r.isPlaying() || st.playing || st.starting || (r.wanted && r.wanted());
        if (active) {
            r.stop();
            if (APL.toast) APL.toast(APL.lang === "ar" ? "تم إيقاف إذاعة القرآن الكريم فوراً" : APL.t("Radio stopped"), true);
            render();
            return;
        }
        if (APL.toast) APL.toast(APL.lang === "ar" ? "جاري تشغيل إذاعة القرآن الكريم…" : APL.t("Opening the radio…"), true);
        r.play().then(function () { render(); }, function (e) {
            if (APL.toast) APL.toast((e && e.message) || APL.t("The radio needs the internet."));
            render();
        });
    }

    /* ---------- build / render ---------- */
    function buildDom() {
        root = el("section", "aplpage aplpage--glass");
        var head = el("div", "aplpage__head");
        var wrap = el("div", "aplpage__titlewrap");
        titleEl = el("h1", "aplpage__title");
        subEl = el("p", "aplpage__sub");
        wrap.appendChild(titleEl); wrap.appendChild(subEl);
        head.appendChild(wrap);
        bodyEl = el("div", "aplpage__body");
        hintEl = el("p", "aplpage__hint");
        root.appendChild(head); root.appendChild(bodyEl); root.appendChild(hintEl);
        document.body.appendChild(root);
        nav = new APL.Nav({
            onFocus: function (i) { focusIndex = i; },
            onSelect: function (i) { if (tiles[i] && tiles[i].run) tiles[i].run(); },
            onKey: moveVertical,
            /* The main Prayer grid has its own visible-row routing. */
            rawArrowKeys: true,
            onBack: function () {
                if (mode === "wxday") { mode = "weather"; focusIndex = wxReturn; render(); return; }
                if (mode === "hekam-items") { mode = "hekam"; focusIndex = hekamReturn; render(); return; }
                if (mode === "hekam-random") { mode = "hekam"; focusIndex = 0; render(); return; }
                if (mode === "hekam") { focusIndex = mainReturn; mode = "main"; render(); return; }
                if (mode === "city" || mode === "events" || mode === "weather" || mode === "adjust" || mode === "sleep" || mode === "adhkar") {
                    focusIndex = mainReturn;
                    mode = "main";
                    render();
                    return;
                }
                close();
            }
        });
    }

    function render() {
        var keep = Math.min(focusIndex, 999);
        if (mode === "city") buildCity();
        else if (mode === "sleep") buildSleep();
        else if (mode === "events") buildEvents();
        else if (mode === "weather") buildWeather();
        else if (mode === "wxday") buildWxDay();
        else if (mode === "adjust") buildAdjust();
        else if (mode === "adhkar") buildAdhkar();
        else if (mode === "hekam") buildHekamSections();
        else if (mode === "hekam-items") buildHekamItems();
        else if (mode === "hekam-random") buildHekamRandom();
        else buildMain();
        nav.setTiles(tiles.map(function (t) { return t.el; }), true);
        nav.focus(tiles.length ? Math.min(keep, tiles.length - 1) : 0);
    }

    function open() {
        if (!root) buildDom();
        mode = "main";
        openFlag = true;
        if (bodyEl) bodyEl.scrollTop = 0;
        render();
        root.classList.add("is-open");
        document.body.classList.add("has-aplpage");
        APL.pushNav(nav);
        if (p()) p().refresh().then(function () { if (openFlag && mode === "main") render(); });
        // The countdown on the page follows the clock
        clearInterval(tickTimer);
        /* v1.2.96: only the widget is redrawn (not the whole page), and not while the launcher is in the background */
        tickTimer = setInterval(function () {
            if (!openFlag || mode !== "main" || blackoutArmed || document.hidden) return;
            var w = bodyEl && bodyEl.querySelector(".pw-wrap");
            if (w && p()) w.innerHTML = p().widgetHtml({ variant: "page" }) || w.innerHTML;
            else render();
        }, 30000);
    }

    function close() {
        if (!openFlag) return;
        leaveBlackout();
        openFlag = false;
        clearInterval(tickTimer);
        root.classList.remove("is-open");
        document.body.classList.remove("has-aplpage");
        hekamCacheClear();          // v8.6.5: the big wisdom data goes back to the system on leaving the page
        APL.popNav(nav);
    }

    APL.prayerPage = {
        open: open,
        close: close,
        isOpen: function () { return openFlag; },
        refresh: function () { if (openFlag) render(); },
        openOccasions: openOccasions,
        openAdhkar: openAdhkar,
        openHekam: openHekam,
        openWeather: openWeather,
        blackout: enterBlackout,
        isBlackout: function () { return blackoutArmed; },
        leaveBlackout: leaveBlackout
    };

    /* The radio and the alerts change the page while it is open */
    if (APL.radio) APL.radio.onChange(function () { if (openFlag && mode === "main") render(); });
    if (APL.audioPack) APL.audioPack.onChange(function () { if (openFlag && mode === "main") render(); });
    sys.onPref("clockFormat", function () { if (openFlag) render(); });
})(window);
