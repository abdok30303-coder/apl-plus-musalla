/* ============================================================
   ambient.js (v3.4.1, epic version v7.1.0, redesigned v8.7.0: gold frame, dial ring, prayer cards) - "Living Mihrab": a screen saver style (Settings > Screen Saver > Type).
   v7.1.0: the packaged mosque pictures (Al Masjid Al Haram, Al Masjid An Nabawi, Al Masjid Al Aqsa; images/wallpapers/)
   crossfade slowly with a gentle pan, under a tint that follows the real Fajr / Sunrise / Dhuhr / Asr / Maghrib / Isha
   times of the chosen city (APL.prayer.list), a big clock, the date, a ring that counts down to the next prayer, the
   five prayers along the bottom and a soft golden glow for two minutes after each adhan. The content drifts a few
   pixels every minute (OLED). The pan stops with Reduce Motion; the glow pulse and the tint fade follow "Living Mihrab
   motion" (ambientFx). No network, no audio, no blur. Started and stopped by js/screensaver.js. Untested on the TV.
   ============================================================ */
(function (global) {
    "use strict";
    var APL = global.APL;
    if (!APL || !APL.sys) return;
    var box = null, imgA = null, imgB = null, tintA = null, tintB = null, elG = null, elInner = null;
    var elT = null, elD = null, elN = null, elC = null, elP = null, elRing = null, elRow = null, elRingName = null;
    var timer = 0, drift = 0, rot = 0, front = 0, phaseNow = "", noMotion = false, pi = 0, pcur = 0, rowKey = "";
    var CIRC = 439.8;

    var PICS = [
        ["images/wallpapers/wp23-masjid-nabawi.webp", "\u0627\u0644\u0645\u0633\u062c\u062f \u0627\u0644\u0646\u0628\u0648\u064a \u0627\u0644\u0634\u0631\u064a\u0641"],
        ["images/wallpapers/wp21-masjid-haram.webp", "\u0627\u0644\u0645\u0633\u062c\u062f \u0627\u0644\u062d\u0631\u0627\u0645"],
        ["images/wallpapers/wp22-masjid-aqsa.webp", "\u0627\u0644\u0645\u0633\u062c\u062f \u0627\u0644\u0623\u0642\u0635\u0649"]
    ];
    var DAYS = ["\u0627\u0644\u0623\u062d\u062f", "\u0627\u0644\u0627\u062b\u0646\u064a\u0646", "\u0627\u0644\u062b\u0644\u0627\u062b\u0627\u0621", "\u0627\u0644\u0623\u0631\u0628\u0639\u0627\u0621", "\u0627\u0644\u062e\u0645\u064a\u0633", "\u0627\u0644\u062c\u0645\u0639\u0629", "\u0627\u0644\u0633\u0628\u062a"];

    /* top colour, bottom colour per phase of the day (a tint over the picture) */
    var SKY = {
        night:     ["#050914", "#142347"],
        dawn:      ["#1b2a52", "#c97b5a"],
        morning:   ["#2f6fb3", "#f0c987"],
        noon:      ["#1f6fc9", "#8fd0f5"],
        afternoon: ["#2b6ab0", "#f2b66b"],
        dusk:      ["#2a1f4d", "#e0703a"]
    };
    var TINT = { night: 0.5, dawn: 0.38, morning: 0.22, noon: 0.16, afternoon: 0.24, dusk: 0.4 };
    function p2(n) { return (n < 10 ? "0" : "") + n; }
    function dg(s) { try { return APL.digits ? APL.digits(String(s)) : String(s); } catch (e) { return String(s); } }
    function div(cls) { var d = document.createElement("div"); d.className = cls; return d; }

    /* v8.7.0: small sky / sun / moon marks for the five prayer cards (24 x 24, stroked in the card's colour) */
    function sv(p) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + p + "</svg>"; }
    var ICO = {
        fajr:    sv('<path d="M3 18h18M7 18a5 5 0 0 1 10 0M12 5v3M5.2 9.2l1.8 1.8M18.8 9.2L17 11"/>'),
        dhuhr:   sv('<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/>'),
        asr:     sv('<circle cx="12" cy="12" r="3.2"/><path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M6 6l1.4 1.4M16.6 16.6L18 18M6 18l1.4-1.4M16.6 7.4L18 6"/>'),
        maghrib: sv('<path d="M3 18h18M7 18a5 5 0 0 1 10 0M12 4.5v4M10 7l2 2 2-2"/>'),
        isha:    sv('<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>')
    };
    function hm(a) {
        var h = a.getHours(), m = a.getMinutes(), ar = String(APL.lang || "en").indexOf("ar") === 0;
        if (APL.sys.pref("clockFormat") === "24") return { t: dg(p2(h) + ":" + p2(m)), ap: "" };
        return { t: dg(((h % 12) || 12) + ":" + p2(m)), ap: h < 12 ? (ar ? "\u0635" : "AM") : (ar ? "\u0645" : "PM") };
    }

    function build(root) {
        box = div("amb");
        imgA = div("amb__img"); imgB = div("amb__img"); tintA = div("amb__tint"); tintB = div("amb__tint");
        elG = div("amb__glow");
        box.appendChild(imgA); box.appendChild(imgB); box.appendChild(tintA); box.appendChild(tintB);
        box.appendChild(div("amb__aura"));
        box.appendChild(div("amb__vig")); box.appendChild(elG);
        elInner = div("amb__in");
        /* the gold frame lives inside the drifting layer, so its lines never stay on the same pixels (OLED) */
        var frame = div("amb__frame");
        frame.appendChild(div("amb__cn amb__cn--tl")); frame.appendChild(div("amb__cn amb__cn--tr"));
        frame.appendChild(div("amb__cn amb__cn--bl")); frame.appendChild(div("amb__cn amb__cn--br"));
        elInner.appendChild(frame);
        var head = div("amb__head");
        elP = div("amb__place");
        head.appendChild(div("amb__ln amb__ln--a")); head.appendChild(elP); head.appendChild(div("amb__ln amb__ln--b"));
        var mid = div("amb__mid"), clk = div("amb__clk"), nxt = div("amb__nxt");
        elT = div("amb__t"); elD = div("amb__d");
        clk.appendChild(elT); clk.appendChild(div("amb__rule")); clk.appendChild(elD);
        elN = div("amb__n");
        var ring = div("amb__ring");
        ring.innerHTML = "<svg viewBox=\"0 0 160 160\" width=\"250\" height=\"250\"><defs><linearGradient id=\"ambGold\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\">" +
            "<stop offset=\"0\" stop-color=\"#fff1c2\"/><stop offset=\"0.55\" stop-color=\"#ffd36b\"/><stop offset=\"1\" stop-color=\"#e0953a\"/></linearGradient></defs>" +
            "<circle cx=\"80\" cy=\"80\" r=\"77\" class=\"amb__rtick\"></circle>" +
            "<circle cx=\"80\" cy=\"80\" r=\"70\" class=\"amb__rbg\"></circle>" +
            "<circle cx=\"80\" cy=\"80\" r=\"70\" class=\"amb__rfg\" transform=\"rotate(-90 80 80)\"></circle></svg>";
        elRing = ring.querySelector(".amb__rfg");
        elC = div("amb__c"); ring.appendChild(elC);
        nxt.appendChild(elN); nxt.appendChild(ring);
        mid.appendChild(clk); mid.appendChild(nxt);
        elRow = div("amb__row");
        elInner.appendChild(head); elInner.appendChild(mid); elInner.appendChild(elRow);
        box.appendChild(elInner);
        root.appendChild(box);
    }

    function pic() {
        var nextLayer = pcur ? imgA : imgB, oldLayer = pcur ? imgB : imgA, p = PICS[pi % PICS.length];
        nextLayer.style.backgroundImage = "url('" + p[0] + "')";
        nextLayer.classList.remove("is-on", "is-pan-a", "is-pan-b");
        void nextLayer.offsetWidth;
        nextLayer.classList.add("is-on", pi % 2 === 0 ? "is-pan-a" : "is-pan-b");
        oldLayer.classList.remove("is-on");
        elP.textContent = p[1];
        pcur = 1 - pcur; pi++;
        try { var pre = new Image(); pre.src = PICS[pi % PICS.length][0]; } catch (e) {}   // the next one is ready before the fade
    }

    function phase(now) {
        var L = [], i, at = {};
        try { L = APL.prayer && APL.prayer.list ? APL.prayer.list() : []; } catch (e) { L = []; }
        for (i = 0; i < L.length; i++) if (L[i].at) at[L[i].key] = L[i].at.getTime();
        if (!at.fajr || !at.maghrib) {                                  // no times at all: a plain day / night split
            var h = new Date(now).getHours();
            return h >= 6 && h < 18 ? "noon" : "night";
        }
        if (now < at.fajr) return "night";
        if (at.sunrise && now < at.sunrise) return "dawn";
        if (at.dhuhr && now < at.dhuhr) return "morning";
        if (at.asr && now < at.asr) return "noon";
        if (now < at.maghrib) return "afternoon";
        if (at.isha && now < at.isha) return "dusk";
        return "night";
    }
    function setSky(ph) {
        if (ph === phaseNow) return;
        var c = SKY[ph] || SKY.night, nx = front ? tintA : tintB, pv = front ? tintB : tintA;
        nx.style.background = "linear-gradient(180deg," + c[0] + "," + c[1] + ")";
        nx.style.opacity = String(TINT[ph] || 0.3); pv.style.opacity = "0";
        front = 1 - front; phaseNow = ph;
    }

    /* the five prayers along the bottom; rebuilt only when the list or the next prayer changes */
    function paintRow(L, nextKey, now) {
        var i, key = nextKey + "|", html = "";
        for (i = 0; i < L.length; i++) if (L[i].key !== "sunrise" && L[i].at) key += L[i].key + L[i].at.getTime() + (L[i].at.getTime() <= now ? "p" : "f") + ";";
        if (key === rowKey) return;
        rowKey = key;
        for (i = 0; i < L.length; i++) {
            if (L[i].key === "sunrise" || !L[i].at) continue;
            var a = L[i].at, f = hm(a), nx = L[i].key === nextKey, past = !nx && a.getTime() <= now;
            html += "<div class=\"amb__pr" + (nx ? " is-next" : "") + (past ? " is-past" : "") + "\"><span class=\"amb__pi\">" + (ICO[L[i].key] || "") + "</span>" +
                "<span class=\"amb__pn\">" + L[i].name + "</span><span class=\"amb__pt\"><b>" + f.t + "</b>" + (f.ap ? "<i>" + f.ap + "</i>" : "") + "</span></div>";
        }
        elRow.innerHTML = html;
    }

    function tick() {
        if (!box) return;
        var d = new Date(), now = d.getTime(), n = null, adhan = "", adhanKey = "", L = [], i, c = hm(d);
        elT.innerHTML = "<span class=\"amb__tn\">" + c.t + "</span>" + (c.ap ? "<span class=\"amb__ap\">" + c.ap + "</span>" : "");
        var hj = "";
        try { hj = (APL.prayer && APL.prayer.hijri && APL.prayer.hijri()) || ""; } catch (e) { hj = ""; }
        elD.textContent = DAYS[d.getDay()] + (hj ? "  \u00B7  " + hj : "");
        try {
            n = APL.prayer && APL.prayer.next ? APL.prayer.next() : null;
            L = APL.prayer && APL.prayer.list ? APL.prayer.list() : [];
            for (i = 0; i < L.length; i++) {
                if (L[i].key === "sunrise" || !L[i].at) continue;
                var gap = now - L[i].at.getTime();
                if (gap >= 0 && gap < 120000) { adhan = L[i].name; adhanKey = L[i].key; break; }
            }
        } catch (e) {}
        if (adhan) {
            elN.innerHTML = "<span class=\"amb__nk\">\u062D\u0627\u0646 \u0627\u0644\u0622\u0646 \u0645\u0648\u0639\u062F \u0627\u0644\u0623\u0630\u0627\u0646</span><span class=\"amb__nm\">" + adhan + "</span>";
            elC.textContent = "\u0627\u0644\u0623\u0630\u0627\u0646"; elRing.style.strokeDashoffset = "0";
        } else if (n) {
            var s = Math.max(0, Math.floor(n.ms / 1000)), nt = n.at ? hm(n.at) : { t: dg(n.time), ap: "" };
            elN.innerHTML = "<span class=\"amb__nk\">\u0627\u0644\u0635\u0644\u0627\u0629 \u0627\u0644\u0642\u0627\u062F\u0645\u0629</span><span class=\"amb__nm\">" + n.name + "</span>" +
                "<span class=\"amb__nt\">" + nt.t + (nt.ap ? " <i>" + nt.ap + "</i>" : "") + "</span>";
            elC.textContent = dg(s >= 3600 ? p2(Math.floor(s / 3600)) + ":" + p2(Math.floor(s % 3600 / 60)) + ":" + p2(s % 60) : p2(Math.floor(s / 60)) + ":" + p2(s % 60));
            /* the ring fills between the previous prayer (or sunrise) and the next one */
            var prev = 0;
            for (i = 0; i < L.length; i++) if (L[i].at && L[i].at.getTime() <= now && L[i].at.getTime() > prev) prev = L[i].at.getTime();
            var span = prev ? (n.at.getTime() - prev) : 6 * 3600000;
            if (span <= 0 || span > 20 * 3600000) span = 6 * 3600000;
            var f = Math.min(1, Math.max(0, 1 - n.ms / span));
            elRing.style.strokeDashoffset = String(Math.round(CIRC * (1 - f)));
        } else { elN.innerHTML = ""; elC.textContent = ""; elRing.style.strokeDashoffset = String(CIRC); }
        paintRow(L, adhanKey || (n ? n.key : ""), now);       /* v8.7.0: while the adhan is on, the card of the prayer that just came is the lit one */
        box.classList.toggle("is-adhan", !!adhan);
        setSky(phase(now));
    }

    function nudge() {
        if (!elInner) return;
        elInner.style.transform = "translate(" + (Math.round(Math.random() * 30) - 15) + "px," + (Math.round(Math.random() * 20) - 10) + "px)";
    }

    /* v8.7.28: OK in the Living Mihrab screen saver starts / stops the radio while "Radio Button in the Screen Saver" is on.
       v8.7.39: the on-screen OK chip is gone for good (it looked and sat badly); a short toast says what OK did instead. */
    function radioOn() { try { return !!(APL.radio && APL.radio.isPlaying && APL.radio.isPlaying()); } catch (e) { return false; } }
    function toast(m, ok) { try { if (APL.toast) APL.toast(m, ok); } catch (e) {} }
    function toggleRadio() {
        try {
            var wasOn = radioOn();
            var r = APL.radio && APL.radio.toggle ? APL.radio.toggle() : null;
            if (r && r.then) r.then(function () {
                var on = radioOn();
                if (on !== wasOn) toast(APL.t(on ? "Radio turned on" : "Radio turned off"), true);
            }, function () { toast(APL.t("The radio needs the internet."), false); });
        } catch (e) {}
    }
    function start(root) {
        if (!box) build(root);
        noMotion = !!APL.sys.pref("reduceMotion") || !APL.sys.pref("ambientFx");   // glow pulse / tint fade follow "Living Mihrab motion"
        box.classList.toggle("no-motion", noMotion);
        box.classList.toggle("no-pan", !!APL.sys.pref("reduceMotion"));
        box.style.display = "block"; phaseNow = ""; rowKey = "";
        pi = Math.floor(Math.random() * PICS.length); pcur = 0;
        pic(); tick(); nudge();
        clearInterval(timer); clearInterval(drift); clearInterval(rot);
        stopShared();
        /* v8.7.13: Settings > Performance > "Light timers" (on by default): the three jobs run on the shared timer (js/timers.js),
           which skips them while the launcher is not in front. Off: the old separate intervals. */
        if (APL.sys.pref("liteTimers") !== false && APL.timers && APL.timers.every) {
            APL.timers.every("ambient_tick", 1000, tick);
            APL.timers.every("ambient_nudge", 60000, nudge);
            APL.timers.every("ambient_pic", 28000, pic);
        } else {
            timer = setInterval(tick, 1000);
            drift = setInterval(nudge, 60000);
            rot = setInterval(pic, 28000);
        }
    }
    function stopShared() {
        if (APL.timers && APL.timers.cancel) { APL.timers.cancel("ambient_tick"); APL.timers.cancel("ambient_nudge"); APL.timers.cancel("ambient_pic"); }
    }
    function stop() {
        clearInterval(timer); clearInterval(drift); clearInterval(rot); timer = drift = rot = 0;
        stopShared();
        if (box) {
            box.style.display = "none"; box.classList.remove("is-adhan");
            imgA.classList.remove("is-on", "is-pan-a", "is-pan-b"); imgB.classList.remove("is-on", "is-pan-a", "is-pan-b");
            imgA.style.backgroundImage = "none"; imgB.style.backgroundImage = "none";
        }
    }
    APL.ambient = { start: start, stop: stop, toggleRadio: toggleRadio, phase: function () { return phase(Date.now()); } };
})(window);
