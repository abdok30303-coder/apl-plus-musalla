/* ============================================================
   appmenu.js — Apple TV's small menu when you hold OK on an app,
   and the confirmation box ("Delete “X”?").

   APL.contextMenu.open(tileEl, [{ label, icon, destructive, run }])
   APL.alert({ title, message, buttons: [{ label, destructive, run }], focus })
   ============================================================ */
(function (global) {
    "use strict";

    var APL = global.APL;

    function el(tag, cls) {
        var e = document.createElement(tag);
        if (cls) e.className = cls;
        return e;
    }

    /* ---------- context menu ---------- */
    var menuRoot, menuPanel, menuNav, menuItems = [], menuOpen = false;

    function buildMenu() {
        menuRoot = el("div", "appmenu");
        menuPanel = el("div", "appmenu__panel");
        menuRoot.appendChild(menuPanel);
        document.body.appendChild(menuRoot);
        menuNav = new APL.Nav({
            onSelect: function (i) {
                var item = menuItems[i];
                closeMenu();
                if (item && item.run) item.run();
            },
            onBack: closeMenu
        });
    }

    function openMenu(anchor, items) {
        if (!menuRoot) buildMenu();
        menuItems = items;
        menuPanel.innerHTML = "";
        var rows = items.map(function (it) {
            var row = el("div", "appmenu__item" + (it.destructive ? " is-destructive" : ""));
            var label = el("span", "appmenu__label");
            label.textContent = it.label;
            row.appendChild(label);
            var ico = el("span", "appmenu__icon");
            ico.innerHTML = APL.icon(it.icon || "info", 34, 1.9);
            row.appendChild(ico);
            menuPanel.appendChild(row);
            return row;
        });

        // Below the icon if there is room, otherwise above it (as on tvOS).
        menuRoot.classList.remove("is-open", "is-above");
        menuRoot.style.visibility = "hidden";
        menuRoot.style.display = "block";
        // Position in the 1920×1080 screen (the PC preview shrinks it: scale back).
        var a = anchor.getBoundingClientRect(), o = document.body.getBoundingClientRect();
        var k = (o.width / (document.body.offsetWidth || o.width)) || 1;
        var r = { left: (a.left - o.left) / k, top: (a.top - o.top) / k, bottom: (a.bottom - o.top) / k };
        var w = menuPanel.offsetWidth, h = menuPanel.offsetHeight;
        var top = r.bottom + 26, above = false;
        if (top + h > 1040) { top = r.top - 26 - h; above = true; }
        var left = Math.max(60, Math.min(1920 - 60 - w, r.left));
        menuPanel.style.left = Math.round(left) + "px";
        menuPanel.style.top = Math.round(Math.max(40, top)) + "px";
        menuRoot.classList.toggle("is-above", above);
        menuRoot.style.visibility = "";
        void menuRoot.offsetWidth;
        menuRoot.classList.add("is-open");

        menuNav.setTiles(rows);
        menuNav.focus(0);
        APL.pushNav(menuNav);
        menuOpen = true;
    }

    function closeMenu() {
        if (!menuOpen) return;
        menuOpen = false;
        menuRoot.classList.remove("is-open");
        APL.popNav(menuNav);
        setTimeout(function () { if (!menuOpen) menuRoot.style.display = "none"; }, 220);
    }

    /* ---------- confirmation box (tvOS alert) ---------- */
    var alertRoot, alertTitle, alertMsg, alertMore, alertExtra, alertBtns, alertNav, alertSpec = null;

    function buildAlert() {
        alertRoot = el("div", "aplalert");
        var box = el("div", "aplalert__box");
        alertTitle = el("h2", "aplalert__title");
        alertMsg = el("p", "aplalert__msg");
        alertMore = el("div", "aplalert__more");                // v8.7.34: "more below" hint for a long message
        alertMsg.addEventListener("scroll", updateMore);
        alertExtra = el("div", "aplalert__extra");              // spec.node: a picture under the message (a QR code)
        alertBtns = el("div", "aplalert__buttons");
        box.appendChild(alertTitle); box.appendChild(alertMsg); box.appendChild(alertMore); box.appendChild(alertExtra); box.appendChild(alertBtns);
        alertRoot.appendChild(box);
        document.body.appendChild(alertRoot);
        alertNav = new APL.Nav({
            onSelect: function (i) {
                var b = alertSpec && alertSpec.buttons[i];
                closeAlert();
                if (b && b.run) b.run();
            },
            onBack: closeAlert,
            /* v8.7.34: a long message (What's New) scrolls with Up / Down. Down scrolls until the end, then moves on
               to the buttons as before; Up scrolls back up and otherwise does what it always did. */
            onKey: function (code) {
                if (!alertMsg || (code !== 38 && code !== 40)) return false;
                var room = alertMsg.scrollHeight - alertMsg.clientHeight;
                if (room <= 4) return false;
                var top = alertMsg.scrollTop, step = Math.max(120, Math.round(alertMsg.clientHeight * 0.7));
                if (code === 40 && top < room - 2) { alertMsg.scrollTop = Math.min(room, top + step); updateMore(); return true; }
                if (code === 38 && top > 2) { alertMsg.scrollTop = Math.max(0, top - step); updateMore(); return true; }
                return false;
            }
        });
    }

    function updateMore() {
        if (!alertMore || !alertMsg) return;
        var room = alertMsg.scrollHeight - alertMsg.clientHeight, top = alertMsg.scrollTop;
        var down = room > 4 && top < room - 2, up = room > 4 && top > 2;
        alertMore.textContent = down ? (up ? "\u25B2 \u25BC  " : "\u25BC  ") + APL.t("Press Down to read more") : (up ? "\u25B2  " + APL.t("Press Up to go back") : "");
        alertMore.style.display = (down || up) ? "block" : "none";
    }

    function openAlert(spec) {
        if (!alertRoot) buildAlert();
        alertSpec = spec;
        alertTitle.textContent = APL.enx ? APL.enx(spec.title || "") : (spec.title || "");
        alertMsg.textContent = APL.enx ? APL.enx(spec.message || "") : (spec.message || "");
        alertMsg.style.display = spec.message ? "" : "none";
        alertMsg.scrollTop = 0;
        alertExtra.innerHTML = "";
        if (spec.node) alertExtra.appendChild(spec.node);
        alertExtra.style.display = spec.node ? "" : "none";
        alertBtns.innerHTML = "";
        var btns = spec.buttons.map(function (b) {
            var e = el("div", "aplalert__btn" + (b.destructive ? " is-destructive" : ""));
            e.textContent = APL.enx ? APL.enx(b.label) : b.label;
            alertBtns.appendChild(e);
            return e;
        });
        alertRoot.classList.add("is-open");
        updateMore();
        global.setTimeout(updateMore, 60);
        alertNav.setTiles(btns);
        alertNav.focus(spec.focus || 0);
        APL.pushNav(alertNav);
    }

    function closeAlert() {
        if (!alertSpec) return;
        alertSpec = null;
        alertRoot.classList.remove("is-open");
        APL.popNav(alertNav);
    }

    APL.contextMenu = { open: openMenu, close: closeMenu, isOpen: function () { return menuOpen; } };
    APL.alert = openAlert;
    APL.alert.close = closeAlert;
    APL.alert.isOpen = function () { return !!alertSpec; };
})(window);
