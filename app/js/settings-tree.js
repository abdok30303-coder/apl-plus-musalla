/* ============================================================
   settings-tree.js — content of the Settings app.

   Apple TV layout, content = the screen's Samsung menus
   (Tizen One UI, Smart Monitor M8), taken from videos of
   "All Settings": Picture, Gaming, Sound, Connection,
   Advanced Features, General & Privacy, Support.

   Entry types:
     menu    -> submenu
     info    -> value read live from the screen (read-only)
     toggle  -> launcher preference On / Off (real)
     choice  -> launcher preference with several choices (real)
     volume  -> real volume (◀ ▶ to adjust); mute -> real mute
     action  -> immediate action (real)
     tv      -> real picture setting of the screen (◀ ▶ to adjust)
     tvmode  -> real picture mode; game -> real Game Mode
     native  -> other real setting of the screen: slider, or list of values
     samsung -> the Samsung settings, a single row: the fallback for what
                the screen does not let the launcher do.
   ============================================================ */
(function (global) {
    "use strict";

    var APL = global.APL, sys = APL.sys;

    /* v8.7.22: English text for strings that were written in Arabic only */
    var HT_D = {
        /* v8.7.24: English for rows that were Arabic only (applied to the whole tree by enTree) */
        "آخر نسخة شغالة": "Last Working Version",
        "نسخة احتياطية من اللانشر على التلفزيون، والرجوع ليها لو النسخة الجديدة وقفت في التشغيل.": "A backup copy of the launcher on the TV, to go back to if the new version stops at startup.",
        "أيقونات أونلاين": "Online Icons",
        "أيقونات حقيقية من كتالوج التطبيقات. محتاج نت.": "Real icons from the app catalog. Needs internet.",
        "استماع تلاوة القرآن في الخلفية": "Quran Recitation in the Background",
        "استمرار تشغيل تلاوة القرآن الكريم عند الخروج من اللانشر أو فتح تطبيقات أخرى (يتطلب دعم الشاشة).": "Keeps the Quran recitation playing when you leave the launcher or open other apps (needs support from the TV).",
        "المصحف والختمة": "Mushaf & Khatma",
        "افتح المصحف، سجّل اللي قرأته، هدف يومي، أيام متتالية، وسورة الكهف يوم الجمعة.": "Open the Mushaf, log what you read, a daily goal, streak days, and Surat Al-Kahf on Friday.",
        "اقفل كل الميزات الثقيلة": "Turn Off All Heavy Features",
        "بتقفل كل الميزات اللي فوق مرة واحدة.": "Turns off every feature above at once.",
        "التمويه والزجاج": "Blur & Glass",
        "تمويه وزجاج على الواجهة. أحلى شكلًا بس أبطأ.": "Blur and glass on the interface. Looks nicer but slower.",
        "الخط": "Font",
        "بيغيّر خط اللانشر كله (الودجات والقوايم والساعة) ماعدا نص المصحف. الخطوط جوّه الحزمة فعلًا ومش بتعتمد على خطوط الشاشة، فالتغيير بيبان على طول.": "Changes the font of the whole launcher (widgets, menus and the clock) except the Mushaf text. The fonts are inside the package and do not depend on the TV's fonts, so the change shows at once.",
        "تجوّل · الافتراضي": "Tajawal (default)",
        "نسخ كلاسيك": "Classic Naskh",
        "مضغوط": "Compact",
        "عريض": "Bold",
        "خط الشاشة (القديم)": "TV font (old)",
        "الراديو في الخلفية": "Radio in the Background",
        "الراديو يكمّل لما تفتح HDMI أو تطبيق تاني (لو اتقطع هيرجع لوحده). لو مش شغال على شاشتك اقفله.": "The radio keeps playing when you open HDMI or another app (it comes back by itself if it drops). Turn it off if it does not work on your TV.",
        "الراديو يكمّل من مشغّل الخلفية": "Radio Continues from the Background Player",
        "لو الشاشة قطعت الراديو وانت على HDMI أو يوتيوب، بيتحوّل لمشغّل الخلفية (بيتخلط مع أي صوت) ويرجع لوحده لما تفتح اللانشر. تجريبي.": "If the TV cuts the radio while you are on HDMI or YouTube, it moves to the background player (mixed with any sound) and returns by itself when you open the launcher. Experimental.",
        "الرف المباشر": "Live Shelf",
        "محتوى اللحظة فوق الرئيسية (أفلام/يوتيوب). محتاج نت.": "What is on right now, above the Home Screen (movies/YouTube). Needs internet.",
        "المحراب الحي": "Living Mihrab",
        "تدفق الصلاة": "Prayer Flow",
        "عدّاد الإقامة بعد الأذان، وبعدها الشاشة بتهدى وترجع لوحدها (مقفول افتراضيًا).": "An iqama countdown after the adhan, then the screen goes quiet and comes back by itself (off by default).",
        "بوستر للتطبيق اللي معندوش خلفية. محتاج نت.": "A poster for an app that has no background. Needs internet.",
        "خلفيات ديناميكية (بوسترات)": "Dynamic Backgrounds (Posters)",
        "لون من الخلفية": "Color from the Wallpaper",
        "بيطلّع لمسة لون خفيفة من صورة الخلفية المحلية على الشاشة الرئيسية.": "Adds a light touch of color taken from the local wallpaper on the Home Screen.",
        "لمسة لون خفيفة من صورة الخلفية المحلية.": "A light touch of color from the local wallpaper.",
        "تلقائي في رمضان: عدّاد السحور والإفطار، مدفع، تنبيه التراويح، وختمة ٣٠ يوم.": "Automatic in Ramadan: suhoor and iftar countdown, cannon, Taraweeh reminder, and a 30-day khatma.",
        "وضع رمضان": "Ramadan Mode",
        "تدرّج السما ولمعة الأذان المتحركة.": "The moving sky gradient and the adhan glow.",
        "حركة المحراب الحي": "Living Mihrab Motion",
        "حركة الخلفية البطيئة": "Slow Background Motion",
        "كاميرا بطيئة فوق صور الرئيسية. بتشغّل الشاشة كتير.": "A slow camera move over the Home Screen pictures. It works the TV hard.",
        "حلقة حوالين الأيقونة المحددة وتعتيم الباقي.": "A ring around the selected icon and a dimmed background.",
        "تمييز العنصر المحدد": "Highlight the Selected Item",
        "زجاج وحركة محسّنة": "Enhanced Glass & Motion",
        "زجاج مموّه وحركة انسيابية. للمعالجات السريعة بس.": "Frosted glass and smooth motion. For fast processors only.",
        "ميزات التحسين الثقيلة": "Heavy Enhancement Features",
        "كل ميزة لوحدها، وكلها مقفولة افتراضيًا.": "Each feature on its own, all off by default.",
        "مؤقتات خفيفة": "Light Timers",
        "مؤقتات شاشة المحراب الحية تعمل على مؤقت مشترك وتتوقف وقت غياب اللانشر (يوتيوب أو HDMI). مفعّل افتراضياً. لا يمس الأذان ولا الراديو ولا المهام. التغيير يسري عند فتح الشاشة المرة القادمة.": "The Living Mihrab screen timers run on one shared timer and pause while the launcher is away (YouTube or HDMI). On by default. It does not touch the adhan, the radio or the tasks. A change takes effect the next time the screen opens.",
        "وقت تشغيل اللانشر": "Launcher Startup Time",
        "تحميل = وصول كود اللانشر، جاهزية = ظهور الشاشة الرئيسية. أرقام آخر 5 تشغيلات على هذا التلفزيون، للمقارنة قبل أي تعديل وبعده.": "Load = the launcher code arrived, ready = the Home Screen is shown. Numbers from the last 5 starts on this TV, to compare before and after any change.",
        "لم يُسجَّل بعد: يُسجَّل في التشغيل التالي": "Not recorded yet: it is recorded on the next start",
        "ويدجت الصلاة في صفحة الاستماع": "Prayer Widget on the Listening Page",
        "يظهر ويدجت الصلاة الكامل (المواقيت والطقس والمهام والمناسبات) أسفل مشغل القرآن. مفعّل افتراضياً.": "Shows the full prayer widget (times, weather, tasks and occasions) below the Quran player. On by default.",
        "قيود وضع الطفل": "Kid Mode Limits",
        "تطبيقات مسموحة، حد يومي، قفل الصلاة والنوم. للكبار فقط.": "Allowed apps, a daily limit, and a prayer and sleep lock. For adults only.",
        "ويدجت حكم ومواعظ بالرئيسية": "Wisdom & Sermons Home Widget",
        "ويدجت حكم ومواعظ (٥ دقائق)": "Wisdom & Sermons Widget (5 min)",
        "يعرض كارت حكمة أو موعظة منفصل على الشاشة الرئيسية ويتغير تلقائياً كل ٥ دقائق (أوفلاين).": "Shows a separate wisdom or sermon card on the Home Screen, changing every 5 minutes (offline).",
        "موضع ويدجت الحكمة": "Wisdom Widget Position",
        "فوق التطبيقات بالمنتصف": "Above the apps, centered",
        "أعلى المنتصف": "Top center",
        "أعلى اليمين": "Top right",
        "أعلى اليسار": "Top left",
        "أسفل المنتصف": "Bottom center",
        "أسفل اليمين": "Bottom right",
        "أسفل اليسار": "Bottom left",
        "متصل بشريط الصلاة": "Attached to the prayer strip",
        "اختر موضع كارت الحكمة منفصلاً في أي زاوية من الشاشة أو متصلاً بشريط الصلاة.": "Choose where the wisdom card sits: any corner of the screen, or attached to the prayer strip.",
        "موضع كارت الحكمة على الشاشة.": "Where the wisdom card sits on the screen.",
        "حجم ويدجت الحكمة": "Wisdom Widget Size",
        "عادي (100%)": "Normal (100%)",
        "كبير (125%)": "Large (125%)",
        "كبير جداً (150%)": "Very large (150%)",
        "ضخم (175%)": "Huge (175%)",
        "أقصى حجم (200%)": "Maximum (200%)",
        "100% عادي": "100% Normal",
        "125% كبير": "125% Large",
        "150% كبير جداً": "150% Very large",
        "175% ضخم": "175% Huge",
        "200% أقصى حجم": "200% Maximum",
        "تحكم في حجم كارت الحكمة والخط ليكون بارزاً ومقروءاً بامتياز على شاشة التلفزيون.": "Sets the size of the wisdom card and its text so it is easy to read on the TV.",
        "حجم كارت الحكمة على الشاشة.": "Size of the wisdom card on the screen.",
        "لون خط ويدجت الحكمة": "Wisdom Widget Text Color",
        "ذهبي ملكي براق": "Royal gold",
        "أبيض ناصع كريستالي": "Crystal white",
        "أزرق سماوي نيون": "Neon sky blue",
        "موف المجرة متوهج": "Glowing galaxy purple",
        "أخضر فسفوري إسلامي": "Islamic neon green",
        "اختر لون خط وتوهج نصوص ويدجت الحكمة.": "Choose the text color and glow of the wisdom widget.",
        "عرض الويدجت بالشاشة كاملة": "Full-Screen-Width Widget",
        "الويدجت بياخد عرض الشاشة الرئيسية فوق صف التطبيقات، ومعاه أقرب ٤ مناسبات والمهام والطقس.": "The widget takes the full width of the Home Screen above the app row, with the next 4 occasions, tasks and weather."
    };
    /* v8.7.24: with English selected, no Arabic-only row may reach the screen: every label, hint, choice and value is mapped. */
    function enStr(s) {
        if (typeof s !== "string" || APL.lang === "ar" || !/[\u0600-\u06FF]/.test(s)) return s;
        if (Object.prototype.hasOwnProperty.call(HT_D, s)) return HT_D[s];
        var m = /^([A-Za-z][A-Za-z ]*?) \u00B7 /.exec(s);      /* "Cairo \u00B7 <arabic name>" -> "Cairo" */
        return m ? m[1] : s;
    }
    function enTree(nd) {
        if (!nd || APL.lang === "ar") return nd;
        nd.label = enStr(nd.label); nd.desc = enStr(nd.desc);
        if (nd.options) nd.options = nd.options.map(function (o) { return (o && o.length > 1) ? [o[0], enStr(o[1])].concat(o.slice(2)) : o; });
        if (typeof nd.get === "function") { var g = nd.get; nd.get = function () { var r = g.apply(this, arguments); return typeof r === "string" ? enStr(r) : r; }; }
        if (nd.children) nd.children.forEach(enTree);
        return nd;
    }
    function HT(s) { return (APL.lang !== "ar" && Object.prototype.hasOwnProperty.call(HT_D, s)) ? HT_D[s] : s; }

    function menu(label, icon, children, desc) { return { type: "menu", label: label, icon: icon, children: children, desc: desc }; }
    function info(label, get, desc) { return { type: "info", label: label, get: get, desc: desc }; }
    function toggle(label, key, desc) { return { type: "toggle", label: label, key: key, desc: desc }; }
    function choice(label, key, options, desc, apply) { return { type: "choice", label: label, key: key, options: options, desc: desc, apply: apply }; }
    function action(label, run, desc, icon) { return { type: "action", label: label, run: run, desc: desc, icon: icon }; }
    /* A row that only works through Vetro: without it on the screen, it says so (settings.js, needsVetro). */
    function vetro(item) { item.vetro = true; return item; }
    /* Real setting of the screen (sys.native): slider without "options", otherwise a list of values. */
    function n(id, label, desc, options, format) { return { type: "native", id: id, label: label, desc: desc, options: options, format: format }; }
    var ON_OFF = [[0, APL.t("Off")], [1, APL.t("On")]];
    /* REAL picture setting, read and written directly on the screen (otherwise "Unavailable"). */
    function tv(id, label, desc) { return { type: "tv", id: id, label: label, desc: desc }; }
    /* Sound output and Bluetooth: the Audio panel of Control Center. */
    function openAudio() { APL.settings.close(); APL.controlCenter.openAudio(); }
    /* The Egyptian places of js/cities.js, for the prayer times and the weather. */
    function cityOptions() {
        var list = [], cu = global.APL_CITY_CUSTOM && global.APL_CITY_CUSTOM();
        if (cu) list.push(["custom", "\u2605 " + cu.en + (cu.cc && global.APL_COUNTRY_NAME ? " \u00b7 " + global.APL_COUNTRY_NAME(cu.cc) : "")]);
        (global.APL_CITIES || []).forEach(function (c) {
            var nm = APL.lang === "ar" ? c.ar : c.en;
            list.push([c.key, c.cc === "EG" ? nm : nm + " \u00b7 " + (global.APL_COUNTRY_NAME ? global.APL_COUNTRY_NAME(c.cc) : c.cc)]);
        });
        return list;
    }
    /* v8.7.28: the city, shown with its country, and the picker (country first, then its cities) on the Prayer page */
    function curCityText() {
        var k = APL.sys.pref("prayerCity") || "cairo", c = global.APL_CITY ? global.APL_CITY(k) : null;
        if (!c) return "";
        var nm = APL.lang === "ar" ? (c.ar || c.en) : (c.en || c.ar), cn = c.cc && global.APL_COUNTRY_NAME ? global.APL_COUNTRY_NAME(c.cc) : "";
        return nm + (cn ? " \u00b7 " + cn : "");
    }
    function openCityPicker() {
        APL.settings.close();
        if (APL.prayerPage) {
            APL.prayerPage.open();
            if (typeof APL.prayerPage.openCity === "function") APL.prayerPage.openCity();
        }
    }
    /* v8.7.21: world support for the prayer times and the weather. */
    function weatherOptions() { return [["same", APL.t("Same as prayer city")]].concat(cityOptions()); }
    function methodOptions() {
        var list = [["auto", APL.t("Automatic (by country)")]];
        (global.APL_METHODS || []).forEach(function (m) { list.push([m.id, APL.lang === "ar" ? m.ar : m.en]); });
        return list;
    }
    function reloadPrayer() { if (APL.prayer && APL.prayer.reload) APL.prayer.reload(); }
    /* Search for a city anywhere: Open-Meteo geocoding (internet), then the list of answers. Same text field as the profile name. */
    function searchCity() {
        var box = document.createElement("div");
        box.className = "pprompt";
        box.innerHTML = '<div class="pprompt__box"><h2 class="pprompt__title">' + APL.t("Search for a city") + '</h2>' +
            '<input class="pprompt__input" type="text" maxlength="40"><p class="pprompt__hint">' + APL.t("Type the city name, then OK \u00b7 Back to cancel") + '</p></div>';
        document.body.appendChild(box);
        var input = box.querySelector("input"), done = false;
        function finish(ok) {
            if (done) return;
            done = true;
            var q = input.value.trim();
            if (box.parentNode) box.parentNode.removeChild(box);
            if (ok && q.length > 1) lookupCity(q);
        }
        input.addEventListener("keydown", function (e) {
            if (e.keyCode === 13) { e.preventDefault(); e.stopPropagation(); finish(true); }
            else if (e.keyCode === 27 || e.keyCode === 10009) { e.preventDefault(); e.stopPropagation(); finish(false); }
        });
        input.addEventListener("blur", function () { setTimeout(function () { finish(true); }, 0); });
        setTimeout(function () { input.focus(); }, 50);
    }
    function lookupCity(q) {
        APL.toast(APL.t("Searching\u2026"), true);
        APL.fetchJSON("https://geocoding-api.open-meteo.com/v1/search?name=" + encodeURIComponent(q) + "&count=8&format=json&language=" + (APL.lang === "ar" ? "ar" : "en"), 12000).then(function (j) {
            var r = (j && j.results) || [];
            if (!r.length) { APL.toast(APL.t("No city found"), true); return; }
            var items = r.map(function (x) {
                var label = x.name + (x.admin1 ? ", " + x.admin1 : "") + (x.country ? " \u00b7 " + x.country : "");
                return { label: label, icon: "sparkle", run: function () { useCity(x); } };
            });
            APL.contextMenu.open(document.querySelector(".srow.is-focused") || document.body, items);
        }).catch(function () { APL.toast(APL.t("No internet connection"), true); });
    }
    /* v8.7.26: the geocoder sometimes sends no time zone. It is then asked of the weather service (timezone=auto) and the city is set only
       once a real zone is known: no silent fallback to Cairo time. */
    function useCity(x) {
        if (x.timezone) { applyCity(x, x.timezone); return; }
        APL.toast(APL.t("Looking up the time zone\u2026"), true);
        APL.fetchJSON("https://api.open-meteo.com/v1/forecast?latitude=" + encodeURIComponent(+x.latitude) + "&longitude=" + encodeURIComponent(+x.longitude) + "&current=temperature_2m&timezone=auto", 12000).then(function (j) {
            if (j && typeof j.timezone === "string" && j.timezone.length > 2 && j.timezone !== "GMT") applyCity(x, j.timezone);
            else APL.toast(APL.t("Could not find this city's time zone. Try another city."), true);
        }).catch(function () { APL.toast(APL.t("Could not find this city's time zone. Try another city."), true); });
    }
    function applyCity(x, tzName) {
        var c = { name: x.name, lat: +x.latitude, lon: +x.longitude, cc: String(x.country_code || "").toUpperCase(), tz: tzName };
        APL.sys.setPref("customPlace", c);
        APL.sys.setPref("weatherPlace", "same");
        APL.sys.setPref("prayerCity", "custom");
        if (APL.prayer) APL.prayer.setCity("custom");
        if (APL.weather) APL.weather.refresh();
        APL.toast(APL.t("City set: {name}", { name: x.name }), true);
    }
    /* v8.7.27: Ramadan and the two Eids: the next date of each, corrected by hand when the announcement differs. */
    function keyDatesText() {
        var I = APL.islamic;
        if (!I || !I.keyDates) return "";
        return I.keyDates().map(function (k) {
            return k.name + " " + I.gregorian(k.start).date + (k.fix ? " (" + signed(k.fix) + ")" : "") + (k.exact ? "" : " \u2248");
        }).join("  \u00b7  ");
    }
    function fixPick(k) {
        var I = APL.islamic, items = [-2, -1, 0, 1, 2].map(function (d) {
            return { label: I.gregorian(k.auto + d).date + (d ? " (" + signed(d) + ")" : " \u2014 " + APL.t("automatic")), icon: d ? "calendar" : "refresh",
                     run: function () { I.setFix(k.hy, k.m, d); APL.toast(k.name + ": " + I.gregorian(k.auto + d).date, true); } };
        });
        APL.contextMenu.open(document.querySelector(".srow.is-focused") || document.body, items);
    }
    function fixDates() {
        var I = APL.islamic;
        if (!I || !I.keyDates) return;
        var items = I.keyDates().map(function (k) {
            return { label: k.name + " \u00b7 " + I.gregorian(k.start).date + (k.fix ? " (" + signed(k.fix) + ")" : "") + (k.exact ? "" : " \u2248"), icon: "calendar",
                     run: function () { setTimeout(function () { fixPick(k); }, 120); } };
        });
        items.push({ label: APL.t("Reset all corrections"), icon: "refresh", run: function () { APL.sys.setPref("hijriFix", {}); APL.toast(APL.t("Corrections removed"), true); } });
        APL.contextMenu.open(document.querySelector(".srow.is-focused") || document.body, items);
    }
    function openDuck() { APL.settings.close(); if (APL.openUrl) APL.openUrl("https://duck.ai/").catch(function (e) { if (APL.toast) APL.toast(e.message); }); }
    function openPrayer() { APL.settings.close(); if (APL.prayerPage) APL.prayerPage.open(); }
    /* Tint: 15 is neutral, below it more green, above it more red. */
    function tintText(v) { return v === 15 ? "0/0" : v < 15 ? APL.t("G{n}", { n: 15 - v }) : "R" + (v - 15); }
    function signed(v) { return v > 0 ? "+" + v : String(v); }
    function balanceText(v) { return v === 10 ? APL.t("Center") : v < 10 ? APL.t("L{n}", { n: 10 - v }) : APL.t("R{n}", { n: v - 10 }); }
    function eqText(v) { return signed((v - 50) / 10); }
    function delayText(v) { return v + " ms"; }

    function getRemapAppChoices() {
        var base = [
            ["default", APL.t("Default (Original TV Action)")],
            ["APLMusalla.Home", APL.t("Salah Launcher")]
        ];
        /* v1.2.103: the screen's HDMI inputs, so a remote button can open one of them (handled by the launcher: system.js handleRemapKey). */
        try {
            if (APL.sources && APL.sources.hdmiPorts) {
                APL.sources.hdmiPorts().forEach(function (p) {
                    base.push(["apl.hdmi:" + p.number, p.hasDevice ? p.name + " \u00b7 " + p.port : p.port]);
                });
            }
        } catch (e) {}
        var realApps = [];
        if (typeof APL.allApps === "function") {
            try {
                realApps = (APL.allApps() || []).filter(function (a) {
                    return a && a.id && !a.virtual && a.id !== "APLMusalla.Home";
                });
            } catch (e) {}
        }
        if (realApps.length > 0) {
            realApps.forEach(function (app) {
                if (!base.some(function (b) { return b[0] === app.id; })) {
                    base.push([app.id, app.name || app.id]);
                }
            });
        } else {
            var defaults = [
                ["org.tizen.tizentube", "TizenTube (YouTube Ad-Free)"],
                ["9uQXbeqlCA.YouTube", "YouTube"],
                ["com.samsung.tv.hotiptv", "Hot IPTV"],
                ["org.stremio.tizen", "Stremio"],
                ["3201512006785", "Shahid"],
                ["3201907018807", "Netflix"],
                ["3201512006463", "Prime Video"],
                ["3201901017640", "Disney+"],
                ["org.videolan.vlc", "VLC Media Player"],
                ["org.xbmc.kodi", "Kodi"],
                ["3201506003175", "Plex"],
                ["org.tizen.browser", APL.t("Samsung Internet Browser")],
                ["com.samsung.tv.tvplus", "Samsung TV Plus"]
            ];
            defaults.forEach(function (d) { base.push(d); });
        }
        return base;
    }

    function applyRemap(primaryCode, altCodes, btnName) {
        return function (appId) {
            if (!appId || appId === "default") {
                sys.setRemapRule(primaryCode, "none").then(function () {
                    (altCodes || []).forEach(function (c) { sys.setRemapRule(c, "none"); });
                    APL.toast(APL.t("Restored {name} to default action", { name: btnName }), true);
                }).catch(function (e) { APL.toast(e.message); });
                return;
            }
            sys.setRemapRule(primaryCode, appId, btnName).then(function () {
                (altCodes || []).forEach(function (c) { sys.setRemapRule(c, appId, btnName); });
                APL.toast(APL.t("Remapped {name} button successfully", { name: btnName }), true);
            }).catch(function (e) { APL.toast(e.message); });
        };
    }

    function build() { return enTree(build0()); }
    function build0() {
        var apps = ((APL.allApps && APL.allApps()) || []).filter(function (a) { return !a.virtual; });
        /* The language is fixed when the launcher starts (i18n.js): changing it reloads the launcher. */
        var language = sys.pref("language");

        return menu(APL.t("Settings"), "display", [

            action(APL.t("Control Center"), function () { APL.settings.close(); APL.controlCenter.open(); },
                APL.t("Also opens with the play/pause button on the remote, or by holding Home."), "sliders"),

            /* -------- Appearance -------- */
            menu(APL.t("Appearance"), "sun", [
                choice(APL.t("Theme"), "appearance", [["light", APL.t("Light")], ["dark", APL.t("Dark")], ["auto", APL.t("Automatic")]],
                    APL.t("Light or dark for backgrounds and menus. Automatic switches to dark at sunset and to light at sunrise.")),
                    choice("\u0627\u0644\u062e\u0637", "uiFont", [["default", "\u062a\u062c\u0648\u0651\u0644 \u00b7 \u0627\u0644\u0627\u0641\u062a\u0631\u0627\u0636\u064a"], ["cairo", "Cairo \u00b7 \u0627\u0644\u0642\u0627\u0647\u0631\u0629"], ["almarai", "Almarai \u00b7 \u0627\u0644\u0645\u0631\u0627\u0626\u064a"], ["plex", "IBM Plex \u00b7 \u0639\u0635\u0631\u064a"], ["kufi", "Noto Kufi \u00b7 \u0643\u0648\u0641\u064a"], ["naskh", "Noto Naskh \u00b7 \u0646\u0633\u062e"], ["elmessiri", "El Messiri \u00b7 \u0627\u0644\u0645\u0633\u064a\u0631\u064a"], ["readex", "Readex \u00b7 \u0631\u064a\u062f\u0643\u0633"], ["changa", "Changa \u00b7 \u062a\u0634\u0627\u0646\u063a\u0627"], ["amiri", "Amiri \u00b7 \u0623\u0645\u064a\u0631\u064a"], ["classic", "\u0646\u0633\u062e \u0643\u0644\u0627\u0633\u064a\u0643"], ["condensed", "\u0645\u0636\u063a\u0648\u0637"], ["heavy", "\u0639\u0631\u064a\u0636"], ["apl", "APL"], ["system", "\u062e\u0637 \u0627\u0644\u0634\u0627\u0634\u0629 (\u0627\u0644\u0642\u062f\u064a\u0645)"]],
                        "\u0628\u064a\u063a\u064a\u0651\u0631 \u062e\u0637 \u0627\u0644\u0644\u0627\u0646\u0634\u0631 \u0643\u0644\u0647 (\u0627\u0644\u0648\u062f\u062c\u0627\u062a \u0648\u0627\u0644\u0642\u0648\u0627\u064a\u0645 \u0648\u0627\u0644\u0633\u0627\u0639\u0629) \u0645\u0627\u0639\u062f\u0627 \u0646\u0635 \u0627\u0644\u0645\u0635\u062d\u0641. \u0627\u0644\u062e\u0637\u0648\u0637 \u062c\u0648\u0651\u0647 \u0627\u0644\u062d\u0632\u0645\u0629 \u0641\u0639\u0644\u064b\u0627 \u0648\u0645\u0634 \u0628\u062a\u0639\u062a\u0645\u062f \u0639\u0644\u0649 \u062e\u0637\u0648\u0637 \u0627\u0644\u0634\u0627\u0634\u0629\u060c \u0641\u0627\u0644\u062a\u063a\u064a\u064a\u0631 \u0628\u064a\u0628\u0627\u0646 \u0639\u0644\u0649 \u0637\u0648\u0644."),
                menu(APL.lang === "ar" ? "التحسينات والمؤثرات البصرية الفاخرة" : "Visual Enhancements & FX", "sparkle", [
                    toggle(APL.lang === "ar" ? "الهالة النورانية المتفاعلة مع التركيز (Aurora Glow)" : "Aurora Focus Glow", "fx_aurora_glow",
                        APL.lang === "ar" ? "هالة ضوئية زمردية وذهبية متفاعلة ونابضة حول العنصر المحدد بالريموت." : "Breathing luminous ambient aura around focused tiles and cards."),
                    toggle(APL.lang === "ar" ? "التدرج السماوي التفاعلي للصلوات (Dynamic Sky)" : "Dynamic Sky Gradient", "fx_dynamic_sky",
                        APL.lang === "ar" ? "تدرجات لونية سماوية غامرة تتغير تلقائياً حسب موقع الشمس (فجر، ضحى، عصر، مغرب، عشاء)." : "Atmospheric sky gradient shifts reflecting prayer times and solar position."),
                    toggle(APL.lang === "ar" ? "الزجاج المصقول الماسي المشطوف (Chamfered Glass)" : "Chamfered Diamond Glass", "fx_chamfer_glass",
                        APL.lang === "ar" ? "حواف زجاجية مشطوفة ببريق ماسي عاكس تعطي مظهراً فائق الفخامة للبطاقات." : "Diamond-beveled frosted glass styling with specular edge highlights."),
                    toggle(APL.lang === "ar" ? "التذهيب والزخرفة الملكية (Royal Islamic Gilding)" : "Royal Islamic Gilding", "fx_royal_gilding",
                        APL.lang === "ar" ? "إطارات ذهبية وزخارف إسلامية ملكية حول بطاقات الصلاة والمصحف الشريف." : "Gold fillet framing and authentic arabesque motifs on cards."),
                    toggle(APL.lang === "ar" ? "الخلفيات الشفقية الحية (Living Mesh Aurora)" : "Living Mesh Aurora", "fx_living_mesh",
                        APL.lang === "ar" ? "حركة شفقية هادئة وبطيئة في خلفية الشاشة الرئيسية تعطي عمقاً حياً دون إجهاد المعالج." : "Gentle ambient living aurora motion in the background."),
                    toggle(APL.lang === "ar" ? "الأرقام المشرقية الفاخرة (Eastern Arabic Numerals)" : "Eastern Arabic Numerals", "fx_eastern_numerals",
                        APL.lang === "ar" ? "عرض الأرقام ومواقيت الصلاة والعد التنازلي بالأرقام المشرقية الأصيلة (١، ٢، ٣...)." : "Display times, counters, and ayah numbers in Eastern Arabic numerals."),
                    toggle(APL.lang === "ar" ? "العمق السينمائي لمشاهد المحراب (Cinematic Mihrab Depth)" : "Cinematic Mihrab Depth", "fx_cinematic_mihrab",
                        APL.lang === "ar" ? "إضاءة بؤرية مسرحية وظلال سينمائية عميقة في صفحة الصلاة وشاشات التوقف." : "Spotlight cone and vignette depth for the Living Mihrab and prayer screen."),
                    toggle(APL.lang === "ar" ? "بطاقة الحكمة الهولوجرافية (Holographic Wisdom Card)" : "Holographic Wisdom Card", "fx_holographic_wisdom",
                        APL.lang === "ar" ? "تأثير بريق موشوري وشعار خطي بارز لبطاقة حكمة اليوم والكلم الطيب." : "Prismatic shimmer and embossed watermark on wisdom cards."),
                    toggle(APL.lang === "ar" ? "الأيقونات المناخية المصغرة النابضة (Animated Weather Icons)" : "Animated Weather Icons", "fx_animated_weather",
                        APL.lang === "ar" ? "أشعة شمس نابضة وحركة سحب خفيفة لأيقونات الطقس في أعلى الشاشة." : "Subtle pulse and drift micro-animations for weather glyphs."),
                    toggle(APL.lang === "ar" ? "الفيزياء الحركية الزنبركية للريموت (Fluid Spring Remote Physics)" : "Spring Remote Physics", "fx_spring_physics",
                        APL.lang === "ar" ? "استجابة زنبركية ناعمة وسريعة بمعدل 60 إطاراً عند التنقل بأسهم الريموت كونترول." : "Fluid 60fps spring bounce and elastic response on TV remote navigation.")
                ], APL.lang === "ar" ? "تحكم في تشغيل أو إيقاف المؤثرات البصرية الفاخرة العشرة بدقة." : "Control and toggle each of the 10 aesthetic visual improvements independently."),
                menu(APL.t("Home Wallpapers"), "photo", [
                    toggle(APL.t("Home Wallpapers"), "wallpapers",
                        APL.t("Six photographs, a new one every five minutes.")),
                    choice(APL.t("Change Every"), "wallpaperEvery", [[5, "5"], [10, "10"], [15, "15"], [30, "30"]],
                        APL.t("Minutes between two photographs.")),
                    choice(APL.t("Wallpaper Source"), "wallpaperSource",
                        [["local", APL.t("Local only")], ["mixed", APL.t("Local and online")], ["online", APL.t("Online only")]],
                        APL.t("Online wallpapers are off unless you choose them here. They come only from two daily collections picked by editors, with no search: the Bing Image of the Day and the NASA Astronomy Picture of the Day. Family-friendly. A picture joins only after it has loaded, so without internet the local ones keep going.")),
                    choice(APL.t("Online Collection"), "onlineWallpaperSource",
                        [["both", APL.t("Both")], ["bing", APL.t("Daily photos (Bing)")], ["nasa", APL.t("Space (NASA)")]],
                        APL.t("Where the online pictures come from. The list is renewed once a day.")),
                    action(APL.t("Download Online Wallpapers Now"), function () {
                        if (!APL.wallpapers) return;
                        if (APL.sys.pref("wallpaperSource") === "local") { APL.toast(APL.t("Choose Local and online, or Online only, in Wallpaper Source first."), true); return; }
                        APL.wallpapers.refreshOnline();
                        APL.toast(APL.t("Looking for new pictures…"), true);
                    }, APL.t("Looks for today's pictures now."), "photo"),
                    action(APL.t("Change the Wallpaper Now"), function () {
                        if (APL.wallpapers) { APL.wallpapers.next(); APL.toast(APL.wallpapers.currentName(), true); }
                    }, APL.t("Goes to the next photograph straight away."), "photo")
                ], APL.t("Wallpapers from Pexels (see CREDITS-wallpapers.md). Online pictures are optional.")),
                menu(APL.t("Weather"), "sun", [
                    action(APL.t("Open Full Weather Forecast"), function () {
                        APL.settings.close();
                        if (APL.prayerPage) {
                            APL.prayerPage.open();
                            if (typeof APL.prayerPage.openWeather === "function") APL.prayerPage.openWeather();
                        }
                    }, APL.t("Opens detailed 7-day forecast, humidity, wind, and live conditions."), "sun"),
                    info(APL.t("City"), function () { return curCityText(); },
                        APL.t("The weather always follows the city of the prayer times. Source: Open-Meteo.")),
                    action(APL.t("Choose Country and City"), openCityPicker,
                        APL.t("One city for the prayer times and the weather. Pick the country first, then the city."), "sparkle"),
                    choice(APL.t("Temperature Unit"), "weatherUnit",
                        [["C", APL.t("Celsius (\u00b0C), km/h")], ["F", APL.t("Fahrenheit (\u00b0F), mph")]],
                        APL.t("Choose the unit of the temperature and the wind."),
                        function () { if (APL.weather) APL.weather.refresh(); }),
                    info(APL.t("Weather"), function () {
                        var w = APL.weather && APL.weather.get();
                        if (!w) return APL.t("Weather unavailable");
                        return w.icon + " " + w.temp + "° " + (APL.lang === "ar" ? w.textAr : w.textEn);
                    }, APL.t("Updated {time}", { time: APL.t("every 15 minutes") })),
                    action(APL.t("Refresh"), function () {
                        if (APL.weather) APL.weather.refresh().then(function () { APL.toast(APL.t("Weather updated successfully"), true); });
                    }, APL.t("Asks Open-Meteo again now."), "update")
                ], APL.t("Open-Meteo, no key, no device location.")),
                menu(APL.t("Top Shelf"), "photo", [
                    info(APL.t("Online Content"), function () { return APL.t("Disabled"); },
                        APL.t("What You're Watching, What's Popular and the artwork searched online are removed from this build: no poster, logo or background is fetched from the internet. The shelf shows the apps' own packaged images.")),
                    choice(APL.t("Look"), "shelfArt",
                        [["sheets", APL.t("Sheets of Light")], ["logo", APL.t("Large Logo")], ["black", APL.t("Black")]],
                        APL.t("Apps with their own artwork keep it (YouTube, Netflix, Steam…). For the others: soft sheets of light in their colors, or their logo on a halo of their color. Black: plain dark behind every app, artwork included."),
                        function () { if (APL.restyleArt) APL.restyleArt(); })
                ], APL.t("No online source: the shelf always uses the look chosen here.")),
                toggle(APL.t("Visual Effects"), "visualEffects", APL.t("Blur and glass. Prettier but slower: turn it off if the screen feels slow.")),
                toggle(APL.t("Enhanced Glass & Motion"), "richFx",
                    APL.t("Apple TV-style depth, fluid spring motion and real frosted glass blur. Turn it off if the screen feels slow.")),
                toggle(APL.t("Dynamic Backdrops"), "cleanFrameBackdrops",
                    APL.t("Off by default. On: apps with nothing of their own to show get a poster of a popular title from JustWatch (needs the internet, no key). Off: nothing is downloaded.")),
                toggle(APL.t("Slow Background Motion"), "bgMotion", APL.t("A slow camera move over the Home Screen images. Pretty, but it keeps the screen very busy and slows everything else down.")),
                choice(APL.t("Night Dimming"), "nightDim",
                    [["off", APL.t("Off")], ["sun", APL.t("Maghrib to Fajr")], ["20", APL.t("From 8 PM")], ["21", APL.t("From 9 PM")], ["22", APL.t("From 10 PM")], ["23", APL.t("From 11 PM")]],
                    APL.t("From the chosen hour until 6:00 (or from Maghrib to Fajr) the artwork behind the icons is dimmed and stops moving."))
            ], APL.t("Theme, Top Shelf, visual effects.")),

            /* -------- Home Screen -------- */
            menu(APL.t("Home Screen"), "grid", [
                menu(APL.t("Show on Home Screen"), "apps", [
                    // The launcher's own Smart Hub tile first: the way out to Samsung's home
                    { type: "hide", label: "Smart Hub", id: "apl.samsunghome",
                      desc: APL.t("A tile that opens Samsung's Smart Hub, the way out now that the Home button opens the launcher. Press Home there to come back.") }
                ].concat(apps.map(function (a) {
                    return { type: "hide", label: a.name, id: a.id, desc: APL.t("OK to show or hide “{name}” on the Home Screen.", { name: a.name }) };
                })), APL.t("Choose the apps shown on the Home Screen.")),
                info(APL.t("Rearrange"), function () { return APL.t("Hold OK"); },
                    APL.t("On the Home Screen, hold OK on an app: Edit Home Screen, Hide App or Delete App.")),
                action(APL.t("Change the App Order with the Remote"), function () {
                    APL.settings.close();
                    APL.toast(APL.t("On the Home Screen, hold OK on an app: Edit Home Screen, then move it with the arrows."), true);
                }, APL.t("The first row keeps your order."), "grid"),
                toggle(APL.t("Sort the Rows by Use"), "statsOrder",
                    APL.t("The first row keeps your order. The rows below put the apps you open the most (in APL) first. Every profile keeps its own counts.")),
                action(APL.t("System Components"), function () {
                    APL.settings.close();
                    if (APL.systemPage) APL.systemPage.open();
                }, APL.t("Some Samsung services and plugins look like apps. They are hidden here; nothing is deleted or disabled on the screen."), "shield"),
                action(APL.t("Save Settings and App Order"), function () {
                    APL.settings.close();
                    if (APL.backup) APL.backup.open();
                }, APL.t("The backup follows each profile: its layout, its hidden apps, its statistics."), "backup"),
                choice(APL.t("Apps per Row"), "appsPerRow", [[5, "5"], [6, "6"], [7, "7"]],
                    APL.t("In the dock and in every row below. 5: bigger tiles, 7: more apps with a Top Shelf.")),
                toggle(APL.t("Search Hidden Apps"), "searchHidden",
                    APL.t("Search also finds the apps hidden from the Home Screen. Off: only what the Home Screen and its folders show.")),
                toggle(APL.t("Focus Highlight"), "focusFx", APL.t("A white ring around the selected icon, the others slightly dimmed.")),
                choice(APL.t("Focus Ring Colour"), "ringColour",
                    [["white", APL.t("White")], ["app", APL.t("App colour")], ["green", APL.t("Green")]],
                    APL.t("The colour of the ring around the selected icon.")),
                choice(APL.t("Focus Ring Thickness"), "ringSize",
                    [["thin", APL.t("Thin")], ["medium", APL.t("Medium")], ["thick", APL.t("Thick")]],
                    APL.t("How thick the ring around the selected icon is.")),
                toggle(APL.t("Number Keys"), "numberKeys", APL.t("1 to 6 select the icons of the first row; pressing the same number again opens the app.")),
                toggle(APL.t("Full Screen Hint"), "showHint", APL.t("Shows “Press ▲ for full screen” on the Home Screen.")),
                toggle(APL.t("Return to the Launcher"), "homeReturn", APL.t("When an app closes, the screen comes back here instead of the Samsung home screen."))
            ], APL.t("The apps shown, their order, and coming back here.")),

            action(APL.t("duck.ai (Internet)"), openDuck,
                APL.t("Opens duck.ai in the TV browser."), "sparkle"),

            /* -------- Prayer and Quran (this build) -------- */
            menu(APL.t("Prayer and Quran"), "moon", [
                choice(APL.lang === "ar" ? "أيقونة بطاقة الصلاة والقرآن" : "Prayer Tile Icon", "prayerTileIcon", [
                    ["mosaly", APL.lang === "ar" ? "المصلي الذهبي (الافتراضي)" : "Al-Mosaly Gold (Default)"],
                    ["mosque", APL.lang === "ar" ? "المسجد والهلال الكحلي" : "Mosque & Crescent (Blue/Teal)"],
                    ["topcinema", APL.lang === "ar" ? "شعار توب سينما" : "Top Cinema Logo"],
                    ["vector", APL.lang === "ar" ? "المسجد الزمردي المتجهي" : "Emerald Vector Mosque"]
                ], APL.lang === "ar" ? "اختر مظهر وأيقونة بطاقة الصلاة والقرآن على الشاشة الرئيسية." : "Choose the appearance of the Prayer and Quran tile on the Home Screen.", function () {
                    if (APL.refreshHome) APL.refreshHome();
                    APL.toast(APL.lang === "ar" ? "تم تحديث أيقونة الصلاة والقرآن" : "Prayer icon updated", true);
                }),
                action(APL.lang === "ar" ? "مشغل استماع القرآن الكريم عبر الإنترنت" : "Online Quran Audio Player", function () {
                    APL.settings.close();
                    if (APL.quranAudio) APL.quranAudio.open();
                }, APL.lang === "ar" ? "استماع لتلاوات القرآن الكريم بأصوات كبار القراء مع التفسير والبحث المباشر." : "Listen to online Quran recitations from top reciters with verse-by-verse Saadi/Muyassar Tafsir.", "headphones"),
                action(APL.t("Prayer Times"), openPrayer,
                    APL.t("Today's six times, the next prayer, the radio and the black screen."), "moon"),
                toggle(APL.t("Detect Location Automatically"), "prayerAuto",
                    APL.t("Off by default. When on, the screen asks public IP-location services (ipwho.is and others) for an approximate position, every 12 hours. When off, nothing is sent. Choosing a city by hand turns this off.")),
                info(APL.t("Detected Location"), function () { return APL.autoLocation ? APL.autoLocation.describe() : ""; },
                    APL.t("The city used for the prayer times, the weather and the Hijri calendar.")),
                action(APL.t("Detect Location Now"), function () {
                    if (!APL.autoLocation) return;
                    APL.toast(APL.t("Detecting the location…"), true);
                    APL.autoLocation.detect(true);
                }, APL.t("One check now: sends your Internet address to public IP-location services (needs internet; without it the screen's own country and time zone are used). Does not turn automatic detection on."), "sparkle"),
                action(APL.t("Update Prayer Times & Islamic Calendar"), function () {
                    APL.toast(APL.t("Updating prayer times & calendar…"), true);
                    if (APL.prayer) {
                        APL.prayer.refresh().then(function () {
                            if (APL.islamic && APL.islamic.clearCache) APL.islamic.clearCache();
                            APL.toast(APL.t("Prayer times and Islamic calendar updated successfully"), true);
                        }).catch(function (e) { APL.toast(e.message); });
                    }
                }, APL.t("Manually syncs prayer times and Hijri calendar with the Egyptian General Authority of Survey / AlAdhan API."), "refresh"),
                choice(APL.t("Hijri Date Adjustment"), "hijriOffset", [
                    [-2, "-2 " + APL.t("days")],
                    [-1, "-1 " + APL.t("day")],
                    [0, APL.t("Automatic (Egypt Official)")],
                    [1, "+1 " + APL.t("day")],
                    [2, "+2 " + APL.t("days")]
                ], APL.t("Adjust Hijri calendar by ±1 or ±2 days according to Dar Al-Ifta Egypt moon sighting announcement."), function () {
                    if (APL.islamic && APL.islamic.clearCache) APL.islamic.clearCache();
                    APL.toast(APL.t("Hijri calendar adjusted"), true);
                }),
                choice(APL.t("Hijri Calendar Source"), "hijriSource", [
                    ["auto", APL.t("Automatic (by the country)")],
                    ["egypt", APL.t("Egypt (Dar Al-Ifta, crescent rule)")],
                    ["HJCoSA", APL.t("Saudi Arabia (announcements)")],
                    ["UAQ", APL.t("Umm Al-Qura (Saudi civil)")],
                    ["DIYANET", APL.t("Turkey (Diyanet)")]
                ], APL.t("Which authority's Hijri calendar sets Ramadan and the Eids. Automatic follows the country of the city."), function () {
                    APL.toast(APL.t("Hijri calendar updated"), true);
                }),
                info(APL.t("Ramadan & Eid Dates"), keyDatesText,
                    APL.t("Worked out from the moon and renewed by itself; \u2248 means not announced yet.")),
                action(APL.t("Correct Ramadan & Eid Dates"), fixDates,
                    APL.t("If the announcement differs by a day, shift Ramadan or an Eid by hand."), "calendar"),
                action(APL.t("Islamic Occasions & Holidays"), function () {
                    APL.settings.close();
                    if (APL.prayerPage) {
                        APL.prayerPage.open();
                        if (typeof APL.prayerPage.openOccasions === "function") APL.prayerPage.openOccasions();
                    }
                }, APL.t("Browse Islamic occasions, Ramadan countdown, and Eid dates."), "calendar"),
                action(APL.t("Morning & Evening Adhkar"), function () {
                    APL.settings.close();
                    if (APL.prayerPage) {
                        APL.prayerPage.open();
                        if (typeof APL.prayerPage.openAdhkar === "function") APL.prayerPage.openAdhkar();
                    }
                }, APL.t("Read authentic morning and evening adhkar with counters."), "book"),
                action("المصحف والختمة", function () { if (APL.khatma) APL.khatma.panel(); },
                    "افتح المصحف، سجّل اللي قرأته، هدف يومي، أيام متتالية، وسورة الكهف يوم الجمعة.", "book"),
                action("وضع رمضان", function () { if (APL.ramadan) APL.ramadan.panel(); },
                    "تلقائي في رمضان: عدّاد السحور والإفطار، مدفع، تنبيه التراويح، وختمة ٣٠ يوم.", "moon"),
                action("تدفق الصلاة", function () { if (APL.prayerFlow) APL.prayerFlow.panel(); },
                    "عدّاد الإقامة بعد الأذان، وبعدها الشاشة بتهدى وترجع لوحدها (مقفول افتراضيًا).", "moon"),
                info(APL.t("Next Prayer"), function () {
                    var n = APL.prayer && APL.prayer.next();
                    if (!n) return APL.t("Loading…");
                    return n.name + " " + APL.prayer.hhmm(n.time) + " · " + APL.prayer.left(n.ms);
                }, (APL.prayer && APL.prayer.methodNote ? APL.prayer.methodNote() : APL.t("Times from AlAdhan, Egyptian General Authority of Survey. Timezone Africa/Cairo."))),
                info(APL.t("City"), function () { return curCityText(); },
                    (APL.prayer && APL.prayer.methodNote ? APL.prayer.methodNote() : APL.t("Times from AlAdhan, Egyptian General Authority of Survey. Timezone Africa/Cairo."))),
                action(APL.t("Choose Country and City"), openCityPicker,
                    APL.t("One city for the prayer times and the weather. Pick the country first, then the city."), "sparkle"),
                action(APL.t("Search for a city anywhere"), searchCity,
                    APL.t("Needs internet. Finds any city in the world for the prayer times and the weather."), "sparkle"),
                choice(APL.t("Calculation Method"), "prayerMethod", methodOptions(),
                    APL.t("Automatic picks the usual method of the country."), reloadPrayer),
                choice(APL.t("Asr Time"), "prayerSchool",
                    [[0, APL.t("Standard (Shafi, Maliki, Hanbali)")], [1, APL.t("Hanafi (later Asr)")]],
                    APL.t("Hanafi Asr starts when the shadow is twice the object."), reloadPrayer),
                choice(APL.t("High-Latitude Rule"), "prayerHighLat",
                    [["auto", APL.t("Automatic")], [1, APL.t("Middle of the night")], [2, APL.t("One-seventh of the night")], [3, APL.t("Angle-based")]],
                    APL.t("For far-north and far-south cities, where the sun does not go deep enough below the horizon."), reloadPrayer),
                choice(APL.t("Prayer Widget Size"), "prayerWidgetScale",
                    [[0, APL.t("Current size") + " 100%"], [25, "125%"], [50, "150%"], [75, "175%"], [100, "200%"], [150, "250%"], [200, "300%"]],
                    APL.t("Makes the prayer widget on the Home Screen bigger than its current size.")),
                toggle(HT("\u0639\u0631\u0636 \u0627\u0644\u0648\u064a\u062f\u062c\u062a \u0628\u0627\u0644\u0634\u0627\u0634\u0629 \u0643\u0627\u0645\u0644\u0629"), "prayerWidgetFull",
                    HT("\u0627\u0644\u0648\u064a\u062f\u062c\u062a \u0628\u064a\u0627\u062e\u062f \u0639\u0631\u0636 \u0627\u0644\u0634\u0627\u0634\u0629 \u0627\u0644\u0631\u0626\u064a\u0633\u064a\u0629 \u0641\u0648\u0642 \u0635\u0641 \u0627\u0644\u062a\u0637\u0628\u064a\u0642\u0627\u062a\u060c \u0648\u0645\u0639\u0627\u0647 \u0623\u0642\u0631\u0628 \u0664 \u0645\u0646\u0627\u0633\u0628\u0627\u062a \u0648\u0627\u0644\u0645\u0647\u0627\u0645 \u0648\u0627\u0644\u0637\u0642\u0633.")),
                toggle(HT("ويدجت حكم ومواعظ بالرئيسية"), "hekamWidget",
                    HT("يعرض كارت حكمة أو موعظة منفصل على الشاشة الرئيسية ويتغير تلقائياً كل ٥ دقائق (أوفلاين).")),
                choice(HT("موضع ويدجت الحكمة"), "hekamPos", [
                    ["above-dock", HT("فوق التطبيقات بالمنتصف")],
                    ["top-center", HT("أعلى المنتصف")],
                    ["top-right", HT("أعلى اليمين")],
                    ["top-left", HT("أعلى اليسار")],
                    ["bottom-center", HT("أسفل المنتصف")],
                    ["bottom-right", HT("أسفل اليمين")],
                    ["bottom-left", HT("أسفل اليسار")],
                    ["inline", HT("متصل بشريط الصلاة")]
                ], HT("اختر موضع كارت الحكمة منفصلاً في أي زاوية من الشاشة أو متصلاً بشريط الصلاة.")),
                choice(HT("حجم ويدجت الحكمة"), "hekamScale", [
                    [100, HT("عادي (100%)")],
                    [125, HT("كبير (125%)")],
                    [150, HT("كبير جداً (150%)")],
                    [175, HT("ضخم (175%)")],
                    [200, HT("أقصى حجم (200%)")]
                ], HT("تحكم في حجم كارت الحكمة والخط ليكون بارزاً ومقروءاً بامتياز على شاشة التلفزيون.")),
                choice(HT("لون خط ويدجت الحكمة"), "hekamColor", [
                    ["gold", HT("ذهبي ملكي براق")],
                    ["white", HT("أبيض ناصع كريستالي")],
                    ["sky", HT("أزرق سماوي نيون")],
                    ["galaxy", HT("موف المجرة متوهج")],
                    ["green", HT("أخضر فسفوري إسلامي")]
                ], HT("اختر لون خط وتوهج نصوص ويدجت الحكمة.")),
                toggle(APL.t("Prayer Alerts"), "prayerAlerts",
                    APL.t("A short spoken alert at each prayer time. Not the full call to prayer.")),
                action(APL.t("Test the Isha Alert"), function () {
                    if (APL.prayerAlert) APL.prayerAlert.test();
                }, APL.t("Plays the short alert of the Isha prayer."), "speaker"),
                action(APL.t("Black Screen"), function () {
                    APL.settings.close();
                    setTimeout(function () { if (APL.prayerPage) APL.prayerPage.blackout(); }, 260);
                }, APL.t("A black layer inside the launcher, not the screen's own light off. Any button brings the picture back."), "moon")
            ], APL.t("Prayer times, alerts, Islamic occasions and the black screen.")),

            /* -------- Tasks & Countdown (this build) -------- */
            menu(APL.t("Tasks"), "clock", [
                action(APL.t("Open Tasks"), function () {
                    APL.settings.close();
                    setTimeout(function () { if (APL.tasksPage) APL.tasksPage.open(); }, 180);
                }, APL.t("Schedule tasks inside the launcher and see the live countdown until the next task."), "clock"),
                action(APL.t("Add New Task"), function () {
                    APL.settings.close();
                    setTimeout(function () { if (APL.tasksPage) APL.tasksPage.open("add"); }, 180);
                }, APL.t("Add a task with custom title, time, and daily or one-time schedule."), "clock"),
                info(APL.t("Next Task"), function () {
                    var nx = APL.tasks && APL.tasks.next();
                    if (!nx) return APL.t("No upcoming tasks");
                    return nx.title + " (" + APL.tasks.dayLabel(nx.targetDay, nx.repeat) + " " +
                           APL.tasks.hhmm(nx.time) + ") · " + APL.tasks.left(nx.ms);
                }, APL.t("Remaining time until the next scheduled task.")),
                toggle(APL.t("Show Next Task Countdown"), "showNextTask",
                    APL.t("Shows how much time is left until the next task on the Home Screen.")),
                toggle(APL.t("Show When List Is Empty"), "showEmptyTaskHint",
                    APL.t("Shows a compact Tasks line on the Home Screen even when no upcoming task is scheduled.")),
                toggle(APL.t("Task Alerts"), "taskAlerts",
                    APL.t("Plays a sound alert through Vetro even if another app is open.")),
                action(APL.t("Test Task Alert"), function () {
                    if (APL.prayerAlert) APL.prayerAlert.test("task");
                }, APL.t("Plays the task alert chime now."), "speaker")
            ], APL.t("Add tasks inside the launcher and show the time remaining until the next task.")),

            /* -------- Remote and Devices -------- */
            menu(APL.t("Remote and Devices"), "remote", [
                choice(APL.t("Play/Pause Button"), "pauseKey", [
                    ["samsunghome", APL.t("Samsung Home (Smart Hub)")],
                    ["controlcenter", APL.t("Control Center")],
                    ["playpause", APL.t("Play and Pause")]
                ], APL.t("What the play/pause button does on the remote: open Samsung's Smart Hub, open the launcher's Control Center, or play and pause.")),
                vetro(action(APL.t("Set Up the Remote Buttons"), function () { APL.overlay.setUpButtons(); },
                    APL.t("Sends Home and ⏯ to Salah Launcher in Vetro, as APL Launcher Setup does. For a launcher installed from a phone with Apps2Samsung, or when Home opens Samsung's home again."), "remote")),
                vetro(action(APL.t("Alexa on the Microphone Button"), function () { APL.settings.close(); APL.services.alexaMic(); },
                    APL.t("Do this once: in the Voice menu, choose Amazon Alexa and sign in to your Amazon account. Then hold the microphone button on the remote and talk to Alexa."), "mic")),
                toggle("Alexa (Echo Dot)", "alexaBridge", APL.t("Say “Alexa, discover my devices” once. Then: “Alexa, turn on TizenTube”, “Alexa, turn off the screen”, “Alexa, turn on the AirPods”, “Alexa, turn on game mode”.")),
                toggle(APL.t("Channel Up / Down"), "channelKeys",
                    APL.t("Opens Salah Launcher Settings with Channel Up or Channel Down. Samsung may keep these buttons for itself.")),
                action("Bluetooth", openAudio, APL.t("Connect or pair AirPods, headphones or a speaker."), "bluetooth")
            ], APL.t("The remote's buttons, Alexa, Bluetooth.")),

            /* -------- Account -------- */
            menu(APL.t("Users and Accounts"), "person", [
                action(APL.t("Household Profiles"), function () { APL.settings.close(); if (APL.profilesUI) APL.profilesUI.open(); },
                    APL.t("Choose, add, rename or delete a profile. Each one keeps its own Home Screen, preferences and recent apps."), "person"),
                info(APL.t("Current Profile"), function () { return sys.pref("profileName") || "—"; }, APL.t("The profile chosen at the top right."))
            ], APL.t("Household profiles.")),

            /* -------- Picture (everything seen in the videos) -------- */
            menu(APL.t("Picture"), "display", [
                { type: "tvmode", label: APL.t("Picture Mode"), desc: APL.t("Dynamic, Standard, Eco, Movie. Changes right away. Each mode keeps its own settings.") },
                tv("backlight", APL.t("Backlight"), APL.t("Screen brightness. ◀ ▶ to adjust, live.")),
                tv("contrast", APL.t("Contrast"), APL.t("◀ ▶ to adjust, live.")),
                tv("sharpness", APL.t("Sharpness"), APL.t("◀ ▶ to adjust, live.")),
                tv("color", APL.t("Color"), APL.t("Color saturation. ◀ ▶ to adjust, live.")),
                menu(APL.t("Eye Care"), "sparkle", [
                    n("eyeSaver", APL.t("Eye Saver Mode"), APL.t("Reduces blue light."), ON_OFF),
                    n("adaptive", APL.t("Adaptive Picture"), APL.t("Adjusts the picture to the light in the room."), ON_OFF)
                ], APL.t("Eye protection and adaptive picture.")),
                menu(APL.t("Expert Settings"), "sliders", [
                    n("tint", APL.t("Tint (G/R)"), APL.t("◀ ▶ to adjust, live."), null, tintText),
                    n("contrastUp", APL.t("Contrast Enhancer"), APL.t("Adjusts the picture's contrast automatically."), [[0, APL.t("Disabled")], [1, APL.t("Low")], [3, APL.t("High")]]),
                    n("shadow", APL.t("Shadow Detail"), APL.t("Brightens or darkens the dark areas."), null, signed),
                    n("gamma", APL.t("Gamma"), APL.t("BT.1886 curve: darker or brighter in the midtones."), null, signed),
                    n("colorSpace", APL.t("Color Space"), APL.t("Auto follows the source, Native uses all the colors of the screen."), [[0, APL.t("Auto")], [1, APL.t("Native")]]),
                    n("colorTone", APL.t("Color Tone"), APL.t("Cool leans blue, warm leans red."), [[1, APL.t("Cool")], [2, APL.t("Standard")], [5, APL.t("Warm1")], [6, APL.t("Warm2")]]),
                    n("clarity", APL.t("Picture Clarity"), APL.t("Smooths moving pictures."), [[0, APL.t("Disabled")], [2, APL.t("Auto")], [4, APL.t("Custom")]]),
                    n("blur", APL.t("Blur Reduction"), APL.t("In Custom mode."), null),
                    n("judder", APL.t("Judder Reduction"), APL.t("In Custom mode."), null)
                ], APL.t("Fine-tuning of the picture.")),
                info(APL.t("Screen Resolution"), sys.display),
                info("HDR", function () { return sys.hdr(); })
            ], APL.t("Picture Mode, colors and fine-tuning.")),

            /* -------- Gaming -------- */
            menu(APL.t("Gaming"), "gamepad", [
                { type: "game", label: APL.t("Game Mode"), desc: APL.t("Reduces latency for consoles and PCs on HDMI and USB-C. OK to change.") },
                vetro(toggle(APL.t("Use the Screen's Input Name"), "hdmiTvName",
                    APL.t("Opens HDMI with the input name the screen itself keeps (for example PC), as Samsung's own home does, so the screen uses its PC picture. Turn off to send the launcher's own name."))),
                vetro(toggle(APL.t("Neutral HDMI Picture on Open"), "hdmiPicFix",
                    APL.t("After an HDMI input opens from the launcher, puts Warm/Cool color tone back to Standard and Native color space to Auto. The picture mode (Entertainment, Game…) is never changed. For a yellowish, dull picture. Off by default."))),
                vetro(toggle(APL.t("HDMI via Samsung Home"), "hdmiViaHome",
                    APL.t("Opens HDMI as if chosen from Samsung's own home screen, for the clean picture. The Samsung home shows for a moment first. Turn off to send the request straight from the launcher.")))
            ], APL.t("Game Mode.")),

            /* -------- Sound -------- */
            menu(APL.t("Sound"), "speaker", [
                { type: "volume", label: APL.t("Volume"), desc: APL.t("◀ ▶ to adjust. The screen's real setting.") },
                { type: "mute", label: APL.t("Mute"), desc: APL.t("Turns the sound off or back on.") },
                toggle(APL.t("Sound Effects"), "uiSounds", APL.t("Little clicks when moving through the menus, like on Apple TV.")),
                info(APL.t("Digital Output Audio Format"), function () { return sys.audio.outputMode(); }),
                action(APL.t("Sound Output"), openAudio, APL.t("Screen speakers, AirPods, Bluetooth headphones and speakers."), "speaker"),
                n("soundMode", APL.t("Sound Mode"), APL.t("Amplify boosts voices and volume."), [[1, APL.t("Standard")], [5, APL.t("Amplify")]]),
                n("autoVolume", APL.t("Auto Volume"), APL.t("Evens out the volume between sources."), [[0, APL.t("Disabled")], [1, APL.t("Normal")], [2, APL.t("Night")]]),
                menu(APL.t("Expert Settings"), "sound", [
                    n("balance", APL.t("Balance"), APL.t("◀ ▶ toward the left or the right."), null, balanceText),
                    n("eq0", APL.t("Equalizer: 100 Hz"), APL.t("Bass."), null, eqText),
                    n("eq1", APL.t("Equalizer: 300 Hz"), "", null, eqText),
                    n("eq2", APL.t("Equalizer: 1 kHz"), APL.t("Voices."), null, eqText),
                    n("eq3", APL.t("Equalizer: 3 kHz"), "", null, eqText),
                    n("eq4", APL.t("Equalizer: 10 kHz"), APL.t("Treble."), null, eqText),
                    n("delay", APL.t("Digital Output Audio Delay"), APL.t("Fixes the lag between picture and sound."), null, delayText),
                    n("earc", APL.t("HDMI-eARC Mode"), APL.t("For a soundbar on HDMI-eARC."), ON_OFF),
                    n("feedback", APL.t("Sound Feedback"), APL.t("The sounds of the Samsung menus."), [[0, APL.t("Disabled")], [1, APL.t("Low")], [2, APL.t("Medium")], [3, APL.t("High")]])
                ], APL.t("Balance, equalizer, eARC, audio delay."))
            ], APL.t("Sound Output, Sound Mode, equalizer.")),

            /* -------- Screen Saver (launcher) -------- */
            menu(APL.t("Screen Saver"), "photo", [
                choice(APL.t("Start After"), "screensaverDelay",
                    [[0, APL.t("Never")], [2, APL.t("2 minutes")], [5, APL.t("5 minutes")], [10, APL.t("10 minutes")], [15, APL.t("15 minutes")], [30, APL.t("30 minutes")]],
                    APL.t("Idle time on the Home Screen before the screen saver starts.")),
                choice(APL.t("Type"), "screensaverStyle", [["wallpaper", APL.t("Wallpapers")], ["mihrab", "\u0627\u0644\u0645\u062d\u0631\u0627\u0628 \u0627\u0644\u062d\u064a"], ["art", APL.t("App artwork")], ["clock", APL.t("Large clock over the artwork")], ["dark", APL.t("Clock on black")]],
                    APL.t("Wallpapers: the pictures of the Home Screen (local, plus the online ones if you chose them in Appearance › Home Wallpapers), crossfading every 20 seconds. The Apple Aerial videos are gone.")),
                toggle(APL.t("Radio Button in the Screen Saver"), "mihrabRadio",
                    APL.t("In the Living Mihrab screen saver, OK starts or stops the Quran radio and the screen saver stays. Any other key leaves it. Off: every key leaves it.")),
                choice(APL.t("Move the Clock"), "screensaverClockMove",
                    [[0, APL.t("Off")], [1, APL.t("Every minute")], [2, APL.t("Every 2 minutes")], [3, APL.t("Every 3 minutes")], [4, APL.t("Every 4 minutes")], [5, APL.t("Every 5 minutes")]],
                    APL.t("For OLED screens: the clock goes round the four corners, a few pixels off each time, so no spot stays lit for hours.") +
                    (APL.sys.isOled && APL.sys.isOled() ? " " + APL.t("This screen is an OLED: it's on unless you turn it off.") : "")),
                action(APL.t("Preview"), function () { APL.settings.close(); if (APL.screensaver) APL.screensaver.start(); }, APL.t("Starts the screen saver now. Press any button to exit."))
            ], APL.t("Apple TV–style screen saver.")),

            /* -------- Connection -------- */
            menu(APL.t("Connection"), "wifi", [
                menu(APL.t("Network"), "wifi", [
                    info(APL.t("Status"), function () { return sys.network().connected ? APL.t("Connected") : APL.t("Disconnected"); }),
                    info(APL.t("Connection Type"), function () { return sys.network().type; }),
                    info(APL.t("Network Name"), function () { return sys.network().ssid; }),
                    info(APL.t("Signal Strength"), function () { var n = sys.network(); return n.type === "Wi-Fi" ? n.signal + " / 5" : "—"; }),
                    info(APL.t("IP Address"), function () { return sys.network().ip; }),
                    info(APL.t("MAC Address"), function () { return sys.network().mac; }),
                    info(APL.t("Gateway"), function () { return sys.network().gateway; }),
                    info(APL.t("DNS Server"), function () { return sys.network().dns; })
                ], APL.t("Network status and addresses.")),
                action("AirPlay", function () { APL.settings.close(); APL.controlCenter.openAirPlay(); }, APL.t("Stream from an iPhone, iPad or Mac."), "airplay"),
                menu("HDMI", "hdmi", [
                    n("hdmiBlack", APL.t("HDMI Black Level"), APL.t("Change it if blacks look gray or crushed."), [[0, APL.t("Normal")], [1, APL.t("Auto")], [2, APL.t("Low")]])
                ], APL.t("HDMI input settings."))
            ], APL.t("Network, AirPlay, HDMI.")),

            /* -------- Apps -------- */
            menu(APL.t("Apps"), "apps", [
                toggle(APL.t("Online App Icons"), "onlineIcons",
                    APL.t("Off unless you turn it on. Apps that have no tile of their own get their real icon from the App Store catalogue, found by the app's exact name. Only app icons are asked for, one installed app at a time. They are kept on the screen. Posters and logos are still never searched.")),
                action(APL.t("Download Missing Icons Now"), function () {
                    if (APL.sys.pref("onlineIcons") !== true) { APL.toast(APL.t("Turn on Online App Icons first."), true); return; }
                    APL.toast(APL.t("Looking for icons…"), true);
                    if (APL.refreshArt) APL.refreshArt();
                }, APL.t("Looks again for the apps that still have the screen's small icon."), "apps"),
                action(APL.t("Delete Downloaded Icons"), function () {
                    if (APL.autoArt && APL.autoArt.clear) APL.autoArt.clear();
                    if (APL.refreshHome) APL.refreshHome();
                    APL.toast(APL.t("Downloaded icons deleted."), true);
                }, APL.t("Removes the icons kept on the screen. The screen's own icons come back."), "apps"),
                action(APL.t("System Components"), function () {
                    APL.settings.close();
                    if (APL.systemPage) APL.systemPage.open();
                }, APL.t("Some Samsung services and plugins look like apps. They are hidden here; nothing is deleted or disabled on the screen."), "shield"),
                action(APL.t("Save Settings and App Order"), function () {
                    APL.settings.close();
                    if (APL.backup) APL.backup.open();
                }, APL.t("The backup follows each profile: its layout, its hidden apps, its statistics."), "backup"),
                info(APL.t("Installed Apps"), function () { return String(apps.length); }),
                vetro(toggle(APL.t("Close Unused Apps"), "idleClose",
                    APL.t("An app left in the background for more than 10 minutes closes on its own, TizenTube included: the screen keeps its memory and stays smooth. The app in front is never closed, nor are the Home Screen, the TV inputs and AirPlay."))),
                vetro(action(APL.t("Free Up Memory"), function () { APL.freeMemory(); },
                    APL.t("Closes the apps left open behind the launcher (Netflix, Disney+, Samsung's YouTube…). They reopen normally, but start over from the beginning. TizenTube stays ready."), "trash"))
            ], APL.t("Local artwork, apps left open, memory.")),

            /* -------- Vetro Root Controls -------- */
            menu(APL.t("Vetro Root Controls"), "shield", [
                info(APL.t("Root Agent Status"), function () {
                    return sys.vetroAlive().then(function (ok) {
                        return ok ? APL.t("Connected (Root Ready)") : APL.t("Not Responding");
                    });
                }, APL.t("Status of Vetro's background root agent on port 8099.")),

                info(APL.t("Link to Vetro"), function () { return sys.vetroLink(); },
                    APL.t("How the launcher talks to Vetro through the private bridge.")),

                action(APL.t("Vetro Health"), function () {
                    APL.toast(APL.t("Checking Vetro…"), true);
                    function ask(path, ms) {
                        return sys.bridge("GET", path, "", ms).then(function (r) {
                            try { return JSON.parse(r.body); } catch (e) { return null; }
                        }, function () { return null; });
                    }
                    function ago(t) {
                        if (!t) return "never";
                        var sec = Math.max(0, Math.round((Date.now() - t) / 1000));
                        return sec < 90 ? sec + " s ago" : Math.round(sec / 60) + " min ago";
                    }
                    Promise.all([ask("/bridge-info", 10000), ask("/__vetro-health", 12000), ask("/status", 10000)]).then(function (r) {
                        var info = r[0], live = r[1], st = r[2], L = [];
                        if (!info) {
                            L.push("Bridge: NOT ANSWERING");
                            L.push("The launcher's background service did not reply.");
                            L.push("Open the launcher again, or restart the screen.");
                        } else {
                            L.push("Bridge: " + (info.bridgeVersion || "old build") + " (running " + Math.round((info.uptimeMs || 0) / 60000) + " min)");
                            if (info.ports) L.push("Ports: trusted " + (info.ports.trusted ? "OK" : "closed") + " · plain " + (info.ports.plain ? "OK" : "closed") + " · shortcut " + (info.ports.shortcut ? "OK" : "closed"));
                            L.push("Vetro now: " + (live ? (live.ok ? "ANSWERING (" + live.ms + " ms)" : "NOT ANSWERING" + (live.error ? " — " + live.error : "")) : "unknown (old bridge)"));
                            L.push("Address: " + ((live && live.reached) || info.reached || "none") + " · port " + (info.port || sys.vetroPort()));
                            if (st && st.app) L.push("Vetro: version " + (st.app.version || "?") + " · root agent " + (st.agent ? (st.agent.connected === false ? "NOT connected" : "connected") : "unknown"));
                            L.push("Last good answer: " + ago(info.vetroLastOkAt));
                            L.push("Heartbeat failures in a row: " + (info.heartbeatFailures || 0));
                            L.push("Replies lost: " + (info.replyDrops || 0));
                            if (info.recovery) L.push("Auto-recovery: " + info.recovery.attempts + " attempt(s), last " + ago(info.recovery.lastAt) + (info.recovery.target ? " → " + info.recovery.target : ""));
                        }
                        var node = document.createElement("pre");
                        node.style.cssText = "width:900px;max-height:470px;margin:-8px auto 26px;padding:20px;box-sizing:border-box;overflow:hidden;border-radius:16px;background:rgba(255,255,255,.09);color:#d7f5e7;text-align:left;font:18px/1.45 monospace;white-space:pre-wrap;";
                        node.textContent = L.join("\n");
                        APL.alert({ title: APL.t("Vetro Health"), message: APL.t("Read-only check. It changes nothing on the screen."), node: node, buttons: [{ label: APL.t("OK") }] });
                    });
                }, APL.t("Shows if the bridge and Vetro are answering, how fast, and the last good answer."), "info"),

                /* -------- v1.2.85: more Vetro tools (each runs only when chosen) -------- */
                action(APL.t("Reconnect to Vetro"), function () {
                    APL.toast(APL.t("Reconnecting to Vetro…"), true);
                    sys.vetroReconnect().then(function (text) {
                        APL.alert({ title: APL.t("Reconnect to Vetro"), message: text, buttons: [{ label: APL.t("OK") }] });
                    }, function (e) { APL.toast((e && e.message) || APL.t("Vetro is not responding")); });
                }, APL.t("Clears the launcher's remembered Vetro state and checks the link again. Changes nothing on the screen."), "info"),

                vetro(action(APL.t("Root Access Test"), function () {
                    APL.toast(APL.t("Testing root access…"), true);
                    sys.rootTest().then(function (d) {
                        var root = String(d.uid) === "0";
                        var msg = (root ? APL.t("✓ Root access confirmed (uid 0)") : APL.t("✗ Commands do not run as root (uid {u})", { u: d.uid || "?" })) + "\n" +
                                  APL.t("Kernel:") + " " + (d.kernel || "?") + "\n" +
                                  APL.t("Answer time:") + " " + (d.ms || 0) + " ms";
                        APL.alert({ title: APL.t("Root Access Test"), message: msg, buttons: [{ label: APL.t("OK") }] });
                    }, function (e) { APL.toast((e && e.message) || APL.t("Vetro is not responding")); });
                }, APL.t("Runs one harmless read-only command through Vetro to confirm it really has root."), "shield")),

                vetro(action(APL.t("Vetro Apps Overview"), function () {
                    APL.toast(APL.t("Reading Vetro's app list…"), true);
                    sys.vetroOverview().then(function (o) {
                        var msg = APL.t("Apps known to Vetro:") + " " + o.total + "\n" +
                                  APL.t("Disabled:") + " " + o.disabled + "\n" +
                                  APL.t("Start at boot:") + " " + o.onboot + "\n" +
                                  APL.t("Restart on their own:") + " " + o.autorestart;
                        APL.alert({ title: APL.t("Vetro Apps Overview"), message: msg, buttons: [{ label: APL.t("OK") }] });
                    }, function (e) { APL.toast((e && e.message) || APL.t("Vetro is not responding")); });
                }, APL.t("Read-only counts from Vetro's app inventory. Changes nothing."), "info")),

                vetro(action(APL.t("Restart Vetro Service"), function () {
                    APL.alert({
                        title: APL.t("Restart Vetro Service?"),
                        message: APL.t("Starts Vetro's background service again. Use it only if Vetro stopped answering. The launcher, the radio and the alerts are not touched."),
                        focus: 0,
                        buttons: [
                            { label: APL.t("Cancel") },
                            { label: APL.t("Restart"), run: function () {
                                APL.toast(APL.t("Starting Vetro's service…"), true);
                                sys.restartVetroService().then(function () {
                                    APL.toast(APL.t("Vetro's service was started. Give it up to a minute."), true);
                                }, function (e) { APL.toast((e && e.message) || APL.t("Vetro is not responding")); });
                            } }
                        ]
                    });
                }, APL.t("Starts Vetro's background service (never its screen). The bridge also does this by itself after several silent minutes."), "power")),

                toggle(APL.t("Vetro Notices"), "vetroNotices",
                    APL.t("Shows a short message when Vetro stops answering and when it is back. Nothing else changes.")),

                vetro(action(APL.t("Hardware & SoC Monitor"), function () {
                    APL.toast(APL.t("Reading hardware sensors…"), true);
                    sys.getTelemetryMonitor().then(function (d) {
                        var temp = (d.soctemp_c && d.soctemp_c !== "N/A") ? d.soctemp_c : APL.t("Sensors protected");
                        var msg = APL.t("Processor:") + " " + (d.soc || "Samsung Smart TV SoC") + "\n" +
                                  APL.t("SoC Temperature:") + " " + temp + "\n" +
                                  APL.t("CPU Cores:") + " " + d.cpu_cores + " (" + d.cpu_freq + ")\n" +
                                  APL.t("CPU Load:") + " " + d.load + "\n" +
                                  APL.t("Available RAM:") + " " + (d.mem_avail || "N/A") + " / " + (d.mem_total || "N/A") + "\n" +
                                  APL.t("System Uptime:") + " " + d.uptime;
                        APL.alert({ title: APL.t("Hardware & SoC Monitor"), message: msg, buttons: [{ label: APL.t("OK") }] });
                    }).catch(function (e) { APL.toast(e.message); });
                }, APL.t("Shows live CPU temperature, processor frequency and system uptime."), "info")),

                /* -------- Remote Button Remapper Submenu -------- */
                vetro(menu(APL.t("Remote Button Remapper"), "remote", [
                    choice(APL.t("Shahid Button"), "remap_shahid", getRemapAppChoices(),
                        APL.t("Select app to open when pressing Shahid on the remote."),
                        applyRemap(231, [578, 648, 447, 582], "Shahid")),

                    choice(APL.t("Netflix Button"), "remap_netflix", getRemapAppChoices(),
                        APL.t("Select app to open when pressing Netflix on the remote."),
                        applyRemap(226, [574, 102, 583, 448], "Netflix")),

                    choice(APL.t("Prime Video Button"), "remap_prime", getRemapAppChoices(),
                        APL.t("Select app to open when pressing Prime Video on the remote."),
                        applyRemap(228, [575, 584, 449], "Prime Video")),

                    choice(APL.t("Disney+ Button"), "remap_disney", getRemapAppChoices(),
                        APL.t("Select app to open when pressing Disney+ on the remote."),
                        applyRemap(229, [576, 585, 450], "Disney+")),

                    choice(APL.t("Samsung TV Plus Button"), "remap_tvplus", getRemapAppChoices(),
                        APL.t("Select app to open when pressing TV Plus on the remote."),
                        applyRemap(230, [577, 586, 451], "TV Plus")),

                    menu(APL.t("Color Buttons (Legacy Remotes)"), "remote", [
                        choice(APL.t("Red Button (A)"), "remap_red", getRemapAppChoices(),
                            APL.t("Select app for the red color button."),
                            applyRemap(398, [], "Red")),

                        choice(APL.t("Green Button (B)"), "remap_green", getRemapAppChoices(),
                            APL.t("Select app for the green color button."),
                            applyRemap(399, [], "Green")),

                        choice(APL.t("Yellow Button (C)"), "remap_yellow", getRemapAppChoices(),
                            APL.t("Select app for the yellow color button."),
                            applyRemap(400, [], "Yellow")),

                        choice(APL.t("Blue Button (D)"), "remap_blue", getRemapAppChoices(),
                            APL.t("Select app for the blue color button."),
                            applyRemap(401, [], "Blue"))
                    ], APL.t("For older Samsung remotes with Red, Green, Yellow, and Blue buttons.")),

                    action(APL.t("Capture Any Remote Button"), function () {
                        APL.toast(APL.t("Press any button on the physical remote now… (10s)"), true);
                        sys.captureRemoteKey(10000).then(function (res) {
                            var code = res.code;
                            var labelName = res.device || code;
                            var choices = getRemapAppChoices().filter(function (c) { return c[0] !== "default"; });
                            // v1.2.92: Cancel puts the old bindings back (they were set aside while the button was being read)
                            var btns = [{ label: APL.t("Cancel"), run: function () { sys.resumeRemap(); } }];
                            choices.forEach(function (app) {
                                btns.push({
                                    label: app[1],
                                    run: function () {
                                        sys.setRemapRule(code, app[0], res.device || ("Custom " + code)).then(function () {
                                            APL.toast(APL.t("Button mapped to {name}", { name: app[1] }), true);
                                        }).catch(function (e) { APL.toast(e.message); });
                                    }
                                });
                            });
                            APL.alert({
                                title: APL.t("Button Captured: {c}", { c: labelName }),
                                message: APL.t("Choose an action for this button:"),
                                buttons: btns
                            });
                        }).catch(function (e) { APL.toast(e.message); });
                    }, APL.t("Listens to the physical remote and captures any key press to remap it."), "remote"),

                    action(APL.t("Restore Default Remote Buttons"), function () {
                        APL.alert({
                            title: APL.t("Restore Remote Buttons?"),
                            message: APL.t("Removes all button mappings and restores default factory remote functions."),
                            buttons: [
                                { label: APL.t("Cancel") },
                                { label: APL.t("Restore"), destructive: true, run: function () {
                                    sys.clearAllRemapRules().then(function () {
                                        sys.setPref("remap_shahid", "default");
                                        sys.setPref("remap_netflix", "default");
                                        sys.setPref("remap_prime", "default");
                                        sys.setPref("remap_disney", "default");
                                        sys.setPref("remap_tvplus", "default");
                                        sys.setPref("remap_red", "default");
                                        sys.setPref("remap_green", "default");
                                        sys.setPref("remap_yellow", "default");
                                        sys.setPref("remap_blue", "default");
                                        APL.toast(APL.t("All buttons restored to default"), true);
                                    }).catch(function (e) { APL.toast(e.message); });
                                } }
                            ]
                        });
                    }, APL.t("Clears all custom remote bindings."), "remote")
                ], APL.t("Map Netflix, Prime Video, Disney+, TV Plus, and Color buttons to any app."))),

                /* -------- Root Safety & Updates -------- */
                vetro(toggle(APL.t("Block Samsung Auto-Updates"), "blockFirmwareUpdate",
                    APL.t("Prevents Samsung from pushing silent firmware updates that remove root access."))),

                vetro(toggle(APL.t("Keep Removed Apps Removed"), "keepRemovedApps",
                    APL.t("Prevents Samsung Apps Store from automatically reinstalling deleted bloatware apps."))),

                /* -------- Privacy & Bloatware Blocking -------- */
                vetro(action(APL.t("Block Samsung Tracking and Ads"), function () { APL.services.cutAll(); },
                    APL.t("Stops Samsung recognition and telemetry services (ACR, CIS, Canalysis) from starting."), "shield")),

                vetro(toggle(APL.t("Vetro DNS Ad Blocker"), "dnsAdBlock",
                    APL.t("Blocks Samsung ad, tracking, and ACR telemetry domains via Vetro's local DNS filter."))),

                vetro(toggle(APL.t("Disable Voice Assistants & Mic"), "disableVoice",
                    APL.t("Disables Bixby and microphone background services to save memory."))),

                vetro(toggle(APL.t("Disable HbbTV Interactive Tracking"), "disableHbbtv",
                    APL.t("Stops interactive broadcast tracking services and red-button overlays."))),

                /* -------- Performance & Memory -------- */
                vetro(action(APL.t("Free Up Memory"), function () { APL.freeMemory(); },
                    APL.t("Closes background apps left open behind the launcher and drops system caches."), "trash")),

                vetro(action(APL.t("Clear System Temp & Caches"), function () {
                    sys.clearSystemCache().then(function (msg) {
                        APL.toast(msg, true);
                    }, function (e) { APL.toast(e.message); });
                }, APL.t("Cleans /tmp, PulseAudio stale sockets, and flushes kernel buffers."), "trash")),

                vetro(action(APL.t("Clear Leftovers & Staging"), function () {
                    sys.clearLeftovers().then(function () {
                        APL.toast(APL.t("Installer leftovers and app cache files cleaned"), true);
                    }, function (e) { APL.toast(e.message); });
                }, APL.t("Clears old package installers, Prime Video temporary pictures, and stale caches."), "trash")),

                vetro(toggle(APL.t("Disable Samsung Ambient Mode"), "disableAmbient",
                    APL.t("Prevents Samsung Ambient service from waking in the background and wasting RAM."))),

                vetro(toggle(APL.t("Disable AirPlay Service"), "disableAirPlay",
                    APL.t("Frees memory by stopping Apple AirPlay receiver service if not in use."))),

                vetro(toggle(APL.t("Close Apps at Start-Up"), "bootCleanup",
                    APL.t("Once per full power-on, closes what the system opens on its own: Netflix, TV Plus, Disney+, Samsung Internet, Art Mode, the pieces of the Samsung home screen and the blocked services. Frees about 350 MB."))),

                vetro(toggle(APL.t("Close Unused Apps"), "idleClose",
                    APL.t("An app left in the background for more than 10 minutes closes on its own: the screen keeps its memory and stays smooth."))),

                /* -------- Audio & Background Alerts -------- */
                vetro(action(APL.t("Restart Alert & Audio Daemon"), function () {
                    sys.restartAlertDaemon().then(function () {
                        APL.toast(APL.t("Root daemon and audio streams restarted"), true);
                    }, function (e) { APL.toast(e.message); });
                }, APL.t("Restarts the background root alert supervisor and repairs PulseAudio routes."), "sound")),

                vetro(action(APL.t("Sync Alert Sound Files"), function () {
                    sys.syncAlertSounds().then(function () {
                        APL.toast(APL.t("Sound files verified and synchronized"), true);
                    }, function (e) { APL.toast(e.message); });
                }, APL.t("Syncs Azan prayer and task audio files to persistent root storage (/opt/usr/home/owner/APL/bg/sounds/)."), "speaker")),

                vetro(action(APL.t("Play a Test Alert"), function () {
                    APL.alert({
                        title: APL.t("Play a Test Alert"),
                        message: APL.t("Choose how you want to test the alert sound:"),
                        buttons: [
                            { label: APL.t("Cancel") },
                            { label: APL.t("Play Now"), run: function () {
                                APL.toast(APL.t("Playing test alert…"), true);
                                if (APL.prayerAlert && APL.prayerAlert.test) {
                                    APL.prayerAlert.test("dhuhr");
                                } else if (APL.bgAudio && APL.bgAudio.playAlert) {
                                    APL.bgAudio.playAlert("dhuhr").catch(function (e) { APL.toast(e.message); });
                                }
                            } },
                            { label: APL.t("Play in 8s (Background Test)"), run: function () {
                                APL.toast(APL.t("Open YouTube or an HDMI input now… alert will play in 8 seconds"), true);
                                setTimeout(function () {
                                    if (APL.bgAudio && APL.bgAudio.playAlert) {
                                        APL.bgAudio.playAlert("dhuhr").then(function (ok) {
                                            if (APL.toast) APL.toast(ok ? APL.t("Background alert played successfully") : APL.t("Daemon could not play alert"), ok);
                                        }).catch(function (e) {
                                            if (APL.toast) APL.toast((e && e.message) || APL.t("Alert failed"));
                                        });
                                    }
                                }, 8000);
                            } }
                        ]
                    });
                }, APL.t("Plays the short alert sound through the root supervisor daemon even outside the launcher."), "speaker")),

                vetro(action(APL.t("Alert Readiness Check"), function () {
                    APL.toast(APL.t("Checking Vetro, daemon and Pulse…"), true);
                    if (APL.bgAudio && APL.bgAudio.health) {
                        APL.bgAudio.health().then(function (st) {
                            var msg = (st.keeper ? APL.t("✓ Root Alert Keeper: Running & Ready") : APL.t("✗ Root Alert Keeper: Stopped")) + "\n" +
                                      (st.supervisor ? APL.t("✓ Audio Supervisor: Connected") : APL.t("✗ Audio Supervisor: Disconnected")) + "\n" +
                                      (st.pulse ? APL.t("✓ PulseAudio Sound Socket: {p}", { p: st.pulse }) : APL.t("✗ PulseAudio Sound Socket: Missing")) + "\n" +
                                      APL.t("✓ Alert Sound Files: Verified & Synced") + "\n" +
                                      APL.t("• Alert Engine Status: Standby (Active 24/7)") + "\n" +
                                      APL.t("• HDMI Audio Route: Recovers automatically on switch");
                            APL.alert({ title: APL.t("Alert Readiness Check"), message: msg, buttons: [{ label: APL.t("OK") }] });
                        }, function (e) { APL.toast(e.message); });
                    }
                }, APL.t("Shows if Vetro (8099), the daemon, the Pulse socket and pactl are ready for prayer and task alerts."), "info")),

                vetro(action(APL.t("Audio Diagnostic Report"), function () {
                    if (APL.bgAudio && APL.bgAudio.diagnostic) {
                        APL.bgAudio.diagnostic().then(function (text) {
                            APL.alert({ title: APL.t("Diagnostic Report"), message: text.slice(0, 500), buttons: [{ label: APL.t("OK") }] });
                        }, function (e) { APL.toast(e.message); });
                    }
                }, APL.t("Full report of background audio routing, GStreamer, Pulse streams and daemon log."), "info")),

                /* -------- System UI & Power Controls -------- */
                vetro(action(APL.t("Set Up the Remote Buttons"), function () { APL.overlay.setUpButtons(); },
                    APL.t("Sends Home and ⏯ to Salah Launcher in Vetro, as APL Launcher Setup does."), "remote")),

                vetro(action(APL.t("Restore Home to Smart Hub"), function () {
                    APL.alert({
                        title: APL.t("Restore Home Button"),
                        message: APL.t("Do you want to restore the Home button to Samsung's default Smart Hub?"),
                        buttons: [
                            { label: APL.t("Cancel") },
                            { label: APL.t("Restore"), destructive: true, run: function () {
                                sys.restoreHomeSmartHub().then(function () {
                                    APL.toast(APL.t("Home button restored to Smart Hub"), true);
                                }, function (e) { APL.toast(e.message); });
                            } }
                        ]
                    });
                }, APL.t("Returns Home button control back to Samsung Smart Hub if you want to use original TV menus."), "power")),

                vetro(action(APL.t("Restart System UI"), function () {
                    APL.alert({
                        title: APL.t("Restart System UI?"),
                        message: APL.t("Restarts Tizen Web engine and system viewer without a full reboot."),
                        focus: 0,
                        buttons: [
                            { label: APL.t("Cancel") },
                            { label: APL.t("Restart"), destructive: true, run: function () {
                                sys.restartSystemUI();
                            } }
                        ]
                    });
                }, APL.t("Restarts Tizen's Smart Hub and Web UI."), "power")),

                vetro(action(APL.t("Reboot TV"), function () {
                    APL.alert({
                        title: APL.t("Reboot TV?"),
                        message: APL.t("Completely restarts your television using Vetro root privileges."),
                        focus: 0,
                        buttons: [
                            { label: APL.t("Cancel") },
                            { label: APL.t("Reboot"), destructive: true, run: function () {
                                sys.rebootTV().catch(function (e) { APL.toast(e.message); });
                            } }
                        ]
                    });
                }, APL.t("Full reboot of the screen via root."), "power"))
            ], APL.t("Vetro root agent, TV reboot, system cache, memory optimization, background daemon, remote button mapping.")),

            /* -------- General & Privacy -------- */
            menu(APL.t("General & Privacy"), "sliders", [
                choice(APL.t("Language"), "language", [["auto", APL.t("Automatic")], ["ar", "العربية"], ["en", "English"]],
                    APL.t("Automatic follows the screen's language. The launcher restarts to apply it."),
                    function (v) { if (v !== language) setTimeout(function () { global.location.reload(); }, 400); }),
                choice(APL.t("Clock Format"), "clockFormat", [["12", APL.t("12-Hour Time")], ["24", APL.t("24-Hour Time")]],
                    APL.t("Time format on the Home Screen and in Control Center.")),
                choice(APL.t("Digits"), "digitStyle", [["west", APL.t("Western (1 2 3)")], ["arabic", APL.t("Arabic (١ ٢ ٣)")]],
                    APL.t("One choice for the prayer widget, the clock and the weather. Only in Arabic.")),
                choice(APL.t("Date on Home Screen"), "homeDate",
                    [["full", APL.t("Gregorian and Hijri")], ["greg", APL.t("Gregorian only")], ["off", APL.t("Off")]],
                    APL.t("The weekday and the date beside the clock on the Home Screen.")),
                choice(APL.t("Second Clock"), "secondClock",
                    APL.homeClock ? APL.homeClock.zoneOptions() : [["off", APL.t("Off")]],
                    APL.t("The time of another country, across the clock card from your own time.")),
                menu(APL.t("Performance"), "sliders", [
                    toggle(APL.t("Light Mode"), "lightMode",
                        APL.t("Fewer background jobs: no artwork search, no content cards, no heavy effects. The wallpapers, the prayer times and the radio stay.")),
                    toggle(APL.t("Auto Light Effects"), "autoPerf",
                        APL.t("Off by default. When on, if the remote feels slow, the heavy effects turn off by themselves until the next restart.")),
                    toggle("\u0648\u064a\u062f\u062c\u062a \u0627\u0644\u0635\u0644\u0627\u0629 \u0641\u064a \u0635\u0641\u062d\u0629 \u0627\u0644\u0627\u0633\u062a\u0645\u0627\u0639", "qaPrayerWidget",
                        "\u064a\u0638\u0647\u0631 \u0648\u064a\u062f\u062c\u062a \u0627\u0644\u0635\u0644\u0627\u0629 \u0627\u0644\u0643\u0627\u0645\u0644 (\u0627\u0644\u0645\u0648\u0627\u0642\u064a\u062a \u0648\u0627\u0644\u0637\u0642\u0633 \u0648\u0627\u0644\u0645\u0647\u0627\u0645 \u0648\u0627\u0644\u0645\u0646\u0627\u0633\u0628\u0627\u062a) \u0623\u0633\u0641\u0644 \u0645\u0634\u063a\u0644 \u0627\u0644\u0642\u0631\u0622\u0646. \u0645\u0641\u0639\u0651\u0644 \u0627\u0641\u062a\u0631\u0627\u0636\u064a\u0627\u064b."),
                    toggle("\u0645\u0624\u0642\u062a\u0627\u062a \u062e\u0641\u064a\u0641\u0629", "liteTimers",
                        "\u0645\u0624\u0642\u062a\u0627\u062a \u0634\u0627\u0634\u0629 \u0627\u0644\u0645\u062d\u0631\u0627\u0628 \u0627\u0644\u062d\u064a\u0629 \u062a\u0639\u0645\u0644 \u0639\u0644\u0649 \u0645\u0624\u0642\u062a \u0645\u0634\u062a\u0631\u0643 \u0648\u062a\u062a\u0648\u0642\u0641 \u0648\u0642\u062a \u063a\u064a\u0627\u0628 \u0627\u0644\u0644\u0627\u0646\u0634\u0631 (\u064a\u0648\u062a\u064a\u0648\u0628 \u0623\u0648 HDMI). \u0645\u0641\u0639\u0651\u0644 \u0627\u0641\u062a\u0631\u0627\u0636\u064a\u0627\u064b. \u0644\u0627 \u064a\u0645\u0633 \u0627\u0644\u0623\u0630\u0627\u0646 \u0648\u0644\u0627 \u0627\u0644\u0631\u0627\u062f\u064a\u0648 \u0648\u0644\u0627 \u0627\u0644\u0645\u0647\u0627\u0645. \u0627\u0644\u062a\u063a\u064a\u064a\u0631 \u064a\u0633\u0631\u064a \u0639\u0646\u062f \u0641\u062a\u062d \u0627\u0644\u0634\u0627\u0634\u0629 \u0627\u0644\u0645\u0631\u0629 \u0627\u0644\u0642\u0627\u062f\u0645\u0629."),
                    toggle(APL.t("Nightly Refresh"), "softReload",
                        APL.t("Once a night, around 4 AM, the launcher reloads itself to free memory, only if the radio is stopped, no alert is due within 10 minutes and nobody has used the screen for 30 minutes.")),
                    menu("\u0645\u064a\u0632\u0627\u062a \u0627\u0644\u062a\u062d\u0633\u064a\u0646 \u0627\u0644\u062b\u0642\u064a\u0644\u0629", "sliders", [
                        toggle("\u0627\u0644\u062a\u0645\u0648\u064a\u0647 \u0648\u0627\u0644\u0632\u062c\u0627\u062c", "visualEffects", "\u062a\u0645\u0648\u064a\u0647 \u0648\u0632\u062c\u0627\u062c \u0639\u0644\u0649 \u0627\u0644\u0648\u0627\u062c\u0647\u0629. \u0623\u062d\u0644\u0649 \u0634\u0643\u0644\u064b\u0627 \u0628\u0633 \u0623\u0628\u0637\u0623."),
                        toggle("\u0632\u062c\u0627\u062c \u0648\u062d\u0631\u0643\u0629 \u0645\u062d\u0633\u0651\u0646\u0629", "richFx", "\u0632\u062c\u0627\u062c \u0645\u0645\u0648\u0651\u0647 \u0648\u062d\u0631\u0643\u0629 \u0627\u0646\u0633\u064a\u0627\u0628\u064a\u0629. \u0644\u0644\u0645\u0639\u0627\u0644\u062c\u0627\u062a \u0627\u0644\u0633\u0631\u064a\u0639\u0629 \u0628\u0633."),
                        toggle("\u062e\u0644\u0641\u064a\u0627\u062a \u062f\u064a\u0646\u0627\u0645\u064a\u0643\u064a\u0629 (\u0628\u0648\u0633\u062a\u0631\u0627\u062a)", "cleanFrameBackdrops", "\u0628\u0648\u0633\u062a\u0631 \u0644\u0644\u062a\u0637\u0628\u064a\u0642 \u0627\u0644\u0644\u064a \u0645\u0639\u0646\u062f\u0648\u0634 \u062e\u0644\u0641\u064a\u0629. \u0645\u062d\u062a\u0627\u062c \u0646\u062a."),
                        toggle("\u062d\u0631\u0643\u0629 \u0627\u0644\u062e\u0644\u0641\u064a\u0629 \u0627\u0644\u0628\u0637\u064a\u0626\u0629", "bgMotion", "\u0643\u0627\u0645\u064a\u0631\u0627 \u0628\u0637\u064a\u0626\u0629 \u0641\u0648\u0642 \u0635\u0648\u0631 \u0627\u0644\u0631\u0626\u064a\u0633\u064a\u0629. \u0628\u062a\u0634\u063a\u0651\u0644 \u0627\u0644\u0634\u0627\u0634\u0629 \u0643\u062a\u064a\u0631."),
                        toggle("\u062a\u0645\u064a\u064a\u0632 \u0627\u0644\u0639\u0646\u0635\u0631 \u0627\u0644\u0645\u062d\u062f\u062f", "focusFx", "\u062d\u0644\u0642\u0629 \u062d\u0648\u0627\u0644\u064a\u0646 \u0627\u0644\u0623\u064a\u0642\u0648\u0646\u0629 \u0627\u0644\u0645\u062d\u062f\u062f\u0629 \u0648\u062a\u0639\u062a\u064a\u0645 \u0627\u0644\u0628\u0627\u0642\u064a."),
                        toggle("\u0627\u0644\u0631\u0641 \u0627\u0644\u0645\u0628\u0627\u0634\u0631", "liveShelf", "\u0645\u062d\u062a\u0648\u0649 \u0627\u0644\u0644\u062d\u0638\u0629 \u0641\u0648\u0642 \u0627\u0644\u0631\u0626\u064a\u0633\u064a\u0629 (\u0623\u0641\u0644\u0627\u0645/\u064a\u0648\u062a\u064a\u0648\u0628). \u0645\u062d\u062a\u0627\u062c \u0646\u062a."),
                        toggle("\u0623\u064a\u0642\u0648\u0646\u0627\u062a \u0623\u0648\u0646\u0644\u0627\u064a\u0646", "onlineIcons", "\u0623\u064a\u0642\u0648\u0646\u0627\u062a \u062d\u0642\u064a\u0642\u064a\u0629 \u0645\u0646 \u0643\u062a\u0627\u0644\u0648\u062c \u0627\u0644\u062a\u0637\u0628\u064a\u0642\u0627\u062a. \u0645\u062d\u062a\u0627\u062c \u0646\u062a."),
                        toggle("\u0644\u0648\u0646 \u0645\u0646 \u0627\u0644\u062e\u0644\u0641\u064a\u0629", "wallTint", "\u0644\u0645\u0633\u0629 \u0644\u0648\u0646 \u062e\u0641\u064a\u0641\u0629 \u0645\u0646 \u0635\u0648\u0631\u0629 \u0627\u0644\u062e\u0644\u0641\u064a\u0629 \u0627\u0644\u0645\u062d\u0644\u064a\u0629."),
                        toggle("\u062d\u0631\u0643\u0629 \u0627\u0644\u0645\u062d\u0631\u0627\u0628 \u0627\u0644\u062d\u064a", "ambientFx", "\u062a\u062f\u0631\u0651\u062c \u0627\u0644\u0633\u0645\u0627 \u0648\u0644\u0645\u0639\u0629 \u0627\u0644\u0623\u0630\u0627\u0646 \u0627\u0644\u0645\u062a\u062d\u0631\u0643\u0629."),
                        toggle(HT("ويدجت حكم ومواعظ (٥ دقائق)"), "hekamWidget", HT("يعرض كارت حكمة أو موعظة منفصل على الشاشة الرئيسية ويتغير تلقائياً كل ٥ دقائق (أوفلاين).")),
                        choice(HT("موضع ويدجت الحكمة"), "hekamPos", [
                            ["above-dock", HT("فوق التطبيقات بالمنتصف")],
                            ["top-center", HT("أعلى المنتصف")],
                            ["top-right", HT("أعلى اليمين")],
                            ["top-left", HT("أعلى اليسار")],
                            ["bottom-center", HT("أسفل المنتصف")],
                            ["bottom-right", HT("أسفل اليمين")],
                            ["bottom-left", HT("أسفل اليسار")],
                            ["inline", HT("متصل بشريط الصلاة")]
                        ], HT("موضع كارت الحكمة على الشاشة.")),
                        choice(HT("حجم ويدجت الحكمة"), "hekamScale", [
                            [100, HT("100% عادي")],
                            [125, HT("125% كبير")],
                            [150, HT("150% كبير جداً")],
                            [175, HT("175% ضخم")],
                            [200, HT("200% أقصى حجم")]
                        ], HT("حجم كارت الحكمة على الشاشة.")),
                        choice(HT("لون خط ويدجت الحكمة"), "hekamColor", [
                            ["gold", HT("ذهبي ملكي براق")],
                            ["white", HT("أبيض ناصع كريستالي")],
                            ["sky", HT("أزرق سماوي نيون")],
                            ["galaxy", HT("موف المجرة متوهج")],
                            ["green", HT("أخضر فسفوري إسلامي")]
                        ], HT("اختر لون خط وتوهج نصوص ويدجت الحكمة.")),
                        action("\u0627\u0642\u0641\u0644 \u0643\u0644 \u0627\u0644\u0645\u064a\u0632\u0627\u062a \u0627\u0644\u062b\u0642\u064a\u0644\u0629", function () { ["visualEffects","richFx","cleanFrameBackdrops","bgMotion","focusFx","liveShelf","onlineIcons","wallTint","ambientFx","hekamWidget"].forEach(function (k) { APL.sys.setPref(k, false); }); APL.toast("\u0627\u062a\u0642\u0641\u0644\u062a \u0643\u0644 \u0627\u0644\u0645\u064a\u0632\u0627\u062a \u0627\u0644\u062b\u0642\u064a\u0644\u0629", true); },
                            "\u0628\u062a\u0642\u0641\u0644 \u0643\u0644 \u0627\u0644\u0645\u064a\u0632\u0627\u062a \u0627\u0644\u0644\u064a \u0641\u0648\u0642 \u0645\u0631\u0629 \u0648\u0627\u062d\u062f\u0629.", "shield")
                    ], "\u0643\u0644 \u0645\u064a\u0632\u0629 \u0644\u0648\u062d\u062f\u0647\u0627\u060c \u0648\u0643\u0644\u0647\u0627 \u0645\u0642\u0641\u0648\u0644\u0629 \u0627\u0641\u062a\u0631\u0627\u0636\u064a\u064b\u0627."),
                    action(APL.t("Error Log"), function () { if (APL.errorLog) APL.errorLog.show(); },
                        APL.t("The last errors of the launcher and of the bridge, with the time."), "info"),
                    action(APL.t("Error Report"), function () { if (APL.errorLog) APL.errorLog.report(); },
                        APL.t("A short report (version, start-up time, errors) to read here or scan with your phone's camera, to send for help."), "info"),
                    action(APL.t("Export Report to USB"), function () { if (APL.errorLog && APL.errorLog.exportReport) APL.errorLog.exportReport(); },
                        APL.t("Saves the full diagnostic report (version, memory readings, errors) as a text file on a USB stick."), "info"),
                    action(APL.t("Alert Keeper Health"), function () { if (APL.errorLog && APL.errorLog.health) APL.errorLog.health(); },
                        APL.t("Shows when the bridge last got through to the prayer-alert keeper, so you know the alerts are covered."), "info"),
                    action(APL.t("What's New"), function () { if (APL.whatsNew) APL.whatsNew.show(); },
                        APL.t("What changed in this version."), "info"),
                    action(APL.t("TV Check"), function () { if (APL.tvCheck) APL.tvCheck.show(); },
                        APL.t("One screen that checks the launcher on the TV: OK, needs attention, or not working, with a short reason. Can be saved to a USB stick."), "info"),
                    action("آخر نسخة شغالة", function () { if (APL.safeRestore) APL.safeRestore.panel(); },
                        "نسخة احتياطية من اللانشر على التلفزيون، والرجوع ليها لو النسخة الجديدة وقفت في التشغيل.", "info"),
                    action(APL.t("Clear Error Log"), function () { if (APL.errorLog) APL.errorLog.clear(); },
                        APL.t("Empties the launcher's error list."), "info"),
                    info("\u0648\u0642\u062a \u062a\u0634\u063a\u064a\u0644 \u0627\u0644\u0644\u0627\u0646\u0634\u0631", function () {
                        var bl = [], i, a = 0, b = 0, last;
                        try { bl = JSON.parse(window.localStorage.getItem("apl.bootlog") || "[]"); } catch (e) { bl = []; }
                        if (!bl.length) return "\u0644\u0645 \u064a\u064f\u0633\u062c\u064e\u0651\u0644 \u0628\u0639\u062f: \u064a\u064f\u0633\u062c\u064e\u0651\u0644 \u0641\u064a \u0627\u0644\u062a\u0634\u063a\u064a\u0644 \u0627\u0644\u062a\u0627\u0644\u064a";
                        function sec(ms) { return (Math.round(ms / 100) / 10).toFixed(1) + " \u062b"; }
                        for (i = 0; i < bl.length; i++) { a += bl[i].load || 0; b += bl[i].ready || 0; }
                        last = bl[bl.length - 1];
                        return "\u0622\u062e\u0631 \u0645\u0631\u0629: \u062a\u062d\u0645\u064a\u0644 " + sec(last.load) + " | \u062c\u0627\u0647\u0632\u064a\u0629 " + sec(last.ready) + "  -  \u0627\u0644\u0645\u062a\u0648\u0633\u0637 (" + bl.length + "): \u062a\u062d\u0645\u064a\u0644 " + sec(a / bl.length) + " | \u062c\u0627\u0647\u0632\u064a\u0629 " + sec(b / bl.length);
                    }, "\u062a\u062d\u0645\u064a\u0644 = \u0648\u0635\u0648\u0644 \u0643\u0648\u062f \u0627\u0644\u0644\u0627\u0646\u0634\u0631\u060c \u062c\u0627\u0647\u0632\u064a\u0629 = \u0638\u0647\u0648\u0631 \u0627\u0644\u0634\u0627\u0634\u0629 \u0627\u0644\u0631\u0626\u064a\u0633\u064a\u0629. \u0623\u0631\u0642\u0627\u0645 \u0622\u062e\u0631 5 \u062a\u0634\u063a\u064a\u0644\u0627\u062a \u0639\u0644\u0649 \u0647\u0630\u0627 \u0627\u0644\u062a\u0644\u0641\u0632\u064a\u0648\u0646\u060c \u0644\u0644\u0645\u0642\u0627\u0631\u0646\u0629 \u0642\u0628\u0644 \u0623\u064a \u062a\u0639\u062f\u064a\u0644 \u0648\u0628\u0639\u062f\u0647."),
                    info(APL.t("Note"), function () { return APL.t("Light Mode was not measured on a television: no figure is claimed for it."); })
                ], APL.t("Fewer background jobs.")),
                n("homeApp", APL.t("Start on Salah Launcher"), APL.t("The screen opens Salah Launcher at power-on, about a second after the picture, instead of the TV input. Off: the screen starts as before."), ON_OFF),
                vetro(toggle(APL.t("Close Apps at Start-Up"), "bootCleanup", APL.t("Once per full power-on, closes what the system opens on its own: Netflix, TV Plus, Disney+, Samsung Internet, Art Mode, the pieces of the Samsung home screen and the blocked services. Frees about 350 MB."))),
                menu(APL.t("Power and Energy Saving"), "leaf", [
                    n("ecoSensor", APL.t("Brightness Optimization"), APL.t("Lowers the brightness in a dark room."), ON_OFF),
                    n("energy", APL.t("Power Saving Mode"), APL.t("Reduces power consumption."), ON_OFF)
                ], APL.t("Brightness and power consumption.")),
                menu(APL.t("Accessibility"), "access", [
                    toggle(APL.t("Reduce Motion"), "reduceMotion", APL.t("Removes the launcher's zooms and fades.")),
                    toggle(APL.t("Large Text"), "bigText", APL.t("Makes the rows in Settings bigger.")),
                    toggle(APL.t("High Contrast"), "highContrast", APL.t("Darker panels and clearer outlines in Settings.")),
                    toggle("\u0627\u0644\u0631\u0627\u062f\u064a\u0648 \u0641\u064a \u0627\u0644\u062e\u0644\u0641\u064a\u0629", "radioBackground", "\u0627\u0644\u0631\u0627\u062f\u064a\u0648 \u064a\u0643\u0645\u0651\u0644 \u0644\u0645\u0627 \u062a\u0641\u062a\u062d HDMI \u0623\u0648 \u062a\u0637\u0628\u064a\u0642 \u062a\u0627\u0646\u064a (\u0644\u0648 \u0627\u062a\u0642\u0637\u0639 \u0647\u064a\u0631\u062c\u0639 \u0644\u0648\u062d\u062f\u0647). \u0644\u0648 \u0645\u0634 \u0634\u063a\u0627\u0644 \u0639\u0644\u0649 \u0634\u0627\u0634\u062a\u0643 \u0627\u0642\u0641\u0644\u0647."),
                    toggle("استماع تلاوة القرآن في الخلفية", "quran_bg_playback", "استمرار تشغيل تلاوة القرآن الكريم عند الخروج من اللانشر أو فتح تطبيقات أخرى (يتطلب دعم الشاشة)."),
                    toggle("\u0627\u0644\u0631\u0627\u062f\u064a\u0648 \u064a\u0643\u0645\u0651\u0644 \u0645\u0646 \u0645\u0634\u063a\u0651\u0644 \u0627\u0644\u062e\u0644\u0641\u064a\u0629", "radioHandoff", "\u0644\u0648 \u0627\u0644\u0634\u0627\u0634\u0629 \u0642\u0637\u0639\u062a \u0627\u0644\u0631\u0627\u062f\u064a\u0648 \u0648\u0627\u0646\u062a \u0639\u0644\u0649 HDMI \u0623\u0648 \u064a\u0648\u062a\u064a\u0648\u0628\u060c \u0628\u064a\u062a\u062d\u0648\u0651\u0644 \u0644\u0645\u0634\u063a\u0651\u0644 \u0627\u0644\u062e\u0644\u0641\u064a\u0629 (\u0628\u064a\u062a\u062e\u0644\u0637 \u0645\u0639 \u0623\u064a \u0635\u0648\u062a) \u0648\u064a\u0631\u062c\u0639 \u0644\u0648\u062d\u062f\u0647 \u0644\u0645\u0627 \u062a\u0641\u062a\u062d \u0627\u0644\u0644\u0627\u0646\u0634\u0631. \u062a\u062c\u0631\u064a\u0628\u064a."),
                    toggle("\u0644\u0648\u0646 \u0645\u0646 \u0627\u0644\u062e\u0644\u0641\u064a\u0629", "wallTint", "\u0628\u064a\u0637\u0644\u0651\u0639 \u0644\u0645\u0633\u0629 \u0644\u0648\u0646 \u062e\u0641\u064a\u0641\u0629 \u0645\u0646 \u0635\u0648\u0631\u0629 \u0627\u0644\u062e\u0644\u0641\u064a\u0629 \u0627\u0644\u0645\u062d\u0644\u064a\u0629 \u0639\u0644\u0649 \u0627\u0644\u0634\u0627\u0634\u0629 \u0627\u0644\u0631\u0626\u064a\u0633\u064a\u0629."),
                    action("\u0642\u064A\u0648\u062F \u0648\u0636\u0639 \u0627\u0644\u0637\u0641\u0644", function () { if (APL.kidLimits) APL.kidLimits.show(); },
                        "\u062A\u0637\u0628\u064A\u0642\u0627\u062A \u0645\u0633\u0645\u0648\u062D\u0629\u060C \u062D\u062F \u064A\u0648\u0645\u064A\u060C \u0642\u0641\u0644 \u0627\u0644\u0635\u0644\u0627\u0629 \u0648\u0627\u0644\u0646\u0648\u0645. \u0644\u0644\u0643\u0628\u0627\u0631 \u0641\u0642\u0637.", "shield")
                ], APL.t("Launcher animations.")),
                menu(APL.t("Samsung Services"), "shield", [
                    vetro(action(APL.t("Block All"), function () { APL.services.cutAll(); },
                        APL.t("Stops the Samsung services below from starting. They go away at the screen's next full restart. Nothing is uninstalled."), "shield")),
                    action(APL.t("Restore All"), function () { APL.services.restoreAll(); },
                        APL.t("Brings back what was blocked here, at the screen's next start-up."), "shield")
                ].concat(APL.services.groups.map(function (g) {
                    return { type: "service", label: g.label, group: g, desc: g.desc };
                })), APL.t("Stops what the launcher no longer needs from starting.")),
                { type: "samsung", label: APL.t("Samsung Settings"), desc: APL.t("For what the screen keeps for its own menus: changing Wi-Fi, time, language, Samsung account, parental controls, privacy.") }
            ], APL.t("Clock, start-up, energy, accessibility, Samsung Settings.")),

            /* -------- Support -------- */
            menu(APL.t("Support"), "info", [
                menu(APL.t("Launcher Update"), "update", [
                    info(APL.t("Version"), function () {
                        var u = APL.updater;
                        return u ? (u.fromBundle() ? APL.t("{v} (auto-update)", { v: u.running() }) : u.running()) : sys.version;
                    }, APL.t("The version running. “auto-update”: downloaded on its own from GitHub.")),
                    toggle(APL.t("Automatic updates"), "autoUpdate",
                        APL.t("The launcher checks GitHub every 6 hours and installs the new version on its own. Nothing to do on the PC.")),
                    info(APL.t("This Build"), function () {
                        return (global.APL_SITE && global.APL_SITE.buildName ? global.APL_SITE.buildName : "APL") + " · " +
                               APL.t("automatic updates off");
                    }, APL.t("This is a custom build: the original project's automatic updates are off, so they cannot replace these changes.")),
                    action(APL.t("Check for Update"), function () { if (APL.updater) APL.updater.check(true); },
                        APL.t("Checks right away for a new version."), "update")
                ], APL.t("Automatic updates from GitHub.")),
                action(APL.t("Support Salah Launcher"), function () {
                    var page = (window.APL_SITE && window.APL_SITE.support && window.APL_SITE.support.url) || "", qr = document.createElement("div");
                    if (!page) { APL.toast(APL.t("Support link is not set")); return; }
                    qr.className = "aplalert__qr";
                    if (APL.qr) qr.appendChild(APL.qr.canvas(page, 360));
                    var url = document.createElement("div");
                    url.className = "aplalert__qrurl";
                    url.textContent = page.replace(/^https?:\/\//, "");
                    qr.appendChild(url);
                    APL.alert({ title: APL.t("Support Salah Launcher"), message: APL.t("Scan the code with your phone's camera. Thank you!"),
                                node: qr, buttons: [{ label: APL.t("OK") }] });
                }, APL.t("Salah Launcher is free and open source. If it is useful to you, you can support its development: OK shows a code to scan with your phone."), "sparkle"),
                menu(APL.t("About This Screen"), "info", [
                    info(APL.t("Name"), function () { return sys.product().name; }),
                    info(APL.t("Model"), function () { return sys.product().model; }),
                    info(APL.t("Software Version"), function () { return sys.product().firmware; }),
                    info(APL.t("Tizen Version"), function () { return sys.product().tizen; }),
                    info(APL.t("Resolution"), sys.display),
                    info(APL.t("Storage"), sys.storage),
                    info(APL.t("IP Address"), function () { return sys.network().ip; }),
                    info(APL.t("Link to Vetro"), function () { return sys.vetroLink(); },
                        APL.t("How the launcher talks to Vetro. Through the bridge it reads the screen's settings; without it, orders still go out but the settings show Unavailable.")),
                    vetro(action("HDMI Picture Recording: START", function () {
                        var AV = "busctl --system call org.tizen.tv.avoc /org/tizen/tv/avoc org.tizen.tv.avoc.AvOutputControl ";
                        var G = [["pm", "GetPictureMode i 0"], ["bl", "GetBacklight i 0"], ["ct", "GetContrast i 0"], ["sh", "GetSharpness i 0"],
                                 ["col", "GetColorStrength i 0"], ["bri", "GetBrightness i 0"], ["gam", "GetGamma i 0"], ["cspace", "GetColorSpace i 0"],
                                 ["hdmiblack", "GetHdmiBlackLevel i 0"], ["game", "GetGameMode i 0"], ["dyn", "GetDynamicContrast i 0"],
                                 ["tone", "GetColorToneMode i 0"], ["eco", "GetEnergySaving i 0"], ["eye", "GetEyeSaverMode i 0"]];
                        var body = G.map(function (g) { return 'printf "' + g[0] + '=%s | " "$(' + AV + g[1] + ' 2>/dev/null)"; '; }).join("");
                        var snap = 'i=0; while [ $i -lt 30 ]; do { printf "== %s fg=%s " "$(date +%T)" "$(vconftool get memory/appfw/current_appid 2>/dev/null)"; ' +
                                   body + 'echo; } >> /tmp/apl-hdmi-cap.snap 2>&1; i=$((i+1)); sleep 6; done';
                        var cmd = "rm -f /tmp/apl-hdmi-cap.snap /tmp/apl-hdmi-cap.dlog; S=$(command -v setsid); " +
                                  "$S sh -c '" + snap + "' >/dev/null 2>&1 & " +
                                  "$S sh -c 'dlogutil -v time 2>/dev/null | head -c 3000000 > /tmp/apl-hdmi-cap.dlog' >/dev/null 2>&1 & " +
                                  "$S sh -c 'sleep 185; pkill -f \"dlogutil -v time\"' >/dev/null 2>&1 & echo started";
                        APL.toast("Starting the HDMI picture recording…", true);
                        sys.exec(cmd).then(function () {
                            APL.alert({ title: "HDMI Picture Recording", message: "Recording for 3 minutes. Now: 1) open HDMI from the launcher and wait 10 seconds; 2) come back; 3) open the same HDMI from Samsung's own home and wait 10 seconds; 4) come back and press HDMI Picture Recording: SHOW.", buttons: [{ label: APL.t("OK") }] });
                        }, function (e) { APL.toast((e && e.message) || "Could not start the recording"); });
                    }, "Records the picture settings every 6 seconds and the system's source requests, for 3 minutes. It changes nothing on the screen.", "info")),
                    vetro(action("HDMI Picture Recording: SHOW", function () {
                        var cmd = "echo SNAP; cat /tmp/apl-hdmi-cap.snap 2>/dev/null; echo DLOG; " +
                                  "grep -i -E 'change_source|sourceType|sourceName|sourceIcon|mbrIndex|REQUESTOR' /tmp/apl-hdmi-cap.dlog 2>/dev/null | tail -n 30; " +
                                  "echo HANDOFF; cat /tmp/apl-native-source-handoff.shell /tmp/apl-native-source-handoff.status 2>/dev/null; true";
                        APL.toast("Reading the recording…", true);
                        sys.exec(cmd).then(function (r) {
                            var out = String((r && r.output) || ""), part = "SNAP", snap = [], dlog = [], hand = [];
                            out.split("\n").forEach(function (ln) {
                                if (ln === "SNAP" || ln === "DLOG" || ln === "HANDOFF") { part = ln; return; }
                                if (!ln.trim()) return;
                                (part === "SNAP" ? snap : part === "DLOG" ? dlog : hand).push(ln);
                            });
                            var L = [], prev = null;
                            snap.forEach(function (ln) {
                                var head = (ln.match(/^== (\S+) fg=(.*?) pm=/) || [])[0] || ln.slice(0, 40);
                                var toks = ln.slice(head.length - 3).split(" | ").filter(Boolean);
                                var t = (ln.match(/^== (\S+)/) || [])[1] || "";
                                var fg = ((ln.match(/fg=(.*?) pm=/) || [])[1] || "").replace(/\s+/g, " ").trim();
                                fg = fg.split(" ").pop();
                                if (!prev) { L.push(t + " " + fg + " | " + toks.join(" ")); }
                                else {
                                    var ch = toks.filter(function (x, i) { return x !== prev.toks[i]; });
                                    if (ch.length || fg !== prev.fg) L.push(t + " " + fg + " | " + (ch.length ? "CHANGED " + ch.join(" ") : "same picture"));
                                }
                                prev = { toks: toks, fg: fg };
                            });
                            if (!L.length) L.push("No picture snapshots. Press START first.");
                            L.push("-- system source requests --");
                            if (!dlog.length) L.push("(none captured)");
                            dlog.slice(-10).forEach(function (x) { L.push(x.slice(0, 170)); });
                            L.push("-- APL hand-off --");
                            hand.slice(0, 6).forEach(function (x) { L.push(x.slice(0, 120)); });
                            var node = document.createElement("pre");
                            node.style.cssText = "width:1100px;max-height:560px;margin:-8px auto 26px;padding:18px;box-sizing:border-box;overflow:hidden;border-radius:16px;background:rgba(255,255,255,.09);color:#d7f5e7;text-align:left;font:14px/1.3 monospace;white-space:pre-wrap;word-break:break-all;";
                            node.textContent = L.join("\n").slice(0, 3800);
                            APL.alert({ title: "HDMI Picture Recording", message: "Read-only. Take a photo of this screen.", node: node, buttons: [{ label: APL.t("OK") }] });
                        }, function (e) { APL.toast((e && e.message) || "Could not read the recording"); });
                    }, "Shows what the recording captured: picture-setting changes and the source requests.", "info")),
                    vetro(action("HDMI Handoff Status", function () {
                        APL.toast("Reading HDMI handoff status…", true);
                        sys.nativeHandoffReport().then(function (text) {
                            var node = document.createElement("pre");
                            node.style.cssText = "width:900px;max-height:470px;margin:-8px auto 26px;padding:20px;box-sizing:border-box;overflow:hidden;border-radius:16px;background:rgba(255,255,255,.09);color:#d7f5e7;text-align:left;font:16px/1.35 monospace;white-space:pre-wrap;";
                            node.textContent = String(text || "No HDMI handoff record").slice(0, 2600);
                            APL.alert({ title: "HDMI Handoff Status", message: "Read-only diagnostic. It does not change HDMI, picture settings, APL, or Vetro.", node: node, buttons: [{ label: APL.t("OK") }] });
                        }, function (e) { APL.toast((e && e.message) || "HDMI status unavailable"); });
                    }, "Shows whether APL used the native CAPI helper or fell back to the Web route on the last HDMI switch. Read-only.", "info")),
                    info("Salah Launcher", function () { return APL.t("Version {v}", { v: sys.version }); }, APL.t("Based on APL Launcher by Knikt (Gero Corp.)")), 
                    info(APL.t("Sources"), function () { return "TMDB, YouTube, App Store, Apple Music"; },
                        APL.t("Movies and shows: This product uses the TMDB API but is not endorsed or certified by TMDB."))
                ], APL.t("Model, software and storage."))
            ], APL.t("Launcher updates, about.")),

            action(APL.t("Sources"), function () { APL.openSources(); },
                APL.t("Connected devices: HDMI, TV Access, SmartThings, Emby…"), "source"),
            action(APL.t("Sleep Now"), function () { sys.sleepNow().catch(function (e) { APL.toast(e.message); }); },
                APL.t("Turns off the screen."), "moon")

        ], APL.t("All the screen's settings, the Apple TV way."));
    }

    APL.settingsTree = build;
})(window);
