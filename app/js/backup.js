/* ============================================================
   backup.js — saving the settings and the app order.

   What is saved: every launcher key kept on the screen
   (localStorage "apl.*"): the preferences, each profile's layout,
   hidden apps and statistics, the folders, the weather and prayer
   place, the radio settings. Not the backups themselves.

   Three places:
     - on the screen, as snapshots (the last 10 are kept, plus one
       automatic snapshot a day);
     - in a file, in /opt/usr/home/owner/APL/backups (through Vetro),
       one file per backup, named with its date;
     - back from either of them: choosing a snapshot restores it and
       the launcher restarts.

   On a PC (preview) the file is downloaded and chosen with the
   browser's own file picker instead.
   ============================================================ */
(function (global) {
    "use strict";

    var APL = global.APL, sys = APL && APL.sys;
    if (!APL || !sys) return;

    var STORE = "apl.backups";             // snapshots kept on the screen
    var DIR = "/opt/usr/home/owner/APL/backups";
    var MAX = 10;
    var running = false;

    /* ---------- what a backup holds ---------- */
    function collect() {
        var data = {};
        try {
            for (var i = 0; i < global.localStorage.length; i++) {
                var k = global.localStorage.key(i);
                if (!k || k.indexOf("apl.") !== 0 || k === STORE) continue;
                data[k] = global.localStorage.getItem(k);
            }
        } catch (e) {}
        return data;
    }

    function stamp(d) {
        d = d || new Date();
        function two(n) { return (n < 10 ? "0" : "") + n; }
        return d.getFullYear() + two(d.getMonth() + 1) + two(d.getDate()) + "-" + two(d.getHours()) + two(d.getMinutes()) + two(d.getSeconds());
    }
    function isoText(ms) {
        var d = new Date(ms);
        function two(n) { return (n < 10 ? "0" : "") + n; }
        return d.getFullYear() + "-" + two(d.getMonth() + 1) + "-" + two(d.getDate()) + " " + two(d.getHours()) + ":" + two(d.getMinutes());
    }

    function make(reason) {
        var pack = {
            format: "apl-backup/1",
            at: Date.now(),
            launcher: sys.version,
            model: (sys.product && sys.product().model) || "",
            reason: reason || "manual",
            profiles: (sys.profiles && sys.profiles.list()) || [],
            data: collect()
        };
        return pack;
    }

    /* ---------- snapshots on the screen ---------- */
    function list() {
        var all = [];
        try { all = JSON.parse(global.localStorage.getItem(STORE) || "[]") || []; } catch (e) { all = []; }
        return all.slice().sort(function (a, b) { return b.at - a.at; });
    }
    function writeList(all) {
        try { global.localStorage.setItem(STORE, JSON.stringify(all.slice(0, MAX))); } catch (e) {}
    }
    function add(pack) {
        var all = list();
        all.unshift(pack);
        // The automatic ones do not push a manual backup out: keep the last 3 automatic at most
        var autos = all.filter(function (b) { return b.reason === "auto"; });
        if (autos.length > 3) {
            var drop = {};
            autos.slice(3).forEach(function (b) { drop[b.at] = true; });
            all = all.filter(function (b) { return !drop[b.at]; });
        }
        writeList(all);
        return pack;
    }

    function backupNow(reason) {
        var pack = make(reason);
        add(pack);
        return pack;
    }

    function remove(at) {
        var all = list().filter(function (b) { return b.at !== at; });
        writeList(all);
    }

    function removeAll() {
        writeList([]);
    }

    /* A snapshot a day, kept on the screen: the first start-up of the day makes one. */
    function autoDaily() {
        if (sys.pref("autoBackup") === false) return;
        var all = list(), last = all.filter(function (b) { return b.reason === "auto"; })[0];
        var day = 24 * 3600 * 1000;
        if (last && Date.now() - last.at < day) return;
        add(make("auto"));
    }

    /* ---------- restore ---------- */
    function apply(pack) {
        if (!pack || !pack.data) return false;
        // A snapshot of the current state first: a restore can be undone
        add(make("before-restore"));
        var keys = Object.keys(pack.data);
        keys.forEach(function (k) {
            if (k.indexOf("apl.") !== 0 || k === STORE) return;
            try { global.localStorage.setItem(k, pack.data[k]); } catch (e) {}
        });
        var have = {};
        keys.forEach(function (k) { have[k] = true; });
        // Keys that did not exist in the backup go: the state is the backup's, not a mix
        try {
            for (var i = global.localStorage.length - 1; i >= 0; i--) {
                var k2 = global.localStorage.key(i);
                if (k2 && k2.indexOf("apl.") === 0 && k2 !== STORE && !have[k2]) global.localStorage.removeItem(k2);
            }
        } catch (e) {}
        return true;
    }

    function restore(pack, then) {
        if (!apply(pack)) return;
        setTimeout(function () {
            if (then) then();
            global.location.reload();
        }, 450);
    }

    /* ---------- files on the screen (through Vetro) ---------- */
    function b64(text) {
        try { return global.btoa(unescape(encodeURIComponent(text))); } catch (e) { return ""; }
    }
    function filePath(pack) { return DIR + "/apl-backup-" + stamp(new Date(pack.at)) + (pack.reason === "auto" ? "-auto" : "") + ".json"; }

    function exportToFile(pack) {
        pack = pack || make("manual");
        add(pack);
        if (sys.PREVIEW) {
            download(pack);
            return Promise.resolve({ preview: true, path: APL.t("your computer") });
        }
        var path = filePath(pack);
        var text = JSON.stringify(pack);
        var cmd = "mkdir -p " + DIR + "; printf '%s' '" + b64(text) + "' | base64 -d > '" + path + "'; ls -l '" + path + "' 2>&1 | tail -1";
        return sys.exec(cmd).then(function (r) {
            var out = String((r && r.output) || "");
            if (!/\.json/.test(out)) throw new Error(APL.t("Vetro is not responding"));
            return { path: path };
        });
    }

    function download(pack) {
        try {
            var blob = new global.Blob([JSON.stringify(pack, null, 1)], { type: "application/json" });
            var url = global.URL.createObjectURL(blob);
            var a = document.createElement("a");
            a.href = url;
            a.download = "apl-backup-" + stamp(new Date(pack.at)) + ".json";
            document.body.appendChild(a);
            a.click();
            setTimeout(function () { document.body.removeChild(a); global.URL.revokeObjectURL(url); }, 1000);
        } catch (e) {}
    }

    function filesOnScreen() {
        if (sys.PREVIEW) return Promise.resolve([]);
        return sys.exec("ls -1 " + DIR + "/*.json 2>/dev/null | tail -20").then(function (r) {
            return String((r && r.output) || "").trim().split("\n").filter(Boolean);
        }, function () { return []; });
    }

    function importFromFile(path) {
        if (sys.PREVIEW) return Promise.reject(new Error(APL.t("This needs Vetro and the bridge: without them the backups stay on this screen.")));
        return sys.exec("cat '" + path + "' 2>/dev/null").then(function (r) {
            var text = String((r && r.output) || "");
            var pack = null;
            try { pack = JSON.parse(text); } catch (e) { pack = null; }
            if (!pack || !pack.data) throw new Error(APL.t("No backup file found in {path}", { path: path }));
            restore(pack);
            return pack;
        });
    }

    /* The newest file in the folder, without choosing one with the remote. */
    function importLatest() {
        return filesOnScreen().then(function (list) {
            if (!list.length) throw new Error(APL.t("No backup file found in {path}", { path: DIR }));
            return importFromFile(list[list.length - 1]);
        });
    }

    /* ---------- the page ---------- */
    var root, bodyEl, titleEl, subEl, hintEl, nav, tiles = [], openFlag = false, mode = "main";

    function el(tag, cls, html) {
        var e = document.createElement(tag);
        if (cls) e.className = cls;
        if (html !== undefined) e.innerHTML = html;
        return e;
    }

    function card(label, value, note, run, badge) {
        var c = el("div", "aplx-card",
            '<div class="aplx-card__label">' + label + "</div>" +
            '<div class="aplx-card__value">' + value + (badge ? ' <span class="aplx-badge ' + badge.cls + '">' + badge.text + "</span>" : "") + "</div>" +
            (note ? '<div class="aplx-card__note">' + note + "</div>" : ""));
        c.addEventListener("click", function () { run && run(); });
        tiles.push({ el: c, run: run || function () {} });
        return c;
    }
    function row(label, sub, value, run) {
        var r = el("div", "aplx-row",
            '<div class="aplx-row__main"><span class="aplx-row__label">' + label + "</span>" +
            (sub ? '<span class="aplx-row__sub">' + sub + "</span>" : "") + "</div>" +
            (value ? '<span class="aplx-row__value">' + value + "</span>" : ""));
        r.addEventListener("click", function () { run && run(); });
        tiles.push({ el: r, run: run || function () {} });
        return r;
    }

    function buildMain() {
        bodyEl.innerHTML = "";
        tiles = [];
        titleEl.textContent = APL.t("Save Settings and App Order");
        subEl.textContent = APL.t("The backup follows each profile: its layout, its hidden apps, its statistics.");

        var row1 = el("div", "aplx-cards");
        row1.appendChild(card(APL.t("Back Up Now"), "⤓", APL.t("A snapshot of every setting and every profile, kept on this screen."),
            function () {
                backupNow("manual");
                if (APL.toast) APL.toast(APL.t("Backup created"), true);
                render();
            }));
        row1.appendChild(card(APL.t("Export to the Screen's Storage"), "↗", DIR,
            function () {
                exportToFile(make("manual")).then(function (r) {
                    if (APL.toast) APL.toast(APL.t("Backup exported to {path}", { path: r.path }), true);
                }, function (e) { if (APL.toast) APL.toast(e.message); });
            }));
        row1.appendChild(card(APL.t("Automatic Backup"),
            sys.pref("autoBackup") === false ? APL.t("Off") : APL.t("On"),
            APL.t("A snapshot a day, kept on this screen."),
            function () { sys.setPref("autoBackup", sys.pref("autoBackup") === false); render(); },
            { cls: sys.pref("autoBackup") === false ? "aplx-badge--off" : "aplx-badge--on",
              text: sys.pref("autoBackup") === false ? APL.t("Off") : APL.t("On") }));
        bodyEl.appendChild(row1);

        var row2 = el("div", "aplx-cards");
        row2.appendChild(card(APL.t("Import from the Screen's Storage"), "↘", DIR + "/*.json",
            function () {
                importLatest().then(function () {
                    if (APL.toast) APL.toast(APL.t("Backup imported from {path}", { path: DIR }), true);
                }, function (e) { if (APL.toast) APL.toast(e.message); });
            }));
        row2.appendChild(card(APL.t("Restore"), "⟲", APL.t("Settings and app order restored"),
            function () {
                var all = list();
                if (!all.length) { if (APL.toast) APL.toast(APL.t("No backup yet")); return; }
                mode = "restore";
                render();
            }));
        bodyEl.appendChild(row2);

        var head = el("p", "aplpage__sub", APL.t("Backups on this Screen"));
        bodyEl.appendChild(head);
        var box = el("div", "aplx-list");
        var all = list();
        if (!all.length) {
            box.appendChild(row(APL.t("No backup yet"), "", "", null));
        } else {
            all.forEach(function (b) {
                box.appendChild(row(isoText(b.at), (b.reason === "auto" ? APL.t("Automatic") : APL.t("Manual")) + " · " +
                    Object.keys(b.data || {}).length + " " + APL.t("keys") + " · " + (b.launcher || ""),
                    "", function () { APL.alert({
                        title: APL.t("Backup"), focus: 1,
                        message: isoText(b.at) + " (" + (b.reason === "auto" ? APL.t("Automatic") : APL.t("Manual")) + ")",
                        buttons: [
                            { label: APL.t("Cancel") },
                            { label: APL.t("Restore"), run: function () { restore(b); } },
                            { label: APL.t("Delete"), destructive: true, run: function () {
                                remove(b.at);
                                if (APL.toast) APL.toast(APL.t("Backup deleted"), true);
                                render();
                            } }
                        ]
                    }); }));
            });
        }
        bodyEl.appendChild(box);
        hintEl.textContent = DIR;
    }

    function render() {
        if (mode === "main") buildMain();
        nav.setTiles(tiles.map(function (t) { return t.el; }), true);
        if (tiles.length) nav.focus(0);
    }

    function open() {
        if (!root) {
            root = el("section", "aplpage aplpage--glass");
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
        mode = "main";
        openFlag = true;
        if (bodyEl) bodyEl.scrollTop = 0;
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

    APL.backup = {
        open: open,
        close: close,
        isOpen: function () { return openFlag; },
        list: list,
        backupNow: backupNow,
        remove: remove,
        removeAll: removeAll,
        restore: restore,
        exportToFile: exportToFile,
        importLatest: importLatest,
        filesOnScreen: filesOnScreen,
        collect: collect,
        autoDaily: autoDaily
    };

    setTimeout(autoDaily, 12000);
})(window);
