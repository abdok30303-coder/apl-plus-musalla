/* ============================================================
   auto-location.js (v8.7.27) — the city of the prayer times and the weather, found by itself.

   Two kinds of evidence, both read without asking the viewer anything:
     1. The screen: its time zone, and its country (Smart Hub country / Tizen locale / language tag).
        Works with no internet.
     2. The Internet address (IP): a free, keyless geolocation service gives an approximate position.
        Tried in this order: ipwho.is, geojs.io, ipapi.co, freeipapi.com (the first answer wins).
   The two are compared. When both are known and BOTH disagree (a VPN, a TV set to another country),
   nothing is changed. When only the screen is known (no internet), the city is set only if the current
   one does not fit the screen's country and time zone.

   The answer is snapped to the nearest city of js/cities.js when it is within 35 km (so the name,
   time zone and country are the city's own); farther away it becomes a "custom" place named by the
   service. It then writes exactly what a manual choice writes (prayerCity / customPlace) and reloads
   the prayer times and the weather, so everything else (Hijri calendar, Ramadan, Eid, alerts sent to
   Vetro) follows by itself.

   Settings > Prayer and Quran: "Detect location automatically" (OFF by default since v8.7.28: until it is turned on,
   no request is sent to any geolocation service), "Detect location now" (one check, does not turn the mode on),
   and the city lists. Choosing a city by hand turns the automatic mode off (prayer.js setCity).

   Care taken:
     - Runs 4 s after start-up, every 12 hours, when the network comes back, and when turned on.
     - The region of the language tag is used only for Arabic ("ar-EG"); "en-US" says nothing about where the screen is.
     - A change between two known cities needs two matching detections in a row (no flip-flopping on a
       jumpy address), except the first detection and "Detect now".
     - Internet addresses are only sent to the geolocation service, never stored: the saved record
       holds only the place that was found.
   ============================================================ */
(function (global) {
    "use strict";

    var APL = global.APL, sys = APL && APL.sys;
    if (!APL || !sys) return;

    var KEY = "apl.autoloc";
    var SNAP_KM = 35;          // an answer this close to a known city becomes that city
    var lastRun = 0;

    function T(s, p) { try { return APL.t(s, p); } catch (e) { return s; } }
    function say(m) { try { if (APL.toast) APL.toast(m, true); } catch (e) {} }
    function enabled() { return sys.pref("prayerAuto") === true; }   /* v8.7.28: OFF unless the viewer turns it on */
    function load() {
        try { var o = JSON.parse(global.localStorage.getItem(KEY) || "null"); return (o && typeof o === "object") ? o : {}; } catch (e) { return {}; }
    }
    function save(o) { try { global.localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {} }
    function nameOf(c) { return APL.lang === "ar" ? (c.ar || c.en) : (c.en || c.ar); }
    function curCity() { try { return (APL.prayer && APL.prayer.city) ? APL.prayer.city() : null; } catch (e) { return null; } }

    /* Did the viewer pick a city before automatic mode existed? (only a saved preference counts, not the default) */
    function userChoseCity() {
        try {
            var p = JSON.parse(global.localStorage.getItem("apl.prefs") || "{}");
            return Object.prototype.hasOwnProperty.call(p, "prayerCity") || Object.prototype.hasOwnProperty.call(p, "customPlace");
        } catch (e) { return false; }
    }

    /* ---------- small maths ---------- */
    function km(lat1, lon1, lat2, lon2) {
        var d2r = Math.PI / 180, dLat = (lat2 - lat1) * d2r, dLon = (lon2 - lon1) * d2r;
        var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(lat1 * d2r) * Math.cos(lat2 * d2r) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(a)));
    }
    /* The offset (minutes east of UTC) of an IANA zone right now, or null. */
    function zoneOffset(zone) {
        if (!zone) return null;
        try {
            var f = new global.Intl.DateTimeFormat("en-GB", {
                timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit",
                hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false
            });
            var o = {}, list = f.formatToParts(new Date()), i;
            for (i = 0; i < list.length; i++) o[list[i].type] = list[i].value;
            var now = new Date();
            var asUTC = Date.UTC(+o.year, +o.month - 1, +o.day, (+o.hour) % 24, +o.minute, +o.second);
            return Math.round((asUTC - Math.floor(now.getTime() / 1000) * 1000) / 60000);
        } catch (e) { return null; }
    }

    /* ---------- 1. what the screen knows ---------- */
    function deviceInfo() {
        return new Promise(function (resolve) {
            var info = { cc: "", tz: "", off: -new Date().getTimezoneOffset(), lang: "" }, done = false;
            try {
                var z = global.Intl.DateTimeFormat().resolvedOptions().timeZone;
                if (z && !/^(UTC|GMT|Etc\/)/i.test(z)) info.tz = z;
            } catch (e) {}
            try { info.lang = String(global.navigator.language || ""); } catch (e) {}
            function finish() {
                if (done) return;
                done = true;
                /* the region of the language tag counts only for Arabic ("ar-EG", "ar-SA"): "en-US" is on countless screens outside the US */
                if (!info.cc && /^ar[-_][A-Za-z]{2}$/i.test(info.lang) && global.APL_CC_FROM) info.cc = global.APL_CC_FROM(info.lang);
                resolve(info);
            }
            try {                                              // Samsung: the Smart Hub country
                var wa = global.webapis;
                if (wa && wa.productinfo && wa.productinfo.getSystemConfig && wa.productinfo.ProductInfoConfigKey) {
                    var c = global.APL_CC_FROM(wa.productinfo.getSystemConfig(wa.productinfo.ProductInfoConfigKey.CONFIG_KEY_SERVICE_COUNTRY));
                    if (c) info.cc = c;
                }
            } catch (e) {}
            if (!info.cc) {                                    // Tizen: the locale of the screen
                try {
                    var tz = global.tizen;
                    if (tz && tz.systeminfo && tz.systeminfo.getPropertyValue) {
                        tz.systeminfo.getPropertyValue("LOCALE", function (l) {
                            var c2 = l && global.APL_CC_FROM ? global.APL_CC_FROM(l.country) : "";
                            if (c2 && !info.cc) info.cc = c2;
                            finish();
                        }, function () { finish(); });
                        global.setTimeout(finish, 1500);
                        return;
                    }
                } catch (e) {}
            }
            finish();
        });
    }

    /* ---------- 2. what the Internet address says ---------- */
    function num(v) { var n = parseFloat(v); return isFinite(n) ? n : null; }
    var SERVICES = [
        { name: "ipwho.is", url: "https://ipwho.is/", parse: function (j) {
            if (!j || j.success === false) return null;
            return { lat: num(j.latitude), lon: num(j.longitude), cc: j.country_code, city: j.city, region: j.region,
                     tz: j.timezone && (j.timezone.id || j.timezone) };
        } },
        { name: "geojs.io", url: "https://get.geojs.io/v1/ip/geo.json", parse: function (j) {
            return j ? { lat: num(j.latitude), lon: num(j.longitude), cc: j.country_code, city: j.city, region: j.region, tz: j.timezone } : null;
        } },
        { name: "ipapi.co", url: "https://ipapi.co/json/", parse: function (j) {
            if (!j || j.error) return null;
            return { lat: num(j.latitude), lon: num(j.longitude), cc: j.country_code, city: j.city, region: j.region, tz: j.timezone };
        } },
        { name: "freeipapi.com", url: "https://freeipapi.com/api/json", parse: function (j) {
            if (!j) return null;
            return { lat: num(j.latitude), lon: num(j.longitude), cc: j.countryCode, city: j.cityName, region: j.regionName,
                     tz: (j.timeZones && j.timeZones[0]) || j.timeZone };
        } },
        /* v8.7.31: three more services, so one blocked or limited service no longer leaves the screen with its country only */
        { name: "ipinfo.io", url: "https://ipinfo.io/json", parse: function (j) {
            if (!j || j.error || !j.loc) return null;
            var p = String(j.loc).split(",");
            return { lat: num(p[0]), lon: num(p[1]), cc: j.country, city: j.city, region: j.region, tz: j.timezone };
        } },
        { name: "ip-api.com", url: "http://ip-api.com/json/?fields=status,countryCode,regionName,city,lat,lon,timezone", parse: function (j) {
            if (!j || j.status !== "success") return null;
            return { lat: num(j.lat), lon: num(j.lon), cc: j.countryCode, city: j.city, region: j.regionName, tz: j.timezone };
        } },
        { name: "bigdatacloud", url: "https://api.bigdatacloud.net/data/reverse-geocode-client", parse: function (j) {
            if (!j) return null;
            return { lat: num(j.latitude), lon: num(j.longitude), cc: j.countryCode, city: j.city || j.locality, region: j.principalSubdivision, tz: "" };
        } }
    ];
    function clean(o) {
        if (!o || o.lat === null || o.lon === null || Math.abs(o.lat) > 90 || Math.abs(o.lon) > 180 || (o.lat === 0 && o.lon === 0)) return null;
        var cc = String(o.cc || "").toUpperCase(), tz = String(o.tz || "");
        if (!/^[A-Z]{2}$/.test(cc)) cc = "";
        if (!/^[A-Za-z_]+\/[A-Za-z0-9_+\-\/]+$/.test(tz)) tz = "";
        return { lat: o.lat, lon: o.lon, cc: cc, tz: tz, city: String(o.city || "").slice(0, 40), region: String(o.region || "").slice(0, 40) };
    }
    /* v8.7.31: the first answer that NAMES a city wins. An answer with a position but no city name is kept
       as a second choice (it used to win at once, and the app then fell back to the country's main city). */
    var lastTried = [];
    function lookupIP() {
        var i = 0, spare = null;
        lastTried = [];
        return new Promise(function (resolve) {
            function fin() { resolve(spare); }
            (function next() {
                if (i >= SERVICES.length) { fin(); return; }
                var s = SERVICES[i++];
                APL.fetchJSON(s.url, 8000).then(function (j) {
                    var r = null;
                    try { r = clean(s.parse(j)); } catch (e) { r = null; }
                    if (r) {
                        r.via = s.name; lastTried.push(s.name + ":ok");
                        if (r.city) { resolve(r); return; }
                        if (!spare) spare = r;
                    } else lastTried.push(s.name + ":none");
                    next();
                }, function () { lastTried.push(s.name + ":fail"); next(); });
            })();
        });
    }

    /* ---------- comparing and choosing ---------- */
    function nearestKnown(lat, lon, cc) {
        var best = null, bestKm = Infinity, list = global.APL_CITIES || [], i, d;
        for (i = 0; i < list.length; i++) {
            if (cc && list[i].cc !== cc) continue;
            d = km(lat, lon, list[i].lat, list[i].lon);
            if (d < bestKm) { bestKm = d; best = list[i]; }
        }
        return best ? { city: best, km: bestKm } : null;
    }
    /* How the Internet address and the screen compare: conflict = every signal that is known disagrees. */
    function judge(ip, dev) {
        var known = 0, agree = 0, o;
        if (dev.cc && ip.cc) { known++; if (dev.cc === ip.cc) agree++; }
        o = zoneOffset(ip.tz);
        if (o !== null && dev.off !== null) { known++; if (o === dev.off) agree++; }
        return { known: known, agree: agree, conflict: known > 0 && agree === 0 };
    }
    /* Is a place consistent with the screen (its country and its time zone)? */
    function fitsScreen(c, dev) {
        if (!c) return false;
        if (dev.cc && c.cc && c.cc !== dev.cc) return false;
        var o = zoneOffset(c.tz);
        return o === null || dev.off === null || o === dev.off;
    }
    /* A place from the Internet address: a known city when close enough, else a custom place. null when it cannot be used. */
    function placeFromIP(ip, dev) {
        var n = nearestKnown(ip.lat, ip.lon, ip.cc || dev.cc);
        if (n && n.km <= SNAP_KM) {
            return { key: n.city.key, name: nameOf(n.city), cc: n.city.cc, tz: n.city.tz, lat: n.city.lat, lon: n.city.lon };
        }
        var name = ip.city || ip.region;
        var tz = ip.tz || (n && n.km < 300 ? n.city.tz : "") || dev.tz;
        if (!name || !tz || zoneOffset(tz) === null) {
            return n && n.km <= 150 ? { key: n.city.key, name: nameOf(n.city), cc: n.city.cc, tz: n.city.tz, lat: n.city.lat, lon: n.city.lon } : null;
        }
        return { key: "custom", name: name, cc: ip.cc || dev.cc, tz: tz, lat: ip.lat, lon: ip.lon };
    }
    /* A place from the screen alone: the current city when it fits, else the main city of the screen's country. */
    function placeFromDevice(dev, cur) {
        if (fitsScreen(cur, dev)) return null;
        var c = global.APL_CITY_FOR ? global.APL_CITY_FOR(dev.cc, dev.tz) : null, list, i;
        if (c && !fitsScreen(c, dev)) c = null;
        if (!c && dev.cc) {                                   // right country, but the time zone name is unknown: match by offset
            list = global.APL_CITIES || [];
            for (i = 0; i < list.length; i++) if (list[i].cc === dev.cc && zoneOffset(list[i].tz) === dev.off) { c = list[i]; break; }
        }
        return c ? { key: c.key, name: nameOf(c), cc: c.cc, tz: c.tz, lat: c.lat, lon: c.lon } : null;
    }
    function sameAsCurrent(pl, cur) {
        if (!cur) return false;
        if (pl.key !== "custom") return cur.key === pl.key;
        return cur.key === "custom" && km(cur.lat, cur.lon, pl.lat, pl.lon) < 5;
    }
    function placeSig(pl) { return pl.key === "custom" ? "custom@" + pl.lat.toFixed(1) + "," + pl.lon.toFixed(1) : pl.key; }
    function countryName(cc) { return (cc && global.APL_COUNTRY_NAME) ? global.APL_COUNTRY_NAME(cc) : ""; }

    /* ---------- applying ---------- */
    function applyPlace(pl) {
        if (pl.key === "custom") sys.setPref("customPlace", { name: pl.name, lat: pl.lat, lon: pl.lon, cc: pl.cc || "", tz: pl.tz });
        if (APL.prayer && APL.prayer.setCity) APL.prayer.setCity(pl.key, { auto: true });
        else sys.setPref("prayerCity", pl.key);
        try { if (APL.weather && APL.weather.refresh) APL.weather.refresh(); } catch (e) {}
    }

    /* ---------- one detection ---------- */
    var inflight = null;
    function run(force, once) {
        if (inflight) return inflight;
        if (!enabled() && !once) return Promise.resolve(null);      // v8.7.28: no request leaves the screen unless the viewer turned this on, or pressed "Detect Location Now"
        lastRun = Date.now();
        var dev = null;
        inflight = deviceInfo().then(function (d) {
            dev = d;
            return lookupIP();
        }).then(function (ip) {
            var rec = load(), cur = curCity(), out = { status: "", changed: false, name: "" };
            var pl = null, source = "", pending = rec.pending || null;
            rec.at = Date.now();
            rec.tried = lastTried.join(" ");
            rec.dev = { cc: dev.cc, tz: dev.tz, off: dev.off };

            if (ip) {
                rec.ip = { city: ip.city, region: ip.region, cc: ip.cc, via: ip.via };
                if (judge(ip, dev).conflict) out.status = "conflict";          // every known signal disagrees: change nothing
                else {
                    pl = placeFromIP(ip, dev); source = "ip";
                    if (!pl) out.status = "nozone";
                }
            } else {
                rec.ip = null;
                pl = placeFromDevice(dev, cur); source = "tv";
                if (!pl) out.status = "offline";                                // no internet, and the current city fits the screen
            }

            if (pl) {
                out.name = pl.name;
                var first = !rec.seenAt;
                rec.seenAt = Date.now();
                if (sameAsCurrent(pl, cur)) {
                    out.status = "same"; rec.pending = null;
                    if (!rec.source) rec.source = source;
                } else {
                    var go = force || first || source === "tv";
                    if (!go) {
                        // a change between two cities must be seen twice in a row
                        if (pending && pending.sig === placeSig(pl)) go = true;
                        else { rec.pending = { sig: placeSig(pl), n: 1 }; out.status = "waiting"; pl = null; }
                    }
                    if (pl && go) {
                        applyPlace(pl);
                        rec.pending = null; rec.source = source;
                        rec.key = pl.key; rec.name = pl.name; rec.cc = pl.cc; rec.tz = pl.tz; rec.lat = pl.lat; rec.lon = pl.lon;
                        out.status = "changed"; out.changed = true;
                    }
                }
            }
            rec.status = out.status;
            save(rec);
            report(out, force);
            try { if (APL.prayerPage && APL.prayerPage.refresh) APL.prayerPage.refresh(); } catch (e) {}
            return out;
        }).then(function (r) { inflight = null; return r; }, function () { inflight = null; return null; });
        return inflight;
    }
    function report(out, force) {
        var c = curCity(), nm = c ? nameOf(c) : out.name;
        if (out.changed) { say(T("Location set automatically: {name}", { name: out.name })); return; }
        if (!force) return;
        if (out.status === "conflict") say(T("The Internet address and the screen's settings disagree, so nothing was changed. Choose the city yourself."));
        else if (out.status === "offline") say(T("Could not reach the internet to detect the location."));
        else if (out.status === "nozone") say(T("Could not tell the time zone of this place. Choose the city yourself."));
        else say(T("Your location: {name}", { name: nm }));
    }

    /* ---------- what Settings shows ---------- */
    function describe() {
        if (!enabled()) return T("Off. The city is the one you chose.");
        var rec = load(), c = curCity();
        if (!c) return T("Loading…");
        var nm = nameOf(c), cn = countryName(c.cc);
        var s = nm + (cn ? " · " + cn : "");
        if (rec.status === "conflict") return s + " — " + T("not changed: the Internet address and the screen disagree");
        if (!rec.at) return s + " — " + T("not detected yet");
        var how = rec.source === "ip" ? T("by Internet address") : rec.source === "tv" ? T("by the screen's settings") : "";
        if (rec.status === "offline" && !rec.source) how = T("no internet: using the screen's settings");
        if (rec.source === "tv" && rec.tried) how += " (" + T("country only: no location service answered") + ")";
        return s + (how ? " — " + how : "");
    }

    /* "Detect location now": ONE detection the viewer asked for; it does not turn automatic mode on (v8.7.28). */
    function detect(force) {
        return run(!!force, !enabled());
    }

    function start() {
        /* v8.7.28: automatic mode is OFF by default: nothing is sent to any service until the viewer turns it on in Settings */
        if (enabled()) global.setTimeout(function () { run(false); }, 4000);
        if (APL.timers && APL.timers.every) APL.timers.every("autoloc", 12 * 3600000, function () { run(false); }, { hidden: true });
        try {
            global.addEventListener("online", function () {
                if (enabled() && Date.now() - lastRun > 600000) global.setTimeout(function () { run(false); }, 5000);
            });
        } catch (e) {}
        sys.onPref("prayerAuto", function () { if (enabled()) run(true); });
    }

    APL.autoLocation = {
        enabled: enabled,
        detect: detect,
        state: load,
        describe: describe,
        _judge: judge, _placeFromIP: placeFromIP, _placeFromDevice: placeFromDevice, _fitsScreen: fitsScreen, _nearest: nearestKnown
    };
    global.setTimeout(start, 2500);
})(window);
