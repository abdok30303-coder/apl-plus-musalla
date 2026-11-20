/* ============================================================
   liveshelf.js — NEUTRALISED IN THIS CUSTOM BUILD (v1.1.1).

   The original file filled the Top Shelf with posters and "continue
   watching" cards fetched from TMDB, Fanart.tv, JustWatch, YouTube,
   Apple's RSS charts, Steam and the like (image.tmdb.org,
   webservice.fanart.tv, images.justwatch.com, rss.applemarketingtools.com,
   cdn.akamai.steamstatic.com, v3-cinemeta.strem.io, thesportsdb.com…).

   None of that is fetched here: this build loads no image from the
   internet. Every function the rest of the launcher calls is kept, and
   answers "there is nothing to show", so the Home Screen falls back to
   its own look (app tiles, packaged images) instead of online artwork.

   Nothing is drawn, nothing is downloaded, no key is read.
   ============================================================ */
(function (global) {
    "use strict";
    var APL = global.APL || (global.APL = {});

    function noItems() { return []; }

    APL.live = {
        /* No service is configured: the launcher never asks this module again. */
        hasSource: function () { return false; },
        itemsNow: noItems,
        items: noItems,
        keys: function () { return {}; },
        region: function () { return ""; },
        findImdb: function () { return Promise.resolve(null); },
        searchArt: function () { return Promise.resolve(null); },
        metaOf: function () { return ""; },
        noteOf: function () { return ""; },
        cardFor: function () { return null; },
        onChange: function () {},
        refresh: function () {},
        clearCache: function () {},
        disabled: true,
        why: "local-only build: no online artwork"
    };
})(window);
