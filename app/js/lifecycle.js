/* ============================================================
   APL Launcher — Lifecycle Management (APL.lifecycle)
   Centralized scope, timer suspension, audio teardown, and cache trimmer.
   ES2019 / Chromium 76 compatible.
   ============================================================ */
(function (global) {
    "use strict";

    var APL = global.APL = global.APL || {};
    var scopes = {}, byNav = [], trimmers = [], suspended = false;

    function Scope(name) {
        this.name = name;
        this.items = [];
        this.timers = [];
        this.audios = [];
        this.dead = false;
    }

    Scope.prototype.on = function (target, type, fn, opts) {
        if (this.dead || !target) return fn;
        target.addEventListener(type, fn, opts);
        this.items.push(function () {
            try { target.removeEventListener(type, fn, opts); } catch (e) {}
        });
        return fn;
    };

    Scope.prototype.timeout = function (fn, ms, keep) {
        var t = { fn: fn, ms: ms, due: Date.now() + ms, keep: !!keep, id: 0, once: true };
        this._arm(t);
        this.timers.push(t);
        return t;
    };

    Scope.prototype.interval = function (fn, ms, keep) {
        var t = { fn: fn, ms: ms, keep: !!keep, id: 0, once: false };
        this._arm(t);
        this.timers.push(t);
        return t;
    };

    Scope.prototype._arm = function (t) {
        var self = this, ms = t.once ? Math.max(0, t.due - Date.now()) : t.ms;
        t.id = (t.once ? setTimeout : setInterval)(function () {
            if (t.once) self.clear(t);
            try {
                t.fn();
            } catch (e) {
                setTimeout(function () { throw e; }, 0);
            }
        }, ms);
    };

    Scope.prototype.clear = function (t) {
        if (!t) return;
        clearTimeout(t.id);
        clearInterval(t.id);
        t.id = 0;
        var i = this.timers.indexOf(t);
        if (i >= 0) this.timers.splice(i, 1);
    };

    Scope.prototype.audio = function (el) {
        if (el && this.audios.indexOf(el) < 0) this.audios.push(el);
        return el;
    };

    Scope.prototype.own = function (disposeFn) {
        if (typeof disposeFn === "function") this.items.push(disposeFn);
    };

    Scope.prototype.suspend = function () {
        this.timers.slice().forEach(function (t) {
            if (t.keep || !t.id) return;
            clearTimeout(t.id);
            clearInterval(t.id);
            t.id = 0;
            if (t.once) t.remain = Math.max(0, t.due - Date.now());
        });
    };

    Scope.prototype.resume = function () {
        var self = this;
        this.timers.slice().forEach(function (t) {
            if (t.keep || t.id) return;
            if (t.once) t.due = Date.now() + (t.remain || 0);
            self._arm(t);
        });
    };

    Scope.prototype.dispose = function () {
        if (this.dead) return;
        this.dead = true;
        this.timers.slice().forEach(function (t) {
            clearTimeout(t.id);
            clearInterval(t.id);
        });
        this.items.forEach(function (f) {
            try { f(); } catch (e) {}
        });
        this.audios.forEach(function (a) {
            try {
                a.pause();
                a.removeAttribute("src");
                a.load();
            } catch (e) {}
        });
        this.timers = [];
        this.items = [];
        this.audios = [];
        delete scopes[this.name];
    };

    APL.lifecycle = {
        scope: function (name) {
            return scopes[name] || (scopes[name] = new Scope(name));
        },
        scopeFor: function (nav, name) {
            var s = this.scope(name);
            byNav.push({ nav: nav, name: name });
            return s;
        },
        navClosed: function (nav) {
            for (var i = byNav.length - 1; i >= 0; i--) {
                if (byNav[i].nav === nav) {
                    var n = byNav[i].name;
                    byNav.splice(i, 1);
                    if (scopes[n]) scopes[n].dispose();
                }
            }
            APL.lifecycle.trim("page-closed");
        },
        onTrim: function (fn) {
            if (typeof fn === "function") trimmers.push(fn);
        },
        trim: function (why) {
            trimmers.forEach(function (f) {
                try { f(why); } catch (e) {}
            });
        },
        stats: function () {
            var o = { scopes: 0, listeners: 0, timers: 0, audios: 0 };
            Object.keys(scopes).forEach(function (k) {
                var s = scopes[k];
                o.scopes++;
                o.listeners += s.items.length;
                o.timers += s.timers.length;
                o.audios += s.audios.length;
            });
            return o;
        }
    };

    if (global.document) {
        global.document.addEventListener("visibilitychange", function () {
            var hid = global.document.hidden;
            if (hid === suspended) return;
            suspended = hid;
            Object.keys(scopes).forEach(function (k) {
                scopes[k][hid ? "suspend" : "resume"]();
            });
            if (hid) APL.lifecycle.trim("suspend");
        });
    }

})(window);
