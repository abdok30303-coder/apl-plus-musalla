/* ============================================================
   safe-mode.js (v3.3.3) - two small things, both Untested on the TV.
   1) SAFE MODE: diag.js counts start-ups that never reached the Home Screen
      (localStorage apl.bootFails). After 3 in a row this start-up (APL_SAFE)
      comes up with the heavy effects off (classes perf + reduce-motion), and
      a toast says so. A good start resets the count.
   2) Comfort: Settings > Accessibility > Large Text / High Contrast
      (body classes big-text / hi-contrast, see css/custom.css).
   ============================================================ */
(function (global) {
    "use strict";
    var APL = global.APL, sys = APL && APL.sys;
    if (!APL || !sys) return;

    function apply() {
        var b = document.body;
        if (!b) return;
        b.classList.toggle("big-text", !!sys.pref("bigText"));
        b.classList.toggle("hi-contrast", !!sys.pref("highContrast"));
        var f = String(sys.pref("uiFont") || "default");
        /* v7.2.0: real fonts. Old saved names are mapped to the nearest real one; "system" = the screen's own font (the old look). */
        var LEGACY = { tahoma: "cairo", serif: "elmessiri", notosans: "almarai", samsung: "system" };
        if (LEGACY[f]) f = LEGACY[f];
        var NAMES = ["default", "tajawal", "cairo", "almarai", "plex", "kufi", "naskh", "elmessiri", "readex", "changa", "amiri", "classic", "condensed", "heavy", "apl"];
        if (f !== "system" && NAMES.indexOf(f) < 0) f = "default";
        NAMES.forEach(function (n) { b.classList.toggle("font-" + n, f === n); });
        b.classList.toggle("font-ui", f !== "system");
    }
    apply();
    ["bigText", "highContrast", "uiFont"].forEach(function (k) { sys.onPref(k, apply); });

    if (global.APL_SAFE && document.body) {
        document.body.classList.add("perf", "reduce-motion", "auto-perf");
        global.setTimeout(function () {
            try { APL.toast("\u0627\u0644\u0648\u0636\u0639 \u0627\u0644\u0622\u0645\u0646: \u0627\u0644\u0645\u0624\u062B\u0631\u0627\u062A \u0645\u0642\u0641\u0648\u0644\u0629 \u0644\u0623\u0646 \u0627\u0644\u0634\u0627\u0634\u0629 \u0641\u0634\u0644\u062A \u062A\u0641\u062A\u062D 3 \u0645\u0631\u0627\u062A", true); } catch (e) {}
        }, 3000);
    }
    APL.safeMode = { active: !!global.APL_SAFE };

    /* 3) What's New (v3.3.3): shown once per version, 8 s after the Home Screen is up; also in Settings > Performance. Untested on the TV. */
    var NEWS_AR = [
        "✔ 8.7.49: شلت دعاء ليلة القدر المكرر من العشر الأواخر (١٥٠ عنصر دلوقتي).",
        "✔ 8.7.48: القائمة اسمها «الأناشيد». رجوع من مشغل النشيد بيقفله ويوقف الصوت ومبيسيبش حاجة على الشاشة.",
        "✔ 8.7.47: ٧ أناشيد وقصائد زيادة بتشتغل من رابط archive.org بتاعك وفي أول القائمة؛ والقائمة اسمها «الأناشيد والأغاني». زر رجوع دلوقتي بيقفل المشغل ويوقف الصوت دايمًا.",
        "✔ 8.7.46: أغنيتين رمضان والعيد بتشتغل دلوقتي مباشرة من الروابط اللي حطيتها (مشغّل صغير: OK إيقاف/تشغيل، يمين/شمال ١٠ ثواني، رجوع إغلاق). لو الملف ماشتغلش في ١٥ ثانية بتفتح على يوتيوب.",
        "✔ 8.7.45: في شاشة المحراب الحي، أول ضغطة OK بتشغّل الراديو (كانت محتاجة ضغطتين).",
        "✔ 8.7.44: أغاني رمضان والعيد بتفتح الفيديو نفسه بدل الشاشة الرئيسية ليوتيوب (تطبيق يوتيوب، وبعده TizenTube، وبعده YouTube Dummy، وآخر حاجة متصفح التلفزيون). الأغنيتين «أهلا بالعيد» و«رمضان جانا» بقوا الاتنين في الإعدادات > الصلاة والقرآن > أغاني رمضان والعيد.",
        "✔ 8.7.43: ودجت رمضان بقى على 3 مراحل مش بتتخلط: قبل رمضان بيوم لحد اليوم ٢٠ (أدعية ونصايح وفضائل)، من ٢١ لـ٣٠ (العشر الأواخر وليلة القدر وقيام الليل بس)، وأول ٣ أيام عيد الفطر (نصايح العيد بس). اليوم الإسلامي بيبدأ من المغرب. معاينات جديدة في الإعدادات، وإطار الشاشة الذهبي اتشال من المحراب الحي.",
        "✔ 8.7.42: قسم جديد «أغاني رمضان والعيد» في الإعدادات (الصلاة والقرآن، وسط عناصر رمضان) بيفتح «أهلا بالعيد» على يوتيوب، وأغنية تانية مخفية في الإعدادات > الدعم. الأغنية بتفتح أول حاجة في YouTube Dummy، وبعدها TizenTube، وبعدها تطبيق يوتيوب، وآخر حاجة متصفح التلفزيون. بتشتغل أونلاين بالصورة ومفيش حاجة متخزنة في اللانشر.",
        "✔ 8.7.41: ويدجت رمضان بقى في نص الشاشة فوق صف التطبيقات مباشرة، بمسافة واضحة تحت كارت الصلاة وبعيد عن اسم التطبيق ووصفه. والمحتوى زاد من ٣٨ لـ ١٢٠ دعاء ونصيحة وأدعية ليلة القدر وفضائل رمضان (قرآن وأحاديث صحيحة فقط)، وكل مصدر حديث بقى مكتوب كامل زي «صحيح البخاري · حديث ٢٠١٧».",
        "✔ 8.7.40: ويدجت رمضان جديد في الشاشة الرئيسية (في رمضان بس): كارت زجاجي فوق صف التطبيقات فيه هلال كبير (وفانوس في الأيام الأولى) ومعاه دعاء أو نصيحة أو دعاء ليلة القدر بمصدره من القرآن أو الحديث، عربي وإنجليزي وبدون إنترنت؛ وأدعية ليلة القدر في العشر الأواخر. في الإعدادات إيقاف وتشغيل ومعاينة. درجة الحرارة بقت بحجم «منذ الظهر» ولونها أزرق زي المهام. صفحة تحديث اللانشر بتعرض آخر إصدار معروف فورًا. جملة «اضغط لتحت لقراءة الباقي» بتظهر بس لما النص فعلاً أطول من المربع، والمربع أطول. وويدجت الحكمة بعيد عن حافة الشاشة أكتر.",
        "✔ 8.7.39: شارة «OK · تشغيل الراديو» اللي على شاشة توقف المحراب الحي اتحذفت خالص — دلوقتي لما تضغط OK بيظهر تنبيه صغير إن الراديو اتشغّل أو اتوقف؛ وودجت الحكمة بقى بيختار من مكتبة الكلم الطيب كلها (أكتر من ٣٢ ألف حكمة) مش من عيّنة ألف بس",
        "✔ 8.7.38: التاريخ الهجري اتصلح (كان متقدّم يوم كامل: بدايات الشهور الهجرية المعلنة من دار الإفتاء المصرية بقت هي المعتمدة، لحد جمادى الآخرة 1448)",
        "✔ 8.7.37: تجربة المدفع بتشتغل فوراً (كانت بتاخد حوالي 8 ثواني وهي بتدوّر على مخرج الصوت)؛ وأزرار الريموت المربوطة بتطبيقات بترجع لوحدها لو Vetro فقد قائمة الأزرار كلها",
        "✔ 8.7.36: أزرار الريموت المربوطة بتطبيقات ما بتضيعش لو خرجت من اللانشر وانت بتربط زر؛ القائمة بتتحفظ قبل ما Vetro تتفضى وبترجع لما اللانشر يرجع",
        "✔ 8.7.35: تنبيه الأذان والتجربة بالخلفية اتصلحوا (المشغّل الخلفي كان ما بيتثبتش)؛ وزر تجربة 8 ثواني بقى بيشتغل والتطبيق التاني قدامك؛ وفحص الجاهزية بقى بيقول الحقيقة",
        "✔ 8.7.34: تثبيت التحديث بقى يقول بالظبط أنهي خطوة فشلت وليه؛ وبيفحص التلفزيون الأول (Vetro والمجلد والأدوات) وبيتأكد من الملف المحمّل",
        "✔ قائمة «إيه الجديد» بتتحرك بالأسهم فوق وتحت؛ وويدجت الحكمة بقى بعيد عن الساعة وويدجت الصلاة",
        "✔ 8.7.33: الحكمة بتظهر كاملة دايماً؛ فحص التحديث مرة كل 24 ساعة؛ وتجربة المدفع بتبدأ أسرع",
        "✔ 8.7.32: صوت المدفع بيتدوّر عليه في أماكن أكتر؛ والموقع التلقائي بيسأل خدمات أكتر",
        "✔ 8.7.31: تثبيت التحديث من جوه اللانشر؛ وكل منافذ HDMI الأربعة بتظهر",
        "✔ 8.7.28: الموقع التلقائي اختياري (مقفول افتراضياً)؛ اختيار الدولة ثم المدينة؛ مفاتيح المصحف؛ والمحراب الحي شاشة التوقف الافتراضية",
        "\u2714 8.7.27: \u0627\u0644\u0645\u062f\u064a\u0646\u0629 \u0628\u062a\u062a\u062d\u062f\u062f \u0644\u0648\u062d\u062f\u0647\u0627 \u0645\u0646 \u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0634\u0627\u0634\u0629 (\u0627\u0644\u062f\u0648\u0644\u0629 \u0648\u0627\u0644\u0645\u0646\u0637\u0642\u0629 \u0627\u0644\u0632\u0645\u0646\u064a\u0629) \u0648\u0639\u0646\u0648\u0627\u0646 \u0627\u0644\u0625\u0646\u062a\u0631\u0646\u062a\u060c \u0648\u062a\u0642\u062f\u0631 \u062a\u062e\u062a\u0627\u0631\u0647\u0627 \u064a\u062f\u0648\u064a \u0641\u064a \u0623\u064a \u0648\u0642\u062a",
        "\u2714 \u0627\u0644\u062a\u0642\u0648\u064a\u0645 \u0627\u0644\u0647\u062c\u0631\u064a \u0628\u064a\u062a\u0628\u0639 \u062f\u0648\u0644\u0629 \u0627\u0644\u0645\u062f\u064a\u0646\u0629\u060c \u0648\u0645\u0648\u0639\u062f \u0631\u0645\u0636\u0627\u0646 \u0648\u0627\u0644\u0639\u064a\u062f \u0628\u064a\u062a\u062c\u062f\u062f \u0644\u0648\u062d\u062f\u0647 \u0648\u0645\u0639\u0627\u0647 \u0632\u0631 \u062a\u062d\u062f\u064a\u062b \u064a\u062f\u0648\u064a \u0648\u062a\u0635\u062d\u064a\u062d \u0628\u0627\u0644\u0623\u064a\u0627\u0645",
        "\u2714 \u0627\u0644\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0647\u062c\u0631\u064a \u0648\u0627\u062d\u062f \u0641\u064a \u0643\u0644 \u0627\u0644\u0634\u0627\u0634\u0627\u062a\u060c \u0648\u0627\u0644\u0639\u0644\u0627\u0645\u0629 \u2248 \u0645\u0639\u0646\u0627\u0647\u0627 \u0625\u0646 \u0627\u0644\u0645\u0648\u0639\u062f \u0644\u0633\u0647 \u0645\u0627 \u0627\u062a\u0639\u0644\u0646\u0634 \u0631\u0633\u0645\u064a\u064b\u0627",
        "\u2714 8.7.26: \u0648\u0642\u062a \u0627\u0644\u0639\u0634\u0627\u0621 \u0641\u064a \u0631\u0645\u0636\u0627\u0646 \u0628\u0637\u0631\u064a\u0642\u0629 \u0623\u0645 \u0627\u0644\u0642\u0631\u0649 \u0628\u0642\u0649 120 \u062f\u0642\u064a\u0642\u0629 \u0628\u0639\u062f \u0627\u0644\u0645\u063a\u0631\u0628 \u062d\u062a\u0649 \u0644\u0645\u0627 \u0627\u0644\u0646\u062a \u064a\u0643\u0648\u0646 \u0642\u0627\u0637\u0639",
        "\u2714 \u0627\u0644\u0645\u062f\u064a\u0646\u0629 \u0627\u0644\u0644\u064a \u0628\u062a\u062f\u0648\u0631 \u0639\u0644\u064a\u0647\u0627 \u0628\u062a\u0627\u062e\u062f \u0645\u0646\u0637\u0642\u062a\u0647\u0627 \u0627\u0644\u0632\u0645\u0646\u064a\u0629 \u0627\u0644\u062d\u0642\u064a\u0642\u064a\u0629 \u0628\u062f\u0644 \u062a\u0648\u0642\u064a\u062a \u0627\u0644\u0642\u0627\u0647\u0631\u0629",
        "\u2714 \u0623\u0633\u0645\u0627\u0621 \u0645\u0646\u0627\u0633\u0628\u0627\u062a\u0643 \u0627\u0644\u0644\u064a \u0643\u062a\u0628\u062a\u0647\u0627 \u0628\u0642\u062a \u0628\u062a\u0638\u0647\u0631 \u0632\u064a \u0645\u0627 \u0643\u062a\u0628\u062a\u0647\u0627 \u0641\u064a \u0627\u0644\u0648\u0636\u0639 \u0627\u0644\u0625\u0646\u062c\u0644\u064a\u0632\u064a",
        "\u2714 \u0631\u0633\u0627\u064a\u0644 \u0641\u062d\u0635 \u0627\u0644\u062a\u0644\u0641\u0632\u064a\u0648\u0646 \u0648USB \u0628\u0642\u062a \u0628\u0627\u0644\u0625\u0646\u062c\u0644\u064a\u0632\u064a \u0643\u0645\u0627\u0646",
        "\u2714 8.7.25: \u0642\u0627\u0631\u0626 \u0627\u0644\u0645\u0635\u062d\u0641 \u0648\u0645\u0634\u063a\u0651\u0644 \u0627\u0644\u0642\u0631\u0622\u0646 \u0648\u0627\u0644\u0641\u062d\u0635 \u0648\u0643\u0644 \u0627\u0644\u0625\u0639\u062f\u0627\u062f\u0627\u062a \u0628\u0642\u062a \u0628\u0627\u0644\u0625\u0646\u062c\u0644\u064a\u0632\u064a \u0643\u0627\u0645\u0644 \u0644\u0645\u0627 \u0627\u0644\u0644\u063a\u0629 English",
        "\u2714 \u0632\u0631 \u062d\u0648\u0627\u0641 \u0627\u0644\u0634\u0627\u0634\u0629 \u0641\u064a \u0627\u0644\u0645\u0635\u062d\u0641 \u0628\u0642\u0649 \u064a\u0646\u0641\u0639 \u062a\u0648\u0635\u0644\u0647 \u0628\u0627\u0644\u0631\u064a\u0645\u0648\u062a",
        "\u2714 \u0627\u0644\u0637\u0642\u0633 \u0645\u0628\u0642\u0627\u0634 \u064a\u0639\u0631\u0636 \u0642\u0631\u0627\u0621\u0629 \u0645\u062f\u064a\u0646\u0629 \u062a\u0627\u0646\u064a\u0629 \u0628\u0639\u062f \u062a\u063a\u064a\u064a\u0631 \u0627\u0644\u0645\u062f\u064a\u0646\u0629 \u0623\u0648 \u0627\u0644\u0648\u062d\u062f\u0629",
        "\u2714 \u0623\u0648\u0642\u0627\u062a \u0627\u0644\u0635\u0644\u0627\u0629 \u0648\u0627\u0644\u0637\u0642\u0633 \u0644\u0644\u0639\u0627\u0644\u0645 \u0643\u0644\u0647 (\u0645\u062f\u0646 \u0648\u062f\u0648\u0644 \u0628\u0637\u0631\u064a\u0642\u0629 \u062d\u0633\u0627\u0628 \u0643\u0644 \u0628\u0644\u062f)",
        "\u2714 \u0645\u062f\u0641\u0639 \u0631\u0645\u0636\u0627\u0646 \u0627\u062a\u0635\u0644\u062d \u0641\u064a \u062c\u062f\u0648\u0644 \u0627\u0644\u062e\u062f\u0645\u0629 \u0627\u0644\u062e\u0644\u0641\u064a\u0629\u060c \u0648\u0632\u0631\u0651 \u0645\u0633\u062a\u0642\u0644 \u0644\u062a\u062c\u0631\u0628\u0629 \u0627\u0644\u0645\u062f\u0641\u0639 \u0644\u0648\u062d\u062f\u0647",
        "\u2714 \u0633\u0648\u0631\u0629 \u0627\u0644\u0643\u0647\u0641 \u0648\u062a\u0643\u0628\u064a\u0631\u0627\u062a \u0627\u0644\u0639\u064a\u062f: \u0645\u0646 \u0645\u0644\u0641 APL-Audio \u0623\u0648\u0644\u0627\u064b\u060c \u0648\u0644\u0648 \u0645\u0634 \u0645\u0648\u062c\u0648\u062f \u062a\u0634\u063a\u0644 \u0623\u0648\u0646\u0644\u0627\u064a\u0646",
        "\u2714 \u0643\u0644\u0627\u0645 \u0627\u0644\u0645\u0635\u062d\u0641 \u0648\u0627\u0644\u062a\u0641\u0633\u064a\u0631 \u0645\u0634 \u0628\u064a\u062a\u0642\u0637\u0639 \u0645\u0646 \u0627\u0644\u062c\u0646\u0628",
        "\u2714 \u0643\u0644 \u0627\u0644\u0625\u0639\u062f\u0627\u062f\u0627\u062a \u0648\u0627\u0644\u0634\u0627\u0634\u0627\u062a \u0644\u0647\u0627 \u0646\u0635 \u0625\u0646\u062c\u0644\u064a\u0632\u064a \u0643\u0627\u0645\u0644 \u0644\u0645\u0627 \u062a\u0627\u062e\u062f \u0627\u0644\u0644\u063a\u0629 English",
        "\u26a0 Untested on the TV \u2014 \u0645\u062d\u062a\u0627\u062c \u062a\u062c\u0631\u0628\u0629 \u0639\u0644\u0649 \u0627\u0644\u0634\u0627\u0634\u0629"
    ];
    var NEWS_EN = [
        "✔ 8.7.49: removed a repeated Laylat al-Qadr dua from the last-ten items (150 items now).",
        "✔ 8.7.48: the songs menu is now just “Nasheeds”. Back from the player closes it, stops the sound and leaves nothing on screen.",
        "✔ 8.7.47: seven more nasheeds and recitations stream from your archive.org item and are listed first; the menu is now “Nasheeds & Songs”. Back always closes the player and stops the sound.",
        "✔ 8.7.46: the two Ramadan & Eid songs now play straight from the links you gave (small player: OK pause/play, Left/Right 10 s, Back closes). If a file cannot start in 15 seconds, the song opens on YouTube.",
        "✔ 8.7.45: on the Living Mihrab screen saver, the first OK now starts the radio (it needed two presses).",
        "✔ 8.7.44: the Ramadan & Eid songs now open the video itself instead of the YouTube home screen (YouTube app, then TizenTube, then YouTube Dummy, then the TV browser). Both songs, “Ahlan bel Eid” and “Ramadan Gana”, are now in Settings > Prayer and Quran > Ramadan & Eid Songs.",
        "✔ 8.7.43: the Ramadan widget now has three phases that never mix: the day before Ramadan to day 20 (duas, tips, virtues), days 21-30 (last ten nights, Laylat al-Qadr and night prayer only) and the first 3 days of Eid (Eid tips only). The Islamic day starts at Maghrib. New previews in Settings, and the gold outline is gone from the Living Mihrab.",
        "✔ 8.7.42: new “Ramadan & Eid Songs” entry in Settings (Prayer and Quran, among the Ramadan items) that opens “Ahlan bel Eid” on YouTube, and a second, hidden song entry in Settings > Support. A song opens first in YouTube Dummy, then TizenTube, then the YouTube app, and last in the TV browser. They play online with picture; nothing is stored in the launcher.",
        "✔ 8.7.41: the Ramadan widget is now centred just above the apps row, with a clear gap under the prayer card and clear of the focused app's name and description. The pool grows from 38 to 120 duas, tips, Laylat al-Qadr duas and virtues of Ramadan (Quran and hadith only), and every hadith source now reads “Sahih al-Bukhari · Hadith 2017” in full. The wisdom widget stays clear of the screen edge.",
        "✔ 8.7.40: new Ramadan widget on the Home screen (Ramadan only): a glass card above the apps row with a big crescent (a fanous lantern in the first days) and a rotating dua, tip or Laylat al-Qadr dua with its Quran / hadith source, Arabic and English, offline; the Qadr duas lead in the last ten nights. Settings > Ramadan has an on/off switch and a preview. The temperature on the Home screen now matches the “since prayer” text size and is blue like Tasks. The Launcher Update page shows the last known version at once. The “press Down to read more” hint now shows only when the text really overflows, and the text box is taller. The wisdom widget keeps a wider margin from the screen edge.",
        "✔ 8.7.39: the on-screen “OK · radio” chip on the Living Mihrab screen saver is gone for good - pressing OK now shows a short toast that the radio turned on or off; the wisdom widget draws from the whole Kalem Tayeb library (32,000+ wisdoms) instead of a 1,000-item sample",
        "✔ 8.7.38: the Hijri date is fixed (it ran one day ahead: the Egyptian month starts announced by Dar al-Ifta are now the ones used, through Jumada al-Akhira 1448)",
        "✔ 8.7.37: the cannon test plays right away (it used to spend about 8 s finding the sound route); remote buttons bound to apps are put back by the launcher whenever Vetro loses the whole button list",
        "✔ 8.7.36: remote buttons bound to apps are no longer lost if you leave the launcher while binding a button; the list is saved before Vetro is emptied and put back when the launcher returns",
        "✔ 8.7.35: the prayer alert and the background test are fixed (the background player could not install); the 8-second test now plays with another app in front; the readiness check tells the truth",
        "✔ 8.7.34: Install Update now says exactly which step failed and why; it checks the TV first (Vetro, folder, tools) and checks the downloaded file",
        "✔ What's New scrolls with Up and Down; the wisdom widget stays clear of the clock and the prayer widget",
        "✔ 8.7.33: the whole wisdom always shows; the update check runs once every 24 hours; the cannon test starts faster",
        "✔ 8.7.32: the cannon sound is found in more places; automatic location asks more services",
        "✔ 8.7.31: Install Update from inside the launcher; all four HDMI ports are listed",
        "✔ 8.7.28: automatic location is optional (off by default); one country-then-city picker; Mushaf keys; Living Mihrab is the default screen saver",
        "✔ 8.7.27: The city is now found by itself from the screen (country, time zone) and the Internet address; you can still choose it by hand",
        "✔ The Hijri calendar follows the city's country; Ramadan and Eid renew themselves, with a manual update and a correction in days",
        "✔ One Hijri date everywhere; ≈ means the date is not announced yet",
        "✔ 8.7.26: Umm Al-Qura Isha in Ramadan is now 120 minutes after Maghrib even when the times are calculated offline",
        "✔ A searched city now gets its real time zone (looked up if missing) instead of silently using Cairo time",
        "✔ Occasion names you type stay exactly as you wrote them in English mode",
        "✔ The TV Check and USB messages are now in English too",
        "\u2714 8.7.25: the Quran reader, the Quran player, the diagnostics and every setting are now fully in English when the language is English",
        "\u2714 The Screen margins button in the Quran reader can now be reached with the remote",
        "\u2714 Weather no longer shows another city's reading after you change the city or the unit",
        "\u2714 8.7.24: every setting and page now has full English text when the language is English",
        "\u2714 Prayer times and weather for the whole world (cities and countries, each with its usual calculation method)",
        "\u2714 Ramadan cannon fixed in the background schedule; the cannon switch decides cannon + adhan or adhan only; separate button to test the cannon alone",
        "\u2714 Al-Kahf and Eid takbeer: the file in APL-Audio is used first, and if it is missing they play online (with a message if both fail)",
        "\u2714 Mushaf and tafsir words are no longer cut at the sides",
        "\u26a0 Untested on the TV \u2014 needs a test on the screen"
    ];
    function newsList() { return (APL.lang === "ar") ? NEWS_AR : NEWS_EN; }
    function showNews() {
        APL.alert({ title: APL.t("What's New"), message: newsList().join("\n"), buttons: [{ label: APL.t("OK") }] });
    }
    /* v7.0.4: "What's New" only shows on the bare home screen. If something is open (a page, Settings,
       the Mushaf reader, a menu) it waits and tries again; the version is marked seen only once shown. */
    function homeIsBare() {
        function open(o, f) { try { return !!(o && o[f] && o[f]()); } catch (e) { return false; } }
        /* v7.0.7: also an open folder (has-folder), moving icons (is-editing) and the prayer blackout (has-blackout) */
        if (/(^| )(has-(cc|sources|search|settings|profiles|wdg|aplpage|folder|blackout)|is-editing)( |$)/.test(document.body.className)) return false;
        if (open(APL.prayerPage, "isBlackout") || open(APL.kidLimits, "reason")) return false;
        return !(open(APL.folders, "isOpen") || open(APL.systemPage, "isOpen") ||
            !!document.querySelector(".khr.is-open, .pflow.is-open, .veil.is-on") ||
            open(APL.settings, "isOpen") || open(APL.controlCenter, "isOpen") || open(APL.search, "isOpen") ||
            open(APL.sources, "isOpen") || open(APL.profilesUI, "isOpen") || open(APL.prayerPage, "isOpen") ||
            open(APL.tasksPage, "isOpen") || open(APL.backup, "isOpen") || open(APL.contextMenu, "isOpen") ||
            open(APL.switcher, "isOpen") || open(APL.screensaver, "isActive") || open(APL.alert, "isOpen") ||
            !!document.querySelector(".mq.is-open"));
    }
    function newsOnce() {
        var v = (global.APL_BUILD && global.APL_BUILD.version) || "", k = "apl.newsSeen", tries = 0;
        try { if (!v || global.localStorage.getItem(k) === v) return; } catch (e) { return; }
        function attempt() {
            if (global.APL_SAFE) return;
            if (document.hidden || !homeIsBare()) {
                if (++tries < 120) global.setTimeout(attempt, 5000);
                return;
            }
            try {
                global.localStorage.setItem(k, v);
                if (global.localStorage.getItem("apl.newsSeenEver") !== "1") { global.localStorage.setItem("apl.newsSeenEver", "1"); }
            } catch (e) { return; }
            showNews();
        }
        global.setTimeout(attempt, 8000);
    }
    newsOnce();
    APL.whatsNew = { show: showNews };
})(window);
