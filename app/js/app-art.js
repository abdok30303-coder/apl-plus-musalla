/* ============================================================
   app-art.js — Dynamic Backdrops (v1.2.113): opt-in posters from JustWatch, no key.
   Off by default (Settings > Appearance > Dynamic Backdrops = pref "cleanFrameBackdrops").
   Nothing is requested until it is turned on. Requests: one for the country's popular titles,
   then one per streaming service the first time an app of that service is focused.
   Everything is cached in localStorage for 12 h; any failure answers "no artwork" (the app keeps
   its own picture). Country: pref "backdropCountry", default EG.
   API used by launcher.js: start(cb) known(app) pick(app) next(app, n) list() status().
   ============================================================ */
(function (global) {
    "use strict";
    var APL = global.APL || (global.APL = {});
    var GQL = "https://apis.justwatch.com/graphql", IMG = "https://images.justwatch.com", LS = "apl.appArt.v1", TTL = 12 * 3600 * 1000;
    var QUERY = "query P($country: Country!, $language: Language!, $filter: TitleFilter, $first: Int!) { popularTitles(country: $country, filter: $filter, first: $first, sortBy: POPULAR) { edges { node { objectType content(country: $country, language: $language) { title originalReleaseYear posterUrl backdrops { backdropUrl } } } } } }";
    /* app id / name -> JustWatch package short names (an unknown short name just returns nothing -> the country list is used) */
    var SERVICES = [
        [/netflix/i, ["nfx"]], [/prime|amazon.?video/i, ["amp"]], [/disney/i, ["dnp"]], [/hbo|max\b/i, ["hbm", "mxx"]],
        [/apple.?tv|appletv/i, ["atp"]], [/paramount/i, ["pmp"]], [/crunchyroll/i, ["cru"]], [/hotstar/i, ["hst"]],
        [/mubi/i, ["mbi"]], [/pluto/i, ["ptv"]], [/hulu/i, ["hlu"]], [/shahid/i, ["shd"]], [/viki/i, ["vik"]]
    ];
    var state = { at: 0, country: "", general: [], by: {}, loading: false }, pending = {}, onReady = null, started = false;

    function country() { var c = APL.sys && APL.sys.pref && APL.sys.pref("backdropCountry"); return /^[A-Za-z]{2}$/.test(c || "") ? c.toUpperCase() : "EG"; }
    function lang() { return APL.lang === "ar" ? "ar" : "en"; }
    function lsGet() { try { return JSON.parse(global.localStorage.getItem(LS)); } catch (e) { return null; } }
    function lsSet() { try { global.localStorage.setItem(LS, JSON.stringify({ at: state.at, country: state.country, general: state.general, by: state.by })); } catch (e) {} }
    function hash(s) { var h = 0; s = String(s || ""); for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }
    function pkgsOf(app) { var s = (app && (app.id + " " + app.name)) || ""; for (var i = 0; i < SERVICES.length; i++) if (SERVICES[i][0].test(s)) return SERVICES[i][1]; return null; }

    /* GraphQL answer -> [{url, title, year, kind}] (landscape backdrop first, poster if a title has none) */
    function parse(j) {
        var edges = j && j.data && j.data.popularTitles && j.data.popularTitles.edges, out = [], seen = {};
        if (!Array.isArray(edges)) return out;
        edges.forEach(function (e) {
            var n = e && e.node, c = n && n.content; if (!c || !c.title) return;
            var path = (c.backdrops && c.backdrops[0] && c.backdrops[0].backdropUrl) || c.posterUrl; if (!path) return;
            var url = /^https?:/.test(path) ? path : IMG + path;
            url = url.replace("{profile}", c.backdrops && c.backdrops[0] ? "s1440" : "s592").replace("{format}", "webp");
            if (seen[url]) return; seen[url] = 1;
            out.push({ url: url, title: String(c.title), year: c.originalReleaseYear || "", kind: n.objectType === "SHOW" ? (APL.t ? APL.t("Series") : "Series") : (APL.t ? APL.t("Movie") : "Movie") });
        });
        return out;
    }
    function fetchList(pkgs) {
        var ctl = global.AbortController ? new AbortController() : null, to = setTimeout(function () { if (ctl) ctl.abort(); }, 9000);
        var filter = { objectTypes: ["MOVIE", "SHOW"] }; if (pkgs) filter.packages = pkgs;
        return global.fetch(GQL, { method: "POST", headers: { "Content-Type": "application/json" }, signal: ctl && ctl.signal,
            body: JSON.stringify({ query: QUERY, variables: { country: state.country, language: lang(), filter: filter, first: 24 } }) })
            .then(function (r) { clearTimeout(to); if (!r.ok) throw new Error("JustWatch " + r.status); return r.json(); })
            .then(function (j) { if (j && j.errors && !j.data) throw new Error("JustWatch query error"); return parse(j); },
                  function (e) { clearTimeout(to); throw e; });
    }

    function start(cb) {
        if (typeof cb === "function") onReady = cb;
        var c = country(), cache = lsGet();
        if (cache && cache.country === c && cache.general && cache.general.length && Date.now() - cache.at < TTL) {
            state.at = cache.at; state.country = c; state.general = cache.general; state.by = cache.by || {};
            started = true; if (onReady) setTimeout(onReady, 0); return Promise.resolve(true);
        }
        if (state.loading) return Promise.resolve(false);
        state.loading = true; state.country = c; state.by = {};
        return fetchList(null).then(function (l) {
            state.general = l; state.at = Date.now(); state.loading = false; started = true; lsSet();
            if (onReady) onReady(); return l.length > 0;
        }, function () { state.loading = false; return false; });     // offline / blocked: no artwork, no noise
    }
    function loadService(pkgs) {
        var k = pkgs.join(",");
        if (state.by[k] || pending[k]) return;
        pending[k] = true;
        fetchList(pkgs).then(function (l) { state.by[k] = l; lsSet(); if (l.length && onReady) onReady(); }, function () { state.by[k] = []; })
            .then(function () { delete pending[k]; });
    }
    function listFor(app) {
        var p = pkgsOf(app);
        if (p) { var l = state.by[p.join(",")]; if (l && l.length) return l; if (!l) loadService(p); }
        return state.general;
    }
    function next(app, n) {
        if (!app || !started) return null;
        var l = listFor(app); if (!l.length) return null;
        return l[(hash(app.id || app.name) + (n || 0)) % l.length];
    }

    APL.appArt = {
        known: function (app) { return !!app; },
        pick: function (app) { return next(app, 0); },
        next: next,
        list: function () { return state.general.slice(); },
        start: start,
        status: function () { return { at: state.at, country: state.country, keys: Object.keys(state.by), general: state.general.length, loading: state.loading, disabled: false }; },
        _parse: parse, _pkgsOf: pkgsOf,
        disabled: false
    };
    if (typeof module !== "undefined" && module.exports) module.exports = APL.appArt;
})(typeof window !== "undefined" ? window : globalThis);
