/* ============================================================
   weather.js — the weather on the Home Screen, from Open-Meteo.

   - No key, no account, and the screen's own location is never
     asked for: the place is chosen in Settings › Weather › Weather
     Place (an Egyptian city, js/cities.js).
   - Refreshed every 15 minutes (Settings: refreshMinutes in
     js/site-config.js), and once when the launcher starts.
   - The last answer is kept on the screen: without a network the
     last weather and its time are shown instead of an error.
   - Nothing is fetched in Light Mode? It is: two numbers every 15
     minutes cost nothing, and the weather is part of the Home Screen.
   ============================================================ */
(function (global) {
    "use strict";

    var APL = global.APL, sys = APL && APL.sys;
    if (!APL || !sys) return;

    var SITE = global.APL_SITE || {};
    var CFG = SITE.weather || {};
    var KEY = "apl.weather.last";
    var last = null, busy = false, failed = false;

    /* WMO weather codes → a word and an icon (Open-Meteo's own table, grouped). */
    var CODES = [
        [0,  "صافية", "Clear", "☀️"],
        [1,  "صافية غالبًا", "Mostly clear", "🌤️"],
        [2,  "غيوم متفرقة", "Partly cloudy", "⛅"],
        [3,  "غائم", "Overcast", "☁️"],
        [45, "شبورة", "Fog", "🌫️"],
        [48, "شبورة متجمدة", "Freezing fog", "🌫️"],
        [51, "رذاذ خفيف", "Light drizzle", "🌦️"],
        [53, "رذاذ", "Drizzle", "🌦️"],
        [55, "رذاذ كثيف", "Heavy drizzle", "🌧️"],
        [56, "رذاذ متجمد", "Freezing drizzle", "🌧️"],
        [57, "رذاذ متجمد كثيف", "Heavy freezing drizzle", "🌧️"],
        [61, "مطر خفيف", "Light rain", "🌦️"],
        [63, "مطر", "Rain", "🌧️"],
        [65, "مطر غزير", "Heavy rain", "🌧️"],
        [66, "مطر متجمد", "Freezing rain", "🌧️"],
        [67, "مطر متجمد غزير", "Heavy freezing rain", "🌧️"],
        [71, "ثلج خفيف", "Light snow", "🌨️"],
        [73, "ثلج", "Snow", "❄️"],
        [75, "ثلج كثيف", "Heavy snow", "❄️"],
        [77, "حبيبات ثلج", "Snow grains", "🌨️"],
        [80, "زخات مطر خفيفة", "Light showers", "🌦️"],
        [81, "زخات مطر", "Showers", "🌧️"],
        [82, "زخات غزيرة", "Violent showers", "⛈️"],
        [85, "زخات ثلج", "Snow showers", "🌨️"],
        [86, "زخات ثلج كثيفة", "Heavy snow showers", "🌨️"],
        [95, "عاصفة رعدية", "Thunderstorm", "⛈️"],
        [96, "عاصفة رعدية مع برد", "Thunderstorm with hail", "⛈️"],
        [99, "عاصفة رعدية شديدة", "Severe thunderstorm", "⛈️"]
    ];
    function describe(code) {
        var best = CODES[CODES.length - 1];
        for (var i = 0; i < CODES.length; i++) if (code >= CODES[i][0]) best = CODES[i];
        return { ar: best[1], en: best[2], icon: best[3] };
    }

    function place() {
        var key = sys.pref("weatherPlace") || CFG.place || "cairo";
        return global.APL_CITY ? global.APL_CITY(key) : { key: "cairo", ar: "القاهرة", en: "Cairo", lat: 30.0444, lon: 31.2357 };
    }

    function readSaved() {
        try { return JSON.parse(global.localStorage.getItem(KEY) || "null"); } catch (e) { return null; }
    }
    function saveSaved(w) {
        try { global.localStorage.setItem(KEY, JSON.stringify(w)); } catch (e) {}
    }

    function fetchNow() {
        if (busy) return Promise.resolve(last);
        var p = place();
        var url = "https://api.open-meteo.com/v1/forecast?latitude=" + p.lat.toFixed(4) +
                  "&longitude=" + p.lon.toFixed(4) +
                  "&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,surface_pressure" +
                  "&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,sunrise,sunset,uv_index_max,precipitation_probability_max,wind_speed_10m_max" +
                  "&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,weather_code" +
                  "&timezone=" + encodeURIComponent((SITE.prayer && SITE.prayer.timezone) || "Africa/Cairo");
        busy = true;
        return APL.fetchJSON(url, 12000).then(function (j) {   // v1.2.115: 12 s limit (a stalled request left busy = true for ever)
            busy = false;
            var cur = (j && j.current) || {};
            var daily = (j && j.daily) || {};
            var hourly = (j && j.hourly) || {};
            var d = describe(parseInt(cur.weather_code, 10) || 0);

            var daysForecast = [];
            var times = daily.time || [];
            for (var i = 0; i < times.length; i++) {
                var cDesc = describe(parseInt(daily.weather_code && daily.weather_code[i], 10) || 0);
                daysForecast.push({
                    date: times[i],
                    code: daily.weather_code && daily.weather_code[i],
                    icon: cDesc.icon,
                    textAr: cDesc.ar,
                    textEn: cDesc.en,
                    max: Math.round(daily.temperature_2m_max && daily.temperature_2m_max[i]),
                    min: Math.round(daily.temperature_2m_min && daily.temperature_2m_min[i]),
                    rainProb: (daily.precipitation_probability_max && daily.precipitation_probability_max[i]) || 0,
                    uv: (daily.uv_index_max && daily.uv_index_max[i]) || 0,
                    windMax: Math.round((daily.wind_speed_10m_max && daily.wind_speed_10m_max[i]) || 0)
                });
            }

            var hoursForecast = [];
            var hTimes = hourly.time || [];
            for (var h = 0; h < Math.min(24, hTimes.length); h++) {
                var hDesc = describe(parseInt(hourly.weather_code && hourly.weather_code[h], 10) || 0);
                var rawT = String(hTimes[h] || "");
                var hrStr = rawT.split("T")[1] || rawT;
                hoursForecast.push({
                    time: hrStr,
                    temp: Math.round(hourly.temperature_2m && hourly.temperature_2m[h]),
                    humidity: Math.round((hourly.relative_humidity_2m && hourly.relative_humidity_2m[h]) || 0),
                    rainProb: (hourly.precipitation_probability && hourly.precipitation_probability[h]) || 0,
                    icon: hDesc.icon,
                    textAr: hDesc.ar,
                    textEn: hDesc.en
                });
            }

            /* v1.2.99: all the hours of the week (compact), for the hour-by-hour page and for "rain in N h"
               counted from NOW (the 24 hours in `hours` start at midnight). */
            var hoursAll = [];
            for (var ha = 0; ha < hTimes.length; ha++) {
                var rt = String(hTimes[ha] || "").split("T");
                hoursAll.push({
                    d: rt[0], t: (rt[1] || "").slice(0, 5),
                    temp: Math.round(hourly.temperature_2m && hourly.temperature_2m[ha]),
                    hum: Math.round((hourly.relative_humidity_2m && hourly.relative_humidity_2m[ha]) || 0),
                    rain: (hourly.precipitation_probability && hourly.precipitation_probability[ha]) || 0,
                    code: (hourly.weather_code && hourly.weather_code[ha]) || 0
                });
            }

            failed = false;
            last = {
                curTime: String(cur.time || ""),
                hoursAll: hoursAll,
                temp: Math.round(parseFloat(cur.temperature_2m)),
                apparent: Math.round(parseFloat(cur.apparent_temperature || cur.temperature_2m)),
                humidity: Math.round(parseFloat(cur.relative_humidity_2m || 0)),
                wind: Math.round(parseFloat(cur.wind_speed_10m || 0)),
                pressure: Math.round(parseFloat(cur.surface_pressure || 1013)),
                precipitation: parseFloat(cur.precipitation || 0),
                code: parseInt(cur.weather_code, 10) || 0,
                textAr: d.ar, textEn: d.en, icon: d.icon,
                isDay: cur.is_day === 1,
                placeKey: p.key,
                days: daysForecast,
                hours: hoursForecast,
                at: Date.now()
            };
            saveSaved(last);
            render();
            return last;
        }).catch(function (e) {
            busy = false;
            failed = true;
            last = readSaved() || last;
            render(true);
            return last;
        });
    }

    function clock(at) {
        var d = new Date(at), h = d.getHours(), m = d.getMinutes();
        var mm = (m < 10 ? "0" : "") + m;
        if (sys.pref("clockFormat") === "24" || sys.pref("clock24")) return APL.digits((h < 10 ? "0" : "") + h + ":" + mm);
        return APL.digits(((h % 12) || 12) + ":" + mm) + " " + (h < 12 ? "AM" : "PM");
    }

    function render(stale) {
        if (!APL.homeStatus) return;
        var w = last;
        if (!w) { APL.homeStatus.set("weather", null, 10); return; }
        var text = APL.lang === "ar" ? w.textAr : w.textEn;
        var p = global.APL_CITY ? global.APL_CITY(w.placeKey) : null;
        var name = p ? (APL.lang === "ar" ? p.ar : p.en) : "";

        var rainAlert = "";
        if (w.code >= 51 && w.code <= 99) {
            rainAlert = ' · <span style="color:#60a5fa;font-weight:600">🌧️ ' + APL.t("Rain now") + '</span>';
        } else if (w.hoursAll && w.hoursAll.length && w.curTime && Date.now() - w.at < 7200000) {
            /* v1.2.99: the next 6 hours from now (it used to read the first hours of the day, from midnight) */
            var nearRain = null, rainH = 0, from = w.curTime.slice(0, 13) + ":00", si = -1, hh;
            for (hh = 0; hh < w.hoursAll.length; hh++) {
                if (w.hoursAll[hh].d + "T" + w.hoursAll[hh].t >= from) { si = hh; break; }
            }
            if (si >= 0) {
                for (hh = 0; hh < 6 && si + hh < w.hoursAll.length; hh++) {
                    if (w.hoursAll[si + hh].rain >= 40) { nearRain = w.hoursAll[si + hh]; rainH = Math.max(1, hh); break; }
                }
            }
            if (nearRain) {
                rainAlert = ' · <span style="color:#60a5fa;font-weight:600">🌧️ ' +
                    APL.t("Rain in {h}h ({p}%)", { h: APL.digits(rainH), p: APL.digits(nearRain.rain) }) + '</span>';
            } else if (w.days && w.days[0] && w.days[0].rainProb >= 50) {
                rainAlert = ' · <span style="color:#60a5fa;font-weight:600">🌧️ ' +
                    APL.t("Rain chance {p}%", { p: APL.digits(w.days[0].rainProb) }) + '</span>';
            }
        }

        var html = '<span class="statusx__ico">' + w.icon + "</span>" +
                   '<span class="num">' + APL.digits(w.temp) + "°</span> " + '<span class="statusx__wtxt">' + text + "</span>" +
                   (name ? " · " + name : "") +
                   rainAlert +
                   (stale ? ' <span class="statusx__left">(' + APL.t("Updated {time}", { time: clock(w.at) }) + ")</span>" : "");
        APL.homeStatus.set("weather", html, 10);
    }

    function start() {
        last = readSaved();
        render();
        if (last && Date.now() - last.at < 60000) { schedule(); return; }
        fetchNow().then(schedule, schedule);
    }
    function schedule() {
        var mins = parseInt(CFG.refreshMinutes, 10) || 15;
        APL.timers.every("weather", Math.max(5, mins) * 60000, function () { fetchNow(); });   // v1.2.100: shared timer; skipped while hidden
    }

    APL.weather = {
        get: function () { return last; },
        failed: function () { return failed; },
        busy: function () { return busy; },
        clock: clock,
        refresh: fetchNow,
        start: start,
        placeName: function () { var p = place(); return APL.lang === "ar" ? p.ar : p.en; },
        describe: describe
    };

    sys.onPref("weatherPlace", function () { fetchNow(); });
    sys.onPref("clockFormat", function () { render(); });
    sys.onPref("digitStyle", function () { render(); });

    setTimeout(start, 2500);
})(window);
