/* ============================================================
   widgets.js — NEUTRALISED IN THIS CUSTOM BUILD (v1.1.1).

   The original file showed, under a focused app, cards of what that
   service is showing now: posters from TMDB / Fanart.tv, YouTube,
   channel logos from raw.githubusercontent.com, JustWatch, Steam,
   Microsoft's store catalogue. It also asked the screen's own Hub
   for its rows.

   This build loads no image from the internet, so the cards are gone
   and the shelf keeps its ordinary look (tiles + the row below).
   The API is kept, so js/launcher.js and js/controlcenter.js run
   unchanged: nothing is drawn and no request is made.
   ============================================================ */
(function (global) {
    "use strict";
    var APL = global.APL || (global.APL = {});

    APL.widgets = {
        show: function () {},
        hide: function () {},
        cardsFor: function () { return []; },
        cardEl: function () { return null; },
        focusCards: function () { return false; },
        leaveCards: function () { return false; },
        isShowing: function () { return false; },
        refresh: function () {},
        disabled: true,
        why: "local-only build: no online cards"
    };
})(window);
