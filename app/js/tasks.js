/* ============================================================
   tasks.js — Scheduled Tasks & Next-Task Countdown Engine.

   - Lets the user add, edit, complete, snooze, and delete tasks
     directly inside Salah Launcher.
   - Displays a live countdown showing the exact remaining time
     until the next upcoming task on the Home Screen status card
     (controlled by the "Show Next Task Countdown" option).
   - Syncs upcoming task timestamps to Vetro's persistent root
     daemon so task alerts fire even when another app is open.
   ============================================================ */
(function (global) {
    "use strict";

    var APL = global.APL, sys = APL && APL.sys;
    if (!APL || !sys) return;

    var STORAGE_KEY = "apl.tasks.list";
    var LAST_FIRED_KEY = "apl.tasks.lastFired";

    var tasks = [];
    var waiters = [];
    var lastFired = "";
    var syncedSig = "";
    var syncingVetro = false;

    function pad(n) { return (n < 10 ? "0" : "") + n; }

    function dateToIso(d) {
        return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
    }

    function todayKey() {
        return dateToIso(new Date());
    }

    function dayPlus(offsetDays, baseIso) {
        var d;
        if (baseIso && /^\d{4}-\d{2}-\d{2}$/.test(baseIso)) {
            var p = baseIso.split("-");
            d = new Date(+p[0], +p[1] - 1, +p[2] + (offsetDays || 0), 12, 0, 0);
        } else {
            var now = new Date();
            d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (offsetDays || 0), 12, 0, 0);
        }
        return dateToIso(d);
    }

    function at(dayIso, hhmm) {
        var m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || "").trim());
        var dp = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dayIso || "").trim());
        if (!m || !dp) return null;
        return new Date(+dp[1], +dp[2] - 1, +dp[3], +m[1], +m[2], 0, 0);
    }

    /* v1.2.117: weekly tasks (repeat "weekly", wd = 0 Sunday .. 6 Saturday) and tasks timed from the Dhuhr
       prayer (rel "dhuhr", relMin minutes before it; used by the Friday reminders). A recurring task is a
       daily or a weekly one; occursOn() says if it falls on a day. Nothing here changes what the daemon gets:
       the same { epoch, id } entries, only on the days that match. */
    function recurs(t) { return t.repeat === "daily" || t.repeat === "weekly"; }
    function weekdayOf(dayIso) {
        var dp = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dayIso || ""));
        return dp ? new Date(+dp[1], +dp[2] - 1, +dp[3], 12, 0, 0).getDay() : -1;
    }
    function occursOn(t, dayIso) {
        if (t.repeat === "daily") return true;
        if (t.repeat === "weekly") return weekdayOf(dayIso) === t.wd;
        return true;
    }
    function taskTime(t, dayIso) {
        if (t.rel === "dhuhr" && APL.prayer && APL.prayer.list) {
            try {
                var l = APL.prayer.list(dayIso), i, m;
                for (i = 0; i < l.length; i++) {
                    if (l[i].key !== "dhuhr") continue;
                    m = /^(\d{1,2}):(\d{2})/.exec(String(l[i].time || ""));
                    if (!m) break;
                    var mins = Math.max(0, +m[1] * 60 + +m[2] - (t.relMin || 30));
                    return pad(Math.floor(mins / 60)) + ":" + pad(mins % 60);
                }
            } catch (e) {}
        }
        return t.time;                      // no saved prayer times for that day: the time stored with the task
    }

    function loadTasks() {
        try {
            var raw = JSON.parse(global.localStorage.getItem(STORAGE_KEY) || "[]");
            tasks = Array.isArray(raw) ? raw.filter(function (t) { return t && t.id && t.title && t.time; }) : [];
        } catch (e) {
            tasks = [];
        }
        try { lastFired = global.localStorage.getItem(LAST_FIRED_KEY) || ""; } catch (e2) {}
    }

    function saveTasks() {
        try { global.localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)); } catch (e) {}
        syncedSig = "";
        render();
        syncToVetro(true);
        notify();
    }

    function notify() {
        waiters.forEach(function (fn) { try { fn(); } catch (e) {} });
    }

    function esc(s) {
        return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c];
        });
    }

    function hhmmText(hhmm) {
        var m = /^(\d{1,2}):(\d{2})/.exec(String(hhmm || ""));
        if (!m) return "—";
        var h = +m[1], mm = m[2];
        if (sys.pref("clockFormat") === "24") return pad(h) + ":" + mm;
        var ampm = h < 12 ? (APL.lang === "ar" ? "ص" : "AM") : (APL.lang === "ar" ? "م" : "PM");
        return ((h % 12) || 12) + ":" + mm + " " + ampm;
    }

    function leftText(ms) {
        if (!(ms > 0)) return APL.t("now");
        var mins = Math.max(0, Math.ceil(ms / 60000));
        if (mins <= 1) return APL.t("1 min left");
        if (mins < 60) return APL.t("{n} min left", { n: mins });
        if (mins < 1440) {
            var h = Math.floor(mins / 60), m = mins % 60;
            if (m === 0) return APL.t("{n} h left", { n: h });
            return APL.t("{h} h {m} min left", { h: h, m: m });
        }
        var d = Math.floor(mins / 1440), remH = Math.floor((mins % 1440) / 60);
        if (remH === 0) return APL.t("{d} d left", { d: d });
        return APL.t("{d} d {h} h left", { d: d, h: remH });
    }

    function dayLabel(dayIso, repeat) {
        if (repeat === "daily") return APL.t("Every day");
        if (repeat === "weekly") {
            var wdn = weekdayOf(dayIso), names = APL.lang === "ar"
                ? ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"]
                : ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
            return APL.t("Every {day}", { day: names[wdn] || "" });
        }
        var tk = todayKey();
        if (dayIso === tk) return APL.t("Today");
        if (dayIso === dayPlus(1, tk)) return APL.t("Tomorrow");
        var dp = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dayIso || ""));
        if (!dp) return dayIso || "";
        var dt = new Date(+dp[1], +dp[2] - 1, +dp[3], 12, 0, 0);
        try {
            return dt.toLocaleDateString(APL.locale || (APL.lang === "ar" ? "ar-EG" : "en-US"), {
                weekday: "short", month: "numeric", day: "numeric"
            });
        } catch (e) {
            return dp[3] + "/" + dp[2];
        }
    }

    /* Compute next scheduled Date for a task relative to `now` */
    function nextOccurrence(t, refDate) {
        var now = refDate || new Date();
        var tk = dateToIso(now);
        if (recurs(t)) {
            for (var off = 0; off < 9; off++) {
                var di = dayPlus(off, tk);
                if (!occursOn(t, di)) continue;
                if (t.doneDate === di) continue;
                var w = at(di, taskTime(t, di));
                if (w && w.getTime() > now.getTime()) return { at: w, dayIso: di };
            }
            return null;
        }
        if (t.done) return null;
        var onceAt = at(t.date || tk, t.time);
        if (!onceAt) return null;
        if (onceAt.getTime() > now.getTime()) return { at: onceAt, dayIso: t.date || tk };
        return null;
    }

    function decorateTask(t) {
        var now = new Date();
        var tk = dateToIso(now);
        var occ = nextOccurrence(t, now);
        var isDone = recurs(t) ? (t.doneDate === tk) : !!t.done;
        var status = "upcoming";
        var ms = 0;
        var targetAt = null;
        var targetDay = t.date || tk;

        if (occ) {
            status = "upcoming";
            targetAt = occ.at;
            targetDay = occ.dayIso;
            ms = occ.at.getTime() - now.getTime();
        } else if (isDone) {
            status = "done";
            targetAt = at(t.date || tk, t.time);
        } else {
            status = "overdue";
            targetAt = at(t.date || tk, t.time);
            ms = targetAt ? targetAt.getTime() - now.getTime() : 0;
        }

        return {
            id: t.id,
            title: t.title,
            date: t.date || tk,
            targetDay: targetDay,
            time: recurs(t) || t.rel ? taskTime(t, targetDay) : t.time,
            repeat: t.repeat || "once",
            done: isDone,
            status: status,
            at: targetAt,
            ms: ms,
            today: targetDay === tk,
            tomorrow: targetDay === dayPlus(1, tk),
            raw: t
        };
    }

    function list() {
        var decorated = tasks.map(decorateTask);
        var rank = { upcoming: 0, overdue: 1, done: 2 };
        decorated.sort(function (a, b) {
            if (rank[a.status] !== rank[b.status]) return rank[a.status] - rank[b.status];
            var ta = a.at ? a.at.getTime() : 0;
            var tb = b.at ? b.at.getTime() : 0;
            if (a.status === "upcoming") return ta - tb;
            return tb - ta;
        });
        return decorated;
    }

    function next() {
        var all = list();
        for (var i = 0; i < all.length; i++) {
            if (all[i].status === "upcoming" && all[i].ms > 0) return all[i];
        }
        return null;
    }

    function add(data) {
        if (!data || !String(data.title || "").trim()) return null;
        var tk = todayKey();
        var item = {
            id: "t_" + Date.now() + "_" + Math.floor(Math.random() * 10000),
            title: String(data.title).trim().slice(0, 80),
            date: (data.repeat === "daily" || data.repeat === "weekly") ? tk : (data.date || tk),
            time: cleanHHMM(data.time || "18:00"),
            repeat: data.repeat === "daily" ? "daily" : data.repeat === "weekly" ? "weekly" : "once",
            done: false,
            doneDate: "",
            createdAt: Date.now()
        };
        if (item.repeat === "weekly") {
            var wdv = parseInt(data.wd, 10);
            item.wd = (wdv >= 0 && wdv <= 6) ? wdv : weekdayOf(data.date || tk);
        }
        if (data.rel === "dhuhr") { item.rel = "dhuhr"; item.relMin = Math.max(0, Math.min(180, parseInt(data.relMin, 10) || 30)); }
        if (data.tag) item.tag = String(data.tag).slice(0, 20);
        tasks.push(item);
        saveTasks();
        return item;
    }

    function cleanHHMM(s) {
        var m = /^(\d{1,2}):(\d{1,2})$/.exec(String(s || "").trim());
        if (!m) return "18:00";
        var hh = Math.max(0, Math.min(23, parseInt(m[1], 10) || 0));
        var mm = Math.max(0, Math.min(59, parseInt(m[2], 10) || 0));
        return pad(hh) + ":" + pad(mm);
    }

    function update(id, patch) {
        for (var i = 0; i < tasks.length; i++) {
            if (tasks[i].id === id) {
                if (patch.title !== undefined && String(patch.title).trim()) {
                    tasks[i].title = String(patch.title).trim().slice(0, 80);
                }
                if (patch.date !== undefined) tasks[i].date = patch.date;
                if (patch.time !== undefined) tasks[i].time = cleanHHMM(patch.time);
                if (patch.repeat !== undefined) tasks[i].repeat = patch.repeat === "daily" ? "daily" : patch.repeat === "weekly" ? "weekly" : "once";
                if (patch.wd !== undefined) { var wdp = parseInt(patch.wd, 10); if (wdp >= 0 && wdp <= 6) tasks[i].wd = wdp; }
                if (tasks[i].repeat === "weekly" && !(tasks[i].wd >= 0 && tasks[i].wd <= 6)) tasks[i].wd = weekdayOf(tasks[i].date || todayKey());
                if (patch.time !== undefined) { delete tasks[i].rel; delete tasks[i].relMin; }     // a time typed by hand replaces "before Dhuhr"
                if (patch.done !== undefined) tasks[i].done = !!patch.done;
                if (patch.doneDate !== undefined) tasks[i].doneDate = patch.doneDate;
                saveTasks();
                return tasks[i];
            }
        }
        return null;
    }

    function remove(id) {
        var before = tasks.length;
        tasks = tasks.filter(function (t) { return t.id !== id; });
        if (tasks.length !== before) saveTasks();
    }

    function toggleDone(id) {
        var tk = todayKey();
        for (var i = 0; i < tasks.length; i++) {
            var t = tasks[i];
            if (t.id !== id) continue;
            if (recurs(t)) {
                t.doneDate = (t.doneDate === tk) ? "" : tk;
            } else {
                t.done = !t.done;
            }
            saveTasks();
            return t;
        }
        return null;
    }

    function snooze(id, minutes) {
        var mins = parseInt(minutes, 10) || 15;
        for (var i = 0; i < tasks.length; i++) {
            var t = tasks[i];
            if (t.id !== id) continue;
            var base = new Date(Date.now() + mins * 60000);
            t.date = dateToIso(base);
            t.time = pad(base.getHours()) + ":" + pad(base.getMinutes());
            if (recurs(t)) t.doneDate = "";
            else t.done = false;
            delete t.rel; delete t.relMin;               // the snoozed time is a fixed time
            saveTasks();
            return t;
        }
        return null;
    }

    function clearFinished() {
        var now = Date.now();
        var before = tasks.length;
        tasks = tasks.filter(function (t) {
            if (recurs(t)) return true;
            if (t.done) return false;
            var w = at(t.date || todayKey(), t.time);
            return !w || w.getTime() > now;
        });
        var removed = before - tasks.length;
        if (removed > 0) saveTasks();
        return removed;
    }

    /* Render Home Screen status row showing remaining time until next task */
    function clockParts(hhmm) {
        var m = /^(\d{1,2}):(\d{2})/.exec(String(hhmm || ""));
        if (!m) return { t: "—", s: "" };
        var h = +m[1], mm = m[2];
        if (sys.pref("clockFormat") === "24") return { t: (h < 10 ? "0" : "") + h + ":" + mm, s: "" };
        var ar = APL.lang === "ar";
        return { t: ((h % 12) || 12) + ":" + mm, s: h < 12 ? (ar ? "ص" : "AM") : (ar ? "م" : "PM") };
    }

    function render() {
        if (!APL.homeStatus) return;
        if (sys.pref("showNextTask") === false) {
            APL.homeStatus.clear("tasks");
            return;
        }
        var nx = next();
        if (!nx) {
            if (sys.pref("showEmptyTaskHint") !== false) {
                APL.homeStatus.set("tasks",
                    '<div class="statusx__card hc__row hc__row--task"><div class="hc__cell"><span class="hc__time"><span class="hc__t">—:—</span></span><span class="hc__label hc__label--task">📋 ' + APL.t("Tasks") + '</span></div><div class="hc__date"><span class="hc__dow">' + APL.t("Tasks") + '</span><span class="hc__greg">' + esc(APL.t("No upcoming tasks")) + '</span></div></div>', 30);
            } else {
                APL.homeStatus.clear("tasks");
            }
            return;
        }
        var tp = clockParts(nx.time);
        var whenPrefix = nx.today ? "" : (dayLabel(nx.targetDay, "once") + " · ");
        /* v7.2.0: full-width Home widget: the tasks window lists the next FOUR tasks, tidy rows (time, title, time left) */
        if (sys.pref("prayerWidgetFull") === true) {
            var four = list().filter(function (x) { return x.status === "upcoming" && x.ms > 0; }).slice(0, 4);
            var h4 = '<div class="statusx__card tk4"><div class="tk4__head">\uD83D\uDCCB ' + APL.t("Tasks") + '</div>';
            four.forEach(function (x, i) {
                var c = clockParts(x.time), pre = x.today ? "" : (dayLabel(x.targetDay, "once") + " \u00B7 ");
                h4 += '<div class="tk4__row' + (i === 0 ? " is-next" : "") + '"><span class="tk4__time">' + c.t + (c.s ? '<small>' + c.s + '</small>' : "") + '</span>' +
                    '<span class="tk4__title">' + esc(x.title) + '</span><span class="tk4__left">' + esc(pre + leftText(x.ms)) + '</span></div>';
            });
            APL.homeStatus.set("tasks", h4 + '</div>', 30);
            return;
        }
        var html = '<div class="statusx__card hc__row hc__row--task">' +
            '<div class="hc__cell">' +
                '<span class="status__clock hc__time"><span class="hc__t">' + tp.t + '</span><span class="hc__s">' + tp.s + '</span></span>' +
                '<span class="hc__label hc__label--task">📋 ' + APL.t("Next Task") + '</span>' +
            '</div>' +
            '<div class="hc__date">' +
                '<span class="hc__dow">' + esc(nx.title) + '</span>' +
                '<span class="hc__greg">' + esc(whenPrefix + leftText(nx.ms)) + '</span>' +
            '</div>' +
        '</div>';
        APL.homeStatus.set("tasks", html, 30);
    }

    /* Push upcoming 14-day task schedule to Vetro background supervisor */
    var retryAt = 0, retryStep = 0;
    function backOff() { retryStep = Math.min(retryStep + 1, 5); retryAt = Date.now() + Math.min(15000 * Math.pow(2, retryStep - 1), 300000); }
    document.addEventListener("visibilitychange", function () { if (!document.hidden) { retryAt = 0; } });
    function syncToVetro(force) {
        if (!APL.bgAudio || !APL.bgAudio.syncTaskSchedule || syncingVetro) return;
        var alertsOn = sys.pref("taskAlerts") !== false;
        var nowSec = Math.floor(Date.now() / 1000) - 180;
        var tk = todayKey();
        var entries = [];

        tasks.forEach(function (t) {
            if (recurs(t)) {
                for (var d = 0; d < 14; d++) {
                    var di = dayPlus(d, tk);
                    if (!occursOn(t, di)) continue;
                    if (t.doneDate === di) continue;
                    var tt = taskTime(t, di), w = at(di, tt);
                    if (!w) continue;
                    var sec = Math.floor(w.getTime() / 1000);
                    if (sec >= nowSec) {
                        entries.push({ epoch: sec, id: t.id + "@" + di + "_" + tt });
                    }
                }
            } else if (!t.done) {
                var wOnce = at(t.date || tk, t.time);
                if (wOnce) {
                    var secOnce = Math.floor(wOnce.getTime() / 1000);
                    if (secOnce >= nowSec) {
                        entries.push({ epoch: secOnce, id: t.id + "@" + (t.date || tk) + "_" + t.time });
                    }
                }
            }
        });

        entries.sort(function (a, b) { return a.epoch - b.epoch; });
        var sig = [alertsOn ? 1 : 0, entries.length, entries[0] ? entries[0].id + ":" + entries[0].epoch : ""].join("|");
        if (!force && sig === syncedSig) return;

        if (!force && Date.now() < retryAt) return;          // Vetro was not ready: wait before asking again
        syncingVetro = true;
        APL.bgAudio.available().then(function (ok) {
            if (!ok) { syncingVetro = false; backOff(); return; }
            return APL.bgAudio.syncTaskSchedule(entries, alertsOn).then(function () {
                syncedSig = sig;
                syncingVetro = false;
                retryStep = 0; retryAt = 0;
            });
        }).catch(function () {
            syncingVetro = false;
            backOff();
        });
    }

    function markFired(stamp) {
        lastFired = stamp;
        try { global.localStorage.setItem(LAST_FIRED_KEY, stamp); } catch (e) {}
    }

    function checkDueTasks() {
        var now = Date.now();
        var tk = todayKey();
        for (var i = 0; i < tasks.length; i++) {
            var t = tasks[i];
            var isDaily = recurs(t);
            var dayIso = isDaily ? tk : (t.date || tk);
            if (isDaily && !occursOn(t, tk)) continue;
            if (isDaily && t.doneDate === tk) continue;
            if (!isDaily && t.done) continue;
            var tm = isDaily ? taskTime(t, dayIso) : t.time;
            var w = at(dayIso, tm);
            if (!w) continue;
            var delta = now - w.getTime();
            var stamp = t.id + "@" + dayIso + "_" + tm;
            if (delta >= 0 && delta < 120000 && lastFired !== stamp) {
                (function (taskObj, dueStamp) {
                    var triggerLocal = function (skipSound) {
                        if (lastFired === dueStamp) return;
                        markFired(dueStamp);
                        if (APL.toast) APL.toast(APL.t("Task time: {title}", { title: taskObj.title }) + " — " + hhmmText(taskObj.rel ? taskTime(taskObj, todayKey()) : taskObj.time));
                        if (!skipSound && sys.pref("taskAlerts") !== false && APL.prayerAlert) {
                            APL.prayerAlert.play("task");
                        }
                        notify();
                    };
                    if (APL.bgAudio && APL.bgAudio.lastFired) {
                        APL.bgAudio.lastFired().then(function (lf) {
                            if (lf && lf.task === dueStamp) triggerLocal(true);
                            else triggerLocal(false);
                        }, function () { triggerLocal(false); });
                    } else {
                        triggerLocal(false);
                    }
                })(t, stamp);
                break;
            }
        }
    }

    function tick() {
        render();
        checkDueTasks();
        if (!syncedSig) syncToVetro(false);
    }

    loadTasks();
    setTimeout(function () {
        render();
        syncToVetro(false);
    }, 1900);
    APL.timers.every("tasks-tick", 15000, tick);   // v1.2.100: shared timer; skipped while hidden, as before

    sys.onPref("prayerWidgetFull", render);
    sys.onPref("showNextTask", render);
    sys.onPref("showEmptyTaskHint", render);
    sys.onPref("clockFormat", render);
    /* v1.2.117: the Friday reminders = three weekly tasks marked tag "friday": Al-Kahf at 09:00, salawat at 10:00,
       and 30 minutes before Dhuhr. Edit or delete them in Tasks like any other task. */
    function fridayList() { return tasks.filter(function (t) { return t.tag === "friday"; }); }
    function setFriday(on) {
        var have = fridayList();
        if (!on) {
            if (have.length) { tasks = tasks.filter(function (t) { return t.tag !== "friday"; }); saveTasks(); }
            return false;
        }
        if (have.length) return true;
        add({ title: APL.t("Friday: read Surat Al-Kahf"), repeat: "weekly", wd: 5, time: "09:00", tag: "friday" });
        add({ title: APL.t("Friday: send blessings on the Prophet ﷺ"), repeat: "weekly", wd: 5, time: "10:00", tag: "friday" });
        add({ title: APL.t("Friday: Dhuhr is near, get ready for the prayer"), repeat: "weekly", wd: 5, time: "11:15", rel: "dhuhr", relMin: 30, tag: "friday" });
        return true;
    }

    sys.onPref("taskAlerts", function () { syncToVetro(true); });

    APL.tasks = {
        list: list,
        next: next,
        add: add,
        update: update,
        remove: remove,
        toggleDone: toggleDone,
        snooze: snooze,
        clearFinished: clearFinished,
        hhmm: hhmmText,
        left: leftText,
        dayLabel: dayLabel,
        weekdayOf: weekdayOf,
        fridayOn: function () { return fridayList().length > 0; },
        setFriday: setFriday,
        todayKey: todayKey,
        dayPlus: dayPlus,
        onChange: function (fn) { if (typeof fn === "function") waiters.push(fn); }
    };
})(window);
