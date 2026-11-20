/* ============================================================
   launcher.js — tvOS Home Screen.

   Three states, driven only by where the focus is:
     shelf : focus in the dock (top row). The app's artwork fills
             the whole screen, the 2nd row peeks out at the bottom.
     grid  : focus in a lower row. Everything moves up, the artwork
             becomes a blurred background, the app's name shows under its icon.
     full  : ▲ from the dock (if the app has artwork). The interface slides
             off the screen; ▼ / Back brings it back, OK opens the app.
   ============================================================ */
(function (global) {
    "use strict";

    var APL = global.APL;
    var DOCK_SIZE = 6;           // apps per row, dock included: Settings › Home Screen › Apps per Row (5 to 7)
    var DOCK_TOP = 807;          // dock position in the shelf state (sizes(): higher with bigger tiles)
    var GRID_DOCK_TOP = 64;      // dock position once the grid has moved up
    var ROWS_TOP = 1076;         // top of the 2nd row inside .home
    var FULL_SHIFT = 430;        // shift that moves the dock off the screen

    var apps = [];          // apps shown (hidden apps excluded)
    var allApps = [];       // all apps, including Settings and Sources
    var tiles = [];
    var nav = null;
    var mode = "shelf";
    var bgActive = null;
    var dom = {};

    function $(id) { return document.getElementById(id); }

    function cacheDom() {
        dom.body = document.body;
        dom.bgA = $("bgA");
        dom.bgB = $("bgB");
        dom.bgBlur = $("bgBlur");
        dom.home = $("home");
        dom.dock = document.querySelector(".dock");
        dom.row0 = $("row0");
        dom.rows = $("rows");
        dom.hint = $("hint");
        dom.shelfInfo = $("shelfInfo");
        dom.shelfTitle = $("shelfTitle");
        dom.shelfMeta = $("shelfMeta");
        var open = document.createElement("div");                          // "OK to open", in full screen (openHint)
        open.className = "shelfinfo__open";
        open.textContent = APL.t("OK to Open");
        dom.shelfInfo.appendChild(open);
        dom.clock = $("clock");
        dom.toast = $("toast");
        dom.boot = $("boot");
        bgActive = dom.bgA;
    }

    /* ---------- colours ---------- */
    function rgba(hex, a) {
        var h = (hex || "#2a2a2e").replace("#", "");
        if (h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
        return "rgba(" + parseInt(h.substr(0,2),16) + "," + parseInt(h.substr(2,2),16) + "," +
               parseInt(h.substr(4,2),16) + "," + a + ")";
    }

    /* Top Shelf artwork: the app's image, otherwise an abstract
       tvOS-style wallpaper tinted with the app's colour. */
    /* Dominant colour: the one sampled from the Tizen icon, otherwise the accent. */
    function brandColour(app) { return app.edge || app.accent || "#3a4a8a"; }

    /* Settings › Appearance › Top Shelf › Otherwise › Black: a plain dark background behind every app,
       its own artwork included (the launcher's own Settings and Sources keep their large icon). What the
       apps show (What You're Watching, What's Popular) has its own switches. */
    function black() { return APL.sys.pref("shelfArt") === "black"; }
    function artOf(app) { return black() ? null : app.bg; }
    function plain(app) { return black() && !app.shelfHtml; }

    /* Home wallpapers are a real screen-wide mode. When enabled they take priority
       over every app's packaged shelf picture, so Change Wallpaper Now is visible
       immediately on any focused tile. Turn Home Wallpapers off to restore app art. */
    function wallpaperFor() {
        return (APL.wallpapers && APL.wallpapers.current) ? APL.wallpapers.current() : null;
    }
    function backdropFor(app) {
        var wall = wallpaperFor();
        if (wall) return "#000 center / cover no-repeat url('" + wall + "')";
        var bg = artOf(app);
        if (bg) return "#000 center / cover no-repeat url('" + bg + "')";
        if (plain(app)) return "#07080c";
        // No artwork yet (genart.js draws it once): a glow in the app's colour on a dark background.
        var a = brandColour(app);
        return "radial-gradient(60% 70% at 50% 44%, " + rgba(a, 0.42) + ", rgba(0,0,0,0) 70%)," +
               "radial-gradient(110% 80% at 50% 115%, " + rgba(a, 0.22) + ", rgba(0,0,0,0) 60%)," +
               "#07080c";
    }

    /* ---------- dynamic backdrops (app-art.js) ---------- */
    /* The title a service is showing right now: the storefront's trending list for the
       screen's country (JustWatch, no key needed), one poster per app. Settings ›
       Appearance › Dynamic Backdrops turns it off, and every app gets its artwork back. */
    function backdropPick(app) {
        if (!APL.appArt || !APL.appArt.pick) return null;
        /* Opt-in, and on every app once it is on: streaming services, the media
           players, the channels - anything the catalogue has a title for. It
           used to spare apps with artwork or a shelf of their own, which left
           the setting doing nothing on most of the wall; those shelves are
           handed over instead (see startBackdrops). */
        if (APL.sys.pref("cleanFrameBackdrops") !== true) return null;
        /* A fallback, never a replacement: an app with a Top Shelf of its own -
           What You're Watching, What's Popular (TMDB), Plex, Spotify, and the
           players' Continue Watching (Stremio, Nuvio, Hot Player, APL TV) - keeps
           it, and the catalogue only fills in where there is nothing else. */
        if (APL.live && APL.live.hasSource && APL.live.hasSource(app)) return null;
        /* Only a real streaming service, and only one the catalogue can name:
           Settings, TizenTube, Sources, Smart Hub, folders and TV inputs keep
           their own artwork. */
        if (!app || app.virtual || app.folder) return null;
        if (APL.appArt.known && !APL.appArt.known(app)) return null;
        try { return APL.appArt.pick(app); } catch (e) { return null; }
    }

    /* Title and year under the poster, where the Top Shelf puts its own. */
    function posterInfo(pick) {
        if (!pick || !pick.title) { shelfInfo(null); return; }
        var meta = [];
        if (pick.year) meta.push(String(pick.year));
        if (pick.kind) meta.push(pick.kind);
        shelfInfo({ poster: true, title: pick.title, meta: meta.join(" · ") });
    }

    /* Logo + name in the centre, like the provided artwork (sharp Tizen icon, never blurred). */
    function brandCard(app) {
        var card = document.createElement("div");
        card.className = "brandcard";
        var custom = getCustomIcons()[app.id];
        if (custom) {
            app.tile = custom;
            app.customTile = true;
        }
        if (app.shelfHtml && !app.customTile) {
            card.innerHTML = app.shelfHtml;               // Settings, Sources: large tvOS icon
        } else if (app.tile && app.customTile) {
            var img = document.createElement("img");
            img.className = "brandcard__icon";
            img.style.borderRadius = "24px";
            img.alt = "";
            img.src = app.tile;
            card.appendChild(img);
        } else if (app.icon) {
            var img = document.createElement("img");
            img.className = "brandcard__icon";
            img.alt = "";
            img.onerror = function () {
                if (!img._vetro) { img._vetro = true; img.src = vetroIcon(app.id); return; }
                img.remove();
            };
            img.src = app.icon;
            card.appendChild(img);
        }
        var name = document.createElement("div");
        name.className = "brandcard__name";
        name.textContent = app.name;
        card.appendChild(name);
        return card;
    }

    /* Grid background, as on tvOS: the Top Shelf image, frozen and blurred.
       It is drawn ONCE into a tiny canvas (the blur costs nothing),
       which the screen stretches: no blur is recomputed while navigating. */
    var blurCanvas = null, blurToken = 0;
    function blurLayer() {
        if (blurCanvas) return blurCanvas;
        blurCanvas = document.createElement("canvas");
        var ctx = blurCanvas.getContext("2d");
        var filters = ctx && "filter" in ctx;
        blurCanvas.width = filters ? 192 : 64;          // without filters: smaller = softer
        blurCanvas.height = filters ? 108 : 36;
        blurCanvas._filters = filters;
        blurCanvas.className = "bgblur__canvas";
        dom.bgBlur.appendChild(blurCanvas);
        return blurCanvas;
    }
    function setBlur(src, app) {
        if (!dom.bgBlur) return;
        var token = ++blurToken;
        if (!src) {
            dom.bgBlur.style.background = backdropFor(app);
            if (blurCanvas) blurCanvas.style.opacity = "0";
            return;
        }
        var img = new Image();
        /* onload is not the whole bitmap. Drawing then left the blurred backdrop
           half filled, and the Control Center sometimes showed that banded blur
           of the app's backdrop instead of the picture. */
        var painted = false;
        function paintBlur() {
            if (painted) return;
            painted = true;
            if (token !== blurToken) return;              // another image was requested in the meantime
            var c = blurLayer(), ctx = c.getContext("2d"), w = c.width, h = c.height;
            var m = c._filters ? 14 : 0;                  // margin: no dark edge from the blur
            ctx.clearRect(0, 0, w, h);
            if (c._filters) ctx.filter = "blur(5px) saturate(150%)";
            // "cover": the image fills the canvas without being distorted
            var r = Math.max((w + 2 * m) / img.naturalWidth, (h + 2 * m) / img.naturalHeight);
            var dw = img.naturalWidth * r, dh = img.naturalHeight * r;
            ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
            c.style.opacity = "1";
            dom.bgBlur.style.background = "#05060a";
        }
        img.onload = function () {
            if (img.decode) img.decode().then(paintBlur, paintBlur);
            else paintBlur();
            global.setTimeout(paintBlur, 400);            // a decode that never settles
        };
        img.onerror = function () { if (token === blurToken) dom.bgBlur.style.background = backdropFor(app); };
        img.src = src;
    }

    /* The blurred background is only prepared when entering the grid: computing it on
       every move in the dock was what made navigation stutter. */
    var blurWanted = null;
    /* glass: the picture for the frosted dock, when it differs from the grid's (see frost). */
    function wantBlur(src, app, glass) {
        frost(glass === undefined ? src : glass);
        blurWanted = { src: src, app: app };
        if (mode === "grid") flushBlur();
    }
    /* Liquid Glass with no live blur: the dock shows a soft copy of the picture behind it (the sheets
       are soft already), lined up with it (layout), so the
       picture looks frosted through the glass. A static image, drawn once when the picture changes.
       Not the small copy of live content: enlarged 6 times without a blur, it showed as big pixels in
       the dock (seen on the M8); the dock is then clear glass over the picture. */
    var frostSrc, frostToken = 0;
    function frost(src) {
        if (!dom.dock || src === frostSrc) return;           // the same picture: nothing to repaint
        frostSrc = src;
        var token = ++frostToken;
        // Swapped once decoded: the dock never flashes to the bare tint while the picture loads
        whenDecoded(src, function (im) {
            if (token !== frostToken) return;                 // another picture was asked for in the meantime
            var resolved = "";
            if (src) {
                try {
                    resolved = (im && im.src) || (new URL(src, document.baseURI || window.location.href).href);
                } catch (e) {
                    resolved = (im && im.src) || src;
                }
            }
            dom.dock.style.setProperty("--glass-img", resolved ? 'url("' + String(resolved).replace(/"/g, "%22") + '")' : "none");
        });
    }
    function flushBlur() {
        if (!blurWanted) return;
        var b = blurWanted;
        blurWanted = null;
        setBlur(b.src, b.app);
    }

    /* An image is only shown once decoded: the fade starts without a hitch. */
    function whenDecoded(src, then) {
        if (!src) { then(); return; }
        var im = new Image();
        im.src = src;
        /* The decoded element is handed on: the glass bakes its pane from this
           very bitmap (APL.glass.prepare(src, done, im)) instead of fetching the
           file again, which is what made the dock trail the picture. */
        var done = function () { then(im); };
        if (im.decode) im.decode().then(done, done);
        else { im.onload = done; im.onerror = done; }
    }

    /* The picture itself, as an <img> that is decoded before it is shown. As a
       CSS background on a full-screen layer the browser painted the file as it
       decoded, so a backdrop filled in a line at a time from the top - every
       time the row was scrolled, not only on the first pass. An <img> whose
       decode has finished is painted whole. The layer keeps its own colour
       underneath and the glass reads the picture from the element (glass.js). */
    function showPicture(layer, url, then) {
        var pic = layer.querySelector("img:not(.brandcard__icon)");   // the brand card's logo is not the backdrop
        if (pic && pic.getAttribute("src") === url && pic.complete && pic.naturalWidth) {
            if (then) then(pic);                                 // the same picture, already decoded
            return;
        }
        if (pic) pic.parentNode.removeChild(pic);
        pic = document.createElement("img");
        pic.alt = "";
        pic.decoding = "async";
        pic.src = url;
        layer.appendChild(pic);
        function done() { if (then) then(pic); }
        if (pic.decode) pic.decode().then(done, done);
        else { pic.onload = done; pic.onerror = done; }
    }

    /* Drawing a full-screen image takes 100 ms on the M8, whatever the effect: the dock
       backgrounds stay ready in invisible layers, and switching between them redraws nothing. */
    var layers = {};
    function layerFor(app) {
        if (layers[app.id]) return layers[app.id];
        var l = document.createElement("div");
        l.className = "bg";
        /* The user-selected wallpaper is an image too: this keeps the same
           decode-before-fade behaviour as app artwork and makes the swap instant. */
        var image = wallpaperFor() || artOf(app);
        l.style.background = image ? "#000" : backdropFor(app);
        if (!image && !plain(app)) l.appendChild(brandCard(app));
        l.dataset.app = app.id;
        dom.bgA.parentNode.insertBefore(l, dom.bgA);
        layers[app.id] = l;
        return l;
    }
    /* After a change of order or artwork: layers to rebuild (the one on screen goes after the fade). */
    function dropLayers() {
        Object.keys(layers).forEach(function (id) {
            var l = layers[id];
            if (l === bgActive) l._stale = true; else l.parentNode.removeChild(l);
        });
        layers = {};
    }
    function showLayer(next, app) {
        next.dataset.app = app.id;
        if (next === bgActive) return;
        if (artOf(app) && !wallpaperFor()) motion(next); else next.classList.remove("is-motion");
        fadeTo(next);
    }
    /* Crossfade without a dip to black (two half-faded pictures over black): of the two layers, the
       upper one in the page does the fading and the lower one stays whole underneath. The new one fades
       in over the old one, or appears at once under it while the old one fades out. Nothing moves and
       the stacking never changes: only the opacity, so no full-screen repaint (100 ms on the M8). */
    var FADE_MS = 300;
    function fadeTo(next) {
        var old = bgActive;
        /* The new picture slides in as it fades, whichever way round the two
           layers stack, so a change never pops - not for a new app, not for the
           next title after ten seconds, not while stepping through the row. */
        if (!next.classList.contains("is-motion")) {
            next.classList.remove("is-slide");
            void next.offsetWidth;                                  // restart the animation
            next.classList.add("is-slide");
            global.setTimeout(function () { next.classList.remove("is-slide"); }, 500);
        }
        clearTimeout(next._out);
        clearTimeout(old._out);
        bgActive = next;
        /* The element itself, not only its id: several layers can carry the
           same app, and the glass has to slice the one that was faded in. */
        document.body.__bgLive = next;
        /* Name the app whose backdrop is live. Two layers keep is-active while
           they cross over, so "the first active layer" can still be the one
           leaving, and the glass would slice the show before last. */
        if (next.dataset && next.dataset.app) document.body.setAttribute("data-bg-app", next.dataset.app);
        if (old.compareDocumentPosition(next) & global.Node.DOCUMENT_POSITION_FOLLOWING) {
            next.classList.add("is-active");                     // above: fades in over the old one
            old._out = setTimeout(function () { hideLayer(old); }, FADE_MS + 50);
        } else {
            next.classList.add("is-instant", "is-active");       // below: whole at once, under the old one
            void next.offsetWidth;
            next.classList.remove("is-instant");
            hideLayer(old);                                       // the old one fades out over it
        }
        /* Whatever path was taken, one backdrop is on screen when the fade is
           over. A poster that never got hidden - the show of the app just left,
           under a channel with no show of its own - is cleared here. */
        setTimeout(function () {
            var list = document.querySelectorAll(".bg.is-active"), i;
            for (i = 0; i < list.length; i++) {
                if (list[i] !== bgActive) hideLayer(list[i]);
            }
        }, FADE_MS + 120);
    }
    function hideLayer(l) {
        if (l === bgActive) return;                               // shown again in the meantime
        l.classList.remove("is-active");
        if (l._stale) setTimeout(function () { if (l !== bgActive && l.parentNode) l.parentNode.removeChild(l); }, FADE_MS + 50);
    }

    var backdropToken = 0;

    /* Wallpapers are global scenery, not app artwork. Keeping one decoded
       full-screen image in the two base layers prevents six or more copies of
       the same 1920x1080 bitmap being decoded while moving across the dock. */
    function setWallpaperBackdrop(app, wall, force) {
        stopRotate();
        /* Moving along the dock normally changes only title/glass metadata: do
           not allocate another blur request or touch a full-screen bitmap. */
        var hasImg = bgActive && bgActive.querySelector && bgActive.querySelector("img");
        if (!force && hasImg && bgActive.dataset && bgActive.dataset.wallpaper === wall) {
            bgActive.dataset.app = app.id;
            refreshGlass();
            return;
        }
        wantBlur(wall, app, wall);
        /* App-art cache layers may each hold an FHD bitmap from before wallpapers
           were enabled. Retire them now; wallpaper mode owns only bgA and bgB. */
        if ((!bgActive.dataset || !bgActive.dataset.wallpaper) && Object.keys(layers).length) dropLayers();
        var token = ++backdropToken;
        whenDecoded(wall, function (decoded) {
            if (token !== backdropToken) return;
            var next;
            if (bgActive === dom.bgA) next = dom.bgB;
            else if (bgActive === dom.bgB) next = dom.bgA;
            else next = dom.bgA; // leave a cached app-art layer for the fade-out
            next.innerHTML = "";
            next.style.background = "#000";
            next.dataset.app = app.id;
            next.dataset.wallpaper = wall;
            delete next.dataset.poster;
            showPicture(next, wall, function (pic) {
                if (token !== backdropToken) return;
                if (APL.glass && APL.glass.prepare) APL.glass.prepare(wall, null, pic);
                showLayer(next, app);
                refreshGlass();
            });
        });
    }

    function setBackdrop(app, force) {
        /* Nothing changes the backdrop under the Control Center, a drawer,
           search or Settings: the picture stays still while they are up. */
        if (!force && overlayOpen()) return;
        /* A picture still being prepared for the app we just left must not land
           now. Its fallback fires half a second later and paints the old show
           over the new one - the flash that goes new, previous, new. */
        /* Only the app in focus owns the backdrop. A catalogue for the app we
           just left answers later, and showing its picture here put the previous
           show back over the new one: the flash that goes new, previous, new. */
        if (!force && apps.length && apps[nav.index] && apps[nav.index] !== app) return;
        backdropToken++;
        var wall = wallpaperFor();
        if (wall) { setWallpaperBackdrop(app, wall, force); return; }
        // Dynamic posters must not overwrite an explicit wallpaper selection.
        var pick = backdropPick(app);
        if (pick && pick.url) { setPoster(app, pick, force); return; }
        if (bgActive.dataset.poster) bgActive._stale = true;      // removed once it has faded out
        stopRotate();
        var image = artOf(app);
        wantBlur(image && (image === app.bg ? app.bgBlur || app.bg : image), app, image && (image === app.bg ? app.bgBlur || null : image));
        var token = ++backdropToken;
        if (apps.indexOf(app) < DOCK_SIZE) {
            /* The picture is decoded before its layer is shown. A cover
               background resolves its percentages against the loaded image, so a
               layer shown first paints at the top of the box and snaps to centre
               when the file lands - the picture that "loads from the top" the
               first time an app is visited. */
            var dockLayer = layerFor(app);
            if (!image) {
                if (token !== backdropToken) return;
                showLayer(dockLayer, app);
                refreshGlass();
                return;
            }
            showPicture(dockLayer, image, function (pic) {
                if (token !== backdropToken) return;
                if (APL.glass && APL.glass.prepare) APL.glass.prepare(image, null, pic);
                showLayer(dockLayer, app);
                refreshGlass();
            });
            return;
        }
        // A forced repaint is used by Change Wallpaper Now. Do not discard it
        // merely because the focused app is the same.
        if (!force && bgActive.dataset.app === app.id) return;
        whenDecoded(image, function () {
            if (token !== backdropToken) return;          // another app was selected in the meantime
            var next = (bgActive === dom.bgA) ? dom.bgB : dom.bgA;
            next.innerHTML = "";
            next.style.background = image ? "#000" : backdropFor(app);
            if (!image && !plain(app)) next.appendChild(brandCard(app));
            if (!image) { showLayer(next, app); refreshGlass(); return; }
            showPicture(next, image, function () {
                if (token !== backdropToken) return;
                showLayer(next, app);
                refreshGlass();
            });
        });
    }

    /* 10 s on the same app: the next title it carries takes over, like the Top
       Shelf's own rotation. Only apps with a catalogue of their own advance
       (app-art.js says no otherwise), so a channel never slides on to a rival. */
    var ROTATE_MS = 10000, rotTimer = null, rotN = 0;
    function stopRotate() { clearTimeout(rotTimer); rotTimer = null; }
    /* The backdrop is left alone while something is over it: the Control Center,
       a drawer, search, Settings, profiles. */
    function overlayOpen() {
        return /(^| )has-(cc|sources|search|settings|profiles|wdg)( |$)/.test(document.body.className);
    }
    function startRotate(app) {
        stopRotate();
        if (!APL.appArt || !APL.appArt.next) return;
        rotTimer = setTimeout(function () {
            rotTimer = null;
            if (apps[nav.index] !== app || mode === "grid" || overlayOpen()) { startRotate(app); return; }
            var pick = null;
            try { pick = APL.appArt.next(app, ++rotN); } catch (e) {}
            if (pick && pick.url) { setPoster(app, pick); return; }
            startRotate(app);                    // nothing else to show: keep the timer alive
        }, ROTATE_MS);
    }

    /* A poster, in the dock and in the grid alike. A fresh layer each time: the picture
       changes with the title, so there is nothing to keep per app. The one before it is
       marked stale and goes once the crossfade is over. */
    function setPoster(app, pick, force) {
        /* A late swap (a bake finishing after the focus moved on, the focus
           coming back from an overlay) must not repaint the picture while the
           Control Center or a drawer is over it. */
        if (!force && overlayOpen()) return;
        var token = ++backdropToken;
        /* The picture AND the glass over it change together: the image is decoded
           and the pane baked before either is shown, so the dock, the pill and the
           Control Center cross at the same moment as the backdrop. */
        var apply = function () {
            if (token !== backdropToken) return;
            if (bgActive.dataset.poster && bgActive.dataset.poster !== pick.url) bgActive._stale = true;
            wantBlur(pick.url, app, pick.url);
            var next;
            if (apps.indexOf(app) < DOCK_SIZE) {
                next = document.createElement("div");
                next.className = "bg";
                dom.bgA.parentNode.insertBefore(next, dom.bgA);
            } else {
                next = (bgActive === dom.bgA) ? dom.bgB : dom.bgA;
                next.innerHTML = "";
            }
            next.dataset.app = app.id;
            next.dataset.poster = pick.url;
            /* The picture is an <img> now (showPicture): a CSS background painted
               itself in as it decoded, which is the poster that arrived a line at
               a time from the top on every pass along the row. The layer is shown
               once that image's own decode is done. */
            showPicture(next, pick.url, function () {
                if (token !== backdropToken) return;
                showLayer(next, app);
                /* The picture is on screen: the glass must re-read the scene now.
                   Painting alone kept the pane baked for the app's own artwork when
                   the poster had not been baked yet, so the dock and every Control
                   Center tile carried that blurred app backdrop instead of the
                   picture behind them - worst on a first scroll through the apps. */
                if (APL.glass && APL.glass.refresh) APL.glass.refresh();
                if (APL.glass && APL.glass.paint) APL.glass.paint();
            });
            /* The next title's pane is made while this one is on screen, so the
               ten-second change lands on a slice that is already rendered. */
            if (APL.glass && APL.glass.prefetch) {
                var coming = null;
                try { coming = APL.appArt.next(app, rotN + 1); } catch (e) {}
                if (coming && coming.url) APL.glass.prefetch(coming.url);
            }
            posterInfo(pick);
            startRotate(app);
        };
        whenDecoded(pick.url, function (im) {
            /* Baked from the element that is about to be shown, so the picture and
               the pane land together rather than the pane a second later. */
            if (APL.glass && APL.glass.prepare) APL.glass.prepare(pick.url, apply, im); else apply();
        });
    }

    /* The frosted panes follow the layer that is on screen. Refreshing before the
       new layer was shown made the glass read the OLD one: moving to an app with
       no picture (Settings) left the previous film baked in the dock and the pill. */
    function refreshGlass() {
        if (APL.glass && APL.glass.refresh) APL.glass.refresh();
        if (APL.glass && APL.glass.paint) APL.glass.paint();
    }

    /* An app's real icon, served by Vetro (fallback when the Tizen path can't be read). */
    function vetroIcon(id) { return APL.sys.vetroUrl("/apps/icon?appId=" + encodeURIComponent(id)); }

    /* Slow camera move over the Top Shelf image, like Apple TV's animated backgrounds.
       Off by default: at rest on the M8 it takes more than one core by itself (135%, versus
       16% without it), and the images change every 9 s, so it never stops. */
    var motionN = 0;
    function motion(layer) {
        layer.classList.remove("is-motion", "is-motion-a", "is-motion-b");
        if (!APL.sys.pref("bgMotion") || document.body.classList.contains("night")) return;
        void layer.offsetWidth;
        layer.classList.add("is-motion", (++motionN % 2) ? "is-motion-a" : "is-motion-b");
    }

    /* ---------- tiles ---------- */
    function letter(name) {
        var el = document.createElement("div");
        el.className = "tile__letter";
        el.textContent = (name || "?").trim().charAt(0).toUpperCase();
        return el;
    }

    /* A Tizen icon is often a square with a background: its edge colour
       is extended over the whole tile for a full-bleed tvOS look. */
    function bleedIconColour(img, card, app) {
        try {
            var c = document.createElement("canvas");
            c.width = c.height = 8;
            var ctx = c.getContext("2d");
            ctx.drawImage(img, 0, 0, 8, 8);
            var d = ctx.getImageData(0, 0, 1, 1).data;
            if (d[3] > 200) {
                card.style.background = "rgb(" + d[0] + "," + d[1] + "," + d[2] + ")";
                app.edge = "#" + [d[0], d[1], d[2]].map(function (v) { return ("0" + v.toString(16)).slice(-2); }).join("");
                if (card.parentNode) ringGlow(card.parentNode, app.edge);
                // The background shown for this app takes its icon's real colour.
                /* Never over a poster: the layer carrying the film from the catalogue
                   has this app's id too, and repainting it here put the app's own
                   picture back over the film - the backdrop that seemed to reload
                   itself on the first pass along the dock. */
                if (bgActive && bgActive.dataset.app === app.id && !bgActive.dataset.poster) bgActive.style.background = backdropFor(app);
            }
        } catch (e) { /* image from another origin: keep the default colour */ }
    }

    function makeTile(app, row) {
        var tile = document.createElement("div");
        tile.className = "tile";
        tile.dataset.row = row;

        var card = document.createElement("div");
        card.className = "tile__card";

        var custom = getCustomIcons()[app.id];
        if (custom) {
            app.tile = custom;
            app.customTile = true;
        }

        if (app.tileHtml && !app.customTile) {
            card.innerHTML = app.tileHtml;
        } else if (app.tile) {
            // inline style: a url() inside a CSS variable would be resolved from css/
            card.style.background = "#111 center / cover no-repeat url('" + app.tile + "')";
        } else if (app.icon) {
            // No logo in the catalog: the app's real, sharp icon, until
            // genart.js makes its tile.
            card.style.background = app.accent || "linear-gradient(160deg, #3b3f4a 0%, #1b1d23 100%)";
            card.classList.add("tile__card--icon");
            var img = document.createElement("img");
            img.className = "tile__icon" + (app.autoIcon ? " tile__icon--app" : "");
            img.alt = "";
            img.onload = function () { bleedIconColour(img, card, app); };
            img.onerror = function () {
                if (!img._vetro) { img._vetro = true; img.src = vetroIcon(app.id); return; }
                card.removeChild(img); card.appendChild(letter(app.name));
            };
            img.src = app.icon;
            card.appendChild(img);
        } else {
            card.style.background = app.accent || "#2a2a2e";
            card.appendChild(letter(app.name));
        }

        var label = document.createElement("div");
        label.className = "tile__label";
        label.textContent = app.name;

        tile.appendChild(card);
        tile.appendChild(label);
        ringGlow(tile, app.edge || app.accent);
        return tile;
    }

    /* v1.2.91: the focus ring's halo takes the app's own colour (one CSS variable on the icon, nothing animated).
       Dark colours are lifted towards white so the halo stays visible; a gradient or a name is ignored. */
    function ringGlow(tile, colour) {
        try {
            var m = /^#([0-9a-f]{6})$/i.exec(colour || "");
            if (!m) return;
            var r = parseInt(m[1].substr(0, 2), 16), g = parseInt(m[1].substr(2, 2), 16), b = parseInt(m[1].substr(4, 2), 16);
            if (r * 0.3 + g * 0.59 + b * 0.11 < 90) { r = Math.round((r + 255) / 2); g = Math.round((g + 255) / 2); b = Math.round((b + 255) / 2); }
            tile.style.setProperty("--ring-glow", "rgba(" + r + "," + g + "," + b + ",0.6)");
            tile.style.setProperty("--ring-solid", "rgb(" + r + "," + g + "," + b + ")");       // Settings > Home Screen > Focus Ring Colour: App colour
        } catch (e) {}
    }

    /* ---------- states ---------- */
    function setMode(m) {
        mode = m;
        dom.body.classList.remove("mode-shelf", "mode-grid", "mode-full");
        dom.body.classList.add("mode-" + m);
        layout();
        if (dom.shelfInfo && nav) openHint();
    }

    /* Apps per row: the tiles share the dock's width (1750 px inside its padding, 50 px gaps) and keep
       their 5:3 shape; the dock sits flush at the bottom edge (1032), and the rows start below
       it as before. CSS reads the result from variables on <html>. */
    var TILE_H = 150, DOCK_BOTTOM = 1032;
    function sizes() {
        var n = APL.sys.pref("appsPerRow");
        n = n === 5 || n === 7 ? n : 6;
        var w = Math.round((1750 - (n - 1) * 50) / n), h = Math.round(w * 0.6), dockH = h + 75;
        DOCK_SIZE = n; TILE_H = h; DOCK_TOP = DOCK_BOTTOM - dockH;
        ROWS_TOP = DOCK_BOTTOM + 44;
        var s = document.documentElement.style;
        s.setProperty("--cols", n);
        s.setProperty("--tile-w", w + "px");
        s.setProperty("--tile-h", h + "px");
        s.setProperty("--dock-top", DOCK_TOP + "px");
        s.setProperty("--dock-h", dockH + "px");
        s.setProperty("--rows-top", ROWS_TOP + "px");
    }
    sizes();

    function layout() {
        var y = 0;
        if (mode === "full") {
            y = FULL_SHIFT;
        } else if (mode === "grid") {
            y = -(DOCK_TOP - GRID_DOCK_TOP);
            // Scroll if the selected row goes off the screen.
            var el = nav && nav.current();
            if (el && el.dataset.row !== "0") {
                var visibleTop = ROWS_TOP + el.offsetTop + y;
                var limit = 1080 - (TILE_H + 80);    // icon + name + bottom margin
                if (visibleTop > limit) y -= (visibleTop - limit);
            }
        }
        dom.home.style.transform = "translate3d(0, " + y + "px, 0)";
        if (dom.dock) dom.dock.style.setProperty("--glass-y", -(DOCK_TOP + y) + "px");   // the frosted copy stays lined up
    }

    /* ---------- live Top Shelf ---------- */
    var liveTimer = null;

    /* The artwork is loaded before being shown: an image that can't be found is skipped
       (on to the next item) instead of leaving a black screen. */
    function setLiveBackdrop(app, item, n, items, tries) {
        if (item.bad) { if (items && (tries || 0) < items.length) setLiveBackdrop(app, items[(n + 1) % items.length], (n + 1) % items.length, items, (tries || 0) + 1); return; }
        if (item.ok) { swapLive(app, item, n); return; }
        var im = new Image();
        function shown() { item.ok = true; if (apps[nav.index] === app && mode !== "grid") swapLive(app, item, n); }
        im.onload = function () { if (im.decode) im.decode().then(shown, shown); else shown(); };
        im.onerror = function () { item.bad = true; if (apps[nav.index] === app) setLiveBackdrop(app, item, n, items, tries); };
        im.src = item.bg;
    }
    var liveShown = null;                                 // the Top Shelf item on screen: in full screen, OK opens it if it can
    function openable(app) {
        var shown = mode === "full" && liveShown && liveShown.app === app && bgActive.dataset.app === liveShown.tag ? liveShown.item : null;
        return shown && shown.link && APL.launchDeepLink ? shown : null;
    }
    /* Full screen on an item that opens directly: say so under its title. */
    function openHint() {
        dom.shelfInfo.classList.toggle("can-open", !!openable(apps[nav.index]));
    }
    function swapLive(app, item, n) {
        var tag = app.id + "#" + n;
        liveShown = { app: app, item: item, tag: tag };
        if (bgActive.dataset.app === tag) return;
        var next = (bgActive === dom.bgA) ? dom.bgB : dom.bgA;
        next.innerHTML = "";
        next.dataset.app = tag;
        motion(next);
        wantBlur(item.bgSmall || null, app, null);
        /* The same rule as a poster (setPoster): the Top Shelf picture from
           TMDB, Plex or YouTube is an <img> revealed once its decode is done, so
           it can never be painted a band at a time. */
        showPicture(next, item.bg, function (pic) {
            if (bgActive === next) return;                 // already on screen
            /* The pane is ready before the picture is faded in, so the dock,
               the pill and the Control Center change with the backdrop instead
               of a second behind it - the poster of the last app under a new
               one. A pane that cannot be made answers at once, so nothing is
               ever held back by glass. */
            var go = function () {
                if (bgActive === next) return;
                fadeTo(next);
                refreshGlass();
                shelfInfo(item);
            };
            if (APL.glass && APL.glass.prepare) APL.glass.prepare(item.bg, go, pic); else go();
        });
    }

    /* Title and rating of the Top Shelf film or series (videos and games have none). */
    function shelfInfo(item) {
        /* A film or a series has a type; a video, an album or a game says where it
           comes from ("TizenTube", "Top albums"): that is what goes under the
           title, so What You're Watching names what it is showing on every app
           and not only on the film ones. */
        var has = !!(item && (item.type || item.poster || (item.title && item.sub)));
        dom.shelfInfo.classList.toggle("is-visible", has);
        if (!has) return;
        dom.shelfTitle.textContent = item.title;
        dom.shelfMeta.textContent = item.meta !== undefined ? item.meta
            : (item.type ? APL.live.metaOf(item) : (item.sub || ""));
        openHint();
    }

    /* The pane for the title that comes next is baked while this one is on
       screen: the twenty-second change then lands on a slice that is already
       made, instead of the dock finishing a bake after the picture changed. */
    function warmNext(items, i) {
        if (!APL.glass || !APL.glass.prefetch || !items || !items.length) return;
        var item = items[i % items.length];
        if (item && item.bg) APL.glass.prefetch(item.bg);
    }

    /* A new full-screen image costs 100 ms: as rarely as possible, and never while navigating. */
    var LIVE_ROTATE_MS = 20000;
    function stopLive() {
        clearTimeout(liveTimer); APL.timers.cancel("live-rotate");      // v1.2.101: shared timer (js/timers.js)
        liveTimer = null;
    }

    /* New sources found (Smart Hub rows read late): the app in the dock starts over with them. */
    APL.onLiveSources = function () {
        var app = apps[nav.index];
        if (app && mode !== "grid" && nav.index < DOCK_SIZE) startLive(app);
    };

    /* The panes of the apps either side are baked while this one is on screen:
       stepping along the row never waits for one, which was the last place a
       pane could still arrive a moment after the picture it belongs to. */
    function warmNear(i) {
        if (!APL.glass || !APL.glass.prefetch) return;
        [-1, 1].forEach(function (d) {
            var app = apps[i + d];
            if (!app) return;
            var pick = null;
            try { pick = backdropPick(app); } catch (e) {}
            if (pick && pick.url) { APL.glass.prefetch(pick.url); return; }
            var art = artOf(app);
            if (art) APL.glass.prefetch(art);
        });
    }
    /* v1.2.91: the artwork two icons away is read from the package a little later, when the screen is idle, so
       it is ready for the next presses. Plain images (no blur made), at most 6 kept, only for the dock, never in the
       light mode. */
    var farImgs = {}, farKeys = [], farTimer = null;
    function warmFar(i) {
        clearTimeout(farTimer);
        if (document.body.classList.contains("perf")) return;
        farTimer = setTimeout(function () {
            [-2, 2].forEach(function (d) {
                var j = i + d, app = apps[j];
                if (!app || j < 0 || j >= DOCK_SIZE) return;
                var art = null;
                try { art = artOf(app); } catch (e) {}
                if (!art || farImgs[art]) return;
                var im = new Image();
                im.src = art;
                farImgs[art] = im; farKeys.push(art);
                if (farKeys.length > 6) delete farImgs[farKeys.shift()];
            });
        }, 450);
    }
    /* After a short pause on the app, its current content is loaded. */
    function startLive(app) {
        stopLive();
        if (!APL.live || !APL.live.hasSource(app)) return;
        liveTimer = setTimeout(function () {
            APL.live.itemsNow(app).then(function (items) {
                if (!items || apps[nav.index] !== app) return;
                if (APL.widgets && APL.widgets.isShowing()) return;   // hidden by the cards: nothing to draw
                var n = 0;
                setLiveBackdrop(app, items[0], 0, items, 0);
                warmNext(items, 1);
                APL.timers.every("live-rotate", LIVE_ROTATE_MS, function () {
                    if (mode === "grid" || document.hidden) return;   // paused under the grid / behind another app
                    if (apps[nav.index] !== app) { stopLive(); return; }
                    n = (n + 1) % items.length;
                    setLiveBackdrop(app, items[n], n, items, 0);
                    warmNext(items, n + 1);
                });
            });
        }, 650);
    }

    var bgTimer = null, lastFocus = 0;
    function onFocus(i, el) {
        lastFocus = i;
        rotN = 0;
        var app = apps[i], inDock = el.dataset.row === "0", fromGrid = mode === "grid";
        if (!inDock) stopRotate();
        if (mode !== "full") setMode(inDock ? "shelf" : "grid");
        else layout();
        if (APL.widgets) APL.widgets.show(inDock ? app : null, fromGrid);
        if (!inDock) flushBlur();
        // In the grid, as on tvOS: the Top Shelf artwork freezes and becomes
        // the blurred background; it no longer changes from one app to the next (and nothing to decode).
        if (!inDock) { clearTimeout(bgTimer); return; }
        var live = APL.live && APL.live.hasSource(app);
        dom.hint.classList.toggle("is-visible", (!!artOf(app) || live) && APL.sys.pref("showHint"));
        warmNear(i);                                   // either side, before it is asked for
        warmFar(i);
        if (live && bgActive.dataset.app && bgActive.dataset.app.indexOf(app.id + "#") === 0) return;   // already shown
        /* Its own artwork is already the layer on screen (after a change of the
           Dynamic Backdrops setting, for one). The shelf picture still has to
           start, or the shelf stays empty until the focus leaves and returns. */
        if (bgActive.dataset.app === app.id) { if (live) startLive(app); return; }
        shelfInfo(null);
        // Full-screen artwork changed a fraction of a second after the focus: when
        // scrolling fast, a large image isn't decoded on every press.
        clearTimeout(bgTimer);
        var swap = function () { setBackdrop(app); startLive(app); };
        if (!bgActive.dataset.app) swap(); else bgTimer = setTimeout(swap, 170);
    }

    function launch(i) {
        var el = tiles[i];
        el.classList.add("is-pressed");
        setTimeout(function () { el.classList.remove("is-pressed"); }, 160);
        if (!apps[i].virtual || apps[i].web) APL.sys.profiles.noteLaunch(apps[i].id);   // profile history
        if (apps[i].web && APL.sys.PREVIEW) { toast(APL.t("Preview: on your TV, “{name}” would open in Internet ({url})", { name: apps[i].name, url: apps[i].url.replace(/^https:\/\/|\/$/g, "") })); return; }
        if (apps[i].virtual) { apps[i].run(); return; }
        if (APL.sys.PREVIEW) { toast(APL.t("Preview: on your TV, “{name}” would open now", { name: apps[i].name })); return; }
        showVeil();
        var id = apps[i].id;
        // Your own item, enlarged with ▲ (Plex's Continue Watching, a Spotify mix): straight to it.
        // From the dock, OK opens the app as usual.
        var shown = openable(apps[i]);
        if (shown) {
            APL.launchDeepLink(id, shown.link).catch(function () { APL.launchApp(id).catch(function (err) { hideVeil(); toast(err.message || APL.t("Couldn't open the app")); }); });
            return;
        }
        if (TUBE.test(apps[i].name)) { launchTube(id); return; }
        APL.launchApp(id).catch(function (err) { hideVeil(); toast(err.message || APL.t("Couldn't open the app")); });
    }

    /* When an app opens: the screen dims right away, the app appears over it.
       The veil goes away on returning Home, or by itself if the app couldn't open. */
    var veilTimer = null, veilHeldUntil = 0;
    function showVeil() {
        var v = $("veil");
        if (!v) { v = document.createElement("div"); v.id = "veil"; v.className = "veil"; document.body.appendChild(v); }
        v.classList.add("is-on");
        clearTimeout(veilTimer);
        veilTimer = setTimeout(hideVeil, Math.max(5000, veilHeldUntil - Date.now()));
    }
    function hideVeil() {
        if (Date.now() < veilHeldUntil) return;
        clearTimeout(veilTimer);
        var v = $("veil");
        if (v) {
            v.style.transition = "none";
            v.classList.remove("is-on");
            setTimeout(function () { if (v) v.style.transition = ""; }, 50);
        }
    }
    /* TizenTube from cold: the launcher comes back to the front while TizenBrew restarts (instead
       of the Samsung home screen) and stays black until then. */
    APL.holdVeil = function (ms) { veilHeldUntil = Date.now() + ms; showVeil(); };

    /* TizenTube replaces Samsung's YouTube app: that one must be closed first,
       otherwise TizenTube can get stuck or give way to Samsung's YouTube (same
       fix as "Fix TizenTube" in Vetro). With no answer from Vetro within 1.5 s,
       it launches anyway. */
    var TUBE = /^(TizenTube|TizenBrew)$/;
    var SAMSUNG_YOUTUBE = ["com.samsung.tv.cobalt-yt", "111299001912"];
    function launchTube(id) {
        var done = false;
        function go() {
            if (done) return;
            done = true;
            (id ? APL.launchApp(id) : APL.launchTizenTube()).catch(function (err) { hideVeil(); toast(err.message || APL.t("Couldn't open the app")); });
        }
        // Most of the time Samsung's YouTube isn't running: nothing to close, TizenTube opens right away
        APL.sys.runningApps().then(function (ids) {
            var open = SAMSUNG_YOUTUBE.filter(function (a) { return ids.indexOf(a) !== -1; });
            if (!open.length) { go(); return; }
            APL.sys.vetroPost("/exec", { cmd: open.map(function (a) { return "app_launcher -k " + a + " >/dev/null 2>&1"; }).join("; ") + "; true" })
                .then(function () { setTimeout(go, 300); }, go);
            setTimeout(go, 1500);
        }, go);
    }

    /* Settings › Apps: closes the apps left open behind the launcher. Only Home Screen apps
       and the big video apps: never a screen service. TizenTube stays ready (20 s from cold). */
    var KEEP_OPEN = /^(APLauncher\.|apl\.launcher\.|xvvl3S1bvH\.|vetrotvapp)/;
    var VIDEO_APPS = ["org.tizen.netflix-app", "org.tizen.primevideo", "HEPsqFNie0.tvplusstandalone"];   // their tile carries a different id
    function memoryLeft() {
        return APL.sys.exec("awk '/MemAvailable|SwapFree/{s+=$2} END{print s}' /proc/meminfo").then(function (r) { return parseInt(r.output, 10) || 0; });
    }
    APL.freeMemory = function () {
        return APL.sys.runningApps().then(function (ids) {
            var known = allApps.filter(function (a) { return !a.virtual; }).map(function (a) { return a.id; }).concat(VIDEO_APPS);   // not Samsung's YouTube: it comes back by itself within 25 s
            var open = ids.filter(function (id) { return known.indexOf(id) !== -1 && !KEEP_OPEN.test(id); });
            if (!open.length) { toast(APL.t("No apps to close"), true); return; }
            return memoryLeft().then(function (before) {
                var cmd = open.map(function (id) { return "app_launcher -k " + id + " >/dev/null 2>&1"; }).join("; ") + "; sleep 1";
                return APL.sys.exec(cmd).then(memoryLeft).then(function (after) {
                    var freed = Math.max(0, Math.round((after - before) / 1024));
                    toast(open.length > 1 ? APL.t("{n} apps closed: {mb} MB freed", { n: open.length, mb: freed }) : APL.t("{n} app closed: {mb} MB freed", { n: open.length, mb: freed }), true);
                });
            });
        }).catch(function (e) { toast(e.message); });
    };

    /* Once per full power-on: at start-up the system opens these apps by itself, and also the
       services turned off in Settings (they then stay closed, apart from a few). Tried on the M8:
       from 400 to 770 MB of available memory. The file in /tmp disappears on restart. It waits for the
       launcher to be in front, in the background: never an app that was just opened, and Home always responds. */
    var BOOT_CLOSE = VIDEO_APPS.concat(["MCmYXNxgcu.DisneyPlus", "com.samsung.tv.home.media", "com.samsung.tv.mycontents", "com.samsung.tv.quicklaunch",
                                        "org.tizen.browser", "com.samsung.tv.bixbycapsuleviewer", "org.tizen.art-app", "com.samsung.tv.aria-video",
                                        "com.samsung.tv.cobalt-yt"]);
    /* A command run once Vetro answers. Right after a full start Vetro needs up to 90 s, and the launcher can
       already be on screen a second after power-on (the screen's home app): the bridge then answers
       { ok: false } instead of failing, so that counts as "not yet" too. Tried every 15 s, `tries` times. */
    function whenVetro(cmd, tries, done) {
        APL.sys.exec(cmd).then(function (r) {
            if (r && r.ok === false) throw new Error(r.error || "Vetro not ready");
            if (done) done(true);
        }).catch(function () {
            if (tries > 0) setTimeout(function () { whenVetro(cmd, tries - 1, done); }, 15000);
            else if (done) done(false);
        });
    }

    var bootCleaned = false;
    function bootCleanup(tries) {
        if (bootCleaned || document.hidden || APL.sys.PREVIEW || !APL.sys.pref("bootCleanup")) return;
        bootCleaned = true;
        var frame = /LS03/i.test(APL.sys.product().model || "");      // The Frame: Art Mode needs art-app
        var ids = BOOT_CLOSE.filter(function (id) { return !(frame && id === "org.tizen.art-app"); })
                            .concat(Object.keys(APL.sys.pref("servicesCut") || {}));
        whenVetro("[ -f /tmp/apl-cleaned ] || { touch /tmp/apl-cleaned; (" + ids.map(function (id) {
            return "app_launcher -k " + id;
        }).join("; ") + ") >/dev/null 2>&1 & }; true", 0, function (ok) {
            if (ok) return;
            bootCleaned = false;
            // Again later, checking each time that the launcher is still in front (never an app just opened)
            if (tries > 0) setTimeout(function () { bootCleanup(tries - 1); }, 15000);
        });
    }

    /* The system repeats a key after 350 ms, and the remote only "releases" it after 250 to
       340 ms: on a busy screen, in every app, a short press sometimes counted twice.
       The setting is lost on restart: it is set again at every launch, as soon as Vetro answers. */
    function slowKeyRepeat(tries) {
        if (APL.sys.PREVIEW) return;
        whenVetro("enlightenment_info -key_repeat set 600 0 >/dev/null 2>&1; true", tries);
    }

    /* ---------- misc ---------- */
    /* info = secondary message, hidden when "Do Not Disturb" is on */
    function toast(msg, info) {
        if (info && APL.sys.pref("dnd")) return;
        dom.toast.textContent = msg;
        dom.toast.classList.add("is-visible");
        clearTimeout(toast._t);
        toast._t = setTimeout(function () { dom.toast.classList.remove("is-visible"); }, 2600);
    }

    /* Settings › General & Privacy › Clock Format: "12" (the default of this build, with AM/PM —
       ص/م in Arabic) or "24". The old "clock24" preference of the original project is not used
       any more, so a screen that still carries it shows 12 hours too. */
    function clockText(d) {
        var m = (d.getMinutes() < 10 ? "0" : "") + d.getMinutes();
        if (APL.sys.pref("clockFormat") === "24") {
            var h24 = d.getHours();
            return APL.digits((h24 < 10 ? "0" : "") + h24 + ":" + m);
        }
        var h = d.getHours(), h12 = (h % 12) || 12;
        var ampm = h < 12 ? (APL.lang === "ar" ? "ص" : "AM") : (APL.lang === "ar" ? "م" : "PM");
        return APL.digits(h12 + ":" + m) + " " + ampm;
    }
    /* v1.2.115: coming back to the Home Screen (from an app, HDMI, a page of the launcher) the prayer card, the
       task card and the weather are brought up to date at once. Before, they waited for their next tick (the
       shared timer made every job wait a full period after the launcher came back to the front). Only the jobs
       that are cheap and safe to run now are run (never the screen saver, wallpapers or Control Center jobs). */
    var lastRefreshHome = 0;
    /* v1.99.0 FIX: this function was called APL.refreshHome, but a second APL.refreshHome (reload of the app list,
       further down) replaced it, so on Home / coming back the prayer and task cards waited for their 15 s tick.
       It is now APL.refreshWidgets and every return path calls it: the cards are redrawn at once (< 1 s). */
    APL.refreshWidgets = function (force) {
        var now = Date.now();
        if (!force && now - lastRefreshHome < 250) return;
        try { if (APL.homeClock && APL.homeClock.update) APL.homeClock.update(); } catch (e) {}
        try { if (APL.hekamOnHome) APL.hekamOnHome(); } catch (e) {}      // v8.6.4: a new random wisdom each time the Home Screen comes back
        lastRefreshHome = now;
        try {
            if (APL.timers && APL.timers.runNow) { APL.timers.runNow("prayer-tick"); APL.timers.runNow("tasks-tick"); }
            var w = APL.weather;
            if (w && w.refresh && !(w.busy && w.busy())) {
                var cur = w.get && w.get();
                if (!cur || now - (cur.at || 0) > 300000) w.refresh();
            }
        } catch (e) {}
    };
    function startClock() {
        function tick() {
            // v1.2.50: the clock card (time, date, second clock) is drawn by js/home-clock.js
            if (APL.homeClock && APL.homeClock.update) { APL.homeClock.update(); return; }
            var text = clockText(new Date());
            if (dom.clock.textContent !== text) dom.clock.textContent = text;
        }
        tick();
        // v1.1.2: no clock work while another app is in front; one refresh on coming back
        APL.timers.every("clock", 10000, tick);          // v1.2.100: shared timer (js/timers.js); skipped while hidden
        document.addEventListener("visibilitychange", function () {
            if (document.hidden) return;
            tick();
            APL.refreshWidgets(true);
            setTimeout(function () { tick(); APL.refreshWidgets(true); }, 400);
            setTimeout(function () { tick(); APL.refreshWidgets(true); }, 1500);      // a second look once the screen has settled
        });
        window.addEventListener("focus", function () { if (!document.hidden) APL.refreshWidgets(true); });
        window.addEventListener("pageshow", function () { APL.refreshWidgets(true); });
        APL.sys.onPref("clockFormat", tick);
        APL.sys.onPref("clock24", tick);
    }

    function render() {
        var keep = nav && nav.index >= 0 ? apps[nav.index] && apps[nav.index].id : null;
        dropLayers();
        allApps.forEach(function (a) { if (a.folder && APL.folders.byId(a.folder)) a.tileHtml = APL.folders.tileHtml(APL.folders.byId(a.folder)); });
        // The Smart Hub tile starts hidden, once per profile: shown from Settings › Home Screen › Show on Home Screen
        if (!APL.sys.pref("smartHubTileSet")) {
            var hide = APL.sys.pref("hiddenApps").slice();
            if (hide.indexOf(SAMSUNG_HOME_TILE) === -1) hide.push(SAMSUNG_HOME_TILE);
            APL.sys.setPref("smartHubTileSet", true);
            APL.sys.setPref("hiddenApps", hide);
        }
        apps = allApps.filter(function (a) {
            if (APL.sys.pref("hiddenApps").indexOf(a.id) !== -1 || APL.folders.holding(a.id)) return false;
            return !a.folder || APL.folders.byId(a.folder);
        });
        /* The dock keeps the order the person chose; the rows below put the apps opened the most
           from APL first (launch-stats.js). Not while the Home Screen is being edited: there the
           app has to stay where it is dropped. */
        if (APL.stats && APL.sys.pref("statsOrder") !== false && !editing) {
            apps = APL.stats.smartOrder(apps, DOCK_SIZE);
        }
        dom.row0.innerHTML = "";
        dom.rows.innerHTML = "";
        tiles = apps.map(function (app, i) {
            var row = i < DOCK_SIZE ? 0 : 1 + Math.floor((i - DOCK_SIZE) / DOCK_SIZE);
            var t = makeTile(app, row);
            (row === 0 ? dom.row0 : dom.rows).appendChild(t);
            return t;
        });
        if (!nav) createNav();
        // Same app as before; if it has gone (deleted, hidden), the same position.
        var want = nav && nav.index >= 0 ? Math.min(nav.index, apps.length - 1) : homeIndex();
        for (var i = 0; i < apps.length; i++) if (apps[i].id === keep) want = i;
        bgActive.dataset.app = "";
        nav.setTiles(tiles);
        nav.focus(want);
    }

    /* v1.2.92: ▲/▼ held for more than a second in the grid jump two rows at a time instead of one (the rows have
       DOCK_SIZE icons each). A normal press, or a short hold, still moves one row: that is the Nav's own move. */
    var vStart = 0, vLast = 0;
    function fastRows(code) {
        var now = Date.now(), K = APL.KEY;
        if (now - vLast > 450) vStart = now;
        vLast = now;
        if (now - vStart < 1000 || !nav || nav.index < DOCK_SIZE) return false;
        var down = code === K.DOWN, t = nav.index + (down ? 2 : -2) * DOCK_SIZE;
        if (down && t > apps.length - 1) return false;
        if (!down && t < DOCK_SIZE) return false;
        nav.focus(t);
        return true;
    }

    /* v1.2.91: where the selection rests on the Home Screen: the middle icon of the first row (the dock). */
    function homeIndex() {
        var n = Math.min(DOCK_SIZE, apps.length);
        return n > 0 ? Math.floor(n / 2) : 0;
    }

    function homeAtRest() {
        function open(o, f) { try { return !!(o && o[f] && o[f]()); } catch (e) { return false; } }
        return !(editing || open(APL.settings, "isOpen") || open(APL.controlCenter, "isOpen") || open(APL.search, "isOpen") ||
            open(APL.sources, "isOpen") || open(APL.profilesUI, "isOpen") || open(APL.prayerPage, "isOpen") || open(APL.quranAudio, "isOpen") ||
            open(APL.tasksPage, "isOpen") || open(APL.backup, "isOpen") || open(APL.contextMenu, "isOpen") ||
            open(APL.switcher, "isOpen") || open(APL.screensaver, "isActive"));
    }

    /* Coming back to the launcher after an app: the remote is already on the middle icon of the first row. */
    function focusHomeRest() {
        if (!nav || !apps.length || !homeAtRest()) return;
        try { if (APL.widgets && APL.widgets.leaveCards) APL.widgets.leaveCards(); } catch (e) {}
        if (mode === "full") setMode("shelf");
        var mid = homeIndex();
        if (nav.index !== mid) nav.focus(mid);
    }

    function createNav() {
        var K = APL.KEY;
        nav = new APL.Nav({
            onFocus: onFocus,
            onSelect: function (i) { launch(i); },
            onLongPress: function (i, el) { if (!editing) openAppMenu(i, el); },
            // The tile reacts as soon as it's pressed: the remote's delay no longer shows
            onHoldStart: function (i) { if (tiles[i]) tiles[i].classList.add("is-pressed"); },
            onHoldCancel: function (i) { if (tiles[i]) tiles[i].classList.remove("is-pressed"); },
            onEdge: function (dir) {
                // ▲ from the dock: the "Continue Watching" cards if the app has any…
                if (dir === "up" && mode === "shelf" && APL.widgets && (!APL.lightMode || APL.lightMode.cards()) && APL.widgets.focusCards()) return;
                // … otherwise full screen (only if the app has artwork)
                var a = apps[nav.index];
                if (dir === "up" && mode === "shelf") {
                    if (a.bg || (APL.live && APL.live.hasSource(a))) setMode("full");
                    else if (APL.search) APL.search.open();      // v1.2.114: no artwork to show full screen -> straight to Search (it was unreachable here)
                }
                // ▼ from the dock: transition into the grid (lift curtain)
                if (dir === "down" && mode === "shelf" && apps.length > DOCK_SIZE) {
                    var target = Math.min(nav.index + DOCK_SIZE, apps.length - 1);
                    nav.focus(target);
                }
            },
            onKey: function (code) {
                if (editing) return editKey(code);
                if (mode === "grid" && (code === K.UP || code === K.DOWN) && fastRows(code)) return true;
                if (mode !== "full") return false;
                // In full screen: ◀ ▶ change app, ▼ / Back return, OK opens, ▲ Search (search.js).
                if (code === K.DOWN || code === K.RETURN || code === K.ESC || code === K.BACKSPACE) { setMode("shelf"); return true; }
                if (code === K.UP) { if (APL.search) APL.search.open(); return true; }
                return false;
            },
            onBack: function () {
                // Already on the resting tile (middle of the first row): stay there. Exiting left a black screen.
                var h = homeIndex();
                if (nav.index !== h) { nav.focus(h); }
            }
        });
        nav.attach();
    }

    function asset(p) { return global.APL_ASSET ? global.APL_ASSET(p) : p; }

    function openVlc() {
        if (!global.tizen || !global.tizen.application || !global.tizen.application.getAppsInfo) {
            toast("VLC can be opened on the TV only");
            return;
        }
        try {
            global.tizen.application.getAppsInfo(function (list) {
                var hit = null;
                for (var i = 0; i < list.length; i++) {
                    if (/\bvlc\b/i.test(String(list[i].name || "")) || /\bvlc\b/i.test(String(list[i].id || ""))) { hit = list[i]; break; }
                }
                if (!hit) { toast("VLC is not installed on this TV"); return; }
                showVeil();
                APL.launchApp(hit.id).catch(function (e) { hideVeil(); toast((e && e.message) || "Couldn't open VLC"); });
            }, function () { toast("Couldn't check VLC installation"); });
        } catch (e) { toast("Couldn't check VLC installation"); }
    }

    /* Apps built into the launcher, like Settings on Apple TV. */
    function virtualApps() {
        return [
            // TizenTube: its own tile, without going through TizenBrew's screen
            { id: "apl.tizentube", name: "TizenTube", virtual: true, needs: "xvvl3S1bvH.TizenBrewStandalone", accent: "#1fb6e6", eyebrow: "VIDÉO",
              tile: APL.TIZENTUBE_ART.tile, live: "youtube",
              run: function () { showVeil(); launchTube(null); } },
            { id: "apl.vlc", name: "VLC", virtual: true, accent: "#ff8800", eyebrow: "MEDIA PLAYER",
              tileHtml: '<div class="vtile vtile--vlc"><svg class="vlc-cone" viewBox="0 0 100 100" aria-hidden="true"><path d="M50 9 20 83h60L50 9Z" fill="#ff8800" stroke="#fff" stroke-width="3"/><path d="M41 31h18l4 10H37l4-10Zm-9 22h36l4 10H28l4-10Zm-12 30h60v10H20z" fill="#fff" opacity=".94"/><path d="M26 93h48c0 5-11 8-24 8s-24-3-24-8Z" fill="#d86700"/></svg></div>',
              shelfHtml: '<div class="brandcard__glyph vtile--vlc"><svg class="vlc-cone vlc-cone--large" viewBox="0 0 100 100" aria-hidden="true"><path d="M50 9 20 83h60L50 9Z" fill="#ff8800" stroke="#fff" stroke-width="3"/><path d="M41 31h18l4 10H37l4-10Zm-9 22h36l4 10H28l4-10Zm-12 30h60v10H20l4-10Z" fill="#fff" opacity=".94"/><path d="M26 93h48c0 5-11 8-24 8s-24-3-24-8Z" fill="#d86700"/></svg></div>',
              run: openVlc },
            // Apple's Settings icon (images/apps/settings-*, made by tools/art)
            { id: "apl.settings", name: APL.t("Settings"), virtual: true, accent: "#8e8e93", eyebrow: "SYSTÈME",
              tile: asset("images/apps/settings-tile.png"),
              run: function () { APL.settings.open(); } },
            /* Prayer and Quran (this build): times, alerts, the radio and the black screen */
            { id: "apl.prayer", name: APL.t("Prayer and Quran"), virtual: true, accent: "#0f8a5f", eyebrow: APL.t("SYSTEM"),
              tileHtml: '<div class="vtile vtile--prayer">' + (APL.prayerArt ? APL.prayerArt(112) : '<span class="vtile__glyph">🕌</span>') + '</div>',
              shelfHtml: '<div class="brandcard__glyph vtile--prayer">' + (APL.prayerArt ? APL.prayerArt(190) : '<span class="vtile__glyph">🕌</span>') + '</div>',
              run: function () { if (APL.prayerPage) APL.prayerPage.open(); } },
            /* Online Quran Listening Widget/Page matching image-1.png */
            { id: "apl.quran.audio", name: APL.lang === "ar" ? "استماع القرآن" : "Listen Quran", virtual: true, accent: "#0d9488", eyebrow: APL.t("SYSTEM"),
              tileHtml: '<div class="vtile vtile--quran-audio"><span class="vtile__glyph">🎧</span></div>',
              shelfHtml: '<div class="brandcard__glyph vtile--quran-audio"><span class="vtile__glyph">🎧</span></div>',
              run: function () { if (APL.quranAudio) APL.quranAudio.open(); } },

            /* Tasks (this build): schedule tasks inside the launcher + live next-task countdown */
            { id: "apl.tasks", name: APL.t("Tasks"), virtual: true, accent: "#2563eb", eyebrow: APL.t("SYSTEM"),
              tileHtml: '<div class="vtile vtile--tasks"><span class="vtile__glyph">📋</span></div>',
              shelfHtml: '<div class="brandcard__glyph vtile--tasks"><span class="vtile__glyph">📋</span></div>',
              run: function () { if (APL.tasksPage) APL.tasksPage.open(); } },
            { id: "apl.backup", name: APL.t("Save Settings and App Order"), virtual: true, accent: "#8e8e93", eyebrow: APL.t("SYSTEM"),
              tileHtml: '<div class="vtile vtile--backup"><span class="vtile__glyph">⤓</span></div>',
              shelfHtml: '<div class="brandcard__glyph vtile--backup"><span class="vtile__glyph">⤓</span></div>',
              run: function () { if (APL.backup) APL.backup.open(); } },
            { id: "apl.sources", name: "Sources", virtual: true, accent: "#2c5cc5", eyebrow: "SYSTÈME",
              tileHtml: '<div class="vtile vtile--sources">' + APL.icon("source", 92, 1.6) + '</div>',
              shelfHtml: '<div class="brandcard__glyph vtile--sources">' + APL.icon("source", 180, 1.3) + '</div>',
              run: function () { APL.openSources(); } },
            // Samsung's own home: the way out now that Vetro keeps the Home key for the launcher.
            // Hidden like any app (Settings › Home Screen › Show on Home Screen, or hold OK › Hide App).
            { id: SAMSUNG_HOME_TILE, name: "Smart Hub", virtual: true, accent: "#1428a0", eyebrow: "SYSTÈME",
              tileHtml: '<div class="vtile vtile--samsunghome">' + APL.icon("apps", 92, 1.6) + '</div>',
              shelfHtml: '<div class="brandcard__glyph vtile--samsunghome">' + APL.icon("apps", 180, 1.3) + '</div>',
              run: openSamsungHome }
        ];
    }

    /* Samsung's home ignores a plain app-control launch (Vetro's dock found the same): the platform's
       own app_launcher, as root through Vetro, shows it. The overlay is told first, or it would put the
       launcher back over it within a second ("Return to the Launcher"). */
    var SAMSUNG_HOME_TILE = "apl.samsunghome";
    function openSamsungHome() {
        if (APL.sys.PREVIEW) { toast(APL.t("Opens Samsung's Smart Hub on the screen")); return; }
        // The overlay opens it itself (it reaches Vetro on its own, without the bridge) and then
        // leaves it on screen; without the overlay, the launcher asks Vetro.
        if (APL.overlay && APL.overlay.isInstalled() && APL.overlay.openSamsungHome) { APL.overlay.openSamsungHome(); return; }
        if (APL.sys.vetroPost) {
            APL.sys.vetroPost("/exec", { cmd: "/usr/bin/app_launcher -s com.samsung.tv.csfs >/dev/null 2>&1 &" })
                .catch(function () {
                    try {
                        if (global.tizen && global.tizen.application) {
                            global.tizen.application.launch("com.samsung.tv.csfs");
                        }
                    } catch (e) {}
                });
            return;
        }
        try {
            if (global.tizen && global.tizen.application) {
                global.tizen.application.launch("com.samsung.tv.csfs");
            }
        } catch (e) {}
    }

    /* The catalogue is in flight while the dock is already up: the poster of the app in
       focus replaces its artwork as soon as it lands, and turning the setting off puts
       the artwork back without a restart. */
    /* The catalogue is a fallback, and it costs two requests: nothing is fetched
       until Dynamic Backdrops is turned on. A boot with the setting off (the
       default) must not reach JustWatch at all. Turning it on loads the list and
       paints the app in focus; turning it off puts that app's own artwork and
       its Top Shelf straight back, without a restart. */
    function startBackdrops() {
        if (!APL.appArt || !APL.appArt.start) return;
        APL.sys.onPref("cleanFrameBackdrops", function (v) {
            dropLayers();
            if (v) {
                APL.appArt.start(function () {
                    var app = apps[nav.index];
                    if (app && mode !== "grid") setBackdrop(app, true);
                });
                return;
            }
            var app = apps[lastFocus];
            if (!app || mode === "grid") return;
            setBackdrop(app, true);                              // the app's artwork, not a poster
            startLive(app);                                      // its own shelf, straight away
        });
        if (APL.sys.pref("cleanFrameBackdrops") !== true) return;
        APL.appArt.start(function () {
            var app = apps[nav.index];
            if (app && mode !== "grid") setBackdrop(app);
        });
    }

    function boot() {
        cacheDom();
        dom.hint.querySelector(".hint__text").textContent = APL.t("Press ▲ for full screen");   // index.html only has the English text
        startClock();
        APL.sys.registerKeys();
        document.body.classList.toggle("reduce-motion", !!APL.sys.pref("reduceMotion"));
        APL.sys.onPref("reduceMotion", function (v) { document.body.classList.toggle("reduce-motion", !!v); });
        applyPerf();
        APL.sys.onPref("visualEffects", applyPerf);
        APL.sys.onPref("richFx", applyPerf);
        document.body.classList.toggle("no-focus-fx", APL.sys.pref("focusFx") === false);
        APL.sys.onPref("focusFx", function (v) { document.body.classList.toggle("no-focus-fx", v === false); });
        applyTheme();
        APL.sys.onPref("appearance", applyTheme);
        APL.sys.onPref("appsPerRow", function () { sizes(); render(); layout(); });
        APL.sys.profiles.onChange(applyTheme);
        APL.timers.every("theme", 60000, applyTheme);   // v1.2.100: shared timer; skipped while hidden
        document.addEventListener("visibilitychange", function () { if (!document.hidden) applyTheme(); });
        APL.loadApps().then(function (list) {
            buildList(list);
            watchPackages();
            setTimeout(preloadDock, 400);
            // Then a background search for missing artwork (new apps included)
            setTimeout(function () { if (APL.autoArt && (!APL.lightMode || APL.lightMode.autoArt())) APL.autoArt.run(allApps, render); }, 3500);
            showCcHint();
            render();
            startBackdrops();
            if (APL.overlay) APL.overlay.start();
            slowKeyRepeat(8);
            setTimeout(function () { bootCleanup(8); }, 25000);
            global.APL_BOOT_OK = true;          // the version (installed or updated) starts fine
            try { global.APL_READY_MS = Math.round(global.performance.now()); } catch (e) {}   // v1.2.101: for the Error Report
            /* v8.7.16: the last 5 start-up times (load = the code is in, ready = the Home Screen is up), shown in Settings > Performance */
            try {
                var bl = JSON.parse(global.localStorage.getItem("apl.bootlog") || "[]");
                if (!Array.isArray(bl)) bl = [];
                bl.push({ v: (global.APL_BUILD && global.APL_BUILD.version) || "", load: global.APL_BOOT_MS || 0, ready: global.APL_READY_MS || 0 });
                while (bl.length > 5) bl.shift();
                global.localStorage.setItem("apl.bootlog", JSON.stringify(bl));
            } catch (eBl) {}
            if (requestedAction()) runAction(requestedAction());   // opened for a specific reason: TizenTube, App Switcher…
            setTimeout(function () { dom.boot.classList.add("is-hidden"); }, 120);
        });
    }

    /* Full list: the dock (your apps, Settings, Sources), then your websites,
       Vetro, App Store, Samsung TV Plus and the rest in alphabetical order. */
    var virtuals = null;
    function buildList(list) {
        var favs = list.filter(function (a) { return a.favorite; });
        var FIRST = ["Vetro", "App Store", "Samsung TV Plus"];
        var rank = function (a) { if (a.web) return -1; var i = FIRST.indexOf(a.name); return i === -1 ? 99 : i; };
        var rest = list.filter(function (a) { return !a.favorite; }).concat(APL.webApps ? APL.webApps() : []).sort(function (a, b) {
            return rank(a) - rank(b) || a.name.localeCompare(b.name, APL.locale, { sensitivity: "base" });
        });
        virtuals = virtuals || virtualApps();
        var usable = virtuals.filter(function (v) { return !v.needs || list.some(function (a) { return a.id === v.needs; }); })
            .concat(APL.sources ? APL.sources.homeTiles() : []);              // inputs pinned to the Home Screen
        var tube = usable.filter(function (v) { return v.id === "apl.tizentube"; });
        /* Samsung services brought back from Settings › Apps › System Components: shown like apps,
           at the end, until they are hidden again. */
        var shown = APL.sys.pref("shownSystemApps") || [];
        var back = (APL.systemApps ? APL.systemApps() : []).filter(function (a) { return shown.indexOf(a.id) !== -1; });
        defaultOrder = tube.concat(favs, usable.filter(function (v) { return tube.indexOf(v) === -1; }), rest, back, APL.folders.all().map(APL.folders.asApp));
        allApps = applySavedOrder(defaultOrder);
        // Artwork already found automatically (kept on the screen): right away
        if (APL.autoArt) APL.autoArt.applyCached(allApps);
    }

    /* An app installed, updated or deleted (by APL Launcher Setup, the App Store…):
       the grid updates by itself, without restarting the launcher. */
    var pkgTimer = null;
    function watchPackages() {
        var pm = global.tizen && global.tizen.package;
        if (!pm || typeof pm.setPackageInfoEventListener !== "function") return;
        function again() {
            clearTimeout(pkgTimer);
            pkgTimer = setTimeout(function () {
                APL.loadApps().then(function (list) {
                    var focused = apps[nav.index] && apps[nav.index].id;
                    buildList(list);
                    render();
                    for (var i = 0; i < apps.length; i++) if (apps[i].id === focused) { nav.focus(i); break; }
                    if (APL.autoArt && (!APL.lightMode || APL.lightMode.autoArt())) setTimeout(function () { APL.autoArt.run(allApps, render); }, 1500);
                });
            }, 1500);
        }
        try { pm.setPackageInfoEventListener({ oninstalled: again, onupdated: again, onuninstalled: again }); } catch (e) {}
    }

    /* ---------- chosen layout (Edit Home Screen) ---------- */
    var defaultOrder = [];
    function applySavedOrder(list) {
        var saved = APL.sys.pref("appOrder") || [];
        if (!saved.length) return list.slice();
        var pos = {};
        saved.forEach(function (id, i) { pos[id] = i; });
        // A layout from before these tiles: TizenTube first, Overscan in place of Internet
        if (!("apl.tizentube" in pos)) pos["apl.tizentube"] = -1;
        var browser = saved.indexOf("org.tizen.browser");
        if (browser !== -1 && !("org.apps2samsung.overscan" in pos)) pos["org.apps2samsung.overscan"] = browser;
        // Only once: AquaPlay moves up into the dock (its widgets show there) in place of TizenBrew,
        // which the TizenTube tile replaces
        var AQUA = "AquaPlay02.AquaPlay", BREW = "xvvl3S1bvH.TizenBrewStandalone", moved = false;
        if (!APL.sys.pref("aquaInDock") && BREW in pos && list.some(function (a) { return a.id === AQUA; })) {
            var brewAt = pos[BREW];
            pos[BREW] = AQUA in pos ? pos[AQUA] : 100000;
            pos[AQUA] = brewAt;
            moved = true;
        }
        // Only once: Stremio moves up into the dock, after AquaPlay (its widgets only show there)
        var STREMIO = "IkWsFHtOY9.Stremio", moveStremio = !APL.sys.pref("stremioInDock") && list.some(function (a) { return a.id === STREMIO; });
        if (moveStremio) pos[STREMIO] = (AQUA in pos ? pos[AQUA] : 0) + 0.5;
        // Known apps in their place; new apps at the end, as on tvOS.
        var ordered = list.map(function (a, i) { return { a: a, k: (a.id in pos) ? pos[a.id] : 100000 + i }; })
                          .sort(function (x, y) { return x.k - y.k; })
                          .map(function (x) { return x.a; });
        if (moved || moveStremio) APL.sys.setPref("appOrder", ordered.map(function (a) { return a.id; }));
        if (moved) APL.sys.setPref("aquaInDock", true);
        if (moveStremio) APL.sys.setPref("stremioInDock", true);
        return ordered;
    }
    function saveOrder() { APL.sys.setPref("appOrder", allApps.map(function (a) { return a.id; })); }

    /* ---------- Custom App Icons (choose from launcher or USB/storage) ---------- */
    var LAUNCHER_TILES = [
        "images/apps/prayer-tile.png",
        "images/apps/prayer-tile-mosque.png",
        "images/apps/topcinema-tile.png",
        "images/apps/netflix-tile.png",
        "images/apps/youtube-tile.png",
        "images/apps/primevideo-tile.png",
        "images/apps/disneyplus-tile.png",
        "images/apps/crunchyroll-tile.png",
        "images/apps/spotify-tile.png",
        "images/apps/twitch-tile.png",
        "images/apps/plex-tile.png",
        "images/apps/kodi-tile.png",
        "images/apps/stremio-tile.png",
        "images/apps/beinsports-tile.png",
        "images/apps/xbox-tile.png",
        "images/apps/steam-tile.png",
        "images/apps/moonlight-tile.png",
        "images/apps/jellyfin-tile.png",
        "images/apps/emby-tile.png",
        "images/apps/appletv-tile.png",
        "images/apps/settings-tile.png",
        "images/apps/tiktok-tile.png",
        "images/apps/smartthings-tile.png",
        "images/apps/samsungtvplus-tile.png",
        "images/apps/deezer-tile.png",
        "images/apps/tidal-tile.png",
        "images/apps/movix-tile.png",
        "images/apps/nuvio-tile.png",
        "images/apps/paramountplus-tile.png",
        "images/apps/hbomax-tile.png",
        "images/apps/canalplus-tile.png",
        "images/apps/tf1plus-tile.png",
        "images/apps/m6plus-tile.png",
        "images/apps/arte-tile.png",
        "images/apps/rakutentv-tile.png",
        "images/apps/vimeo-tile.png",
        "images/apps/dazn-tile.png",
        "images/apps/eurosport-tile.png",
        "images/apps/franime-tile.png",
        "images/apps/geforcenow-tile.png",
        "images/apps/jiohotstar-tile.png",
        "images/apps/lequipe-tile.png",
        "images/apps/ligue1-tile.png",
        "images/apps/luna-tile.png",
        "images/apps/microsoft365-tile.png",
        "images/apps/mubi-tile.png",
        "images/apps/plutotv-tile.png",
        "images/apps/qobuz-tile.png",
        "images/apps/rmcsport-tile.png",
        "images/apps/sonyliv-tile.png",
        "images/apps/vetro-tile.png",
        "images/apps/youtubekids-tile.png",
        "images/apps/youtubemusic-tile.png",
        "images/apps/zoom-tile.png",
        "images/tile-hotiptv.png",
        "images/tile-internet.png",
        "images/tile-tizenbrew.png",
        "images/tile-tizentube.png",
        "images/devices/ps5-tile.png",
        "images/devices/ps4-tile.png",
        "images/devices/xbox-tile.png",
        "images/devices/switch-tile.png",
        "images/devices/switch2-tile.png",
        "images/devices/pc-tile.png",
        "images/devices/mac-tile.png",
        "images/devices/steamdeck-tile.png",
        "images/devices/shield-tile.png",
        "images/devices/appletv-tile.png",
        "images/devices/chromecast-tile.png",
        "images/devices/firetv-tile.png"
    ];

    function getCustomIcons() {
        try { return JSON.parse(global.localStorage.getItem("apl.customIcons") || "{}") || {}; } catch (e) { return {}; }
    }
    function setCustomIcon(id, val) {
        var map = getCustomIcons();
        if (val) map[id] = val; else delete map[id];
        try { global.localStorage.setItem("apl.customIcons", JSON.stringify(map)); } catch (e) {}
    }
    function resetAppIcon(app) {
        setCustomIcon(app.id, null);
        delete app.customTile;
        APL.refreshHome();
        toast(APL.t("Icon reset"), true);
    }

    function chooseAppIcon(app) {
        var hasCustom = !!getCustomIcons()[app.id];
        var btns = [
            { label: APL.t("Choose from Launcher Icons"), run: function () { pickLauncherTile(app); } },
            { label: APL.t("Choose from USB / Storage"), run: function () { pickUsbImage(app); } }
        ];
        if (hasCustom) {
            btns.push({ label: APL.t("Reset Icon"), destructive: true, run: function () { resetAppIcon(app); } });
        }
        btns.push({ label: APL.t("Cancel") });
        APL.alert({
            title: APL.t("Change Icon"),
            message: app.name,
            buttons: btns,
            focus: 0
        });
    }

    function pickUsbImage(app) {
        var inp = document.createElement("input");
        inp.type = "file";
        inp.accept = "image/*";
        inp.style.display = "none";
        document.body.appendChild(inp);
        inp.onchange = function () {
            var file = inp.files && inp.files[0];
            if (!file) { if (inp.parentNode) inp.parentNode.removeChild(inp); return; }
            var reader = new FileReader();
            reader.onload = function (ev) {
                var img = new Image();
                img.onload = function () {
                    try {
                        var cvs = document.createElement("canvas");
                        cvs.width = 400; cvs.height = 225;
                        var ctx = cvs.getContext("2d");
                        ctx.fillStyle = "#11141c";
                        ctx.fillRect(0, 0, 400, 225);
                        var scale = Math.max(400 / img.width, 225 / img.height);
                        var x = (400 - img.width * scale) / 2;
                        var y = (225 - img.height * scale) / 2;
                        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
                        var url = cvs.toDataURL("image/webp", 0.92);
                        if (!url || url.length < 50) url = cvs.toDataURL("image/png");
                        setCustomIcon(app.id, url);
                        app.tile = url;
                        app.customTile = true;
                        delete app.tileHtml;
                        APL.refreshHome();
                        toast(APL.t("Icon updated"), true);
                    } catch (e) {
                        toast(APL.t("Couldn't read the image"));
                    }
                    if (inp.parentNode) inp.parentNode.removeChild(inp);
                };
                img.onerror = function () {
                    toast(APL.t("Couldn't read the image"));
                    if (inp.parentNode) inp.parentNode.removeChild(inp);
                };
                img.src = ev.target.result;
            };
            reader.readAsDataURL(file);
        };
        inp.click();
    }

    function pickLauncherTile(app) {
        var box = document.createElement("div");
        box.className = "apicker apl-tilepicker";
        box.innerHTML = '<h2 class="apicker__title">' + APL.t("Choose Icon") + '</h2>' +
            '<div class="apicker__scroll"><div class="apicker__grid apl-tilepicker__grid"></div></div>' +
            '<p style="margin:20px 0 28px;font-size:20px;color:rgba(255,255,255,0.6);">' + APL.t("OK to choose · Back to cancel") + '</p>';
        var g = box.querySelector(".apicker__grid"), tileEls = [];
        LAUNCHER_TILES.forEach(function (path) {
            var t = document.createElement("div");
            t.className = "apicker__item apl-tilepicker__item";
            t.style.background = "#11141c center / cover no-repeat url('" + path + "')";
            t.style.width = "180px";
            t.style.height = "102px";
            t.style.borderRadius = "16px";
            t._path = path;
            g.appendChild(t);
            tileEls.push(t);
        });
        document.body.appendChild(box);
        var ROW = 126;
        var pickNav = new APL.Nav({
            onFocus: function (i, t) {
                g.style.transform = "translateY(" + (-Math.max(0, Math.round(t.offsetTop / ROW) - 2) * ROW) + "px)";
            },
            onSelect: function (i, t) {
                setCustomIcon(app.id, t._path);
                app.tile = t._path;
                app.customTile = true;
                delete app.tileHtml;
                done();
                APL.refreshHome();
                toast(APL.t("Icon updated"), true);
            },
            onBack: done
        });
        function done() {
            APL.popNav(pickNav);
            if (box.parentNode) box.parentNode.removeChild(box);
        }
        pickNav.setTiles(tileEls);
        pickNav.focus(0);
        APL.pushNav(pickNav);
    }

    /* ---------- "hold OK" menu (as on tvOS) ---------- */
    var PROTECTED = /^(vetrotvapp|APLauncher\.|xvvl3S1bvH\.|com\.samsung\.|org\.tizen\.|samsung\.)/i;   // xvvl3S1bvH: TizenBrew

    function openAppMenu(i, el) {
        var app = apps[i];
        if (!app) return;
        var anchor = el.querySelector(".tile__card") || el;
        var items = [{ label: APL.t("Edit Home Screen"), icon: "grid", run: function () { startEdit(app.id); } }];
        if (app.folder) {
            items.unshift({ label: APL.t("Rename"), icon: "grid", run: function () { APL.folders.askName(app.folder); } });
            items.push({ label: APL.t("Delete Folder"), icon: "trash", destructive: true, run: function () {
                APL.folders.destroy(app.folder);
                APL.foldersChanged();
                toast(APL.t("Folder deleted: its apps are back on the Home Screen"), true);
            } });
            APL.contextMenu.open(anchor, items);
            return;
        }
        items.push({ label: APL.t("Move to Folder"), icon: "grid", run: function () { chooseFolder(app, anchor); } });
        items.push({ label: APL.t("Change Icon"), icon: "photo", run: function () { chooseAppIcon(app); } });
        if (getCustomIcons()[app.id]) {
            items.push({ label: APL.t("Reset Icon"), icon: "trash", run: function () { resetAppIcon(app); } });
        }
        if (app.id !== "apl.settings") {
            items.push({ label: APL.t("Hide App"), icon: "eyeOff", run: function () { hideApp(app); } });
        }
        if (!app.virtual && !PROTECTED.test(app.id)) {
            items.push({ label: APL.t("Delete App"), icon: "trash", destructive: true, run: function () { confirmDelete(app); } });
        }
        APL.contextMenu.open(el.querySelector(".tile__card") || el, items);
    }

    function chooseFolder(app, anchor) {
        var items = APL.folders.all().map(function (f) {
            return { label: f.name, icon: "grid", run: function () { APL.folders.addTo(f.id, app.id); APL.foldersChanged(); toast(APL.t("“{app}” is in “{folder}”", { app: app.name, folder: f.name }), true); } };
        });
        items.push({ label: APL.t("New Folder"), icon: "grid", run: function () {
            var at = allApps.indexOf(app), f = APL.folders.create(app.id);
            allApps.splice(at, 0, APL.folders.asApp(f));
            APL.foldersChanged();
            toast(APL.t("“{name}” created: hold OK on it to rename it", { name: f.name }), true);
        } });
        APL.contextMenu.open(anchor, items);
    }

    /* After a folder change: the Home Screen follows, and the layout is kept. */
    APL.foldersChanged = function () {
        allApps = allApps.filter(function (a) { return !a.folder || APL.folders.byId(a.folder); });
        saveOrder();
        render();
    };

    /* Open an app as the Home Screen knows it (folder, App Switcher…). */
    APL.openApp = function (app) {
        if (app.virtual) { app.run(); return; }
        APL.sys.profiles.noteLaunch(app.id);
        showVeil();
        APL.launchApp(app.id).catch(function (err) { hideVeil(); toast(err.message || APL.t("Couldn't open the app")); });
    };
    APL.makeTile = makeTile;

    function hideApp(app) {
        var hidden = APL.sys.pref("hiddenApps").slice();
        if (hidden.indexOf(app.id) === -1) hidden.push(app.id);
        APL.sys.setPref("hiddenApps", hidden);
        render();
        toast(APL.t("“{name}” is hidden — Settings › Apps to show it again", { name: app.name }));
    }

    function confirmDelete(app) {
        APL.alert({
            title: APL.t("Delete “{name}”?", { name: app.name }),
            message: APL.t("The app and its data will be deleted from the screen. You can reinstall it from the App Store."),
            buttons: [
                { label: APL.t("Delete"), destructive: true, run: function () { deleteApp(app); } },
                { label: APL.t("Cancel") }
            ],
            focus: 1                       // "Cancel" by default: no deleting by mistake
        });
    }

    function dropApp(id) {
        allApps = allApps.filter(function (a) { return a.id !== id; });
        saveOrder();
        render();
    }

    /* Deletion through Vetro (it refuses system and protected apps), then
       a real check in the list of installed apps. */
    function deleteApp(app) {
        if (APL.sys.PREVIEW) { dropApp(app.id); toast(APL.t("“{name}” was deleted (preview)", { name: app.name })); return; }
        toast(APL.t("Deleting “{name}”…", { name: app.name }));
        APL.sys.vetroPost("/components/action", { appId: app.id, action: "uninstall" }).catch(function () {});
        var tries = 0;
        (function check() {
            setTimeout(function () {
                APL.isInstalled(app.id).then(function (still) {
                    if (!still) { dropApp(app.id); toast(APL.t("“{name}” was deleted", { name: app.name })); return; }
                    if (++tries < 8) { check(); return; }
                    toast(APL.t("Couldn't delete “{name}” (system app, or Vetro stopped). You can hide it.", { name: app.name }));
                });
            }, 2500);
        })();
    }

    /* ---------- Edit Home Screen: the app jiggles, the arrows move it ---------- */
    var editing = null;

    function markMoving() {
        tiles.forEach(function (t, k) { t.classList.toggle("is-moving", !!editing && apps[k].id === editing); });
    }

    function startEdit(id) {
        editing = id;
        document.body.classList.add("is-editing");
        markMoving();
        toast(APL.t("Move the app with the arrows, then press OK"), true);
    }

    function endEdit() {
        editing = null;
        document.body.classList.remove("is-editing");
        markMoving();
        saveOrder();
    }

    function editKey(code) {
        var K = APL.KEY;
        if (code === K.ENTER || code === K.RETURN || code === K.ESC || code === K.BACKSPACE) {
            endEdit();
            if (APL.sound) APL.sound.select();
            return true;
        }
        var step = { 37: -1, 39: 1, 38: -6, 40: 6 }[code];
        if (!step) return true;                        // other keys ignored while editing
        var i = -1;
        for (var k = 0; k < apps.length; k++) if (apps[k].id === editing) i = k;
        var j = i + step;
        if (code === K.DOWN && j >= apps.length && i < apps.length - 1) j = apps.length - 1;
        if (i < 0 || j < 0 || j >= apps.length) { if (APL.sound) APL.sound.edge(); return true; }
        var visible = apps.slice();
        visible.splice(j, 0, visible.splice(i, 1)[0]);
        var hidden = allApps.filter(function (a) { return visible.indexOf(a) === -1; });
        allApps = visible.concat(hidden);
        render();
        markMoving();
        if (APL.sound) APL.sound.tick();
        return true;
    }

    /* Home button: closes whatever is open and goes back to the 1st app.
       Returns false if already on the Home Screen (2nd press = Control Center). */
    APL.goHome = function () {
        var closed = false;
        if (APL.refreshWidgets) { APL.refreshWidgets(true); setTimeout(function () { APL.refreshWidgets(true); }, 150); setTimeout(function () { APL.refreshWidgets(true); }, 700); }        // v1.99.0: at once, not after 60 ms through the wrong function
        if (APL.screensaver && APL.screensaver.isActive()) { APL.screensaver.stop(); closed = true; }
        if (APL.alert && APL.alert.isOpen && APL.alert.isOpen()) { APL.alert.close(); closed = true; }
        if (APL.contextMenu && APL.contextMenu.isOpen()) { APL.contextMenu.close(); closed = true; }
        if (APL.prayerPage && APL.prayerPage.isOpen()) { APL.prayerPage.close(); closed = true; }
        if (APL.quranAudio && APL.quranAudio.isOpen()) { APL.quranAudio.close(); closed = true; }
        if (APL.tasksPage && APL.tasksPage.isOpen()) { APL.tasksPage.close(); closed = true; }
        if (APL.backup && APL.backup.isOpen()) { APL.backup.close(); closed = true; }
        if (APL.prayerPage && APL.prayerPage.isBlackout && APL.prayerPage.isBlackout()) { APL.prayerPage.leaveBlackout(); closed = true; }
        if (APL.sources && APL.sources.isOpen()) { APL.sources.close(); closed = true; }
        if (APL.search && APL.search.isOpen()) { APL.search.close(); closed = true; }
        if (APL.profilesUI && APL.profilesUI.isOpen()) { APL.profilesUI.close(); closed = true; }
        if (APL.settings && APL.settings.isOpen()) { APL.settings.close(); closed = true; }
        if (APL.controlCenter && APL.controlCenter.isOpen()) { APL.controlCenter.close(); closed = true; }
        if (APL.widgets && APL.widgets.leaveCards()) closed = true;
        if (editing) { endEdit(); closed = true; }
        if (mode === "full") { setMode("shelf"); closed = true; }
        if (nav && apps.length && nav.index !== homeIndex()) { nav.focus(homeIndex()); closed = true; }
        return closed;
    };

    /* Open an app from elsewhere (a profile's recent apps) */
    APL.launchById = function (id) {
        for (var i = 0; i < apps.length; i++) if (apps[i].id === id) { nav.focus(i); launch(i); return; }
        APL.sys.profiles.noteLaunch(id);
        APL.launchApp(id).catch(function (err) { toast(err.message || APL.t("Couldn't open the app")); });
    };

    /* Profile change: its layout and its hidden apps */
    APL.sys.profiles.onChange(function () {
        if (!defaultOrder.length) return;
        var keep = allApps;
        allApps = applySavedOrder(defaultOrder.filter(function (d) { return keep.indexOf(d) !== -1; }));
        nav.index = -1;                       // v1.2.91: back to the middle of the first row
        render();
    });

    /* The list again, the focus kept: an input pinned or unpinned in Sources. */
    APL.refreshHome = function () {
        APL.loadApps().then(function (list) {
            var focused = apps[nav.index] && apps[nav.index].id;
            buildList(list);
            render();
            for (var i = 0; i < apps.length; i++) if (apps[i].id === focused) { nav.focus(i); break; }
        });
    };

    APL.refreshArt = function () { if (APL.autoArt) APL.autoArt.refresh(allApps, render); };
    // render() too: Black changes no made background, yet every layer must be redrawn
    APL.restyleArt = function () { if (APL.autoArt) APL.autoArt.restyle(allApps, render); render(); };

    APL.resetHomeOrder = function () {
        APL.sys.setPref("appOrder", []);
        allApps = applySavedOrder(defaultOrder.filter(function (d) {
            return allApps.some(function (a) { return a.id === d.id; });
        }));
        render();
    };

    /* Dock backgrounds prepared in advance: the Top Shelf changes without a hitch. */
    function preloadDock() {
        apps.slice(0, DOCK_SIZE).forEach(layerFor);
    }

    /* Appearance: light, dark, or following the sun (sunrise and sunset from the prayer times (France maths as fallback)). */
    function isNight(d) {
        /* v3.3.3: follows the real Sunrise and Maghrib of the chosen city (APL.prayer); the Paris maths below is only the fallback */
        try {
            var L = APL.prayer && APL.prayer.list ? APL.prayer.list() : null, sr = null, mg = null;
            (L || []).forEach(function (x) { if (x.key === "sunrise") sr = x.at; else if (x.key === "maghrib") mg = x.at; });
            if (sr && mg && sr < mg) return d < sr || d >= mg;
        } catch (e) {}
        var day = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000);
        var lat = 48.85 * Math.PI / 180, decl = 23.44 * Math.PI / 180 * Math.sin(2 * Math.PI * (284 + day) / 365);
        var half = Math.acos(-Math.tan(lat) * Math.tan(decl)) * 12 / Math.PI;
        var noon = 12 - d.getTimezoneOffset() / 60 - 2.35 / 15, h = d.getHours() + d.getMinutes() / 60;
        return h < noon - half || h > noon + half;
    }
    function applyTheme() {
        var a = APL.sys.pref("appearance");
        var light = a === "light" || (a === "auto" && !isNight(new Date()));
        document.body.classList.toggle("theme-light", light);
        if (APL.overlay) APL.overlay.setTheme(light);
        // Generated backgrounds exist for both themes: the other one, already made
        if (APL.genArt && allApps && APL.genArt.retheme(allApps)) render();
    }

    /* Performance mode: no real-time blur or glass (which made the screen lag). */
    function applyPerf() {
        var light = APL.lightMode && APL.lightMode.on();
        document.body.classList.toggle("perf", light || !APL.sys.pref("visualEffects"));
        document.body.classList.toggle("rich-fx", !light && !!APL.sys.pref("richFx"));
    }

    /* Tip shown on the first start-ups. */
    function showCcHint() {
        var n = APL.sys.pref("ccHintCount");
        if (n >= 3) return;
        APL.sys.setPref("ccHintCount", n + 1);
        setTimeout(function () {
            toast(APL.t("Tip: ⏯ opens Control Center, and Home twice shows open apps"));
        }, 2500);
    }

    /* Home button (sent here by Vetro): if already on the Home Screen for a while,
       another press opens / closes Control Center, like the TV button on Apple TV. */
    var lastShown = Date.now(), switcherOnShow = false, hiddenAt = 0;
    document.addEventListener("visibilitychange", function () {
        // An app opens over the Home Screen: coming back, it is at rest again, not still in full screen
        if (document.hidden) {
            if (mode === "full") setMode("shelf");
            stopLive();
            hiddenAt = Date.now();
            return;
        }
        // v1.2.91: back from an app (hidden for 2 s or more): the selection is on the middle of the first row
        if (hiddenAt && Date.now() - hiddenAt >= 2000) { try { focusHomeRest(); } catch (e) {} }
        lastShown = Date.now();
        try { var cur = apps[nav.index]; if (cur && mode !== "grid" && nav.index < DOCK_SIZE) startLive(cur); } catch (e) {}
        hideVeil();
        try {
            var act = apps[nav.index] || apps[0];
            if (act) setBackdrop(act, false);
        } catch (e) {}
        setTimeout(function () { bootCleanup(8); }, 25000);
        if (switcherOnShow) { switcherOnShow = false; if (APL.switcher) APL.switcher.open(); }
    });
    var lastHome = 0;
    /* The native Control Center (overlay/) asks for a launcher page: Settings, Connection… */
    function requestedAction() {
        try {
            var data = global.tizen.application.getCurrentApplication().getRequestedAppControl().appControl.data || [];
            for (var i = 0; i < data.length; i++) if (data[i].key === "apl_action") return data[i].value[0];
        } catch (e) {}
        return "";
    }
    function runAction(action) {
        if (action === "boot") return;           // APL Boot putting the launcher on screen after a start-up: nothing to open
        if (action === "controlcenter") {
            var pref = APL.sys.pref("pauseKey");
            if (pref === "controlcenter") {
                if (APL.controlCenter) APL.controlCenter.toggle();
            } else if (pref === "playpause") {
                // Pass through
            } else {
                openSamsungHome();
            }
            return;
        }
        if (APL.controlCenter && APL.controlCenter.isOpen()) APL.controlCenter.close();
        if (action === "switcher") {
            if (document.hidden) switcherOnShow = true;
            else if (APL.switcher && !APL.switcher.isOpen()) APL.switcher.open();
        }
        else if (action === "settings") APL.settings.open();
        else if (action === "connexions") APL.settings.open(APL.t("Connection"));
        else if (action === "alexa") APL.services.alexaMic();
        else if (action.indexOf("open:") === 0) openById(action.substr(5));   // "Alexa, turn on…"
    }
    function openById(id) {
        for (var i = 0; i < allApps.length; i++) if (allApps[i].id === id) { APL.goHome(); APL.openApp(allApps[i]); return; }
    }
    global.addEventListener("appcontrol", function () {
        var action = requestedAction();
        if (action) { lastShown = Date.now(); runAction(action); return; }
        // Two quick presses on Home: the App Switcher, as on Apple TV
        var quick = Date.now() - lastHome < 800;
        lastHome = Date.now();
        // The second press often arrives before the Home Screen is back on screen
        if (quick && document.hidden) { switcherOnShow = true; return; }
        if (quick && !document.hidden && APL.switcher && !APL.switcher.isOpen()) {
            if (APL.controlCenter && APL.controlCenter.isOpen()) APL.controlCenter.close();
            APL.switcher.open();
            return;
        }
        if (!document.hidden && Date.now() - lastShown > 1500) {
            if (APL.switcher && APL.switcher.isOpen()) { APL.switcher.close(); return; }
            // Home from anywhere in the launcher (deep in Settings, full screen, Sources…): the Home Screen
            // at rest, on its first app
            APL.goHome();
        } else {
            lastShown = Date.now();
        }
    });

    APL.toast = function (m, info) { toast(m, info); };
    APL.allApps = function () { return allApps; };
    APL.reloadApps = function () { render(); };
    APL.openSources = function () { if (APL.sources) APL.sources.open(); };

    /* Channel Up / Channel Down open APL Settings (Settings › Remote and Devices › Channel Up / Down).
       These keys are only seen if Samsung hands them to the app: on many screens the system keeps
       them for its own channel list, and then nothing happens. */
    var CH_UP = 427, CH_DOWN = 428;
    APL.addHotkey(function (code) {
        if (code !== CH_UP && code !== CH_DOWN) return false;
        if (APL.sys.pref("channelKeys") === false) return false;
        if (APL.prayerPage && APL.prayerPage.isBlackout && APL.prayerPage.isBlackout()) return false;
        if (APL.alert && APL.alert.isOpen && APL.alert.isOpen()) return false;       // the box keeps its keys
        if (APL.settings && APL.settings.isOpen()) return false;
        if (APL.settings) APL.settings.open();
        return true;
    });

    /* v1.2.92: Number keys 1-6 select the icons of the first row; the same number again opens the app.
       Only on the Home Screen at rest (no menu, box or page open). Settings > Home Screen > Number Keys. */
    APL.addHotkey(function (code) {
        if (code < 49 || code > 54) return false;
        if (APL.sys.pref("numberKeys") === false) return false;
        if (mode !== "shelf" || !nav || !apps.length || !homeAtRest()) return false;
        if (APL.alert && APL.alert.isOpen && APL.alert.isOpen()) return false;
        if (APL.prayerPage && APL.prayerPage.isBlackout && APL.prayerPage.isBlackout()) return false;
        var idx = code - 49;
        if (idx >= Math.min(DOCK_SIZE, apps.length)) return false;
        if (nav.index === idx) launch(idx); else nav.focus(idx);
        return true;
    });

    /* Control Center / Samsung Home: Play/Pause or the red key (C on the keyboard in the PC preview). */
    APL.addHotkey(function (code) {
        var K = APL.KEY;
        if (code === K.MEDIA_PLAY_PAUSE || code === K.RED || (APL.sys.PREVIEW && code === 67)) {
            var action = APL.sys.pref("pauseKey");
            if (action === "controlcenter") {
                if (APL.controlCenter) APL.controlCenter.toggle();
            } else if (action === "playpause") {
                return false;
            } else {
                openSamsungHome();
            }
            return true;
        }
        // Home with the launcher in front: some screens never pass a launch request to the page in
        // front (The Frame 2025), so the Overlay presses blue for Home and green for the App Switcher
        // (red, above, for the Control Center).
        if (code === K.BLUE) {
            if (APL.switcher && APL.switcher.isOpen()) APL.switcher.close();
            else APL.goHome();
            return true;
        }
        if (code === K.GREEN) {
            if (APL.controlCenter && APL.controlCenter.isOpen()) APL.controlCenter.close();
            if (APL.switcher && !APL.switcher.isOpen()) APL.switcher.open();
            return true;
        }
        return false;
    });

    /* A new wallpaper always repaints the visible shelf. This deliberately also
       covers apps with their own artwork; wallpapers are the active user choice. */
    if (APL.wallpapers && APL.wallpapers.onChange) {
        APL.wallpapers.onChange(function () {
            var app = apps[nav && nav.index];
            // The manual control lives inside Settings. Repaint beneath that
            // overlay now, so the selected wallpaper is already visible the
            // instant Settings closes.
            if (!app) return;
            setBackdrop(app, true);
        });
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();

})(window);
