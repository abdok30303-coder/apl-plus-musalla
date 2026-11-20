/* ============================================================
   tasks-page.js — Full-screen "Tasks" (المهام) Manager Page.

   Opened from the "Tasks" tile on the Home Screen, from
   Settings › Tasks, or from Control Center:
     - Shows the Next Task & live remaining countdown;
     - Adds new tasks or edits existing tasks inside the launcher
       with full TV Remote D-pad support (stepper rows, quick
       presets, TV keyboard input, AND built-in on-screen Arabic /
       English remote keyboard);
     - Toggles the Home Screen Next-Task Countdown & Vetro
       Background Task Alerts;
     - Marks tasks complete, snoozes (+15m / +1h), or deletes them.
   ============================================================ */
(function (global) {
    "use strict";

    var APL = global.APL, sys = APL && APL.sys;
    if (!APL || !sys) return;

    var root, titleEl, subEl, bodyEl, hintEl, nav, tiles = [];
    var mode = "main";          // "main" | "edit" | "kbd"
    var openFlag = false;
    var tickTimer = null;
    var focusIndex = 0;
    var kbdLang = "ar";

    var PRESETS = [
        "Prayer / Quran Reading",
        "Medicine Time",
        "Work / Meeting",
        "Study Session",
        "Phone Call",
        "Errand / Appointment",
        "Workout",
        "General Reminder"
    ];

    var KBD_AR = [
        ["ض", "ص", "ث", "ق", "ف", "غ", "ع", "ه", "خ", "ح", "ج", "د"],
        ["ش", "س", "ي", "ب", "ل", "ا", "ت", "ن", "م", "ك", "ط", "ذ"],
        ["ئ", "ء", "ؤ", "ر", "لا", "ى", "ة", "و", "ز", "ظ", "أ", "إ"],
        ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", ":"]
    ];
    var KBD_EN = [
        ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
        ["A", "S", "D", "F", "G", "H", "J", "K", "L", "-"],
        ["Z", "X", "C", "V", "B", "N", "M", ".", ":", "/"],
        ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"]
    ];

    var draft = {
        editId: null,
        title: "",
        presetIdx: -1,
        dayMode: 0,      // -1 = "daily", -2..-8 = every Sunday..Saturday (v1.2.117), 0 = Today, 1 = Tomorrow, 2..30 = +N days
        hour: 18,
        minute: 0
    };

    function tApi() { return APL.tasks; }
    function pad(n) { return (n < 10 ? "0" : "") + n; }

    function esc(s) {
        return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c];
        });
    }

    function el(tag, cls, html) {
        var e = document.createElement(tag);
        if (cls) e.className = cls;
        if (html !== undefined) e.innerHTML = html;
        return e;
    }

    function initDraft(existing) {
        if (existing) {
            var m = /^(\d{1,2}):(\d{2})/.exec(existing.time || "18:00");
            var dm = 0;
            if (existing.repeat === "daily") {
                dm = -1;
            } else if (existing.repeat === "weekly") {
                dm = -2 - (existing.wd >= 0 && existing.wd <= 6 ? existing.wd : 0);
            } else if (existing.date && tApi()) {
                var tk = tApi().todayKey();
                for (var d = 0; d <= 30; d++) {
                    if (tApi().dayPlus(d, tk) === existing.date) { dm = d; break; }
                }
            }
            draft = {
                editId: existing.id,
                title: existing.title || "",
                presetIdx: -1,
                dayMode: dm,
                hour: m ? parseInt(m[1], 10) : 18,
                minute: m ? parseInt(m[2], 10) : 0
            };
            return;
        }
        var soon = new Date(Date.now() + 30 * 60000);
        var roundedMin = Math.round(soon.getMinutes() / 5) * 5;
        if (roundedMin >= 60) {
            soon = new Date(soon.getTime() + (60 - soon.getMinutes()) * 60000);
            roundedMin = 0;
        }
        var nowDay = new Date();
        var crossedDay = (soon.getDate() !== nowDay.getDate() || soon.getMonth() !== nowDay.getMonth()) ? 1 : 0;
        draft = {
            editId: null,
            title: "",
            presetIdx: -1,
            dayMode: crossedDay,
            hour: soon.getHours(),
            minute: roundedMin
        };
    }

    /* a date that falls on the weekday wd (0 = Sunday), only to name the weekday */
    function weeklyIso(wd) {
        var tk = tApi().todayKey(), i;
        for (i = 0; i < 7; i++) { var di = tApi().dayPlus(i, tk); if (tApi().weekdayOf(di) === wd) return di; }
        return tk;
    }

    function draftDayLabel() {
        if (draft.dayMode === -1) return APL.t("Every day");
        if (draft.dayMode <= -2 && tApi()) return tApi().dayLabel(weeklyIso(-2 - draft.dayMode), "weekly");
        var iso = tApi() ? tApi().dayPlus(draft.dayMode, tApi().todayKey()) : "";
        return tApi() ? tApi().dayLabel(iso, "once") : iso;
    }

    function draftTimeString() {
        return pad(draft.hour) + ":" + pad(draft.minute);
    }

    function draftHourLabel() {
        if (sys.pref("clockFormat") === "24") return pad(draft.hour) + ":00";
        var ampm = draft.hour < 12 ? (APL.lang === "ar" ? "ص" : "AM") : (APL.lang === "ar" ? "م" : "PM");
        return ((draft.hour % 12) || 12) + " " + ampm;
    }

    function card(label, value, note, onClick, badge) {
        var c = el("div", "aplx-card",
            '<div class="aplx-card__label">' + esc(label) + "</div>" +
            '<div class="aplx-card__value">' + esc(value) +
            (badge ? ' <span class="aplx-badge ' + badge.cls + '">' + esc(badge.text) + "</span>" : "") +
            "</div>" +
            (note ? '<div class="aplx-card__note">' + esc(note) + "</div>" : ""));
        tiles.push({ el: c, run: onClick || function () {} });
        return c;
    }

    function nextHeroCard() {
        var nx = tApi() ? tApi().next() : null;
        if (!nx) {
            return el("div", "praynext tasknext",
                '<div>' +
                '<div class="praynext__label">' + esc(APL.t("Next Task")) + "</div>" +
                '<div class="praynext__name tasknext__empty">' + esc(APL.t("No upcoming tasks")) + "</div>" +
                '<div class="praynext__date">' + esc(APL.t("Select Add Task below to schedule your tasks inside the launcher.")) + "</div>" +
                "</div>");
        }
        var dayTxt = tApi().dayLabel(nx.targetDay, nx.repeat);
        return el("div", "praynext tasknext",
            '<div>' +
            '<div class="praynext__label">' + esc(APL.t("Next Task")) + "</div>" +
            '<div class="praynext__name">' + esc(nx.title) + "</div>" +
            '<div class="praynext__date">' + esc(dayTxt) + (nx.repeat === "daily" || nx.repeat === "weekly" ? " · ↻" : "") + "</div>" +
            "</div>" +
            '<div class="praynext__time num">' + esc(tApi().hhmm(nx.time)) + "</div>" +
            '<div class="praynext__left">' + esc(tApi().left(nx.ms)) + "</div>");
    }

    function openTaskActions(item, rowEl) {
        var opts = [
            {
                label: APL.t("Edit Task"),
                icon: "sliders",
                run: function () {
                    initDraft(item.raw);
                    mode = "edit";
                    focusIndex = 0;
                    render();
                }
            },
            {
                label: item.done ? APL.t("Mark as Active") : APL.t("Mark as Done"),
                icon: item.done ? "reset" : "check",
                run: function () {
                    tApi().toggleDone(item.id);
                    render();
                }
            },
            {
                label: APL.t("Snooze 15 min"),
                icon: "timer",
                run: function () {
                    tApi().snooze(item.id, 15);
                    if (APL.toast) APL.toast(APL.t("Snoozed 15 minutes"), true);
                    render();
                }
            },
            {
                label: APL.t("Snooze 1 hour"),
                icon: "timer",
                run: function () {
                    tApi().snooze(item.id, 60);
                    if (APL.toast) APL.toast(APL.t("Snoozed 1 hour"), true);
                    render();
                }
            },
            {
                label: APL.t("Delete Task"),
                icon: "trash",
                destructive: true,
                danger: true,
                run: function () {
                    tApi().remove(item.id);
                    if (APL.toast) APL.toast(APL.t("Task deleted"), true);
                    render();
                }
            }
        ];
        if (APL.contextMenu && typeof APL.contextMenu.open === "function" && rowEl) {
            APL.contextMenu.open(rowEl, opts);
        } else if (typeof APL.alert === "function") {
            APL.alert({
                title: item.title,
                message: tApi().dayLabel(item.targetDay, item.repeat) + " · " + tApi().hhmm(item.time),
                buttons: opts.concat([{ label: APL.t("Cancel") }])
            });
        } else {
            tApi().toggleDone(item.id);
            render();
        }
    }

    function buildMain() {
        bodyEl.innerHTML = "";
        tiles = [];
        titleEl.textContent = APL.t("Tasks");
        subEl.textContent = APL.t("Schedule tasks inside the launcher and see the live countdown until the next task.");

        bodyEl.appendChild(nextHeroCard());

        var showHome = sys.pref("showNextTask") !== false;
        var alertsOn = sys.pref("taskAlerts") !== false;

        var actionsRow = el("div", "aplx-cards");
        actionsRow.appendChild(card(
            APL.t("Add Task"),
            "＋ " + APL.t("New Task"),
            APL.t("Add a task with custom title, time, and daily or one-time schedule."),
            function () {
                initDraft(null);
                mode = "edit";
                focusIndex = 0;
                render();
            },
            { cls: "aplx-badge--on", text: "NEW" }
        ));
        actionsRow.appendChild(card(
            APL.t("Show Next Task Countdown"),
            showHome ? APL.t("On") : APL.t("Off"),
            APL.t("Shows how much time is left until the next task on the Home Screen."),
            function () {
                sys.setPref("showNextTask", !showHome);
                render();
            },
            { cls: showHome ? "aplx-badge--on" : "aplx-badge--off", text: showHome ? APL.t("On") : APL.t("Off") }
        ));
        actionsRow.appendChild(card(
            APL.t("Task Alerts"),
            alertsOn ? APL.t("On") : APL.t("Off"),
            APL.t("Plays a sound alert through Vetro even if another app is open."),
            function () {
                sys.setPref("taskAlerts", !alertsOn);
                render();
            },
            { cls: alertsOn ? "aplx-badge--on" : "aplx-badge--off", text: alertsOn ? APL.t("On") : APL.t("Off") }
        ));
        actionsRow.appendChild(card(
            APL.t("Clear Finished"),
            "✓",
            APL.t("Removes completed and past one-time tasks from the list."),
            function () {
                var n = tApi().clearFinished();
                if (APL.toast) APL.toast(n ? APL.t("Cleared {n} finished tasks", { n: n }) : APL.t("Nothing to clear"), true);
                render();
            }
        ));
        bodyEl.appendChild(actionsRow);

        var items = tApi() ? tApi().list() : [];
        var listWrap = el("div", "aplx-list task-list");
        if (!items.length) {
            var empty = el("div", "aplx-row task-row--empty",
                '<div class="aplx-row__main">' +
                '<span class="aplx-row__label">' + esc(APL.t("Your task list is empty")) + "</span>" +
                '<span class="aplx-row__sub">' + esc(APL.t("Press OK here to add your first task now.")) + "</span>" +
                "</div>" +
                '<span class="aplx-badge aplx-badge--on">＋ ' + esc(APL.t("Add Task")) + "</span>");
            tiles.push({
                el: empty,
                run: function () { initDraft(null); mode = "edit"; focusIndex = 0; render(); }
            });
            listWrap.appendChild(empty);
        } else {
            items.forEach(function (it) {
                var badgeCls = "aplx-badge--on";
                var badgeTxt = "";
                var icon = "⏳ ";
                if (it.status === "upcoming") {
                    badgeCls = "aplx-badge--on";
                    badgeTxt = tApi().left(it.ms);
                    icon = "📋 ";
                } else if (it.status === "done") {
                    badgeCls = "aplx-badge--off";
                    badgeTxt = APL.t("Done") + " ✓";
                    icon = "✓ ";
                } else {
                    badgeCls = "aplx-badge--warn";
                    badgeTxt = APL.t("Past due");
                    icon = "⏰ ";
                }
                var sub = tApi().dayLabel(it.targetDay, it.repeat) + " · " + tApi().hhmm(it.time) +
                          (it.repeat === "daily" ? " · " + APL.t("Repeats daily") : it.repeat === "weekly" ? " · " + APL.t("Repeats weekly") : "");
                var row = el("div", "aplx-row task-row" + (it.status === "done" ? " is-done" : ""),
                    '<div class="aplx-row__main">' +
                    '<span class="aplx-row__label">' + icon + esc(it.title) + "</span>" +
                    '<span class="aplx-row__sub num">' + esc(sub) + "</span>" +
                    "</div>" +
                    '<span class="aplx-badge ' + badgeCls + '">' + esc(badgeTxt) + "</span>");
                tiles.push({ el: row, run: function () { openTaskActions(it, row); } });
                listWrap.appendChild(row);
            });
        }
        bodyEl.appendChild(listWrap);
        hintEl.textContent = APL.t("OK on a task for options · Back to return");
    }

    function stepperRow(label, sub, valueText, onStep, onOk) {
        var row = el("div", "aplx-row task-stepper",
            '<div class="aplx-row__main">' +
            '<span class="aplx-row__label">' + esc(label) + "</span>" +
            (sub ? '<span class="aplx-row__sub">' + esc(sub) + "</span>" : "") +
            "</div>" +
            '<div class="task-stepper__ctrl" dir="ltr">' +
            '<span class="task-stepper__btn" data-dir="-1">◀</span>' +
            '<span class="task-stepper__val num">' + esc(valueText) + "</span>" +
            '<span class="task-stepper__btn" data-dir="1">▶</span>' +
            "</div>");
        row._step = onStep;
        row.addEventListener("mousedown", function (ev) {
            var btn = ev.target && ev.target.getAttribute && ev.target.getAttribute("data-dir");
            if (btn) {
                ev.preventDefault();
                ev.stopPropagation();
                onStep(parseInt(btn, 10));
            }
        });
        tiles.push({
            el: row,
            run: onOk || function () { onStep(1); }
        });
        return row;
    }

    function openInlineTitleInput(cardEl) {
        var existingInput = cardEl.querySelector("input");
        if (existingInput) { existingInput.focus(); return; }
        var host = cardEl.querySelector(".task-title-display");
        if (!host) return;
        var inp = document.createElement("input");
        inp.type = "text";
        inp.className = "task-inline-input";
        inp.maxLength = 80;
        inp.value = draft.title || "";
        inp.placeholder = APL.t("Type task name…");
        host.innerHTML = "";
        host.appendChild(inp);
        inp.focus();
        try { inp.setSelectionRange(inp.value.length, inp.value.length); } catch (e) {}

        var committed = false;
        function finish(keep) {
            if (committed) return;
            committed = true;
            if (keep) draft.title = String(inp.value || "").trim();
            inp.blur();
            render();
        }
        inp.addEventListener("keydown", function (e) {
            e.stopPropagation();
            if (e.keyCode === 13) { e.preventDefault(); finish(true); }
            else if (e.keyCode === 27 || e.keyCode === 10009) { e.preventDefault(); finish(false); }
        });
        inp.addEventListener("blur", function () { finish(true); });
    }

    function saveDraft() {
        var cleanTitle = String(draft.title || "").trim();
        if (!cleanTitle) {
            if (APL.toast) APL.toast(APL.t("Please enter or choose a task name first"));
            focusIndex = 0;
            render();
            return;
        }
        var repeat = draft.dayMode === -1 ? "daily" : draft.dayMode <= -2 ? "weekly" : "once";
        var weekdayNo = draft.dayMode <= -2 ? -2 - draft.dayMode : undefined;
        var dateIso = repeat !== "once" ? tApi().todayKey() : tApi().dayPlus(draft.dayMode, tApi().todayKey());
        var hhmm = draftTimeString();

        /* If user chose Today with a time that already passed, smartly schedule for Tomorrow if once */
        if (repeat === "once" && draft.dayMode === 0) {
            var parts = dateIso.split("-");
            var check = new Date(+parts[0], +parts[1] - 1, +parts[2], draft.hour, draft.minute, 0, 0);
            if (check.getTime() <= Date.now()) {
                dateIso = tApi().dayPlus(1, tApi().todayKey());
            }
        }

        if (draft.editId) {
            tApi().update(draft.editId, {
                title: cleanTitle,
                date: dateIso,
                time: hhmm,
                repeat: repeat,
                wd: weekdayNo,
                done: false,
                doneDate: ""
            });
        } else {
            tApi().add({
                title: cleanTitle,
                date: dateIso,
                time: hhmm,
                repeat: repeat,
                wd: weekdayNo
            });
        }

        mode = "main";
        focusIndex = 0;
        render();
        var nx = tApi().next();
        if (APL.toast) {
            APL.toast(nx
                ? (APL.t("Task saved") + " · " + tApi().left(nx.ms))
                : APL.t("Task saved"), true);
        }
    }

    function buildEdit() {
        bodyEl.innerHTML = "";
        tiles = [];
        titleEl.textContent = draft.editId ? APL.t("Edit Task") : APL.t("Add New Task");
        subEl.textContent = APL.t("Use Up/Down to move, Left/Right to adjust the time & day, and OK to select.");

        var listWrap = el("div", "aplx-list task-form");

        /* 1. Task Title Input Row */
        var titleRow = el("div", "aplx-row task-title-row",
            '<div class="aplx-row__main">' +
            '<span class="aplx-row__label">' + esc(APL.t("Task Name")) + "</span>" +
            '<span class="aplx-row__sub task-title-display">' +
            (draft.title ? '<strong>' + esc(draft.title) + "</strong>" : esc(APL.t("Press OK to type task name…"))) +
            "</span>" +
            "</div>" +
            '<span class="aplx-badge aplx-badge--on">✎ ' + esc(APL.t("Typing")) + "</span>");
        tiles.push({ el: titleRow, run: function () { openInlineTitleInput(titleRow); } });
        listWrap.appendChild(titleRow);

        /* 2. On-Screen Remote Keyboard Row (100% remote-friendly fallback) */
        var kbdRow = el("div", "aplx-row",
            '<div class="aplx-row__main">' +
            '<span class="aplx-row__label">⌨ ' + esc(APL.t("On-Screen Remote Keyboard (Arabic / English)")) + "</span>" +
            '<span class="aplx-row__sub">' + esc(APL.t("Write the task name directly using the remote arrows.")) + "</span>" +
            "</div>" +
            '<span class="aplx-badge aplx-badge--on">AR / EN</span>');
        tiles.push({
            el: kbdRow,
            run: function () {
                kbdLang = APL.lang === "ar" ? "ar" : "en";
                mode = "kbd";
                focusIndex = 0;
                render();
            }
        });
        listWrap.appendChild(kbdRow);

        /* 3. Quick Presets Stepper */
        var presetLabel = draft.presetIdx >= 0 ? APL.t(PRESETS[draft.presetIdx]) : APL.t("Choose a quick template…");
        listWrap.appendChild(stepperRow(
            APL.t("Quick Templates"),
            APL.t("Left / Right or OK to fill a ready task title instantly."),
            presetLabel,
            function (dir) {
                var len = PRESETS.length;
                if (draft.presetIdx < 0) draft.presetIdx = dir > 0 ? 0 : len - 1;
                else draft.presetIdx = (draft.presetIdx + dir + len) % len;
                draft.title = APL.t(PRESETS[draft.presetIdx]);
                render();
            }
        ));

        /* 4. Day / Repeat Stepper */
        listWrap.appendChild(stepperRow(
            APL.t("Day & Repeat"),
            APL.t("Choose Today, Tomorrow, a future date, Every day, or one weekday every week."),
            draftDayLabel(),
            function (dir) {
                var nextMode = draft.dayMode + dir;
                if (nextMode < -8) nextMode = 30;
                if (nextMode > 30) nextMode = -8;
                draft.dayMode = nextMode;
                render();
            }
        ));

        /* 5. Hour Stepper */
        listWrap.appendChild(stepperRow(
            APL.t("Hour"),
            APL.t("Scheduled time: {time}", { time: tApi().hhmm(draftTimeString()) }),
            draftHourLabel(),
            function (dir) {
                draft.hour = (draft.hour + dir + 24) % 24;
                render();
            }
        ));

        /* 6. Minute Stepper */
        listWrap.appendChild(stepperRow(
            APL.t("Minute"),
            APL.t("Left / Right steps 5 min · OK steps 1 min."),
            ":" + pad(draft.minute),
            function (dir) {
                draft.minute = (draft.minute + dir * 5 + 60) % 60;
                render();
            },
            function () {
                draft.minute = (draft.minute + 1) % 60;
                render();
            }
        ));

        /* 7. Save Button */
        var saveRow = el("div", "aplx-row task-save-row",
            '<div class="aplx-row__main">' +
            '<span class="aplx-row__label">✓ ' + esc(APL.t("Save Task")) + "</span>" +
            '<span class="aplx-row__sub">' +
            esc((draft.title || APL.t("Untitled")) + " — " + draftDayLabel() + " · " + tApi().hhmm(draftTimeString())) +
            "</span>" +
            "</div>" +
            '<span class="aplx-badge aplx-badge--on">' + esc(APL.t("Save")) + "</span>");
        tiles.push({ el: saveRow, run: saveDraft });
        listWrap.appendChild(saveRow);

        /* 8. Cancel Button */
        var cancelRow = el("div", "aplx-row",
            '<div class="aplx-row__main">' +
            '<span class="aplx-row__label">' + esc(APL.t("Cancel")) + "</span>" +
            "</div>");
        tiles.push({
            el: cancelRow,
            run: function () { mode = "main"; focusIndex = 0; render(); }
        });
        listWrap.appendChild(cancelRow);

        bodyEl.appendChild(listWrap);
        hintEl.textContent = APL.t("Left / Right to adjust · OK to select · Back to cancel");
    }

    function buildKeyboard() {
        bodyEl.innerHTML = "";
        tiles = [];
        titleEl.textContent = APL.t("Task Name");
        subEl.textContent = APL.t("Select letters with OK · Back when done.");

        var previewBox = el("div", "task-kbd-preview",
            '<span class="task-kbd-preview__text">' +
            (draft.title ? esc(draft.title) : '<span class="task-kbd-preview__ph">' + esc(APL.t("Type task name…")) + "</span>") +
            '<span class="task-kbd-caret">|</span></span>');
        bodyEl.appendChild(previewBox);

        var rows = kbdLang === "ar" ? KBD_AR : KBD_EN;
        var gridWrap = el("div", "task-kbd");
        rows.forEach(function (r) {
            var rEl = el("div", "task-kbd__row");
            r.forEach(function (ch) {
                var k = el("div", "task-kbd__key", esc(ch));
                tiles.push({
                    el: k,
                    run: function () {
                        if (draft.title.length < 80) {
                            draft.title += ch;
                            render();
                        }
                    }
                });
                rEl.appendChild(k);
            });
            gridWrap.appendChild(rEl);
        });

        /* Action bar: Space, Backspace, Clear, Switch AR/EN, Done */
        var ctrlRow = el("div", "task-kbd__row task-kbd__row--actions");
        var actions = [
            { label: APL.t("Space"), cls: "task-kbd__key--wide", run: function () { if (draft.title.length < 80) { draft.title += " "; render(); } } },
            { label: "⌫ " + APL.t("Delete"), cls: "task-kbd__key--act", run: function () { draft.title = draft.title.slice(0, -1); render(); } },
            { label: APL.t("Clear"), cls: "task-kbd__key--act", run: function () { draft.title = ""; render(); } },
            { label: kbdLang === "ar" ? "English" : "العربية", cls: "task-kbd__key--act", run: function () { kbdLang = kbdLang === "ar" ? "en" : "ar"; focusIndex = 0; render(); } },
            { label: "✓ " + APL.t("Done"), cls: "task-kbd__key--done", run: function () { mode = "edit"; focusIndex = 3; render(); } }
        ];
        actions.forEach(function (a) {
            var b = el("div", "task-kbd__key " + a.cls, esc(a.label));
            tiles.push({ el: b, run: a.run });
            ctrlRow.appendChild(b);
        });
        gridWrap.appendChild(ctrlRow);

        bodyEl.appendChild(gridWrap);
        hintEl.textContent = APL.t("OK to type · Back to return to task form");
    }

    function buildDom() {
        root = el("div", "aplpage aplpage--tasks aplpage--glass");
        var head = el("div", "aplpage__head");
        var wrap = el("div", "aplpage__titlewrap");
        titleEl = el("h1", "aplpage__title");
        subEl = el("p", "aplpage__sub");
        wrap.appendChild(titleEl);
        wrap.appendChild(subEl);
        head.appendChild(wrap);
        bodyEl = el("div", "aplpage__body");
        hintEl = el("p", "aplpage__hint");
        root.appendChild(head);
        root.appendChild(bodyEl);
        root.appendChild(hintEl);
        document.body.appendChild(root);

        nav = new APL.Nav({
            rows: true,     /* v7.0.5: LEFT/RIGHT stay in the row */
            onFocus: function (i) { focusIndex = i; },
            onSelect: function (i) { if (tiles[i] && tiles[i].run) tiles[i].run(); },
            onKey: function (code) {
                var cur = nav.current();
                if (mode === "edit" && cur && cur._step && (code === APL.KEY.LEFT || code === APL.KEY.RIGHT)) {
                    if (APL.sound) APL.sound.tick();
                    cur._step(code === APL.KEY.RIGHT ? 1 : -1);
                    return true;
                }
                return false;
            },
            onBack: function () {
                if (mode === "kbd") { mode = "edit"; focusIndex = 0; render(); return; }
                if (mode === "edit") { mode = "main"; focusIndex = 0; render(); return; }
                close();
            }
        });
    }

    function render() {
        var keep = Math.max(0, focusIndex);
        if (mode === "kbd") buildKeyboard();
        else if (mode === "edit") buildEdit();
        else buildMain();
        nav.setTiles(tiles.map(function (t) { return t.el; }), true);
        nav.focus(tiles.length ? Math.min(keep, tiles.length - 1) : 0);
    }

    function open(initialMode) {
        if (!root) buildDom();
        if (initialMode === "add") {
            initDraft(null);
            mode = "edit";
        } else {
            mode = "main";
        }
        focusIndex = 0;
        openFlag = true;
        render();
        root.classList.add("is-open");
        document.body.classList.add("has-aplpage");
        APL.pushNav(nav);
        clearInterval(tickTimer);
        tickTimer = setInterval(function () {
            if (openFlag && mode === "main" && !(APL.contextMenu && APL.contextMenu.isOpen())) render();
        }, 20000);
    }

    function close() {
        if (!openFlag) return;
        if (APL.contextMenu && APL.contextMenu.isOpen()) APL.contextMenu.close();
        openFlag = false;
        clearInterval(tickTimer);
        root.classList.remove("is-open");
        document.body.classList.remove("has-aplpage");
        APL.popNav(nav);
    }

    APL.tasksPage = {
        open: open,
        close: close,
        isOpen: function () { return openFlag; },
        refresh: function () { if (openFlag && mode === "main") render(); }
    };

    if (tApi()) tApi().onChange(function () { if (openFlag && mode === "main") render(); });
    sys.onPref("clockFormat", function () { if (openFlag) render(); });
})(window);
