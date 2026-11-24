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

    /* v8.7.24: English for the few panels, toasts and cards that were written in Arabic only.
       APL.enx(text) returns the English text when English is selected (exact words, then known phrases, longest first);
       in Arabic, or for text with no Arabic in it, it returns the text unchanged. */
    var ENX_EXACT = {
"رجوع": "Back",
"خلاص": "Done",
"الصلاة": "Prayer",
"بكرة": "Tomorrow",
"مناسباتي": "My Occasions",
"النوع": "Type",
"اليوم": "Day",
"الشهر": "Month",
"السنة": "Year",
"إلغاء": "Cancel",
"تخرّج": "Graduation",
"خطوبة": "Engagement",
"احتفال": "Celebration",
"أنا": "Me",
"أمي": "Mom",
"أبي": "Dad",
"زوجتي": "My wife",
"زوجي": "My husband",
"ابني": "My son",
"ابنتي": "My daughter",
"أخي": "My brother",
"أختي": "My sister",
"جدي": "My grandfather",
"جدتي": "My grandmother",
"صديقي": "My friend",
"زواجي": "My wedding",
"تخرّجي": "My graduation",
"خطوبتي": "My engagement",
"رحلة": "Trip",
"عزومة": "Dinner invitation",
"يناير": "January",
"فبراير": "February",
"مارس": "March",
"أبريل": "April",
"مايو": "May",
"يونيو": "June",
"يوليو": "July",
"أغسطس": "August",
"سبتمبر": "September",
"أكتوبر": "October",
"نوفمبر": "November",
"ديسمبر": "December",
"(يدوي)": "(manual)",
"بدون": "none",
"تلقائي": "Auto",
"أبيض": "White",
"ذهبي": "Gold",
"سماوي": "Sky blue",
"كريمي": "Cream",
"أسود": "Black",
"بني": "Brown",
"كحلي": "Navy",
"عنابي": "Maroon"
};
    var ENX_FRAG = {
"السحور ينتهي بعد ": "Suhoor ends in ",
"الإفطار بعد ": "Iftar in ",
"العشاء بعد ": "Isha in ",
"وقت التراويح": "Taraweeh time",
"الفجر بعد ": "Fajr in ",
"رمضان • يوم ": "Ramadan • Day ",
"لسه ما اتجرّبش على التلفزيون": "Not tested on the TV yet",
"طلب تشغيل HTML5؛ سماعه على التلفزيون مش مؤكّد": "HTML5 play requested; hearing it on the TV is not confirmed",
"HTML5 رفض التشغيل؛ جرّب Vetro": "HTML5 refused to play; try Vetro",
"تعذّر تشغيل المدفع من HTML5": "Could not play the cannon from HTML5",
"بنطلب تشغيل المدفع؛ الأذان ليه الأولوية": "Asking to play the cannon; the adhan has priority",
"CANNON_QUEUED — طلب التشغيل اتبعت؛ ده مش تأكيد سماع الصوت": "CANNON_QUEUED: the play request was sent; this does not confirm the sound was heard",
"🌙 باقي ": "🌙 ",
" على الفجر: وقت السحور": " left to Fajr: suhoor time",
"🌙 حان موعد الإفطار، تقبّل الله صيامكم": "🌙 It is time for iftar. May Allah accept your fast",
"🌙 حان وقت صلاة التراويح": "🌙 It is time for Taraweeh prayer",
"تلقائي (في رمضان بس)": "Automatic (Ramadan only)",
"شغّال دايمًا": "Always on",
"مقفول": "Off",
"شغّال": "On",
"الحالة: ": "Status: ",
"مش في رمضان دلوقتي": "not in Ramadan now",
" • يوم ": " • Day ",
" من رمضان": " of Ramadan",
"\nالختمة: صفحة ": "\nKhatma: page ",
" (المفروض توصل صفحة ": " (you should reach page ",
" النهاردة لو ختمة ٣٠ يوم)": " today for a 30-day khatma)",
"\nمدفع أوفلاين بمسار Pulse مستقل عن الأذان وباقي الأصوات، والأذان ليه الأولوية. مفيش تغيير في صوت التلفزيون أو ملفاته.\nالحالة: ": "\nOffline cannon on its own Pulse path, separate from the adhan and the other sounds; the adhan has priority. No change to the TV's sound or files.\nStatus: ",
"وضع رمضان": "Ramadan Mode",
"الوضع: ": "Mode: ",
"مدفع الإفطار: ": "Iftar cannon: ",
"تنبيه السحور: ": "Suhoor alert: ",
"تنبيه التراويح: ": "Taraweeh alert: ",
"ختمة رمضان (٣٠ يوم)": "Ramadan khatma (30 days)",
"هدف الختمة: ٢١ صفحة في اليوم": "Khatma goal: 21 pages a day",
"جرّبه دلوقتي (مدفع + تنبيه)": "Try it now (cannon + alert)",
"جرّبه دلوقتي (المدفع بس)": "Try it now (cannon only)",
"حالة تشغيل المدفع": "Cannon playback status",
"حالة المدفع": "Cannon status",
"\nطلب تشغيل ناجح مش ضمان إن الصوت مسموع؛ جرّبه على الشاشة.\nCANNON_FINISHED = مسار Pulse خلّص الطلب.\nNO_PACTL / NO_PULSE = المسار مش متاح.\nSKIPPED_ALERT_BUSY = الأذان ليه الأولوية.": "\nA successful play request does not guarantee the sound is heard; try it on the TV.\nCANNON_FINISHED = the Pulse path finished the request.\nNO_PACTL / NO_PULSE = the path is not available.\nSKIPPED_ALERT_BUSY = the adhan has priority.",
"افتح المصحف": "Open the Mushaf",
"الإقامة بعد ": "Iqama in ",
"تعود الشاشة بعد ": "The screen returns in ",
"تقبّل الله صلاتكم": "May Allah accept your prayers",
"تدفق الصلاة: ": "Prayer Flow: ",
"تدفق الصلاة": "Prayer Flow",
"عدّاد الإقامة بعد الأذان، وبعدها الشاشة بتهدى ويرجع كل شيء لوحده.\nلازم تحدد دقايق الإقامة الأول (صفحة الصلاة > ضبط المواقيت).\nأي زرار بيرجّع الشاشة فورًا.": "An iqama countdown after the adhan, then the screen goes quiet and everything returns by itself.\nSet the iqama minutes first (Prayer page > Adjust the times).\nAny button brings the screen back at once.",
"مدة هدوء الشاشة: ": "Quiet screen time: ",
" دقيقة": " min",
"تمّت سورة الكهف النهاردة، جمعة مباركة": "Surat Al-Kahf is done for today. Blessed Friday",
"مبروك! ختمة كاملة. عدد الختمات: ": "Congratulations! A full khatma. Khatmas: ",
"وصلت هدف النهاردة: ": "You reached today's goal: ",
" صفحة": " pages",
"الجزء ": "Juz ",
" • صفحة ": " • page ",
"سورة الكهف • يوم الجمعة": "Surat Al-Kahf • Friday",
"سورة الكهف: ": "Surat Al-Kahf: ",
"سورة الكهف": "Surat Al-Kahf",
"النهاردة ": "Today ",
"ضع صور المصحف في مجلد ": "Put the Mushaf images in the folder ",
" لعرض الصفحة هنا": " to show the page here",
"OK: قرأت الصفحة • ◄ ► صفحة • ▲ ▼ جزء • رجوع: خروج": "OK: page read • ◄ ► page • ▲ ▼ juz • Back: exit",
"باقي ": "Left: ",
" (حوالي ": " (about ",
" يوم بالمعدّل ده)": " days at this rate)",
"الصفحة ": "Page ",
"\nقرأت النهاردة: ": "\nRead today: ",
" (الهدف ": " (goal ",
"\nأيام متتالية: ": "\nStreak days: ",
" • ختمات كاملة: ": " • full khatmas: ",
"\nالنهاردة الجمعة: سورة الكهف": "\nToday is Friday: Surat Al-Kahf",
" (صفحات ٢٩٣ – ٣٠٤)": " (pages 293 to 304)",
"المصحف والختمة": "Mushaf & Khatma",
"قرأت صفحة": "Page read",
"قرأت جزء كامل": "Full juz read",
"هدف اليوم: ": "Today's goal: ",
" (ختمة في ": " (a khatma in ",
" يوم)": " days)",
"شغّل التلاوة": "Play the recitation",
"الجمعة بس (شغّل برضه)": "Friday only (play anyway)",
"روح لصفحة الكهف": "Go to the Al-Kahf page",
"ابدأ ختمة جديدة": "Start a new khatma",
"تلاوة الكهف مش متاحة": "Al-Kahf recitation is not available",
"النهاردة الجمعة: سورة الكهف (الإعدادات > الصلاة والقرآن > المصحف والختمة)": "Today is Friday: Surat Al-Kahf (Settings > Prayer & Quran > Mushaf & Khatma)",
"مش قادر أحدد مكان اللانشر": "Cannot locate the launcher folder",
"اتحفظت نسخة ": "Saved version ",
"مفيش مساحة كفاية على التلفزيون": "Not enough space on the TV",
"ماقدرتش أحفظ النسخة (Vetro مش متصل؟)": "Could not save the version (Vetro not connected?)",
"ماقدرتش أحفظ النسخة": "Could not save the version",
"الرجوع ماتمّش (المجلد مقفول أو مفيش نسخة)": "Restore failed (the folder is locked or there is no saved version)",
"الرجوع ماتمّش (Vetro مش متصل؟)": "Restore failed (Vetro not connected?)",
"اتعمل رجوع لآخر نسخة شغالة، بعيد التشغيل...": "Went back to the last working version, restarting...",
"آخر نسخة شغالة": "Last Working Version",
"النسخة الحالية: ": "Current version: ",
"\nالنسخة المحفوظة: ": "\nSaved version: ",
"مفيش": "none",
"\nبتتحفظ لوحدها بعد ما نسخة تشتغل كويس مرتين. الرجوع بيستبدل ملفات اللانشر بس، وملفات الصوت (الكهف والتكبيرات) مابتتلمسش.": "\nA version is saved automatically after it runs well twice. Going back replaces only the launcher files; the audio files (Al-Kahf and the takbeerat) are not touched.",
"احفظ نسخة دلوقتي": "Save a version now",
"ارجع للنسخة ": "Go back to version ",
"الرجوع مش متاح (مفيش نسخة مختلفة)": "Going back is not available (no different version)",
"النسخة ": "Version ",
" ماوصلتش للرئيسية: برجّع النسخة ": " did not reach the Home Screen: going back to version ",
"الوضع الآمن": "Safe Mode",
"اللانشر وقف في التشغيل أكتر من مرة. فيه نسخة ": "The launcher stopped at startup more than once. Version ",
" كانت شغّالة. أرجع ليها؟": " was working. Go back to it?",
"كمّل بالوضع الآمن": "Continue in Safe Mode",
"النهارده! 🎉": "Today! 🎉",
"🎉 النهارده: ": "🎉 Today: ",
"⏰ بكرة: ": "⏰ Tomorrow: ",
"⏰ بعد ": "⏰ In ",
" أيام: ": " days: ",
" يوم": " days",
" سنة · ": " years · ",
" شهر · ": " months · ",
" يوم · ": " days · ",
" ساعة · ": " hours · ",
" يوم و": " days and ",
" ساعة و": " hours and ",
"العمر: ": "Age: ",
"مرّ: ": "Elapsed: ",
"عيد ميلاد · ذكرى زواج · تخرّج · احتفال… بتتحسب فورًا أول ما تفتح الصفحة": "Birthday · anniversary · graduation · celebration… counted at once when you open the page",
"＋ إضافة مناسبة": "＋ Add an occasion",
"مفيش مناسبات لسه. دوس «إضافة مناسبة» واختار النوع والاسم والتاريخ بالريموت.": "No occasions yet. Press “Add an occasion” and pick the type, name and date with the remote.",
"مناسبة جديدة": "New Occasion",
"تعديل المناسبة": "Edit Occasion",
"الاسم (اختار من المقترحات)": "Name (pick a suggestion)",
"أو اكتب اسم آخر…": "Or type another name…",
"التاريخ (▲ ▼ تغيّر القيمة)": "Date (▲ ▼ change the value)",
"✓ حفظ": "✓ Save",
"🗑 حذف": "🗑 Delete",
"اختار اسم من المقترحات أو اكتب اسم": "Choose a name from the suggestions or type one",
"عيد ميلاد": "Birthday",
"ذكرى زواج": "Anniversary",
"ميلاد مولود": "New baby",
"مناسبة أخرى": "Other occasion",
"زواج أبي وأمي": "My parents' wedding",
"زواج أخي": "My brother's wedding",
"زواج أختي": "My sister's wedding",
"زواج صديقي": "My friend's wedding",
"مولودنا الجديد": "Our new baby",
"مولود أخي": "My brother's baby",
"مولود أختي": "My sister's baby",
"تخرّج ابني": "My son's graduation",
"تخرّج ابنتي": "My daughter's graduation",
"تخرّج أخي": "My brother's graduation",
"تخرّج أختي": "My sister's graduation",
"خطوبة أخي": "My brother's engagement",
"خطوبة أختي": "My sister's engagement",
"حفلة عائلية": "Family party",
"لمّة الأصحاب": "Friends gathering",
"مناسبة عائلية": "Family occasion",
"ذكرى عزيزة": "Dear memory",
"يوم مميّز": "Special day",
"سورة ": "Surah ",
" · آية ": " · Ayah ",
"تفسير الآية": "Tafsir of the ayah",
"مفيش مناسبات شخصية متسجّلة": "No personal occasions saved",
"ضيف من صفحة الصلاة والقرآن › مناسباتي": "Add one from Prayer & Quran page › My Occasions",
"حكمة اليوم": "Wisdom of the Day",
"تباعد السطور ": "Line spacing ",
"لون الخط: ": "Text color: ",
"حجم الخط ": "Font size ",
"حواف الشاشة: ": "Screen margins: ",
" بكسل": " px",
"حجم خط التفسير ": "Tafsir font size ",
"أخضر فاتح": "Light green",
"أخضر غامق": "Dark green",
"الوضع الورقي مفعّل": "Paper mode on",
"الوضع الليلي مفعّل": "Night mode on",
"الصفحة كاملة على الشاشة": "The whole page fits the screen",
"حجم الخط يدوي، والصفحة بتتمرّر": "Manual font size, the page scrolls",
"ثيم ورقي هادي": "Calm paper theme",
"ثيم داكن": "Dark theme",
"نهاية المصحف الشريف": "End of the Noble Mushaf",
"بداية المصحف الشريف": "Start of the Noble Mushaf",
"سرعة التلاوة: ": "Recitation speed: ",
"تم تفعيل التفسير": "Tafsir on",
"تم إخفاء التفسير": "Tafsir hidden"
};
    var ENX_KEYS = Object.keys(ENX_FRAG).sort(function (a, b) { return b.length - a.length; });
    /* v8.7.26: text between \uE000 and \uE001 (a name the user typed) is kept exactly as written; the marks are removed. */
    var enxRaw = function (s) {
        if (lang === "ar" || typeof s !== "string" || !/[\u0600-\u06FF]/.test(s)) return s;
        if (Object.prototype.hasOwnProperty.call(ENX_EXACT, s)) return ENX_EXACT[s];
        var out = s;
        for (var i = 0; i < ENX_KEYS.length; i++) { if (out.indexOf(ENX_KEYS[i]) >= 0) out = out.split(ENX_KEYS[i]).join(ENX_FRAG[ENX_KEYS[i]]); }
        return out;
    };
    APL.enx = function (s) {
        if (typeof s !== "string" || s.indexOf("\uE000") < 0) return enxRaw(s);
        return s.split("\uE000").map(function (seg, i) {
            if (i === 0) return enxRaw(seg);
            var k = seg.indexOf("\uE001");
            return k < 0 ? seg : seg.slice(0, k) + enxRaw(seg.slice(k + 1));
        }).join("");
    };

    /* v8.7.26: for names the user typed (occasions): only an exact match with a known suggested name is translated.
       Words inside a typed name are never replaced, so text the user wrote stays exactly as written. */
    APL.enxName = function (s) {
        if (lang === "ar" || typeof s !== "string" || !/[\u0600-\u06FF]/.test(s)) return s;
        return Object.prototype.hasOwnProperty.call(ENX_EXACT, s) ? ENX_EXACT[s] : s;
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
