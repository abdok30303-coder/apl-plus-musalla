/* ============================================================
   visual-fx.js — 10 Aesthetic Visual Enhancements & Motion Physics.

   Customizable display options in Settings › Appearance:
     1. Aurora Glow (الهالة النورانية المتفاعلة مع التركيز)
     2. Dynamic Sky Prayer Card (التدرج السماوي التفاعلي)
     3. Chamfered Diamond Frosted Glass (الزجاج المصقول الماسي)
     4. Royal Quran Gilding & Framing (التذهيب والزخرفة الملكية)
     5. Living Mesh Backgrounds (الخلفيات الشفقية الحية)
     6. Eastern Arabic Numerals (الأرقام المشرقية الفاخرة)
     7. Cinematic Mihrab Depth & Lighting (العمق السينمائي لمشاهد المحراب)
     8. Holographic Arabesque Wisdom Card (بطاقة الحكمة الهولوجرافية)
     9. Animated Vector Weather Icons (الأيقونات المناخية المصغرة النابضة)
    10. Fluid TV Spring Remote Physics (الفيزياء الحركية الزنبركية)

   All visual effects are OFF by default, so the launcher remains 100% clean
   and original. They only activate if the user chooses to enable them.
   Chromium 76 compatible (no ?. / ??).
   ============================================================ */
(function (global) {
    "use strict";

    var APL = global.APL, sys = APL && APL.sys;
    if (!APL || !sys) return;

    var FX_KEYS = [
        "fx_aurora_glow",
        "fx_dynamic_sky",
        "fx_chamfer_glass",
        "fx_royal_gilding",
        "fx_living_mesh",
        "fx_eastern_numerals",
        "fx_cinematic_mihrab",
        "fx_holographic_wisdom",
        "fx_animated_weather",
        "fx_spring_physics"
    ];

    var CLASS_MAP = {
        fx_aurora_glow: "fx-aurora-glow",
        fx_dynamic_sky: "fx-dynamic-sky",
        fx_chamfer_glass: "fx-chamfer-glass",
        fx_royal_gilding: "fx-royal-gilding",
        fx_living_mesh: "fx-living-mesh",
        fx_eastern_numerals: "fx-eastern-numerals",
        fx_cinematic_mihrab: "fx-cinematic-mihrab",
        fx_holographic_wisdom: "fx-holographic-wisdom",
        fx_animated_weather: "fx-animated-weather",
        fx_spring_physics: "fx-spring-physics"
    };

    function apply() {
        if (!document.body) return;
        var cl = document.body.classList;
        var isReduceMotion = cl.contains("reduce-motion") || sys.pref("reduceMotion") === true;

        for (var i = 0; i < FX_KEYS.length; i++) {
            var k = FX_KEYS[i];
            var cls = CLASS_MAP[k];
            // Pure opt-in: default is false unless explicitly set to true in settings
            var enabled = sys.pref(k) === true;
            if (isReduceMotion && (k === "fx_spring_physics" || k === "fx_living_mesh" || k === "fx_aurora_glow")) {
                enabled = false;
            }
            cl.toggle(cls, enabled);
        }
        updateDynamicSky();
    }

    function updateDynamicSky() {
        if (!sys.pref("fx_dynamic_sky")) {
            if (document.body) document.body.removeAttribute("data-sky-phase");
            return;
        }
        var p = APL.prayer;
        try {
            var now = new Date();
            var curMin = now.getHours() * 60 + now.getMinutes();
            var skyPhase = "dhuhr";

            var times = null;
            if (p) {
                if (typeof p.today === "function") times = p.today();
                else if (typeof p.todayTimes === "function") times = p.todayTimes();
                else if (typeof p.list === "function") {
                    var l = p.list();
                    if (l && l.length) {
                        times = {};
                        for (var j = 0; j < l.length; j++) times[l[j].key] = l[j].time;
                    }
                }
            }
            if (times && times.fajr && times.dhuhr && times.asr && times.maghrib && times.isha) {
                function toMins(tStr) {
                    var parts = String(tStr).split(":");
                    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
                }
                var fajrM = toMins(times.fajr);
                var sunriseM = times.sunrise ? toMins(times.sunrise) : fajrM + 90;
                var dhuhrM = toMins(times.dhuhr);
                var asrM = toMins(times.asr);
                var maghribM = toMins(times.maghrib);
                var ishaM = toMins(times.isha);

                if (curMin >= fajrM && curMin < sunriseM) skyPhase = "fajr";
                else if (curMin >= sunriseM && curMin < dhuhrM) skyPhase = "morning";
                else if (curMin >= dhuhrM && curMin < asrM) skyPhase = "dhuhr";
                else if (curMin >= asrM && curMin < maghribM) skyPhase = "asr";
                else if (curMin >= maghribM && curMin < ishaM) skyPhase = "maghrib";
                else {
                    var nightStart = ishaM + 90;
                    if (curMin >= nightStart || curMin < Math.max(0, fajrM - 30)) skyPhase = "night";
                    else skyPhase = "isha";
                }
            } else {
                var h = curMin / 60;
                if (h >= 4.5 && h < 6.5) skyPhase = "fajr";
                else if (h >= 6.5 && h < 11.5) skyPhase = "morning";
                else if (h >= 11.5 && h < 15) skyPhase = "dhuhr";
                else if (h >= 15 && h < 17.5) skyPhase = "asr";
                else if (h >= 17.5 && h < 19.5) skyPhase = "maghrib";
                else if (h >= 19.5 && h < 22) skyPhase = "isha";
                else skyPhase = "night";
            }

            if (document.body) {
                if (document.body.getAttribute("data-sky-phase") !== skyPhase) {
                    document.body.setAttribute("data-sky-phase", skyPhase);
                    var skyA = document.getElementById("skyA");
                    var skyB = document.getElementById("skyB");
                    if (skyA && skyB) {
                        var activeSky = skyA.classList.contains("is-on") ? skyA : skyB;
                        var nextSky = (activeSky === skyA) ? skyB : skyA;
                        nextSky.setAttribute("data-p", skyPhase);
                        nextSky.classList.add("is-on");
                        activeSky.classList.remove("is-on");
                    }
                }
            }
        } catch (e) {}
    }

    function init() {
        for (var i = 0; i < FX_KEYS.length; i++) {
            sys.onPref(FX_KEYS[i], apply);
        }
        sys.onPref("lightMode", apply);
        sys.onPref("visualEffects", apply);
        sys.onPref("perf", apply);
        sys.onPref("reduceMotion", apply);

        // Sync Eastern Numerals with system digitStyle
        sys.onPref("fx_eastern_numerals", function (v) {
            sys.setPref("digitStyle", v ? "arabic" : "west");
            if (APL.homeStatus && typeof APL.homeStatus.refresh === "function") APL.homeStatus.refresh();
            if (APL.prayer && typeof APL.prayer.refresh === "function") APL.prayer.refresh();
        });
        sys.onPref("digitStyle", function (v) {
            var isAr = (v === "arabic");
            if (sys.pref("fx_eastern_numerals") !== isAr) {
                sys.setPref("fx_eastern_numerals", isAr);
            }
        });

        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", apply);
        } else {
            apply();
        }

        if (APL.timers && typeof APL.timers.every === "function") {
            APL.timers.every("dynamic_sky", 60000, updateDynamicSky);
        } else {
            setInterval(updateDynamicSky, 60000);
        }

        document.addEventListener("visibilitychange", function () {
            if (!document.hidden) updateDynamicSky();
        });
    }

    function formatDigits(val) {
        if (val === null || val === undefined) return "";
        var str = String(val);
        if (sys.pref("fx_eastern_numerals")) {
            return str.replace(/[0-9]/g, function (d) {
                return "٠١٢٣٤٥٦٧٨٩"[parseInt(d, 10)];
            });
        }
        return str;
    }

    APL.visualEffects = {
        apply: apply,
        init: init,
        digits: formatDigits,
        keys: FX_KEYS
    };

    init();
})(window);
