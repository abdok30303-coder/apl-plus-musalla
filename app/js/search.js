/* ============================================================
   search.js — Search, the Apple TV way.

   A row of letters at the top, the matching apps below. v1.2.115: ONE letter at a time:
   choosing another letter replaces the first (before, it was added after it), and Delete
   clears it. A "Clean Background" button sits above the letters. OK on an app opens it. The remote's
   digits and a keyboard (PC preview) type too. Opened with ▲ from the full
   screen Top Shelf (▲ from the dock, then ▲ again), or from the Control
   Center. A magnifier at the top left of the Home Screen, across from the
   status pill, shows it's up there; in full screen it reads "▲ Search".
   Apps only for now: those in folders too, and the hidden ones
   with Settings › Home Screen › Search Hidden Apps.
   ============================================================ */
(function (global) {
    "use strict";

    var APL = global.APL, K = APL.KEY;
    var LETTERS = "abcdefghijklmnopqrstuvwxyz0123456789".split("");
    var root, fieldEl, keysEl, resultsEl, emptyEl, toolEl, nav;
    var isOpen = false, query = "", keys = [], found = [], cleaning = false;

    function el(tag, cls, text) {
        var e = document.createElement(tag);
        if (cls) e.className = cls;
        if (text !== undefined) e.textContent = text;
        return e;
    }
    /* Lowercase, without accents: "é" finds "e", "Arte" finds "arte". */
    function norm(s) {
        s = String(s || "").toLowerCase();
        return s.normalize ? s.normalize("NFD").replace(/[̀-ͯ]/g, "") : s;
    }

    function candidates() {
        var hidden = APL.sys.pref("searchHidden") ? [] : APL.sys.pref("hiddenApps") || [];
        return ((APL.allApps && APL.allApps()) || []).filter(function (a) {
            return !a.folder && hidden.indexOf(a.id) === -1;
        });
    }
    /* The name's start first, then the start of a word in it, then anywhere. Nothing typed: the recent apps. */
    function match(q) {
        var all = candidates();
        if (!q) {
            var recent = APL.sys.pref("recentApps") || [];
            return recent.map(function (id) { return all.filter(function (a) { return a.id === id; })[0]; }).filter(Boolean);
        }
        var start = [], word = [], inside = [];
        all.forEach(function (a) {
            var n = norm(a.name), at = n.indexOf(q);
            if (at === 0) start.push(a);
            else if (at > 0 && (" " + n).indexOf(" " + q) !== -1) word.push(a);
            else if (at > 0) inside.push(a);
        });
        /* one letter: only names (or words) that START with it; "anywhere" would list almost every app */
        return q.length === 1 ? start.concat(word) : start.concat(word, inside);
    }

    function buildDom() {
        root = el("section", "search");
        root.appendChild(el("div", "search__dim"));
        fieldEl = el("div", "search__field");
        keysEl = el("div", "search__keys");
        resultsEl = el("div", "search__results");
        emptyEl = el("p", "search__empty");
        root.appendChild(fieldEl); root.appendChild(keysEl); root.appendChild(resultsEl); root.appendChild(emptyEl);
        document.body.appendChild(root);

        LETTERS.forEach(function (c) { keys.push({ type: c, label: c }); });
        keys.push({ del: true, label: APL.t("Delete"), wide: true });
        keys.forEach(function (k) {
            var t = el("div", "search__key" + (k.wide ? " search__key--wide" : ""), k.label);
            k.el = t;
            keysEl.appendChild(t);
        });

        /* v1.2.115: the cleaning button, above the letters (right side of the field row) */
        toolEl = el("div", "search__key search__tool");
        toolEl.innerHTML = '<svg viewBox="0 0 24 24" width="34" height="34" aria-hidden="true"><path fill="currentColor" d="M19.4 2.6a1.5 1.5 0 0 0-2.1 0L11 8.9l4.1 4.1 6.3-6.3a1.5 1.5 0 0 0 0-2.1l-2-2zM9.6 10.3 8 11.9c-1.1-.5-2.5-.3-3.4.6-.9.9-1.2 2.2-1 4.4l.2 1.6-1.6.5c-.5.2-.6.8-.2 1.1 1.6 1.4 4.2 2.6 6.6 1.6 2.4-1 3.9-3.3 3.6-5.7l1.6-1.6-4.2-4.1z"/></svg>';
        toolEl.appendChild(el("span", "search__tooltxt", APL.t("Clean")));
        toolEl._tool = true;
        root.appendChild(toolEl);

        nav = new APL.Nav({
            rows: true,     /* v7.0.5: LEFT/RIGHT stay in the row (Clean Background button no longer drops into the letters) */
            onSelect: function (i) {
                var t = nav.tiles[i];
                if (t._tool) { clean(); return; }
                if (t._key) { press(t._key); return; }
                if (t._app) { var app = t._app; close(); APL.openApp(app); }
            },
            onBack: close,
            onKey: function (code, e) {
                if (code >= 48 && code <= 57) { type(String(code - 48)); return true; }             // the remote's digits
                if (code === K.BACKSPACE && e.key === "Backspace") { erase(); return true; }        // a keyboard's ⌫
                if (e.key && e.key.length === 1 && /[\w ]/.test(e.key)) { type(norm(e.key)); return true; }
                return false;
            }
        });
    }

    function press(k) { if (k.del) erase(); else type(k.type); }
    /* v1.2.115: one letter at a time: the new letter replaces the one chosen before */
    function type(c) { c = String(c || "").replace(/\s/g, "").slice(-1); if (!c) return; if (query !== c) { query = c; refresh(); } }
    function erase() { if (query) { query = ""; refresh(); } }

    /* ---- v1.2.115: Clean Background -------------------------------------------------------------------
       Closes the apps that are still open behind the launcher (YouTube, Netflix... stay in memory when you
       leave them) and says how much memory came back, measured (MemAvailable before and after).
       Only apps the launcher knows (the same list as the app switcher) are closed; never the launcher, Vetro
       or anything of the system. Nothing else is touched: radio, alerts and the root daemon keep running. */
    var KEEP = /(APLauncher|vetro|dropbear|ssh)/i;
    function mb(n) { return APL.digits ? APL.digits(n) : String(n); }
    function clean() {
        if (cleaning) return;
        cleaning = true;
        toolEl.classList.add("is-busy");
        var sys = APL.sys, before = null, closed = 0;
        function done(msg) { cleaning = false; toolEl.classList.remove("is-busy"); if (msg) APL.toast(msg, true); }
        if (!sys || !sys.runningApps || !sys.exec || (sys.noVetro && sys.noVetro())) { done(APL.t("This needs Vetro and the bridge: they are not available here.")); return; }
        (APL.memInfo ? APL.memInfo() : Promise.resolve(null)).then(function (m) {
            before = m;
            return sys.runningApps();
        }).then(function (ids) {
            var known = {};
            ((APL.allApps && APL.allApps()) || []).forEach(function (a) { if (a && a.id && !a.virtual) known[a.id] = true; });
            var list = (ids || []).filter(function (id, i) {
                return id && known[id] && /^[A-Za-z0-9._-]+$/.test(id) && !KEEP.test(id) && ids.indexOf(id) === i;
            });
            closed = list.length;
            if (!closed) return null;
            return sys.exec(list.map(function (id) { return "app_launcher -k " + id + " >/dev/null 2>&1"; }).join("; ") + "; true")
                .then(function () { return new Promise(function (r) { setTimeout(r, 1800); }); });
        }).then(function () {
            if (!closed) { done(APL.t("No background apps to close")); return; }
            return (APL.memInfo ? APL.memInfo() : Promise.resolve(null)).then(function (after) {
                var freed = (before && after) ? Math.max(0, after.availMB - before.availMB) : null;
                done(freed === null
                    ? APL.t("{n} background apps closed", { n: mb(closed) })
                    : APL.t("{n} background apps closed · {m} MB free now (+{f} MB)", { n: mb(closed), m: mb(after.availMB), f: mb(freed) }));
            });
        }).catch(function (e) {
            done(APL.t("Could not clean: {why}", { why: String((e && e.message) || e || "").slice(0, 80) }));
        });
    }

    /* Field and results again; the focus stays where it is (on the letter just typed). */
    function refresh() {
        var q = norm(query).replace(/\s+/g, " ").replace(/^ /, "");
        fieldEl.textContent = query || APL.t("Search");
        fieldEl.classList.toggle("is-empty", !query);
        found = match(q);
        resultsEl.innerHTML = "";
        var tiles = found.map(function (app) {
            var t = APL.makeTile(app, 1);
            t._app = app;
            resultsEl.appendChild(t);
            return t;
        });
        emptyEl.textContent = !q ? (found.length ? APL.t("Recently Used") : "") :
            found.length ? "" : APL.t("No apps found for “{q}”", { q: query.trim() });
        root.classList.toggle("has-recent", !q && found.length > 0);
        keys.forEach(function (k) { if (k.type) k.el.classList.toggle("is-picked", k.type === query); });
        var keyEls = [toolEl].concat(keys.map(function (k) { k.el._key = k; return k.el; }));
        var cur = nav.current && nav.current(), at = Math.max(0, keyEls.indexOf(cur));
        nav.setTiles(keyEls.concat(tiles));
        nav.focus(cur && cur._app ? Math.min(nav.tiles.length - 1, keyEls.length) : at);
    }

    function open() {
        if (!root) buildDom();
        query = "";
        nav.setTiles([]);
        refresh();
        nav.focus(1);                                        // the first letter (index 0 is the cleaning button)
        root.classList.add("is-open");
        document.body.classList.add("has-search");          // the Home Screen steps back (launcher.css)
        APL.pushNav(nav);
        isOpen = true;
    }
    function close() {
        if (!isOpen) return;
        root.classList.remove("is-open");
        document.body.classList.remove("has-search");
        APL.popNav(nav);
        isOpen = false;
    }

    /* The magnifier at the top left (launcher.css): "▲ Search" in full screen, where ▲ opens it (launcher.js). */
    function addHint() {
        var h = el("div", "search-hint");
        h.innerHTML = '<span class="search-hint__chevron"></span>' + APL.icon("search", 30, 2.4);
        h.appendChild(el("span", "search-hint__text", APL.t("Search")));
        h.addEventListener("click", function () { open(); });      // v1.2.114: the magnifier also works with a pointer
        document.body.appendChild(h);
    }
    if (document.body) addHint(); else document.addEventListener("DOMContentLoaded", addHint);

    APL.search = { open: open, close: close, isOpen: function () { return isOpen; } };
})(window);
