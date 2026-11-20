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
    var NEWS = [
        "✔ 7.0.0: مصحف حفص كامل مُشكّل وأوفلاين، بفهرس سور وفهرس أجزاء",
        "✔ بحث فوري من أول حرف؛ الآيات بالترتيب، وفتح الآية في صفحتها",
        "✔ أخضر الأذكار زي المصلّي، ومدفع رمضان بمسار مستقل عن باقي الأصوات",
        "⚠ Untested on the TV — محتاج تجربة على الشاشة",
        "\u2714 \u0627\u0644\u0645\u0635\u062D\u0641 \u0648\u0627\u0644\u062E\u062A\u0645\u0629 \u0648\u0633\u0648\u0631\u0629 \u0627\u0644\u0643\u0647\u0641 \u064A\u0648\u0645 \u0627\u0644\u062C\u0645\u0639\u0629",
        "\u2714 \u0648\u0636\u0639 \u0631\u0645\u0636\u0627\u0646 \u0627\u0644\u0643\u0627\u0645\u0644 \u0648\u062A\u062F\u0641\u0642 \u0627\u0644\u0635\u0644\u0627\u0629",
        "\u2714 \u0627\u0644\u0631\u062C\u0648\u0639 \u0644\u0622\u062E\u0631 \u0646\u0633\u062E\u0629 \u0634\u063A\u0627\u0644\u0629 \u0641\u064A \u0627\u0644\u0648\u0636\u0639 \u0627\u0644\u0622\u0645\u0646",
        "\u2714 \u0645\u064A\u0632\u0627\u062A \u0627\u0644\u062A\u062D\u0633\u064A\u0646 \u0627\u0644\u062B\u0642\u064A\u0644\u0629: \u0643\u0644 \u0645\u064A\u0632\u0629 \u0644\u0648\u062D\u062F\u0647\u0627 \u0648\u0643\u0644\u0647\u0627 \u0645\u0642\u0641\u0648\u0644\u0629 (\u0627\u0644\u0623\u062F\u0627\u0621)",
        "\u2714 \u0627\u0644\u0645\u062D\u0631\u0627\u0628 \u0627\u0644\u062D\u064A: \u0634\u0627\u0634\u0629 \u062A\u0648\u0642\u0641 \u0628\u0633\u0645\u0627 \u0628\u062A\u062A\u0628\u0639 \u0627\u0644\u0645\u0648\u0627\u0642\u064A\u062A \u0648\u0639\u062F\u0651\u0627\u062F \u0627\u0644\u0635\u0644\u0627\u0629",
        "\u2714 \u0634\u0627\u0631\u0629 \u0645\u0635\u062F\u0631 \u0627\u0644\u0645\u0648\u0627\u0642\u064A\u062A \u0641\u064A \u0635\u0641\u062D\u0629 \u0627\u0644\u0635\u0644\u0627\u0629",
        "\u2714 \u0644\u0648\u0646 \u0645\u0646 \u0627\u0644\u062E\u0644\u0641\u064A\u0629 (\u0627\u062E\u062A\u064A\u0627\u0631\u064A)",
        "\u2714 \u0642\u064A\u0648\u062F \u0648\u0636\u0639 \u0627\u0644\u0637\u0641\u0644: \u062A\u0637\u0628\u064A\u0642\u0627\u062A \u0645\u0633\u0645\u0648\u062D\u0629 \u0648\u062D\u062F \u064A\u0648\u0645\u064A \u0648\u0642\u0641\u0644 \u0627\u0644\u0635\u0644\u0627\u0629 \u0648\u0627\u0644\u0646\u0648\u0645",
        "\u2714 \u0634\u0627\u0634\u0629 \u0641\u062D\u0635 \u0627\u0644\u062A\u0644\u0641\u0632\u064A\u0648\u0646 (\u0627\u0644\u0625\u0639\u062F\u0627\u062F\u0627\u062A > \u0627\u0644\u0623\u062F\u0627\u0621)",
        "\u2714 \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0648\u064A\u062F\u062C\u062A \u0641\u0648\u0631\u064B\u0627 \u0639\u0646\u062F \u0627\u0644\u0631\u062C\u0648\u0639 \u0644\u0644\u0631\u0626\u064A\u0633\u064A\u0629",
        "\u2714 \u0648\u0636\u0639 \u0627\u0644\u0637\u0641\u0644 (\u0627\u0644\u062E\u0631\u0648\u062C \u0628\u0636\u063A\u0637\u0629 \u0645\u0637\u0648\u0651\u0644\u0629 3 \u062B\u0648\u0627\u0646\u064A \u0639\u0644\u0649 \u0627\u0644\u0643\u062A\u0645)",
        "\u2714 \u0627\u0644\u0648\u0636\u0639 \u0627\u0644\u0622\u0645\u0646 \u0628\u0639\u062F 3 \u0623\u0639\u0637\u0627\u0644",
        "\u2714 \u0646\u0635 \u0623\u0643\u0628\u0631 \u0648\u062A\u0628\u0627\u064A\u0646 \u0639\u0627\u0644\u064A (\u0625\u0645\u0643\u0627\u0646\u064A\u0629 \u0627\u0644\u0648\u0635\u0648\u0644)"
    ];
    function showNews() {
        APL.alert({ title: APL.t("What's New"), message: NEWS.join("\n"), buttons: [{ label: APL.t("OK") }] });
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
