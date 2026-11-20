/* ============================================================
   system-components.js — Settings › Apps › System Components.

   Samsung services, plugins and internal screens report themselves
   as applications (`show:true`) even though they are not apps
   anybody opens. apps.js keeps them aside instead of dropping them:
   this page lists them, OK shows one on the Home Screen or hides it
   again (preference "shownSystemApps").

   Nothing is deleted, disabled or changed on the television: the
   list only decides what the launcher draws, so a mistake here costs
   nothing. A component that was wrongly filtered can always be
   brought back from this page.
   ============================================================ */
(function (global) {
    "use strict";

    var APL = global.APL, sys = APL && APL.sys;
    if (!APL || !sys) return;

    var root, bodyEl, titleEl, subEl, hintEl, nav, tiles = [], openFlag = false;

    function el(tag, cls, html) {
        var e = document.createElement(tag);
        if (cls) e.className = cls;
        if (html !== undefined) e.innerHTML = html;
        return e;
    }
    function shown() { return sys.pref("shownSystemApps") || []; }
    function isShown(id) { return shown().indexOf(id) !== -1; }
    function toggle(id) {
        var list = shown().filter(function (x) { return x !== id; });
        if (list.length === shown().length) list.push(id);
        sys.setPref("shownSystemApps", list);
        if (APL.refreshHome) APL.refreshHome();
        render();
    }

    function render() {
        bodyEl.innerHTML = "";
        tiles = [];
        var list = (APL.systemApps ? APL.systemApps() : []).slice();
        titleEl.textContent = APL.t("System Components");
        subEl.textContent = APL.t("Some Samsung services and plugins look like apps. They are hidden here; nothing is deleted or disabled on the screen.");
        if (!list.length) {
            bodyEl.appendChild(el("p", "aplpage__sub", APL.t("No system components were filtered on this screen.")));
            hintEl.textContent = "";
            nav.setTiles([]);
            return;
        }
        list.sort(function (a, b) { return String(a.name).localeCompare(String(b.name), APL.locale); });
        var box = el("div", "aplx-list");
        list.forEach(function (a) {
            var on = isShown(a.id);
            var row = el("div", "aplx-row",
                '<div class="aplx-row__main"><span class="aplx-row__label">' + a.name + "</span>" +
                '<span class="aplx-row__sub num">' + a.id + "</span></div>" +
                '<span class="aplx-badge ' + (on ? "aplx-badge--on" : "aplx-badge--off") + '">' +
                (on ? APL.t("Shown. OK to hide it again.") : APL.t("Hidden. OK to show it again.")) + "</span>");
            var run = function () { toggle(a.id); };
            row.addEventListener("click", run);
            tiles.push({ el: row, run: run });
            box.appendChild(row);
        });
        bodyEl.appendChild(box);
        hintEl.textContent = APL.t("Some Samsung services and plugins look like apps. They are hidden here; nothing is deleted or disabled on the screen.");
        nav.setTiles(tiles.map(function (t) { return t.el; }), true);
        if (tiles.length) nav.focus(0);
    }

    function open() {
        if (!root) {
            root = el("section", "aplpage");
            var head = el("div", "aplpage__head"), wrap = el("div", "aplpage__titlewrap");
            titleEl = el("h1", "aplpage__title");
            subEl = el("p", "aplpage__sub");
            wrap.appendChild(titleEl); wrap.appendChild(subEl);
            head.appendChild(wrap);
            bodyEl = el("div", "aplpage__body");
            hintEl = el("p", "aplpage__hint");
            root.appendChild(head); root.appendChild(bodyEl); root.appendChild(hintEl);
            document.body.appendChild(root);
            nav = new APL.Nav({
                onSelect: function (i) { if (tiles[i] && tiles[i].run) tiles[i].run(); },
                onBack: function () { close(); }
            });
        }
        openFlag = true;
        render();
        root.classList.add("is-open");
        document.body.classList.add("has-aplpage");
        APL.pushNav(nav);
    }
    function close() {
        if (!openFlag) return;
        openFlag = false;
        root.classList.remove("is-open");
        document.body.classList.remove("has-aplpage");
        APL.popNav(nav);
    }

    APL.systemPage = { open: open, close: close, isOpen: function () { return openFlag; } };
})(window);
