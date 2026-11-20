/* ============================================================
   home-wallpapers.js — local home-screen and screen-saver pictures.

   Twenty-three user-supplied wallpapers are packaged in images/wallpapers/.
   They are 1920x1080 WebP files, centre-cropped to 16:9 and compressed
   for sharp full-HD playback on a 55-inch screen. They never download.

   v1.2.108: ONLINE WALLPAPERS, OFF UNLESS YOU TURN THEM ON (Settings ›
   Appearance › Home Wallpapers › Wallpaper Source). Family-friendly by
   construction: the pictures come only from two curated, editor-chosen
   daily collections, never from a free search:
     - Bing "Image of the Day" (8 countries, the last 8 days of each)
     - NASA "Astronomy Picture of the Day" (still pictures only)
   and any title that mentions something that is not for a family screen
   is dropped as well. A picture joins the rotation only after it has
   loaded completely, so with no internet the local wallpapers keep going.
   The list is kept on the screen and renewed once a day.
   ============================================================ */
(function (global) {
    "use strict";

    var APL = global.APL, sys = APL && APL.sys;
    if (!APL || !sys) return;

    var LIST = [
        { file: "images/wallpapers/wp02.webp", ar: "الخلفية 02", en: "Wallpaper 02" },
        { file: "images/wallpapers/wp03.webp", ar: "الخلفية 03", en: "Wallpaper 03" },
        { file: "images/wallpapers/wp04.webp", ar: "الخلفية 04", en: "Wallpaper 04" },
        { file: "images/wallpapers/wp05.webp", ar: "الخلفية 05", en: "Wallpaper 05" },
        { file: "images/wallpapers/wp06.webp", ar: "الخلفية 06", en: "Wallpaper 06" },
        { file: "images/wallpapers/wp07.webp", ar: "الخلفية 07", en: "Wallpaper 07" },
        { file: "images/wallpapers/wp08.webp", ar: "الخلفية 08", en: "Wallpaper 08" },
        { file: "images/wallpapers/wp09.webp", ar: "الخلفية 09", en: "Wallpaper 09" },
        { file: "images/wallpapers/wp14.webp", ar: "الخلفية 14", en: "Wallpaper 14" },
        { file: "images/wallpapers/wp15.webp", ar: "الخلفية 15", en: "Wallpaper 15" },
        { file: "images/wallpapers/wp16.webp", ar: "الخلفية 16", en: "Wallpaper 16" },
        { file: "images/wallpapers/wp17.webp", ar: "الخلفية 17", en: "Wallpaper 17" },
        { file: "images/wallpapers/wp19.webp", ar: "الخلفية 19", en: "Wallpaper 19" },
        { file: "images/wallpapers/wp21-masjid-haram.webp", ar: "المسجد الحرام", en: "Al Masjid Al Haram" },
        { file: "images/wallpapers/wp22-masjid-aqsa.webp", ar: "المسجد الأقصى", en: "Al Masjid Al Aqsa" },
        { file: "images/wallpapers/wp23-masjid-nabawi.webp", ar: "المسجد النبوي", en: "Al Masjid An Nabawi" }
    ];

    var KEY = "apl.wallpaper", ONLINE_KEY = "apl.onlineWallpapers";
    var state = null;

    /* ---------- online pictures (opt-in) ---------- */
    var BLOCK = /nud|naked|nsfw|erotic|sexual|sex\b|porn|lingerie|bikini|topless|explicit|gore|corpse|war dead|massacre|عار|اباح|إباح/i;
    var online = { at: 0, list: [] }, ready = {}, fetching = false, preloading = false;
    function srcMode() { var m = sys.pref("wallpaperSource"); return (m === "mixed" || m === "online") ? m : "local"; }
    function srcKind() { var k = sys.pref("onlineWallpaperSource"); return (k === "bing" || k === "nasa") ? k : "both"; }
    function loadOnline() {
        try { var o = JSON.parse(global.localStorage.getItem(ONLINE_KEY) || "null"); if (o && o.list) online = o; } catch (e) {}
    }
    function saveOnline() { try { global.localStorage.setItem(ONLINE_KEY, JSON.stringify(online)); } catch (e) {} }
    function get(url) {
        return new Promise(function (resolve, reject) {
            var x = new global.XMLHttpRequest();
            x.open("GET", url, true); x.timeout = 20000;
            x.onload = function () { if (x.status >= 200 && x.status < 300) resolve(x.responseText); else reject(new Error("HTTP " + x.status)); };
            x.onerror = x.ontimeout = function () { reject(new Error("network")); };
            x.send();
        });
    }
    function clean(t) { return !BLOCK.test(String(t || "")); }
    function fetchBing() {
        var mk = ["en-US", "en-GB", "en-IN", "de-DE", "fr-FR", "ja-JP", "pt-BR", "es-ES"], out = [];
        return mk.reduce(function (p, m) {
            return p.then(function () {
                return get("https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=8&mkt=" + m).then(function (t) {
                    var j = {}; try { j = JSON.parse(t); } catch (e) {}
                    (j.images || []).forEach(function (im) {
                        var title = String(im.title || "").replace(/\s*\(©.*$/, "") || String(im.copyright || "").replace(/\s*\(©.*$/, "");
                        if (im.urlbase && clean(title + " " + im.copyright)) out.push({ url: "https://www.bing.com" + im.urlbase + "_1920x1080.jpg", t: title, k: "bing" });
                    });
                }, function () {});
            });
        }, Promise.resolve()).then(function () { return out; });
    }
    function fetchNasa() {
        return get("https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY&count=16").then(function (t) {
            var a = []; try { a = JSON.parse(t); } catch (e) {}
            return (Array.isArray(a) ? a : []).filter(function (x) { return x && x.media_type === "image" && x.url && !/['"\s()]/.test(x.url) && clean(x.title + " " + x.explanation); })
                .map(function (x) { return { url: String(x.url), t: String(x.title || "NASA"), k: "nasa" }; });
        }, function () { return []; });
    }
    function refreshOnline(force) {
        if (fetching || srcMode() === "local") return;
        loadOnline();
        var stale = !online.at || Date.now() - online.at > 86400000 || online.kind !== srcKind();
        if (!stale && !force) { preload(); return; }
        if (global.navigator && global.navigator.onLine === false) { preload(); return; }
        fetching = true;
        var kind = srcKind();
        Promise.all([kind !== "nasa" ? fetchBing() : [], kind !== "bing" ? fetchNasa() : []]).then(function (r) {
            var seen = {}, list = [];
            r[0].concat(r[1]).forEach(function (x) { if (!seen[x.url]) { seen[x.url] = 1; list.push(x); } });
            fetching = false;
            if (list.length) { online = { at: Date.now(), kind: kind, list: list.slice(0, 80) }; saveOnline(); }
            preload();
        }, function () { fetching = false; preload(); });
    }
    /* One picture at a time: a picture counts only after it has loaded whole */
    function preload() {
        if (preloading) return;
        var todo = online.list.filter(function (x) { return !ready[x.url] && !x.bad; }).slice(0, 12), i = 0;
        if (!todo.length) return;
        preloading = true;
        (function step() {
            if (i >= todo.length || srcMode() === "local") { preloading = false; return; }
            var x = todo[i++], im = new global.Image(), settled = false;
            function end(ok) {
                if (settled) return; settled = true; clearTimeout(tm);
                if (ok) ready[x.url] = true; else x.bad = true;
                setTimeout(step, 600);
            }
            var tm = setTimeout(function () { end(false); }, 30000);
            im.onload = function () { end(true); };
            im.onerror = function () { end(false); };
            im.src = x.url;
        })();
    }
    function onlineReadyCount() { return online.list.filter(function (x) { return ready[x.url]; }).length; }

    /* The pictures in rotation: the local ones, the online ones that loaded, or both alternating */
    function items() {
        var mode = srcMode();
        if (mode === "local") return LIST;
        var onl = online.list.filter(function (x) { return ready[x.url]; }).map(function (x) { return { file: x.url, ar: x.t, en: x.t, online: true }; });
        if (!onl.length) return LIST;
        if (mode === "online") return onl;
        var out = [], a = 0, b = 0;
        while (a < LIST.length || b < onl.length) {
            if (a < LIST.length) out.push(LIST[a++]);
            if (b < onl.length) out.push(onl[b++]);
        }
        return out;
    }

    function asset(p) { return p && global.APL_ASSET ? global.APL_ASSET(p) : p; }
    function every() {
        var m = parseInt(sys.pref("wallpaperEvery"), 10);
        return (m >= 1 && m <= 120) ? m : 5;
    }
    function on() { return sys.pref("wallpapers") !== false; }

    function read() {
        if (state) return state;
        var saved = null;
        try { saved = JSON.parse(global.localStorage.getItem(KEY) || "null"); } catch (e) {}
        var i = saved && typeof saved.i === "number" ? saved.i % items().length : 0;
        if (i < 0) i = 0;
        state = { i: i, at: (saved && saved.at) || Date.now() };
        return state;
    }
    function write() {
        try { global.localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
    }

    function at(i) { var L = items(); return L[((i % L.length) + L.length) % L.length]; }
    function file(i) { return at(i).file; }
    function name(i) {
        var w = at(i);
        return APL.lang === "ar" ? w.ar : w.en;
    }
    function pic(i) { var w = at(i); return w.online ? w.file : asset(w.file); }

    function current() {
        if (!on()) return null;
        return pic(read().i);
    }

    // Pre-decode only the next compact wallpaper for a smooth changeover.
    var warmImg = null;
    function warm() {
        try {
            warmImg = new Image();
            warmImg.src = pic(read().i + 1);
            if (warmImg.decode) warmImg.decode().then(function () {}, function () {});
        } catch (e) {}
    }

    var listeners = [];
    function notify() {
        var pic = current();
        listeners.forEach(function (fn) { try { fn(pic); } catch (e) {} });
        setTimeout(warm, 800);
    }

    function next() {
        var s = read();
        s.i = (s.i + 1) % items().length;
        s.at = Date.now();
        write();
        notify();
        preload();
        return current();
    }

    function restart() {
        APL.timers.cancel("wallpaper");
        if (!on()) return;
        var ms = every() * 60000;
        if (Date.now() - read().at >= ms) next();
        APL.timers.every("wallpaper", ms, function () {      // v1.2.100: shared timer; skipped while hidden
            if (!on()) return;
            next();
        });
    }

    APL.wallpapers = {
        list: function () { return items().map(function (w, i) { return { index: i, file: w.online ? w.file : asset(w.file), ar: w.ar, en: w.en, online: !!w.online }; }); },
        current: current,
        currentName: function () { return name(read().i); },
        index: function () { return read().i; },
        next: next,
        show: function (i) {
            state = { i: ((parseInt(i, 10) || 0) % items().length + items().length) % items().length, at: Date.now() };
            write();
            notify();
            return current();
        },
        on: on,
        every: every,
        restart: restart,
        refreshOnline: function () { refreshOnline(true); },
        onlineCount: onlineReadyCount,
        onChange: function (fn) { listeners.push(fn); return fn; }
    };

    sys.onPref("wallpapers", function () { restart(); notify(); });
    sys.onPref("wallpaperEvery", function () { restart(); });
    sys.onPref("wallpaperSource", function () { state = null; refreshOnline(true); restart(); notify(); });
    sys.onPref("onlineWallpaperSource", function () { refreshOnline(true); });
    loadOnline();
    setTimeout(refreshOnline, 6000);
    setTimeout(restart, 1500);
    setTimeout(warm, 4000);
})(window);
