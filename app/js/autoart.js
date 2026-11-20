/* ============================================================
   autoart.js — ONLINE APP ICONS, OFF UNLESS YOU TURN IT ON (v1.2.108).

   Settings › Apps › Online App Icons. When it is on, an app that has no
   packaged tile of its own (the Home Screen would show the screen's small
   system icon) gets its real, sharp icon from the App Store catalogue
   (the iTunes Search service of Apple: free, no key).

   Only the apps installed on this screen are looked up, one by one, by
   their exact name. No free-text search, no pictures of anything else, so
   nothing but app icons can ever come back. A name with no exact match
   keeps the screen's own icon (and is not asked again for a week).

   The icons are cached on the screen (small 256 px pictures in
   localStorage) so the next start needs no network. Settings › Apps can
   download the missing ones now or delete them all.

   The API of the old module is unchanged (run / applyCached / refresh /
   restyle), so js/launcher.js needs no change.
   ============================================================ */
(function (global) {
    "use strict";
    var APL = global.APL || (global.APL = {});
    var KEY = "apl.onlineIcons", MISS = "apl.onlineIconsMiss", WEEK = 7 * 86400000, MAX = 80;
    var running = false;

    function sys() { return APL.sys; }
    function on() { return !!(sys() && sys().pref("onlineIcons") === true); }
    function load(k) { try { return JSON.parse(global.localStorage.getItem(k) || "{}") || {}; } catch (e) { return {}; } }
    function save(k, v) { try { global.localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }

    /* An app that would show the screen's own small icon: no packaged tile, not a folder, not a website, not a system piece */
    function eligible(app) {
        return !!(app && app.id && app.name && !app.tile && !app.tileHtml && !app.shelfHtml && !app.virtual && !app.folder && !app.system && !app.web);
    }
    function norm(s) { return String(s || "").toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9\u0600-\u06ff]+/g, ""); }

    function applyCached(apps) {
        if (!on() || !apps) return;
        var cache = load(KEY);
        apps.forEach(function (a) {
            var c = eligible(a) && cache[a.id];
            if (c && c.d && norm(c.n) === norm(a.name)) { a.icon = c.d; a.autoIcon = true; }
        });
    }

    function xhr(url, type) {
        return new Promise(function (resolve, reject) {
            var x = new global.XMLHttpRequest();
            x.open("GET", url, true);
            if (type) x.responseType = type;
            x.timeout = 15000;
            x.onload = function () { if (x.status >= 200 && x.status < 300) resolve(x.response); else reject(new Error("HTTP " + x.status)); };
            x.onerror = x.ontimeout = function () { reject(new Error("network")); };
            x.send();
        });
    }

    /* The exact-name match in the catalogue: "Netflix" is "Netflix" or "Netflix: Watch TV…", never a different app */
    function findIcon(name) {
        var url = "https://itunes.apple.com/search?media=software&entity=software&limit=8&country=us&term=" + encodeURIComponent(name);
        return xhr(url, "text").then(function (txt) {
            var list = [], want = norm(name), nl = String(name).toLowerCase(), i, tn, best = null;
            try { list = JSON.parse(txt).results || []; } catch (e) {}
            for (i = 0; i < list.length && !best; i++) {
                tn = String(list[i].trackName || "");
                if (list[i].artworkUrl512 && (norm(tn) === want || (want.length >= 4 && tn.toLowerCase().indexOf(nl) === 0 && /^\s*[:\-–—|(]/.test(tn.slice(nl.length))))) best = list[i];
            }
            return best ? String(best.artworkUrl512).replace(/\/\d+x\d+(bb|sr)?\.(jpg|png)$/, "/256x256bb.jpg") : "";
        });
    }

    /* 256 px, kept on the screen as a small picture; if the picture can't be read back, the address is kept instead */
    function toData(url) {
        return xhr(url, "blob").then(function (blob) {
            return new Promise(function (resolve) {
                var img = new global.Image(), obj = global.URL.createObjectURL(blob);
                img.onload = function () {
                    var d = url;
                    try {
                        var c = global.document.createElement("canvas"); c.width = c.height = 256;
                        c.getContext("2d").drawImage(img, 0, 0, 256, 256);
                        d = c.toDataURL("image/jpeg", 0.88);
                    } catch (e) {}
                    global.URL.revokeObjectURL(obj);
                    resolve(d);
                };
                img.onerror = function () { global.URL.revokeObjectURL(obj); resolve(url); };
                img.src = obj;
            });
        }, function () { return url; });
    }

    function remember(cache, id, name, data) {
        var keys;
        cache[id] = { n: name, d: data, at: Date.now() };
        keys = Object.keys(cache);
        if (keys.length > MAX) keys.sort(function (a, b) { return cache[a].at - cache[b].at; }).slice(0, keys.length - MAX).forEach(function (k) { delete cache[k]; });
        if (!save(KEY, cache)) {                          // the screen's storage is full: keep the newest half
            keys = Object.keys(cache).sort(function (a, b) { return cache[a].at - cache[b].at; });
            keys.slice(0, Math.ceil(keys.length / 2)).forEach(function (k) { delete cache[k]; });
            save(KEY, cache);
        }
    }

    function ping(fn) { if (typeof fn === "function") { try { fn(); } catch (e) {} } }

    function run(apps, onChange) {
        function done(v) { running = false; return v; }
        if (!on() || running || !apps) { ping(onChange); return Promise.resolve(false); }
        if (global.navigator && global.navigator.onLine === false) return Promise.resolve(false);
        running = true;
        var cache = load(KEY), miss = load(MISS), changed = 0, todo;
        applyCached(apps);
        todo = apps.filter(function (a) {
            return eligible(a) && !(cache[a.id] && norm(cache[a.id].n) === norm(a.name)) && !(miss[a.id] && Date.now() - miss[a.id] < WEEK);
        });
        if (!todo.length) { ping(onChange); return Promise.resolve(done(false)); }
        return todo.reduce(function (p, app) {
            return p.then(function () {
                if (!on()) return null;
                return findIcon(app.name).then(function (u) {
                    if (!u) { miss[app.id] = Date.now(); return null; }
                    return toData(u).then(function (d) {
                        remember(cache, app.id, app.name, d);
                        app.icon = d; app.autoIcon = true; changed++;
                        if (changed % 4 === 0) ping(onChange);
                    });
                }).catch(function () { /* offline or blocked: tried again at the next start */ });
            }).then(function () { return new Promise(function (r) { setTimeout(r, 250); }); });
        }, Promise.resolve()).then(function () {
            save(MISS, miss);
            if (changed) ping(onChange);
            return done(changed > 0);
        }, function () { return done(false); });
    }

    APL.autoArt = {
        run: run,
        applyCached: applyCached,
        refresh: function (apps, onChange) {          // "Download Missing Icons Now": forget the week-long "no match" answers first
            try { global.localStorage.removeItem(MISS); } catch (e) {}
            return run(apps, onChange);
        },
        restyle: function (apps, onChange) { ping(onChange); return Promise.resolve(false); },
        clear: function () { try { global.localStorage.removeItem(KEY); global.localStorage.removeItem(MISS); } catch (e) {} },
        count: function () { return Object.keys(load(KEY)).length; },
        isOn: on,
        disabled: false
    };

    /* Turned on: fetch now. Turned off: the screen's own icons come back at once. */
    function wire() {
        if (!sys() || !sys().onPref) { setTimeout(wire, 500); return; }
        sys().onPref("onlineIcons", function () {
            if (on()) { if (APL.refreshArt) APL.refreshArt(); }
            else if (APL.refreshHome) APL.refreshHome();
        });
    }
    wire();
})(window);
