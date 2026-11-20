/* ============================================================
   navigation.js — remote focus engine.

   - Nav: a list of focusable elements. The arrows go to the
     nearest element in that direction (on-screen geometry).
   - Screen stack: the Home Screen, Settings and Control Center
     each have their own Nav. Only the top screen gets the keys.
     APL.pushNav(nav) on opening, APL.popNav(nav) on closing.
   - Global shortcuts (APL.hotkeys): handled before the active screen.
   - Long press on OK (onLongPress option), as on Apple TV: a short
     press opens on release, a held press opens the menu.
   - v7.0.5: opt-in { rows: true }: LEFT/RIGHT stay inside the visible row.
   ============================================================ */
(function (global) {
    "use strict";

    var KEY = {
        LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40,
        ENTER: 13,
        RETURN: 10009,          // Back key on the Samsung remote
        MEDIA_PLAY: 415,
        MEDIA_PLAY_PAUSE: 10252,
        RED: 403, GREEN: 404, YELLOW: 405, BLUE: 406,
        INFO: 457,
        // PC preview: Esc / Backspace = Back key
        ESC: 27, BACKSPACE: 8
    };

    function Nav(opts) {
        opts = opts || {};
        this.tiles = [];
        this.index = -1;
        this.onFocus = opts.onFocus || function () {};
        this.onSelect = opts.onSelect || function () {};
        this.onBack = opts.onBack || function () {};
        this.onEdge = opts.onEdge || function () {};   // arrow with no neighbour
        this.onKey = opts.onKey || null;               // intercepts a key before navigation
        this.onLongPress = opts.onLongPress || null;   // OK held (context menu)
        this.canHold = opts.canHold || null;           // does this tile have a long-press action?
        this.onHoldStart = opts.onHoldStart || null;   // OK pressed: visual feedback without waiting
        this.onHoldCancel = opts.onHoldCancel || null; // it turned out to be a long press
        this.crossWeight = opts.crossWeight || 3;
        /* Some Tizen 6.5 remotes stamp each physical UP/DOWN event as a
           rapid repeat. Screens that are explicit vertical lists can opt out
           of the global repeat filter, so every press reaches their own list
           step exactly as the remote sent it. */
        this.rawArrowKeys = opts.rawArrowKeys === true;
        /* v7.0.5 "rows" mode (opt-in, default off = old behaviour): LEFT/RIGHT only go to a tile that shares
           the current tile's visible row (the boxes overlap vertically) and STOP at the row's end, instead of
           jumping diagonally into another row. UP/DOWN stay the normal geometric choice. Works in RTL too
           (on-screen x). Found with tools/arrows-audit.py (Control Center, Tasks, Search). */
        this.rows = opts.rows === true;
    }

    /* ---------- long press on OK ----------
       The M8's infrared remote (measured on the screen): "released" only arrives 250 to
       340 ms after the press, even a short one. A held press gives "pressed, released, pressed…"
       with less than 5 ms between the release and the next press. Waiting longer than GAP_MS after
       a release is therefore pointless: it's a single press, and the action fires right away. */
    var LONG_MS = 600;
    var GAP_MS = 45;
    var HOLD_MIN_MS = 250;     // a repeat before this delay may still be a double press
    var seenKeyUp = false;     // the remote does send "key released"
    var swallowEnter = 0;      // after a long press: OK ignored while it stays pressed
    var holding = null;        // screen waiting for OK to be released

    /* ---------- one press = one action ----------
       A short press is only "released" 250 to 340 ms later, and a slightly long press gives
       system repeats and "released, pressed" pairs less than 5 ms apart: a single press sometimes
       moved two tiles, or three. These repeats only count after ARROW_HOLD_MS, at a
       steady pace, and only for the arrows. A real second press always counts: it
       arrives after a real release, or before HOLD_MIN_MS. */
    var ARROW_HOLD_MS = 600, ARROW_EVERY_MS = 170, REPRESS_GAP_MS = 20;
    var lastKey = 0, pressedAt = 0, actedAt = 0, releasedAt = 0;

    function isArrow(code) { return code >= KEY.LEFT && code <= KEY.DOWN; }

    function counts(e) {
        var code = e.keyCode, now = e.timeStamp;
        // Samsung remotes may report a held arrow as a rapid keyup/keydown pair
        // (typically <5 ms apart). A normal second press of the same arrow is a
        // new action even when the remote's keyup itself arrived 250–340 ms late.
        // The old 20 ms / 600 ms test classified many quick, separate presses as
        // a held-key repeat, making long vertical settings pages appear frozen.
        var rapidRepeat = code === lastKey && (e.repeat || now - releasedAt < 8);
        if (!rapidRepeat) {
            lastKey = code;
            pressedAt = actedAt = now;
            return true;
        }
        if (!isArrow(code) || now - pressedAt < ARROW_HOLD_MS || now - actedAt < ARROW_EVERY_MS) return false;
        actedAt = now;
        return true;
    }

    Nav.prototype.press = function (silent) {
        if (!silent && global.APL.sound) global.APL.sound.select();
        if (this.current()) this.onSelect(this.index, this.current());
    };

    Nav.prototype.holdStart = function () {
        var cur = this._hold;
        if (cur) {                                                // repeat during the press
            cur.rep = true;
            if (cur.release) { clearTimeout(cur.release); cur.release = null; }   // this "release" was a repeat
            if (Date.now() - cur.at >= HOLD_MIN_MS) this.holdFire(cur);           // the repeat confirms the long press
            return;
        }
        // Nothing to do on a long press here (row without a menu): OK acts right away
        if (this.canHold && !this.canHold(this.index)) { this.press(); return; }
        var self = this, h = this._hold = { idx: this.index, rep: false, release: null, at: Date.now() };
        holding = this;
        // The sound and the tile react as soon as it's pressed, without waiting to know if it will be long
        if (global.APL.sound) global.APL.sound.select();
        if (this.onHoldStart) this.onHoldStart(this.index);
        h.t = setTimeout(function () {
            if (self._hold !== h) return;
            if (h.release && !h.rep) return;                       // really released just before: single press
            // With no "release" and no repeat, there's no telling: single press.
            if (!h.rep && !seenKeyUp) { clearTimeout(h.t); self._hold = null; holding = null; self.press(true); return; }
            self.holdFire(h);
        }, LONG_MS);
    };

    Nav.prototype.holdFire = function (h) {
        clearTimeout(h.t);
        if (h.release) { clearTimeout(h.release); h.release = null; }
        this._hold = null; holding = null;
        if (this.onHoldCancel) this.onHoldCancel(h.idx);
        if (top() !== this) return;                                // another screen opened in the meantime
        swallowEnter = Date.now();
        if (this.tiles[h.idx]) this.onLongPress(h.idx, this.tiles[h.idx]);
    };

    Nav.prototype.holdEnd = function () {
        var h = this._hold;
        if (!h) return;
        clearTimeout(h.t);
        if (h.release) clearTimeout(h.release);
        this._hold = null; holding = null;
        this.press(true);
    };

    /* OK released: single press, unless OK comes back right away (held press repeating). */
    Nav.prototype.holdRelease = function () {
        var h = this._hold, self = this;
        if (!h) return;
        if (h.release) clearTimeout(h.release);
        h.release = setTimeout(function () { if (self._hold === h) self.holdEnd(); }, GAP_MS);
    };

    Nav.prototype.setTiles = function (tiles, keepIndex) {
        var prev = this.current();
        if (prev) prev.classList.remove("is-focused");
        this.tiles = tiles;
        var i = keepIndex && this.index >= 0 ? Math.min(this.index, tiles.length - 1) : 0;
        this.index = -1;
        if (tiles.length) this.focus(i);
    };

    Nav.prototype.current = function () { return this.tiles[this.index] || null; };

    Nav.prototype.focus = function (i) {
        if (i < 0 || i >= this.tiles.length) return;
        var prev = this.tiles[this.index];
        if (prev) prev.classList.remove("is-focused");
        this.index = i;
        var el = this.tiles[i];
        el.classList.add("is-focused");
        try {
            if (!el.closest || !el.closest(".settings__list, .settings__listwrap")) {
                var p = el.parentElement;
                var scroller = null;
                while (p && p !== document.body && p !== document.documentElement) {
                    var o = window.getComputedStyle(p).overflowY;
                    if ((o === "auto" || o === "scroll") && p.scrollHeight > p.clientHeight + 10) {
                        scroller = p;
                        break;
                    }
                    p = p.parentElement;
                }
                if (scroller) {
                    var er = el.getBoundingClientRect();
                    var sr = scroller.getBoundingClientRect();
                    var pad = 50;
                    if (er.top < sr.top + pad) {
                        scroller.scrollTop -= (sr.top + pad - er.top);
                    } else if (er.bottom > sr.bottom - pad) {
                        scroller.scrollTop += (er.bottom - (sr.bottom - pad));
                    }
                } else if (typeof el.scrollIntoViewIfNeeded === "function") {
                    el.scrollIntoViewIfNeeded(false);
                } else if (typeof el.scrollIntoView === "function") {
                    el.scrollIntoView({ block: "nearest", inline: "nearest" });
                }
            }
        } catch (e) {}
        this.onFocus(i, el);
    };

    function box(el) {
        var r = el.getBoundingClientRect();
        return { l: r.left, r: r.right, t: r.top, b: r.bottom, x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }
    /* Distance between position p and the interval [a, b] (0 if p is inside). */
    function gap(p, a, b) { return p < a ? a - p : (p > b ? p - b : 0); }

    /* Nearest neighbour in a direction. The element must lie in that
       direction; the gap on the other axis is penalised most, measured by
       overlap (a full-width tile just below is "aligned"
       even if its centre is elsewhere), then a little the distance between centres. */
    Nav.prototype.neighbour = function (dir) {
        var from = this.current();
        if (!from) return -1;
        var a = box(from);
        var best = -1, bestScore = Infinity;
        for (var i = 0; i < this.tiles.length; i++) {
            if (i === this.index) continue;
            var c = box(this.tiles[i]);
            var dx = c.x - a.x, dy = c.y - a.y, primary, cross, ok;
            switch (dir) {
                case "left":  ok = dx < -4; primary = -dx; cross = gap(a.y, c.t, c.b) * this.crossWeight + Math.abs(dy) * 0.3; break;
                case "right": ok = dx > 4;  primary = dx;  cross = gap(a.y, c.t, c.b) * this.crossWeight + Math.abs(dy) * 0.3; break;
                case "up":    ok = dy < -4; primary = -dy; cross = gap(a.x, c.l, c.r) * this.crossWeight + Math.abs(dx) * 0.3; break;
                case "down":  ok = dy > 4;  primary = dy;  cross = gap(a.x, c.l, c.r) * this.crossWeight + Math.abs(dx) * 0.3; break;
            }
            if (ok && this.rows && (dir === "left" || dir === "right") &&
                gap(a.y, c.t, c.b) > 0 && gap(c.y, a.t, a.b) > 0) ok = false;   // not on the same row
            if (!ok) continue;
            var score = primary + cross;
            if (score < bestScore) { bestScore = score; best = i; }
        }
        return best;
    };

    Nav.prototype.move = function (dir) {
        var n = this.neighbour(dir);
        if (n !== -1) { this.focus(n); if (global.APL.sound) global.APL.sound.tick(); }
        else {
            if (global.APL.sound) global.APL.sound.edge();
            this.onEdge(dir);
        }
    };

    Nav.prototype.handleKey = function (e) {
        var code = e.keyCode;
        if (this.onKey && this.onKey(code, e) === true) { e.preventDefault(); return; }
        switch (code) {
            case KEY.LEFT:  this.move("left");  break;
            case KEY.RIGHT: this.move("right"); break;
            case KEY.UP:    this.move("up");    break;
            case KEY.DOWN:  this.move("down");  break;
            case KEY.ENTER:
                if (this.onLongPress) { this.holdStart(); break; }
                this.press();
                break;
            case KEY.MEDIA_PLAY:
                this.press();
                break;
            case KEY.RETURN:
            case KEY.ESC:
            case KEY.BACKSPACE:
                if (global.APL.sound && global.APL.sound.back) global.APL.sound.back();
                this.onBack();
                break;
            default: return;
        }
        e.preventDefault();
    };

    /* ---------- screen stack ---------- */
    var stack = [];
    var hotkeys = [];

    function top() { return stack[stack.length - 1] || null; }

    function pushNav(nav) {
        var prevNav = top();
        if (prevNav && prevNav.root) {
            var curF = prevNav.root.querySelector(".is-focused");
            if (curF) {
                var par = curF.parentNode;
                var idx = par ? Array.prototype.indexOf.call(par.children, curF) : 0;
                nav.__ret = { el: curF, parent: par, idx: idx };
            }
        }
        var i = stack.indexOf(nav);
        if (i !== -1) stack.splice(i, 1);
        stack.push(nav);
    }
    function popNav(nav) {
        var i = stack.indexOf(nav);
        if (i !== -1) stack.splice(i, 1);
        try { if (global.APL && global.APL.lifecycle) global.APL.lifecycle.navClosed(nav); } catch (e) {}

        var ret = nav ? nav.__ret : null;
        if (ret) {
            global.requestAnimationFrame(function () {
                var targetNav = top();
                if (!targetNav) return;
                if (ret.el && ret.el.offsetParent !== null) {
                    if (targetNav.setFocus) targetNav.setFocus(ret.el);
                    else {
                        var old = targetNav.root ? targetNav.root.querySelector(".is-focused") : null;
                        if (old) old.classList.remove("is-focused");
                        ret.el.classList.add("is-focused");
                    }
                } else if (ret.parent && ret.parent.children && ret.parent.children.length) {
                    var safeIdx = Math.min(ret.idx, ret.parent.children.length - 1);
                    var fallback = ret.parent.children[safeIdx];
                    if (fallback) {
                        if (targetNav.setFocus) targetNav.setFocus(fallback);
                        else fallback.classList.add("is-focused");
                    }
                } else {
                    focusGuard(targetNav);
                }
            });
        } else {
            global.requestAnimationFrame(function () {
                var targetNav = top();
                if (targetNav) focusGuard(targetNav);
            });
        }

        // v1.99.0: a page or panel closed (Back): the Home Screen cards show the right time at once
        try { if (global.APL && global.APL.refreshWidgets) global.setTimeout(function () { global.APL.refreshWidgets(false); }, 0); } catch (e) {}
    }

    /* v8.7.6: Remote key acceleration for long list navigation (Quran, Hekam) */
    function keyAccel(onMove) {
        var last = 0, key = 0, held = 0, pending = 0, dir = 0, raf = 0, t0 = 0;
        function flush() {
            raf = 0;
            if (!pending) return;
            var n = pending;
            pending = 0;
            onMove(dir, n);
        }
        return {
            down: function (code, d) {
                var now = Date.now(), rep = (code === key && now - last <= 150);
                held = rep ? held + 1 : 0;
                if (!rep) t0 = now;
                key = code;
                last = now;
                dir = d;
                var hold = now - t0;
                var step = held < 3 ? 1 : hold < 1000 ? 2 : hold < 2000 ? 4 : 8;
                pending += step;
                if (!raf) raf = global.requestAnimationFrame(flush);
            },
            up: function () {
                held = 0;
                key = 0;
            }
        };
    }

    /* v8.7.6: Focus Guard (Layer 1 safety net) — restores focus if .is-focused was lost or detached */
    function focusGuard(nav) {
        if (!nav || !nav.root) return;
        var f = nav.root.querySelector(".is-focused");
        if (f && f.offsetParent !== null) return;
        var first = nav.root.querySelector(nav.focusSelector || "[data-focusable], .pw-btn, .aplx-card, .qa-pill, .dock__item, .tile, button");
        if (first) {
            if (nav.setFocus) nav.setFocus(first);
            else first.classList.add("is-focused");
        }
    }

    global.addEventListener("keydown", function (e) {
        // Typing in a field (a profile's name): the keys go to the field
        var ae = document.activeElement;
        if (ae && (ae.tagName === "INPUT" || ae.tagName === "TEXTAREA")) return;
        // Check remapped physical remote buttons before standard navigation
        if (global.APL && global.APL.handleRemapKey && global.APL.handleRemapKey(e.keyCode, e)) {
            e.preventDefault();
            if (e.stopPropagation) e.stopPropagation();
            return;
        }
        // OK keeps its own tracking: the long press. Settings and Prayer
        // have deterministic list/grid handlers; let their physical arrows
        // through even when the TV reports a rapid synthetic key-up/key-down.
        var activeNav = top();
        var rawArrow = !!(activeNav && activeNav.rawArrowKeys && isArrow(e.keyCode));
        if (e.keyCode !== KEY.ENTER && !rawArrow && !counts(e)) { e.preventDefault(); return; }
        if (e.keyCode === KEY.ENTER && swallowEnter) {
            // OK still held after the menu opened: nothing is activated.
            if (Date.now() - swallowEnter < 450) { swallowEnter = Date.now(); e.preventDefault(); return; }
            swallowEnter = 0;
        }
        if (global.APL.onAnyKey) global.APL.onAnyKey(e);
        for (var i = 0; i < hotkeys.length; i++) {
            if (hotkeys[i](e.keyCode, e) === true) { e.preventDefault(); return; }
        }
        var t = activeNav || top();
        if (t) {
            focusGuard(t);
            t.handleKey(e);
        }
    }, false);

    global.addEventListener("keyup", function (e) {
        if (global.APL && global.APL.handleRemapKey && global.APL.handleRemapKey(e.keyCode, e)) {
            e.preventDefault();
            if (e.stopPropagation) e.stopPropagation();
            return;
        }
        if (e.keyCode === lastKey) releasedAt = e.timeStamp;
        if (e.keyCode !== KEY.ENTER) return;
        seenKeyUp = true;
        // After a long press, OK is ignored until it is really released
        if (swallowEnter && Date.now() - swallowEnter < 450) { swallowEnter = Date.now(); e.preventDefault(); return; }
        swallowEnter = 0;
        if (holding) { holding.holdRelease(); e.preventDefault(); }
    }, false);

    // Mouse (PC preview): right-click = long press.
    global.addEventListener("contextmenu", function (e) {
        var t = top();
        if (!t || !t.onLongPress) return;
        for (var el = e.target; el && el !== document; el = el.parentNode) {
            var idx = t.tiles.indexOf(el);
            if (idx !== -1) { e.preventDefault(); t.focus(idx); t.onLongPress(idx, el); return; }
        }
    }, false);

    // Mouse (PC preview only): click = focus + OK on the top screen.
    global.addEventListener("click", function (e) {
        var t = top();
        if (!t) return;
        for (var el = e.target; el && el !== document; el = el.parentNode) {
            var idx = t.tiles.indexOf(el);
            if (idx !== -1) { t.focus(idx); t.onSelect(idx, el); return; }
        }
    }, false);

    Nav.prototype.attach = function () { pushNav(this); };

    global.APL = global.APL || {};
    global.APL.Nav = Nav;
    global.APL.KEY = KEY;
    global.APL.pushNav = pushNav;
    global.APL.popNav = popNav;
    global.APL.topNav = top;
    global.APL.keyAccel = keyAccel;
    global.APL.addHotkey = function (fn) { hotkeys.push(fn); };

})(window);
