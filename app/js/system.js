/* ============================================================
   system.js — Samsung hardware access + launcher preferences.

   APIs used (all available to a non-partner Tizen app):
     tizen.tvaudiocontrol      volume, mute, audio output format
     webapis.productinfo       model, firmware
     webapis.network           connection type, SSID, IP, MAC, DNS…
     tizen.systeminfo          storage, display, Tizen version
     tizen.tvinputdevice       Play/Pause, color and Info keys
   Remote keys, picture, Game Mode: root commands through Vetro
   (via the private bridge, bridge/service.js). Without Vetro, the local
   network remote (ws://127.0.0.1:8001) puts the screen to sleep: the first
   time, the screen asks whether to allow Salah Launcher, which must be accepted.

   On PC (preview), everything is simulated and marked "(preview)".
   ============================================================ */
(function (global) {
    "use strict";

    var tz = global.tizen;
    var wa = global.webapis;
    var PREVIEW = !tz;
    var APL = global.APL;

    /* ---------- preferences (stored on the screen) ---------- */
    var DEFAULTS = {
        profileName: "",            // first name shown in Control Center (Settings)
        clock24: true,
        showHint: true,
        reduceMotion: false,
        bigText: false,             // v3.3.3
        highContrast: false,        // v3.3.3
        ambientFx: false,           // v3.4.2: Living Mihrab motion (sky fade, adhan glow pulse)
        wallTint: false,            // v3.4.1: soft colour wash taken from the local wallpaper
        focusFx: false,             // v3.4.2: heavy feature, closed by default (was true) // v1.2.91: white ring + dimmed neighbours around the selected icon
        ringColour: "white",         // v1.2.92: focus ring colour: white | app | green
        ringSize: "medium",          // v1.2.92: focus ring thickness: thin | medium | thick
        softReload: true,           // v1.2.119: one page reload a day at 04:00 when the radio is stopped, no alert is near and nobody uses the screen
        nightDim: "off",            // v1.2.92: Night Dimming from this hour ("21", "22"...) until 6:00, or "off"
        numberKeys: true,           // v1.2.92: 1-6 jump to the dock icons
        qaPrayerWidget: true,       // v8.7.14: full prayer widget under the Quran listening player
        liteTimers: true,           // v8.7.13: Mihrab ambient jobs run on the shared timer and pause while the launcher is not in front
        autoPerf: false,            // v8.7.28: OFF by default (was on). v1.2.91: heavy effects off by themselves when the remote lags (js/smart-perf.js)
        dnd: false,
        sleepTimer: 0,              // minutes, 0 = off
        sleepAt: 0,                 // timestamp of the scheduled sleep
        screensaverDelay: 5,        // minutes, 0 = never
        screensaverStyle: "mihrab",    // v8.7.28: default is the Living Mihrab (was "wallpaper"). "wallpaper" (local pictures) | "mihrab" | "art" (app artwork) | "clock" | "dark"
        mihrabRadio: true,          // v8.7.28: in the Living Mihrab screen saver, OK starts / stops the radio (other keys leave the screen saver)
        screensaverClockMove: 0,    // minutes between two corners of the screen saver's clock, 0 = it stays put
        uiSounds: true,             // small navigation clicks, like on Apple TV
        hiddenApps: [],
        appOrder: [],
        sourceDevices: {},          // device chosen for each input (Sources screen)
        hdmiRemap: {},              // v1.2.103: remote button code -> HDMI number it opens (Remote Button Remapper); kept here, never sent to Vetro
        sourcePorts: null,          // the screen's HDMI ports, read through Vetro (sources.js)
        pinnedSources: [],          // inputs shown on the Home Screen as tiles (sources.js)
        autoUpdate: true,           // launcher updates from GitHub, on their own
        autoArt: false,             // kept for the original project only: online artwork is removed here
        appsPerRow: 6,              // dock and grid: 5, 6 or 7 (launcher.js sizes())
        searchHidden: false,        // Search also finds the hidden apps (search.js)
        shelfArt: "sheets",         // Top Shelf of apps without artwork: "sheets" | "logo" | "black" (genart.js, launcher.js)
        smartHubTileSet: false,     // the Smart Hub tile was hidden once in this profile (it starts hidden)
        fx_aurora_glow: false,
        fx_dynamic_sky: false,
        fx_chamfer_glass: false,
        fx_royal_gilding: false,
        fx_living_mesh: false,
        fx_eastern_numerals: false,
        fx_cinematic_mihrab: false,
        fx_holographic_wisdom: false,
        fx_animated_weather: false,
        fx_spring_physics: false,
        quran_audio_reciter: "Minshawy_Murattal_128kbps",
        quran_audio_surah: 45,
        quran_audio_ayah: 17,
        quran_audio_mode: "continuous",
        quran_audio_speed: 1,
        quran_audio_volume: 1,
        quran_audio_tafsir: true,
        quran_audio_fav_reciters: ["Minshawy_Murattal_128kbps", "Husary_64kbps", "Abdul_Basit_Murattal_64kbps", "Alafasy_64kbps"],
        quran_bg_playback: false,   // v8.7.0: Allow Quran audio to continue playing when TV switches apps (default: off)
        hubShelf: true,             // Top Shelf: the apps' own Smart Hub rows first (liveshelf.js)
        liveShelf: false,           // v3.4.2: heavy feature, closed by default (was true)   //   then the content of the moment (TMDB / YouTube…), then shelfArt
        visualEffects: true,        // v8.7.28: blur / glass: ON by default (was off)
        richFx: true,               // v8.7.28: Enhanced glass blur and motion: ON by default (was off)
        cleanFrameBackdrops: false, // a poster only where an app shows nothing of its own (app-art.js)
        gameWanted: false,          // Game Mode requested (applied when switching to an input)
        hdmiViaHome: false,         // experiment (did not fix the HDMI picture): Samsung's home first, then the source request
        ccHintCount: 0,             // number of times the Control Center tip has been shown
        appearance: "dark",         // "dark" | "light" | "auto" (follows the sun)
        folders: [],                // Home Screen folders: { id, name, apps: [ids] }
        aerialHidden: [],           // themes and places hidden from the Aerial screen saver
        bgMotion: false,            // slow background motion: costs more than one CPU core when idle
        homeReturn: true,           // when an app closes: the launcher rather than the Samsung home
        alexaBridge: true,          // the Echo Dot can open apps (overlay/Alexa.cs)
        servicesCut: {},            // blocked Samsung services and their original settings (services.js)
        bootCleanup: true,          // once per power-on: closes what Samsung opens on its own
        homeAppSaved: null,         // { home, autostart } before "Start on Salah Launcher", put back when it is turned off
        idleClose: true,            // an app left in the background for 10 min is closed (overlay/IdleApps.cs)
        pauseKey: "samsunghome",    // ⏯ on the remote: "samsunghome" | "controlcenter" | "playpause"
        language: "auto",           // "auto" (screen language) | "ar" | "en": read at start-up by i18n.js

        /* ---- this build (Salah Launcher — Egypt) ---- */
        clockFormat: "12",          // "12" (with AM/PM, ص/م) | "24": the Home Screen clock (launcher.js startClock)
        digitStyle: "west",         // v1.2.97: "west" (1 2 3) | "arabic" (١ ٢ ٣): prayer widget, clock, weather, in Arabic only (i18n.js)
        homeDate: "full",           // the date beside the clock: "full" (Gregorian + Hijri) | "greg" | "off" (js/home-clock.js)
        secondClock: "off",         // "off" or the key of a country in js/home-clock.js: its time across the card
        statsOrder: true,           // rows below the dock sorted by how often the app is opened from APL (launch-stats.js)
        lightMode: false,           // fewer background jobs (light-mode.js)
        wallpapers: true,           // the six local photographs behind the Home Screen (home-wallpapers.js)
        wallpaperEvery: 5,          // minutes between two photographs
        wallpaperSource: "local",   // v1.2.108: "local" | "mixed" | "online": online = family-friendly daily collections (home-wallpapers.js)
        onlineWallpaperSource: "both", // "both" | "bing" | "nasa"
        onlineIcons: false,         // v1.2.108: real icons from the App Store catalogue for apps with no tile of their own (autoart.js)
        prayerCity: "cairo",       // key in js/cities.js (prayer.js)
        prayerAuto: false,          // v8.7.28: OFF by default (opt-in). v8.7.27: the city is found from the screen's settings and the Internet address (js/auto-location.js); choosing a city by hand turns it off
        hijriOffset: 0,             // v8.7.31: had no default, so the Hijri Date Adjustment row showed "undefined"
        hijriSource: "auto",        // v8.7.27: "auto" (by the country of the city) | "egypt" | "HJCoSA" | "UAQ" | "DIYANET" (js/islamic.js, js/prayer.js)
        hijriCountry: "auto",       // v8.7.50: whose announcements set Ramadan and the Eids: "auto" (Egypt for the Egyptian calendar, else the city's country) or a country code
        hijriFeedStamp: 0,          // v8.7.50: changes when new announced dates arrive online (js/islamic.js)
        hijriFixBase: {},           // v8.7.52: the automatic start of each corrected month when it was corrected (js/islamic.js setFix); a manual correction wins over online dates
        hijriFix: {},               // v8.7.27: Ramadan / Eid corrected by hand: { "1448-9": 1 } = month 9 of 1448 starts 1 day later (js/islamic.js setFix)
        prayerAlerts: true,         // a short spoken alert at each prayer time
        prayerAlertVolume: 0.92,
        prayerWidgetShow: "occ",    // v7.2.1/v8.5.0: "occ" | "ayah" | "tafsir" | "hekam" | "pers"
        ramadanWidget: true,        // v8.7.40: the Ramadan widget (crescent / lantern, duas, tips) on the Home Screen, shown by itself in Ramadan only
        ramadanWidgetPreview: 0,    // v8.7.40: 0 = off | 1 | 12 | 27: shows the widget as if it were that day of Ramadan, to look at it outside Ramadan
        hekamWidget: true,          // v8.7.28: ON by default (was off). v8.5.0: separate Home Screen widget for Hekam, rotating every 5 min
        hekamPos: "top-right",      // v8.5.0: "top-right" | "top-center" | "top-left" | "bottom-right" | "bottom-center" | "bottom-left" | "inline"
        hekamScale: 150,            // v8.5.0: 100 | 125 | 150 | 175 | 200
        personalRemindDays: 3,      // v8.1.0: toast days before a personal occasion: 0 (off) | 1 | 3 | 7
        prayerWidgetFull: false,    // v7.1.1: Home Screen: the prayer widget across the whole screen above the apps row, with the next four occasions, tasks and weather
        prayerWidgetScale: 0,       // v1.2.105: Home Screen prayer widget, % bigger than its v1.2.104 size: 0 | 25 | 50 | 75 | 100
        radioHandoff: true,         // v7.2.0: if the AVPlay radio is cut while another app/HDMI is in front, the background player carries it on
        radioBackground: true,      // v7.0.8: on by default: the AVPlay radio keeps going when another app or an HDMI input is in front (Settings > Accessibility)
        uiFont: "default",          // v7.0.8: "default" | "tahoma" | "naskh" | "kufi" | "serif" | "apl" (css/custom.css, js/safe-mode.js)
        radioDuringAlert: true,     // pause the radio while a prayer alert plays, then resume
        radioStation: "",           // v8.7.65: id of a station from js/radio-stations.js; empty = Cairo
        radioUrl: "",               // empty: the station of js/site-config.js
        weatherPlace: "cairo",     // key in js/cities.js (weather.js)
        channelKeys: true,          // Channel Up / Down opens APL Settings (the Home key stays with Samsung)
        systemFilter: true,         // hide Samsung services and plugins that look like apps (apps.js)
        shownSystemApps: [],        // the ones brought back from Settings › Apps › System Components
        autoBackup: true,           // a daily snapshot of the settings and the app order (backup.js)
        showNextTask: true,         // show remaining time until next task on the Home Screen (tasks.js)
        showEmptyTaskHint: true,    // show compact Tasks status line when no upcoming task is scheduled
        taskAlerts: true,           // play background/foreground alert when a scheduled task is due
        hdmiTvName: true,           // v1.2.88: send the input name the screen itself keeps (e.g. "PC") to its viewer, as Samsung's own tile does
        hdmiPicFix: false,          // v1.2.86: opt-in. After an HDMI input opens from APL, put Warm/Cool tone back to Standard, Native color space to Auto, Movie/Eco picture mode to Standard
        vetroNotices: true          // v1.2.85: short on-screen notice when Vetro stops answering / is back (vetro-watch.js)
    };
    /* OLED panels, told by the model the screen reports: the S8x / S9x TVs from 2022 on, whatever the
       region letters (QE55S95BATXXU, QN65S90FAEXZA, KQ65SD95AFXKR…), and the Odyssey OLED monitors with
       Smart TV, whose code has an S where the Neo (mini LED) ones have an N (LS49CG954SUXEN, LS34BG850SNXGO,
       LS32DG802SUXEN). A still picture can mark them, so the screen saver's clock moves there unless the
       viewer chose otherwise (Settings › Screen Saver › Move the Clock). PC preview: ?oled. */
    var OLED_RE = /^[A-Z]{2}\d{2}S[A-Z]?[89]\d|^LS\d{2}[A-Z]G[689]\d{2}S/;
    var OLED = PREVIEW ? /[?&]oled\b/.test(global.location.search)
        : OLED_RE.test(String((function () { try { return wa.productinfo.getRealModel(); } catch (e) { return ""; } })() || "").toUpperCase());
    if (OLED) DEFAULTS.screensaverClockMove = 2;
    /* Screen settings (shared) and the settings of each profile in the household:
       Home Screen layout, hidden apps, preferences, recent apps. */
    var PROFILE_KEYS = { hiddenApps: 1, appOrder: 1, clock24: 1, showHint: 1, reduceMotion: 1, dnd: 1,
                         uiSounds: 1, screensaverStyle: 1, screensaverDelay: 1, screensaverClockMove: 1, liveShelf: 1, hubShelf: 1, recentApps: 1,
                         appearance: 1, folders: 1, aerialHidden: 1, smartHubTileSet: 1 };
    DEFAULTS.recentApps = [];
    var COLORS = ["#ff9f0a", "#30d158", "#0a84ff", "#bf5af2", "#ff375f", "#64d2ff", "#ffd60a", "#ac8e68"];
    function load(k, fallback) {
        try { var v = JSON.parse(global.localStorage.getItem(k) || "null"); return v || fallback; } catch (e) { return fallback; }
    }
    function save(k, v) { try { global.localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

    var prefs = load("apl.prefs", {});
    var household = load("apl.profiles", null);
    if (!household || !household.list || !household.list.length) {
        // First launch with profiles: the current settings become those of the first profile
        household = { current: "p1", list: [{ id: "p1", name: prefs.profileName || APL.t("Me"), color: COLORS[2] }] };
        var first = {};
        Object.keys(PROFILE_KEYS).forEach(function (k) { if (k in prefs) first[k] = prefs[k]; });
        save("apl.prefs.p1", first);
        save("apl.profiles", household);
    }
    var pprefs = load("apl.prefs." + household.current, {});
    // Up to 1.0.19, Otherwise also had App Colors (now Large Logo) and the APL wallpaper (now Black)
    var OLD_ART = { colors: "logo", wallpaper: "black", all: "black" };
    if (OLD_ART[prefs.shelfArt]) { prefs.shelfArt = OLD_ART[prefs.shelfArt]; save("apl.prefs", prefs); }
    // Up to 1.0.14, "App Backgrounds" off (per profile) gave a plain dark Top Shelf: now shelfArt "black"
    household.list.forEach(function (p) {
        var pp = p.id === household.current ? pprefs : load("apl.prefs." + p.id, {});
        if (!("appBackgrounds" in pp)) return;
        if (pp.appBackgrounds === false && p.id === household.current) { prefs.shelfArt = "black"; save("apl.prefs", prefs); }
        delete pp.appBackgrounds;
        save("apl.prefs." + p.id, pp);
    });

    function currentProfile() {
        for (var i = 0; i < household.list.length; i++) if (household.list[i].id === household.current) return household.list[i];
        return household.list[0];
    }
    function pref(k) {
        if (k === "profileName") return currentProfile().name;
        var src = PROFILE_KEYS[k] ? pprefs : prefs;
        return (k in src) ? src[k] : DEFAULTS[k];
    }
    function setPref(k, v) {
        if (k === "profileName") { currentProfile().name = v; save("apl.profiles", household); }
        else if (PROFILE_KEYS[k]) { pprefs[k] = v; save("apl.prefs." + household.current, pprefs); }
        else { prefs[k] = v; save("apl.prefs", prefs); }
        (listeners[k] || []).forEach(function (fn) { fn(v); });
    }
    var listeners = {};
    function onPref(k, fn) { (listeners[k] = listeners[k] || []).push(fn); }

    /* Is Vetro on the screen at all (vetrotvapp.app, vetrotvapp.svc)? Installed from Apps2Samsung's TV-Store
       without root (a Q72D on Reddit), the Home key stays Samsung's: Return to the Launcher, which needs no
       Vetro, then replaced Samsung's home as soon as Home showed it, with no way back to Samsung's menus. Without
       Vetro it is off unless chosen, and the settings that need Vetro say so (settings.js). Asked again at every
       start; any doubt (the list can't be read) counts as Vetro there, so nothing changes. */
    var noVetro = false;
    function markNoVetro() {
        if (noVetro) return;
        noVetro = true;
        var before = pref("homeReturn");
        DEFAULTS.homeReturn = false;
        if (pref("homeReturn") !== before) (listeners.homeReturn || []).forEach(function (fn) { fn(false); });
    }
    /* v1.1.4: Vetro answering on its port is proof it is on the screen, whatever the app list said (its id or name
       can differ from the usual one). The "Needs Vetro" marks then go away and Home returns to the launcher again. */
    function clearNoVetro() {
        if (!noVetro) return;
        noVetro = false;
        var before = pref("homeReturn");
        DEFAULTS.homeReturn = true;
        if (pref("homeReturn") !== before) (listeners.homeReturn || []).forEach(function (fn) { fn(true); });
    }
    function detectVetro() {
        if (PREVIEW) {
            // The PC preview has no Vetro to look for: ?novetro shows the screen without it
            if (global.location && /[?&]novetro\b/.test(global.location.search)) markNoVetro();
            return;
        }
        /* Keep all Vetro permissions unlocked on Tizen 6.5+: Vetro may run as a background root
           daemon or custom package ID not listed in getAppsInfo. */
        noVetro = false;
    }
    detectVetro();

    /* ---------- profiles ---------- */
    var profileListeners = [];
    var profiles = {
        list: function () { return household.list.slice(); },
        current: currentProfile,
        colors: COLORS,
        switchTo: function (id) {
            if (id === household.current) return;
            /* v1.99.0 child profile: no switching out of it, except profiles.exitKid() (3 s hold on the Mute key) */
            var cpk = currentProfile();
            if (cpk && cpk.kid && !profiles._exiting) { try { if (global.APL && global.APL.toast) global.APL.toast(global.APL.t("Child profile is locked"), true); } catch (e) {} return; }
            var tgk = household.list.filter(function (p) { return p.id === id; })[0];
            if (tgk && tgk.kid && cpk && !cpk.kid) household.lastAdult = cpk.id;
            household.current = id;
            save("apl.profiles", household);
            pprefs = load("apl.prefs." + id, {});
            Object.keys(PROFILE_KEYS).forEach(function (k) { (listeners[k] || []).forEach(function (fn) { fn(pref(k)); }); });
            profileListeners.forEach(function (fn) { fn(currentProfile()); });
        },
        add: function (name) {
            var n = 1, id;
            do { id = "p" + (++n); } while (household.list.some(function (p) { return p.id === id; }));
            var p = { id: id, name: name || APL.t("Profile {n}", { n: household.list.length + 1 }), color: COLORS[household.list.length % COLORS.length] };
            household.list.push(p);
            save("apl.profiles", household);
            return p;
        },
        update: function (id, fields) {
            var cpu = currentProfile();
            if (cpu && cpu.kid && !profiles._exiting) return;       // v1.99.0: no editing while the child profile is active
            household.list.forEach(function (p) { if (p.id === id) Object.keys(fields).forEach(function (k) { p[k] = fields[k]; }); });
            save("apl.profiles", household);
            profileListeners.forEach(function (fn) { fn(currentProfile()); });
        },
        remove: function (id) {
            if (household.list.length < 2) return false;
            var cpr = currentProfile();
            if (cpr && cpr.kid && !profiles._exiting) return false;  // v1.99.0
            household.list = household.list.filter(function (p) { return p.id !== id; });
            try { global.localStorage.removeItem("apl.prefs." + id); } catch (e) {}
            if (household.current === id) profiles.switchTo(household.list[0].id);
            save("apl.profiles", household);
            return true;
        },
        onChange: function (fn) { profileListeners.push(fn); },
        /* v1.99.0 child profile */
        isKid: function () { var c = currentProfile(); return !!(c && c.kid); },
        exitKid: function () {
            var c = currentProfile();
            if (!c || !c.kid) return false;
            var target = household.list.filter(function (p) { return p.id === household.lastAdult && !p.kid; })[0] ||
                         household.list.filter(function (p) { return !p.kid; })[0];
            profiles._exiting = true;
            try {
                if (target) profiles.switchTo(target.id);
                else profiles.update(c.id, { kid: false });
            } finally { profiles._exiting = false; }
            return true;
        },
        /* History: the last apps opened by this profile */
        noteLaunch: function (appId) {
            var r = (pref("recentApps") || []).filter(function (x) { return x !== appId; });
            r.unshift(appId);
            setPref("recentApps", r.slice(0, 12));
        }
    };

    function safe(fn, fallback) { try { var v = fn(); return (v === undefined || v === null || v === "") ? fallback : v; } catch (e) { return fallback; } }

    /* ---------- sound ---------- */
    var mock = { volume: 18, mute: false };
    var audio = {
        getVolume: function () { return PREVIEW ? mock.volume : safe(function () { return tz.tvaudiocontrol.getVolume(); }, 0); },
        setVolume: function (v) {
            v = Math.max(0, Math.min(100, Math.round(v)));
            if (PREVIEW) { mock.volume = v; return v; }
            safe(function () { tz.tvaudiocontrol.setVolume(v); });
            return audio.getVolume();
        },
        isMute: function () { return PREVIEW ? mock.mute : safe(function () { return tz.tvaudiocontrol.isMute(); }, false); },
        setMute: function (m) { if (PREVIEW) mock.mute = m; else safe(function () { tz.tvaudiocontrol.setMute(m); }); },
        outputMode: function () {
            var m = PREVIEW ? "PCM" : safe(function () { return tz.tvaudiocontrol.getOutputMode(); }, "—");
            return { PCM: "PCM", DOLBY: "Dolby Digital", DTS: "DTS", AAC: "AAC", DOLBY_DIGITAL_PLUS: "Dolby Digital+" }[m] || m;
        }
    };

    /* ---------- network ---------- */
    function network() {
        if (PREVIEW) return { connected: true, type: "Wi-Fi", ssid: APL.t("Livebox-(preview)"), signal: 4, ip: "192.168.1.50", mac: "XX:XX:XX:XX:XX:XX", gateway: "192.168.1.1", dns: "192.168.1.1" };
        var n = wa && wa.network;
        var t = safe(function () { return n.getActiveConnectionType(); }, -1);
        var type = { 0: APL.t("Disconnected"), 1: "Wi-Fi", 2: "Ethernet", 3: "Mobile" }[t] || APL.t("Unknown");
        return {
            connected: t > 0,
            type: type,
            ssid: t === 1 ? safe(function () { return n.getWiFiSsid(); }, "—") : "—",
            signal: t === 1 ? safe(function () { return n.getWiFiSignalStrengthLevel(); }, 0) : 0,
            ip: safe(function () { return n.getIp(); }, "—"),
            mac: safe(function () { return n.getMac(); }, "—"),
            gateway: safe(function () { return n.getGateway(); }, "—"),
            dns: safe(function () { return n.getDns(); }, "—")
        };
    }

    /* ---------- device ---------- */
    function product() {
        if (PREVIEW) return { model: "LS32CM801UUXEN", name: APL.t("Smart Monitor M8 (preview)"), firmware: "T-PTMLCWWC-0090", tizen: "9.0" };
        var p = wa && wa.productinfo;
        return {
            model: safe(function () { return p.getRealModel(); }, safe(function () { return p.getModel(); }, "—")),
            name: safe(function () { return p.getModel(); }, APL.t("Samsung screen")),
            firmware: safe(function () { return p.getFirmware(); }, "—"),
            tizen: safe(function () { return tz.systeminfo.getCapability("http://tizen.org/feature/platform.version"); }, "—")
        };
    }

    /* Apps are drawn in 1920 × 1080 (the screen offers them no other mode), while the panel and
       the videos can be 4K or 8K: both are shown. */
    function display() {
        return new Promise(function (resolve) {
            if (PREVIEW) return resolve(APL.t("3840 × 2160 (preview)"));
            var p = wa && wa.productinfo;
            var panel = safe(function () { return p.is8KPanelSupported() ? "7680 × 4320" : ""; }, "") ||
                        safe(function () { return p.isUdPanelSupported() ? "3840 × 2160" : ""; }, "");
            try {
                tz.systeminfo.getPropertyValue("DISPLAY", function (d) {
                    var ui = d.resolutionWidth + " × " + d.resolutionHeight;
                    resolve(panel && panel !== ui ? APL.t("{panel} (interface {ui})", { panel: panel, ui: ui }) : ui);
                }, function () { resolve(panel || "—"); });
            } catch (e) { resolve(panel || "—"); }
        });
    }

    function gb(bytes) { var n = (bytes / 1e9).toFixed(1); return APL.t("{n} GB", { n: n }); }
    function storage() {
        return new Promise(function (resolve) {
            if (PREVIEW) return resolve(APL.t("4.1 GB free of 8.0 GB (preview)"));
            try {
                tz.systeminfo.getPropertyValue("STORAGE", function (s) {
                    var u = (s.units || [])[0];
                    resolve(u ? APL.t("{free} free of {total}", { free: gb(u.availableCapacity), total: gb(u.capacity) }) : "—");
                }, function () { resolve("—"); });
            } catch (e) { resolve("—"); }
        });
    }

    function hdr() {
        if (PREVIEW) return APL.t("Supported");
        return safe(function () { return wa.avinfo.isHdrTvSupport() ? APL.t("Supported") : APL.t("Not supported"); }, "—");
    }

    /* ---------- remote keys ----------
       Simulated by Vetro, as root (/usr/bin/input_keyevent, like Vetro's
       launcher). Samsung's network remote (WebSocket 8001/8002) does not answer
       on every screen: it is now only a fallback, without Vetro. */
    var XKEYS = { KEY_MENU: "XF86Menu", KEY_POWER: "XF86PowerOff", KEY_SOURCE: "XF86Display", KEY_HOME: "XF86Home",
                  KEY_RETURN: "XF86Back", KEY_EXIT: "XF86Exit", KEY_INFO: "XF86Info" };
    function remoteKey(key) {
        if (PREVIEW) return Promise.reject(new Error(APL.t("PC preview: {key} not sent", { key: key })));
        var x = XKEYS[key] || key;
        if (!/^[A-Za-z0-9]+$/.test(x)) return Promise.reject(new Error(APL.t("Unknown key: {key}", { key: key })));
        return vetroAlive().then(function (ok) {
            if (!ok) return wsRemoteKey(key);
            return vetroPost("/exec", { cmd: "/usr/bin/input_keyevent " + x + " 2>&1" }).then(function (r) {
                if (r && r.ok === false) throw new Error(APL.t("The screen refused the key ({key})", { key: x }));
            });
        });
    }

    /* Fallback without Vetro: Samsung's network remote. */
    var TOKEN_KEY = "apl.remoteToken";
    function wsRemoteKey(key) {
        return new Promise(function (resolve, reject) {
            var name = global.btoa("Salah Launcher");
            var token = "";
            try { token = global.localStorage.getItem(TOKEN_KEY) || ""; } catch (e) {}
            var urls = [
                "ws://127.0.0.1:8001/api/v2/channels/samsung.remote.control?name=" + name,
                "wss://127.0.0.1:8002/api/v2/channels/samsung.remote.control?name=" + name + (token ? "&token=" + token : "")
            ];
            (function attempt(i) {
                if (i >= urls.length) { reject(new Error(APL.t("Vetro is not responding (open Vetro once on the screen)"))); return; }
                var done = false, ws;
                var timer = setTimeout(function () { if (!done) { done = true; try { ws.close(); } catch (e) {} attempt(i + 1); } }, 5000);
                try { ws = new global.WebSocket(urls[i]); } catch (e) { clearTimeout(timer); attempt(i + 1); return; }
                ws.onmessage = function (m) {
                    var d = {};
                    try { d = JSON.parse(m.data); } catch (e) {}
                    if (d.event === "ms.channel.connect") {
                        if (d.data && d.data.token) { try { global.localStorage.setItem(TOKEN_KEY, d.data.token); } catch (e) {} }
                        ws.send(JSON.stringify({ method: "ms.remote.control", params: {
                            Cmd: "Click", DataOfCmd: key, Option: "false", TypeOfRemote: "SendRemoteKey" } }));
                        done = true; clearTimeout(timer);
                        setTimeout(function () { try { ws.close(); } catch (e) {} resolve(); }, 400);
                    } else if (d.event === "ms.channel.unauthorized") {
                        done = true; clearTimeout(timer); reject(new Error(APL.t("Access denied on the screen")));
                    }
                };
                ws.onerror = function () { if (!done) { done = true; clearTimeout(timer); attempt(i + 1); } };
            })(0);
        });
    }

    /* Opens Samsung's Settings menu, for the settings the launcher does not handle itself. */
    function openSamsungSettings(path) {
        return tvExec("app_launcher -s org.tizen.menu >/dev/null 2>&1; true").then(function () { return path; });
    }
    function sleepNow() { return remoteKey("KEY_POWER"); }

    /* QN85B / Tizen 6.5 HDMI hand-off.
       This TV's normal Samsung source tile sends a complete tv-viewer request:
       source number, source label, Samsung's own source-icon pathname,
       mbrIndex and __K_EX_LAUNCH_REQUESTOR. Earlier APL builds omitted the
       icon and local requestor fields; tv-viewer can then open a generic video
       path even though the input name continues to say PC.

       Do not call TVWindow.setSource here. TVWindow is the embedded/PiP API;
       this is a direct full-screen viewer hand-off, with APL suspended behind
       it. No picture, RGB, black-level, zoom, PC label or display setting is
       written by this code. */
    var lastSourceSwitch = null;

    /* v1.2.84: two additions around an HDMI/TV input request (untested on the TV, see version.json).
       1) releaseMediaForSource(): the launcher's own audio (the AVPlay radio, WebAudio) is released BEFORE the request is sent
          instead of a moment after it. When the input is opened from Samsung's home the launcher is already in the
          background, so none of its media session is open at that instant; from the launcher it still was.
       2) fallbackNote: if the native helper could not be used and a fallback route had to be used (the Web route
          is the one known to give a dull picture), say so when the launcher is back in front. */
    var fallbackNote = "";
    if (global.document) {
        document.addEventListener("visibilitychange", function () {
            if (document.hidden || !fallbackNote) return;
            var note = fallbackNote; fallbackNote = "";
            try { APL.toast(note); } catch (e) {}
        });
    }
    function releaseMediaForSource() {
        var did = false;
        try { if (actx && actx.state === "running" && actx.suspend) { actx.suspend(); did = true; } } catch (e) {}
        try { if (APL.radio && typeof APL.radio.releaseForVideo === "function" && APL.radio.releaseForVideo()) did = true; } catch (e2) {}
        return new Promise(function (resolve) { setTimeout(resolve, did ? 450 : 0); });
    }

    function sourceTarget(target) {
        var t = (target && typeof target === "object") ? target : {};
        var code = (target && typeof target === "object") ? Number(target.sourceType) : Number(target);
        var kind = String(t.type || "").toUpperCase();
        var number = Number(t.number || 0);
        if (!kind) {
            if (code === 0) { kind = "TV"; number = 1; }
            else if (code >= 13 && code <= 16) { kind = "HDMI"; number = code - 12; }
        }
        if (!number) number = 1;
        return {
            code: isFinite(code) ? code : -1,
            type: kind,
            number: number,
            label: String(t.label || t.port || "")
        };
    }

    function snapshotSource(stage, wanted, selected) {
        var record = {
            stage: stage,
            at: Date.now(),
            wanted: { code: wanted.code, type: wanted.type, number: wanted.number, label: wanted.label },
            selected: selected || null,
            main: null,
            video: null
        };
        try {
            if (tz && tz.tvwindow && tz.tvwindow.getSource) record.main = tz.tvwindow.getSource("MAIN");
        } catch (e) { record.mainError = String((e && e.message) || e); }
        try {
            if (tz && tz.tvwindow && tz.tvwindow.getVideoResolution) record.video = tz.tvwindow.getVideoResolution("MAIN");
        } catch (e2) { record.videoError = String((e2 && e2.message) || e2); }
        lastSourceSwitch = record;
        try { global.localStorage.setItem("apl.lastSourceSwitch", JSON.stringify(record)); } catch (e3) {}
        return record;
    }

    /* Always use the source descriptor that the TV itself published. It can
       contain model-specific fields in addition to type/number; constructing a
       bare { HDMI, n } object is not equivalent on every firmware. */
    function resolveVideoSource(wanted) {
        return new Promise(function (resolve) {
            try {
                if (!tz || !tz.systeminfo || !tz.systeminfo.getPropertyValue) { resolve(null); return; }
                tz.systeminfo.getPropertyValue("VIDEOSOURCE", function (list) {
                    var all = [].concat((list && list.connected) || [], (list && list.disconnected) || []);
                    for (var i = 0; i < all.length; i++) {
                        var s = all[i] || {};
                        if (String(s.type || "").toUpperCase() === wanted.type && Number(s.number || 1) === wanted.number) {
                            resolve(s);
                            return;
                        }
                    }
                    resolve(null);
                }, function () { resolve(null); });
            } catch (e) { resolve(null); }
        });
    }

    function setMainSource(source, wanted) {
        return new Promise(function (resolve, reject) {
            try {
                if (!source || !tz || !tz.tvwindow || !tz.tvwindow.setSource) { resolve(false); return; }
                tz.tvwindow.setSource(source, function (changed) {
                    snapshotSource("tvwindow-set", wanted, changed || source);
                    resolve(true);
                }, reject, "MAIN");
            } catch (e) { reject(e); }
        });
    }

    function switchSource(target) {
        if (PREVIEW) return Promise.reject(new Error(APL.t("PC preview: input change not sent")));
        var wanted = sourceTarget(target);
        if (wanted.code < 0 || !wanted.type) return Promise.reject(new Error(APL.t("This input isn't supported on this screen")));
        /* Mirrors Samsung's source-tile contract on the QN85B family. Source
           type 14 is HDMI 2; sourceName comes from the visible APL source tile
           (normally PC for this installation), and the icon is a firmware asset
           required by tv-viewer to select the native source path. */
        var SOURCE_ICON_DIR = "/usr/apps/com.samsung.tv.theme-resource/shared/res/org.tizen.menu/Settings_Popup/device_icon/";
        function viewerExtras(source) {
            /* v1.2.88: the screen picks its PC profile (Entertainment mode, full chroma, no Dynamic/Movie modes, sharp text) from
               this name. Samsung's own tile sends the name the SCREEN keeps for the port ("PC"...). APL used to send its own
               tile text first (a device name, possibly translated), which the screen does not know as PC: the generic HDMI
               profile then gave the soft, yellowish picture and the small laptop desktop. The screen's own name now comes
               first; the launcher's text is only the fallback. Settings > Gaming > 'Use the Screen's Input Name' turns this off. */
            var tvName = source && (source.editName || source.EditName || source.name || source.label);
            var name = (pref("hdmiTvName") !== false && tvName) || wanted.label || tvName ||
                       (wanted.type === "HDMI" ? "HDMI " + wanted.number : "TV");
            /* Use the system theme asset exactly as Samsung's own source tile
               does. Do not substitute a generic Web API icon: tv-viewer treats
               the source icon as part of the native source-entry contract. */
            var icon = SOURCE_ICON_DIR + (wanted.type === "HDMI" ? "r_icon_device_s_hdmi" + wanted.number : "r_icon_device_s_tv") + ".png";
            return [
                ["change_source", String(wanted.code)],
                ["sourceType", String(wanted.code)],
                ["sourceName", String(name)],
                ["sourceIcon", String(icon)],
                ["mbrIndex", "-2"],
                ["__K_EX_LAUNCH_REQUESTOR", "user"]
            ];
        }
        /* The confirmed Vetro comparison on this QN85B showed the native
           app-control call has the correct PC video pipeline while a Web-app
           launchAppControl request does not. Diagnostics proved this helper
           sent CAPI successfully, and a plain hidden EFL context was still
           insufficient. It now matches Vetro's final ordering: an EFL animator
           frame hides the helper surface and sends the one-shot request from
           that compositor callback. It uses the existing Vetro exec relay but
           does not open, configure, stop, or modify Vetro in any way. */
        var NATIVE_HELPER_CACHE = "/tmp/apl-source-handoff.path";
        var NATIVE_HELPER_NAME = "APLSourceHandoff.dll";
        function shellLiteral(value) {
            /* The source label is data, not shell syntax. Samsung's PC label
               needs no transformation; quotes/control lines are simply not
               meaningful to the native sourceName field. */
            return "'" + String(value || "").replace(/[\u0000-\u001f']/g, " ").replace(/'/g, "") + "'";
        }
        function nativeViewerHandoff(extra) {
            var label = "HDMI", i;
            for (i = 0; i < extra.length; i++) if (extra[i][0] === "sourceName") { label = extra[i][1]; break; }
            /* The known paths cover this package's Tizen installs. The bounded
               lookup is only a recovery path for a firmware-specific install
               directory, and its resolved path is cached for later switches. */
            var cmd = "H=$(cat " + NATIVE_HELPER_CACHE + " 2>/dev/null); " +
                "if [ ! -f \"$H\" ]; then H=; for p in " +
                "/opt/usr/home/owner/apps_rw/APLMusalla/res/wgt/native/" + NATIVE_HELPER_NAME + " " +
                "/opt/usr/home/owner/apps_rw/APLMusalla.Home/res/wgt/native/" + NATIVE_HELPER_NAME + " " +
                "/home/owner/apps_rw/APLMusalla/res/wgt/native/" + NATIVE_HELPER_NAME + " " +
                "/home/owner/apps_rw/APLMusalla.Home/res/wgt/native/" + NATIVE_HELPER_NAME + " " +
                "/opt/usr/apps/APLMusalla/native/" + NATIVE_HELPER_NAME + " " +
                "/opt/usr/apps/APLMusalla.Home/native/" + NATIVE_HELPER_NAME + " " +
                "/usr/apps/APLMusalla/native/" + NATIVE_HELPER_NAME + " " +
                "/usr/apps/APLMusalla.Home/native/" + NATIVE_HELPER_NAME + "; do " +
                "if [ -f \"$p\" ]; then H=\"$p\"; break; fi; done; fi; " +
                "if [ -z \"$H\" ]; then H=$(find /opt/usr /usr/apps /home/owner -maxdepth 14 -type f -name " + NATIVE_HELPER_NAME + " -print -quit 2>/dev/null); fi; " +
                "[ -n \"$H\" ] && [ -f \"$H\" ] || { echo native-helper-missing; exit 127; }; " +
                "printf %s \"$H\" > " + NATIVE_HELPER_CACHE + "; " +
                "echo helper=\"$H\" > /tmp/apl-native-source-handoff.shell; echo sourceType=" + String(wanted.code) + " >> /tmp/apl-native-source-handoff.shell; " +
                /* v1.2.82: picture from APL was dull. Samsung's own home (org.tizen.menu) is brought to the front first and the
                   source request is sent from there, the way a source chosen on Samsung's home is. The helper itself is unchanged. */
                (pref("hdmiViaHome") ? "app_launcher -s org.tizen.menu >/dev/null 2>&1; (sleep 0.8 2>/dev/null || sleep 1); echo via-home >> /tmp/apl-native-source-handoff.shell; " : "") +
                "exec /usr/bin/dotnet \"$H\" " + String(wanted.code) + " " + shellLiteral(label);
            return tvExec(cmd).then(function (r) {
                if (!r || r.ok === false || Number(r.exit_code || 0) !== 0) throw new Error("native source handoff failed");
                return { route: "native-capi", transport: r.sent ? "sent-without-reply" : "confirmed", exitCode: Number(r.exit_code || 0), output: String(r.output || "").slice(0, 180) };
            });
        }
        function viaVetro(extra) {
            var args = extra.map(function (kv) { return kv[0] + " '" + kv[1].replace(/'/g, "") + "'"; }).join(" ");
            return tvExec("app_launcher -s org.tizen.tv-viewer " + args + " 2>&1").then(function (r) {
                if (!r || r.ok === false) throw new Error(APL.t("The screen refused the input change"));
                return true;
            });
        }
        function launchSamsungViewer(extra) {
            return new Promise(function (resolve, reject) {
                try {
                    if (!tz || !tz.ApplicationControl || !tz.ApplicationControlData || !tz.application || !tz.application.launchAppControl) {
                        reject(new Error("Samsung source app-control is unavailable"));
                        return;
                    }
                    var data = extra.map(function (kv) { return new tz.ApplicationControlData(kv[0], [kv[1]]); });
                    var ctl = new tz.ApplicationControl("http://tizen.org/appcontrol/operation/default", null, null, null, data);
                    tz.application.launchAppControl(ctl, "org.tizen.tv-viewer", function () { resolve(true); }, function (err) {
                        reject(err || new Error("Samsung source switch failed"));
                    });
                } catch (e) { reject(e); }
            });
        }
        function nudgeHdmiBg() {
            try { if (actx && actx.state === "running" && actx.suspend) actx.suspend(); } catch (e) {}
            /* This detached audio-only nudge never blocks or participates in the
               picture hand-off above. It exists solely to restore background radio. */
            vetroPost("/exec", {
                cmd: "(sleep 2; for p in /opt/usr/home/owner/APL/bg-daemon.sh /run/apl-bg/bg-daemon.sh /tmp/apl-bg/bg-daemon.sh; do if [ -r \"$p\" ] && [ ! -L \"$p\" ] && [ -f \"$p\" ]; then v=$(APL_DAEMON_SOURCE=\"$p\" sh -c 'cat \"$APL_DAEMON_SOURCE\" | sh -s -- version' 2>/dev/null); if case \"$v\" in 4.[0-9]*) [ \"${v#4.}\" -ge 6 ] 2>/dev/null ;; *) false ;; esac; then APL_DAEMON_SOURCE=\"$p\"; export APL_DAEMON_SOURCE; cat \"$p\" | sh -s -- hdmi-recover; break; fi; fi; done) >/dev/null 2>&1 & true"
            }).catch(function () {});
        }
        snapshotSource("before", wanted, null);
        return releaseMediaForSource().then(function () { return resolveVideoSource(wanted); }).then(function (source) {
            var extra = viewerExtras(source);
            snapshotSource("viewer-metadata", wanted, { sourceFound: !!source, source: source || null, extra: extra });
            /* This is one direct AppControl hand-off. TVWindow.setSource is
               intentionally not part of the QN85B/Tizen 6.5 path: it is an
               embedded-video route and was reproduced as visually wrong here. */
            return nativeViewerHandoff(extra).catch(function () {
                /* v1.2.84: one more native attempt before any fallback route is used. */
                return new Promise(function (again) { setTimeout(again, 700); }).then(function () { return nativeViewerHandoff(extra); });
            }).catch(function (nativeError) {
                /* Keep the established Web/AppLauncher route only as a safe
                   compatibility fallback if the helper cannot be loaded on a
                   future firmware. On the confirmed QN85B target, the native
                   helper is the primary direct path. */
                var reason = String((nativeError && nativeError.message) || nativeError);
                snapshotSource("native-helper-fallback", wanted, { error: reason });
                return launchSamsungViewer(extra).then(function () {
                    return { route: "web-app-control", nativeError: reason };
                }).catch(function () {
                    return viaVetro(extra).then(function () { return { route: "app-launcher-fallback", nativeError: reason }; });
                });
            });
        }).then(function (handoff) {
            snapshotSource("viewer-requested", wanted, { handoff: handoff || null });
            fallbackNote = (handoff && handoff.route && handoff.route !== "native-capi")
                ? "HDMI opened by the fallback route (" + handoff.route + ")" + (handoff.nativeError ? ": " + String(handoff.nativeError).slice(0, 80) : "") + ". The picture may look dull."
                : "";
            nudgeHdmiBg();
            /* Game Mode remains an explicit user setting only. Apply it after
               the hand-off and do not await its old AVOC sleep/readback path,
               so it cannot delay or alter the normal PC/HDMI transaction. */
            if (pref("gameWanted")) game.applyOnInput().catch(function () {});
            hdmiPictureFix(wanted);
            return true;
        });
    }

    /* v1.2.86 (opt-in, Settings > Gaming): a yellowish, dull picture after HDMI is opened from APL matches Warm colour tone and
       Movie/Eco picture mode being active. A detached root script (it keeps running even if the launcher is suspended behind the
       input) waits for the viewer to settle, reads colour tone, colour space and picture mode, and puts only those three back to
       neutral: Warm/Cool tone -> Standard, Native space -> Auto, Movie/Eco -> Standard (undone if Standard would leave the backlight
       at 0). Two passes (5 s and 13 s), because the screen can re-apply its per-input memory after the first. What it found is written
       to /tmp/apl-hdmi-picfix.log and shown in Settings > About This Screen > HDMI Handoff Status. Off by default. */
    /* v1.2.87: the picture MODE (Entertainment, Game...) is never changed, only logged: only tone and colour space are put back. */
    function hdmiPictureFix(wanted) {
        if (PREVIEW || !pref("hdmiPicFix") || !wanted || wanted.type !== "HDMI") return;
        var A = AVOC.replace(/\s+$/, "");
        var cmd = "(A='" + A + "'; " +
            "p() { T=$($A GetColorToneMode i 0 2>/dev/null | awk '{print $2}'); " +
            "S=$($A GetColorSpace i 0 2>/dev/null | awk '{print $2}'); " +
            "M=$($A GetPictureMode i 0 2>/dev/null | awk '{print $2}'); " +
            "echo \"$1 before tone=$T space=$S mode=$M\" >> /tmp/apl-hdmi-picfix.log; " +
            "case \"$T\" in 1|5|6) $A SetColorToneMode ii -- 2 1 >/dev/null 2>&1;; esac; " +
            "[ \"$S\" = 1 ] && $A SetColorSpace ii -- 0 1 >/dev/null 2>&1; " +
            "}; " +
            ": > /tmp/apl-hdmi-picfix.log; sleep 5; p pass1; sleep 8; p pass2) >/dev/null 2>&1 & true";
        vetroPost("/exec", { cmd: cmd }).catch(function () {});
    }

    /* Read-only evidence for a physical HDMI test. It reads only the two
       temporary status files produced by the APL helper and root shell; it
       never writes a source, Vetro option, or picture setting. */
    function nativeHandoffReport() {
        var record = lastSourceSwitch || (function () {
            try { return JSON.parse(global.localStorage.getItem("apl.lastSourceSwitch") || "null"); } catch (e) { return null; }
        })();
        var handoff = record && record.selected && record.selected.handoff;
        var header = "APL HDMI handoff\nroute=" + (handoff && handoff.route ? handoff.route : "no completed APL HDMI test recorded") +
                     "\ntransport=" + (handoff && handoff.transport ? handoff.transport : "n/a") +
                     "\nexit=" + (handoff && handoff.exitCode !== undefined ? handoff.exitCode : "n/a");
        if (handoff && handoff.nativeError) header += "\nnative fallback=" + handoff.nativeError;
        if (PREVIEW) return Promise.resolve(header + "\n\nPreview: no native status file.");
        return tvExec("echo SHELL_STATUS; cat /tmp/apl-native-source-handoff.shell 2>/dev/null; echo HELPER_STATUS; cat /tmp/apl-native-source-handoff.status 2>/dev/null; echo PICFIX_LOG; cat /tmp/apl-hdmi-picfix.log 2>/dev/null; true").then(function (r) {
            var text = String((r && r.output) || "").trim();
            return header + "\n\n" + (text || "No native helper status file. The helper did not start, or Vetro returned no readable command result.");
        }, function (e2) {
            return header + "\n\nStatus read failed: " + String((e2 && e2.message) || e2);
        });
    }

    /* Apps running right now (ids), without going through Vetro. */
    function runningApps() {
        return new Promise(function (resolve, reject) {
            if (!tz || !tz.application || !tz.application.getAppsContext) { reject(new Error(APL.t("unavailable"))); return; }
            tz.application.getAppsContext(function (list) {
                resolve(list.map(function (c) { return c.appId; }));
            }, reject);
        });
    }

    /* ---------- remote keys ---------- */
    function registerKeys() {
        if (!tz || !tz.tvinputdevice) return;
        try {
            var all = tz.tvinputdevice.getSupportedKeys && tz.tvinputdevice.getSupportedKeys();
            if (Array.isArray(all)) {
                all.forEach(function (k) {
                    var nm = k && k.name;
                    if (nm && nm !== "VolumeUp" && nm !== "VolumeDown" && nm !== "VolumeMute" && nm !== "Power") {
                        try { tz.tvinputdevice.registerKey(nm); } catch (e) {}
                    }
                });
            }
        } catch (e) {}
        [
            "MediaPlayPause", "MediaPlay", "MediaPause", "MediaStop", "MediaFastForward", "MediaRewind",
            "ColorF0Red", "ColorF1Green", "ColorF2Yellow", "ColorF3Blue",
            "Info", "ChannelUp", "ChannelDown", "Search", "Guide", "Exit", "Extra", "Apps",
            "PreviousChannel", "Caption", "E-Manual", "PictureMode",
            "Shahid", "Netflix", "PrimeVideo", "DisneyPlus", "TVPlus", "YouTube"
        ].forEach(function (k) {
            try { tz.tvinputdevice.registerKey(k); } catch (e) {}
        });
    }

    /* ---------- sleep timer ----------
       The screen does the counting (background command): the launcher stops as soon as an app
       is in front, which is exactly when the timer is needed. The file is shared with overlay/. */
    var SLEEP_FILE = "/tmp/apl-sleep-at", SLEEP_LOG = "/tmp/apl-sleep.log";
    /* v8.7.66: the counting shell is fully detached (setsid when the screen has it, stdin closed), so it is not taken down
       with the command that started it, and it writes a line to /tmp/apl-sleep.log when it arms and when it fires. The file
       holds the wanted time: a later timer, or a cancel, makes an older shell do nothing. */
    function sleepShell(secs, minutes) {
        return "echo " + secs + " > " + SLEEP_FILE + "; echo \"armed $(date) wait=" + (minutes * 60) + "s\" >> " + SLEEP_LOG + "; " +
               "S=; command -v setsid >/dev/null 2>&1 && S=setsid; " +
               "$S sh -c 'sleep \"$1\"; if [ \"$(cat " + SLEEP_FILE + " 2>/dev/null)\" = \"$2\" ]; then rm -f " + SLEEP_FILE +
               "; echo \"fired $(date)\" >> " + SLEEP_LOG + "; /usr/bin/input_keyevent XF86PowerOff; fi' x " + (minutes * 60) + " " + secs +
               " </dev/null >/dev/null 2>&1 &";
    }
    function armSleepTimer(minutes) {
        var at = minutes ? Date.now() + minutes * 60000 : 0;
        setPref("sleepTimer", minutes);
        setPref("sleepAt", at);
        sleepFallbackDone = false;
        if (PREVIEW) return;
        var secs = Math.round(at / 1000);
        tvExec(minutes ? sleepShell(secs, minutes) : "rm -f " + SLEEP_FILE).catch(function () {});
    }
    /* v8.7.66: second line of defence, in the launcher itself (it also stops what the launcher plays). When the time is up
       the radio, the recitation and the recordings stop at once. If the screen's own shell has not turned the screen off
       25 seconds later (its file is still there), the launcher does it. The file is the lock: whoever removes it sends
       the power key, so it is never sent twice. */
    var sleepFallbackDone = false;
    function stopAllAudio() {
        try { if (APL.radio && APL.radio.stop) APL.radio.stop(); } catch (e) {}
        try { if (APL.quranAudio && APL.quranAudio.pause) APL.quranAudio.pause(); } catch (e1) {}
        try { if (APL.audioPack && APL.audioPack.stop) APL.audioPack.stop(); } catch (e2) {}
    }
    function sleepWatchTick() {
        var at = pref("sleepAt") || 0, now = Date.now();
        if (!at || now < at || sleepFallbackDone) return;
        sleepFallbackDone = true;
        stopAllAudio();
        if (now > at + 10 * 60000) { setPref("sleepAt", 0); setPref("sleepTimer", 0); return; }     // a stale time (the launcher was asleep): do nothing more
        setTimeout(function () {
            setPref("sleepAt", 0);
            setPref("sleepTimer", 0);
            if (PREVIEW) return;
            tvExec("if [ -f " + SLEEP_FILE + " ]; then rm -f " + SLEEP_FILE + "; echo \"launcher fallback $(date)\" >> " + SLEEP_LOG +
                   "; /usr/bin/input_keyevent XF86PowerOff; fi").catch(function (e) {
                if (APL.toast) APL.toast(APL.t("Auto Off could not turn the screen off: {why}", { why: String((e && e.message) || e).slice(0, 80) }));
            });
        }, 25000);
    }
    setInterval(sleepWatchTick, 5000);
    document.addEventListener("visibilitychange", function () { if (!document.hidden) sleepWatchTick(); });
    /* Timer set from the native Control Center: the launcher picks it up. */
    function readSleepTimer() {
        if (PREVIEW) return Promise.resolve();
        return tvExec("cat " + SLEEP_FILE + " 2>/dev/null").then(function (r) {
            var secs = parseInt(String(r.output || "").trim(), 10), at = secs ? secs * 1000 : 0;
            if (at < Date.now()) at = 0;
            setPref("sleepAt", at);
            if (!at) setPref("sleepTimer", 0);
        }, function () {});
    }

    /* ---------- Vetro (root service already installed on the screen) ----------
       Used for the REAL picture settings (backlight, contrast, sharpness,
       color…) and to close the Samsung home. Body sent as text/plain: no
       preflight request, Vetro reads the JSON whatever the type. */
    /* Vetro's port: 8099, or the one Vetro was built with (VETRO_PORT=…, when another app holds 8099). The bridge
       finds it on its own (bridge/service.js, overlay/VetroPort.cs); the launcher learns it from /status, where
       Vetro gives a port that is not the usual one, and keeps it for the direct calls and icons. */
    var VETRO_PORT_KEY = "apl.vetroPort";
    var vetroPortNum = (function () { var p = parseInt(load(VETRO_PORT_KEY, 0), 10); return p >= 1024 && p <= 65535 ? p : 8099; })();
    function vetroUrl(path) { return "http://127.0.0.1:" + vetroPortNum + (path || ""); }
    function notePort(s) {
        if (!s || !s.app || typeof s.app !== "object" || !s.app.version) return;
        var p = parseInt(s.app.port, 10) || 8099;
        if (p === vetroPortNum || p < 1024 || p > 65535) return;
        vetroPortNum = p;
        if (p === 8099) { try { global.localStorage.removeItem(VETRO_PORT_KEY); } catch (e) {} } else save(VETRO_PORT_KEY, p);
    }
    /* Vetro only lets the screen's apps read its answers for /status, /probe and
       /screen. The launcher's private bridge (bridge/service.js, a service in this package) makes
       the other requests and sends the answer back through a trusted Tizen message port
       (reserved for apps signed with the same certificate; no network port is opened). */
    var BRIDGE_ID = "APLMusalla.Bridge", BRIDGE_PORT = "APL_BRIDGE", BRIDGE_PORT_PLAIN = "APL_BRIDGE_PLAIN";
    var replyPort = null, plainReplyPort = null, pending = {}, seq = 0, bridgeDownUntil = 0, bridgeStarting = null;
    var usePlainBridge = false;
    var bridgeToken = "";

    function generateSecureToken() {
        try {
            if (global.crypto && global.crypto.getRandomValues) {
                var bytes = new Uint8Array(16);
                global.crypto.getRandomValues(bytes);
                var hex = "";
                for (var i = 0; i < bytes.length; i++) {
                    var b = bytes[i].toString(16);
                    hex += (b.length === 1 ? "0" : "") + b;
                }
                return hex;
            }
        } catch (e) {}
        return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2) + Date.now().toString(36);
    }

    function rndId() {
        try {
            var u = new Uint8Array(8); global.crypto.getRandomValues(u);
            var h = ""; for (var i = 0; i < u.length; i++) h += (u[i] < 16 ? "0" : "") + u[i].toString(16);
            return h;
        } catch (e) { return Math.random().toString(36).slice(2) + Date.now().toString(36); }
    }
    var tokenPromise = null;
    function initBridgeToken() {
        if (bridgeToken && bridgeToken.length >= 8) return Promise.resolve(bridgeToken);
        if (tokenPromise) return tokenPromise;
        var tokCandidate = generateSecureToken();
        try {
            var saved = global.localStorage && global.localStorage.getItem("apl_bridge_token");
            if (saved && saved.length >= 8) tokCandidate = saved;
            else if (global.localStorage) global.localStorage.setItem("apl_bridge_token", tokCandidate);
        } catch (e) {}

        if (!tz || !tz.filesystem) {
            bridgeToken = tokCandidate;
            return Promise.resolve(bridgeToken);
        }
        tokenPromise = new Promise(function (resolve) {
            var raceTimer = setTimeout(function () {
                if (!bridgeToken) bridgeToken = tokCandidate;
                resolve(bridgeToken);
            }, 1500);

            function finish(tok) {
                clearTimeout(raceTimer);
                bridgeToken = tok || tokCandidate;
                resolve(bridgeToken);
            }

            try {
                tz.filesystem.resolve("wgt-private", function (dir) {
                    try {
                        var f = dir.resolve("bridge.token");
                        if (f) {
                            f.openStream("r", function (stream) {
                                try {
                                    var t = stream.read(stream.bytesAvailable);
                                    stream.close();
                                    if (t && t.trim().length >= 8) {
                                        finish(t.trim());
                                        return;
                                    }
                                } catch (e) { try { stream.close(); } catch (e2) {} }
                                try { dir.deleteFile("bridge.token"); } catch (eDel) {}
                                writeTokenFile(dir, tokCandidate, finish);
                            }, function () {
                                try { dir.deleteFile("bridge.token"); } catch (eDel2) {}
                                writeTokenFile(dir, tokCandidate, finish);
                            }, "UTF-8");
                            return;
                        }
                    } catch (e) {}
                    writeTokenFile(dir, tokCandidate, finish);
                }, function () {
                    finish(tokCandidate);
                }, "rw");
            } catch (e) {
                finish(tokCandidate);
            }
        });
        return tokenPromise;
    }
    function writeTokenFile(dir, tok, resolve) {
        try {
            try { dir.deleteFile("bridge.token"); } catch (eDel) {}
            var f = dir.createFile("bridge.token");
            f.openStream("w", function (stream) {
                try { stream.write(tok); stream.close(); } catch (e) { try { stream.close(); } catch (e2) {} }
                resolve(tok);
            }, function () { resolve(tok); }, "UTF-8");
        } catch (e) { resolve(tok); }
    }
    initBridgeToken().catch(function () {});
    function tizenMajor() {
        return safe(function () {
            return parseFloat(tz.systeminfo.getCapability("http://tizen.org/feature/platform.version")) || 6.5;
        }, 6.5);
    }
    var oldTizen = null;
    function isOldTizen() {
        if (oldTizen === null) oldTizen = tizenMajor() < 7;
        return oldTizen;
    }
    function getRemotePort(forcePlain) {
        if (!forcePlain && !usePlainBridge) {
            try { return { port: tz.messageport.requestTrustedRemoteMessagePort(BRIDGE_ID, BRIDGE_PORT), plain: false }; }
            catch (e) {}
        }
        try { return { port: tz.messageport.requestRemoteMessagePort(BRIDGE_ID, BRIDGE_PORT_PLAIN), plain: true }; }
        catch (e2) {
            return { port: tz.messageport.requestTrustedRemoteMessagePort(BRIDGE_ID, BRIDGE_PORT), plain: false };
        }
    }
    /* The service takes a few seconds to open its port after it starts: wait until either trusted or plain port opens. */
    function waitBridge(until) {
        return new Promise(function (resolve, reject) {
            (function poll() {
                try { getRemotePort(false); resolve(); }
                catch (e) { if (Date.now() >= until) reject(e); else setTimeout(poll, 250); }
            })();
        });
    }
    function startBridge() {
        if (bridgeStarting) return bridgeStarting;
        function done() { bridgeStarting = null; }
        bridgeStarting = new Promise(function (resolve) {
            function plain() { try { tz.application.launch(BRIDGE_ID, resolve, resolve); } catch (e) { resolve(); } }
            try {
                tz.application.launchAppControl(new tz.ApplicationControl("http://tizen.org/appcontrol/operation/service"),
                                                BRIDGE_ID, resolve, plain);
            } catch (e) { plain(); }
        }).then(function () { return waitBridge(Date.now() + 12000); });
        bridgeStarting.then(done, done);
        return bridgeStarting;
    }
    function onReply(data) {
        var m = {};
        for (var i = 0; i < data.length; i++) m[data[i].key] = data[i].value;
        var p = pending[m.id];
        if (!p) return;
        // Large answers arrive in several pieces (a piece sent again by another port counts once)
        var part = parseInt(m.part, 10) || 0;
        if (p.chunks[part] === undefined) p.got++;
        p.chunks[part] = m.body || "";
        if (p.got < (parseInt(m.parts, 10) || 1)) return;
        delete pending[m.id]; clearTimeout(p.timer);
        p.resolve({ status: parseInt(m.status, 10) || 0, body: p.chunks.join("") });
    }
    function ensureReplyPort() {
        if (!replyPort) {
            try {
                replyPort = tz.messageport.requestTrustedLocalMessagePort("APL_BRIDGE_REPLY");
                replyPort.addMessagePortListener(onReply);
            } catch (e) { replyPort = null; }
        }
        /* Open plain reply port on all Tizen < 9 (including Tizen 6.5) so re-signed packages always receive replies */
        if (tizenMajor() < 9 && !plainReplyPort) {
            try {
                plainReplyPort = tz.messageport.requestLocalMessagePort("APL_BRIDGE_REPLY_PLAIN");
                plainReplyPort.addMessagePortListener(onReply);
            } catch (e2) { plainReplyPort = null; }
        }
        return replyPort || plainReplyPort;
    }
    function bridgeRequest(method, path, body, waitMs) {
        if (PREVIEW || !tz || !tz.messageport || Date.now() < bridgeDownUntil) return Promise.reject(new Error("bridge unavailable"));
        var timeoutMs = waitMs || 25000;
        return initBridgeToken().then(function (tok) {
            function sendOnce(forcePlain) {
                return new Promise(function (resolve, reject) {
                    var rem = getRemotePort(forcePlain);
                    ensureReplyPort();
                    var id = rndId() + "." + String(++seq);
                    pending[id] = {
                        resolve: resolve,
                        chunks: [],
                        got: 0,
                        timer: setTimeout(function () { delete pending[id]; reject(new Error("timeout")); }, timeoutMs)
                    };
                    /* The bridge gets a shorter time than this side waits: when Vetro is only slow, the bridge
                       answers with its own error first. If this side timed out first it would send the same
                       command again through the plain port, and a slow command would run twice. */
                    var bridgeMs = timeoutMs > 8000 ? timeoutMs - 4000 : Math.max(1000, Math.round(timeoutMs * 0.6));
                    var msg = [
                        { key: "id", value: id },
                        { key: "method", value: method },
                        { key: "path", value: path },
                        { key: "body", value: body || "" },
                        { key: "timeout", value: String(bridgeMs) },
                        { key: "token", value: tok || bridgeToken || "" }
                    ];
                    /* v7.0.7: the plain port always carries a reply port: the bridge checks its appId (the sender) before
                       relaying a command; without it the plain port only answers read-only diagnostics. */
                    var attach = isOldTizen() ? (rem.plain ? (plainReplyPort || replyPort) : (replyPort || plainReplyPort))
                                              : (rem.plain ? (plainReplyPort || replyPort) : null);
                    try {
                        if (attach) {
                            try { rem.port.sendMessage(msg, attach); return; } catch (e) {}
                        }
                        rem.port.sendMessage(msg);
                    } catch (e3) {
                        if (pending[id]) { clearTimeout(pending[id].timer); delete pending[id]; }
                        reject(e3);
                    }
                });
            }
            return sendOnce(false).catch(function (e) {
                if (e && e.message === "timeout" && !usePlainBridge && tizenMajor() < 9) {
                    return sendOnce(true).then(function (res) { usePlainBridge = true; return res; });
                }
                if (e && e.message === "timeout") throw e;
                return startBridge().then(function () { return sendOnce(false); }).catch(function () {
                    if (tizenMajor() < 9) return sendOnce(true).then(function (res) { usePlainBridge = true; return res; });
                    throw e;
                });
            });
        }).catch(function (e) {
            if (!(e && e.message === "timeout")) bridgeDownUntil = Date.now() + 3000;
            throw e;
        });
    }
    /* Tells the bridge whether the launcher is in front: if the screen goes to sleep on it, the
       bridge brings it back at wake-up on screens that come back on the TV input (bridge/service.js). */
    function bridgeFront(visible) {
        if (PREVIEW || !tz || !tz.messageport) return;
        function send() {
            getRemotePort(false).port.sendMessage([{ key: "front", value: visible ? "1" : "0" }]);
        }
        try { send(); } catch (e) { startBridge().then(send).catch(function () {}); }
    }
    if (!PREVIEW && global.document) {
        document.addEventListener("visibilitychange", function () { bridgeFront(!document.hidden); });
        setTimeout(function () { startBridge().catch(function () {}); if (!document.hidden) bridgeFront(true); }, 1500);
    }
    function vetroGet(path) {
        return bridgeRequest("GET", path, "").then(function (r) {
            if (!r || r.status === 0 || r.status >= 400) throw new Error("Vetro " + (r ? r.status : 0));
            return JSON.parse(r.body);
        }).catch(function () {
            return global.fetch(vetroUrl(path)).then(function (r) {
                if (!r.ok) throw new Error("Vetro " + r.status);
                return r.json();
            }, function () { throw new Error(APL.t("Vetro is not responding")); });
        });
    }
    function vetroPost(path, body) {
        var text = JSON.stringify(body);
        return bridgeRequest("POST", path, text).then(function (r) {
            if (!r || r.status === 0) {
                /* v1.2.85: the bridge says "slow" when Vetro already HAS the request (connected, answer late). Sending it
                   again by the direct route would run the same command twice. Only a request that never reached Vetro
                   goes on to the fallback below. */
                var slow = false;
                try { var eb = JSON.parse((r && r.body) || "{}"); slow = !!(eb && eb.slow === true); } catch (e0) {}
                if (slow) { var se = new Error(APL.t("Vetro is slow to answer")); se.noResend = true; throw se; }
                throw new Error("bridge unreachable");
            }
            try { return JSON.parse(r.body); } catch (e) { return {}; }
        }).catch(function (eFirst) {
            if (eFirst && eFirst.noResend) throw eFirst;
            /* Try readable direct fetch first (works in Tizen WRT with <access origin="*">), then no-cors */
            return global.fetch(vetroUrl(path), {
                method: "POST",
                headers: { "content-type": "text/plain" },
                body: text
            }).then(function (r) {
                if (!r.ok) throw new Error("Vetro " + r.status);
                return r.json();
            }).catch(function () {
                return global.fetch(vetroUrl(path), {
                    method: "POST",
                    mode: "no-cors",
                    headers: { "content-type": "text/plain" },
                    body: text
                }).then(function () { return { sent: true }; });
            });
        });
    }
    /* Is Vetro answering? (a yes is cached for 20 s; a no only for 3 s: right after cold boot Vetro
       can take 30-60 s to connect its root agent) */
    var aliveAt = 0, alive = false;
    function vetroAlive() {
        if (PREVIEW) return Promise.resolve(false);
        if (Date.now() - aliveAt < (alive ? 20000 : 3000)) return Promise.resolve(alive);
        return vetroGet("/status").then(function (s) {
                                            notePort(s);
                                            if (s && s.app && typeof s.app === "object" && s.app.version) clearNoVetro();
                                            return !!s && !(s.agent && s.agent.connected === false);
                                        },
                                        function () { return false; })
            .then(function (ok) { alive = ok; aliveAt = Date.now(); return ok; });
    }
    // Start Bridge & probe Vetro across startup window so background audio & alerts connect immediately
    if (!PREVIEW) {
        [2000, 8000, 20000, 45000].forEach(function (ms) {
            setTimeout(function () { if (!alive) vetroAlive(); }, ms);
        });
    }

    /* Settings › Support › About This Screen: how the launcher reaches Vetro. Through the bridge it reads the
       answers; without it orders still go out (Bluetooth connects) but nothing can be read back, so the
       picture settings say Unavailable. For reports (issue #21, Tizen 6.5). */
    function vetroLink() {
        if (PREVIEW) return Promise.resolve(APL.t("Preview"));
        // 1. Does the bridge get the request and answer at all? The web bridge answers this one itself,
        //    without Vetro (bridge/service.js); the .NET bridge says "not relayed", which is an answer too.
        var t0 = Date.now(), info = null;
        return bridgeRequest("GET", "/bridge-info", "", 10000).then(function (r) {
            try { info = JSON.parse(r.body); } catch (e) {}
            // 2. Then a command through Vetro
            t0 = Date.now();
            return bridgeRequest("POST", "/exec", JSON.stringify({ cmd: "true" }), 20000).then(function (x) {
                var ok = false, why = "";
                try { var j = JSON.parse(x.body); ok = j.ok !== false; why = String(j.error || j.stderr || "").slice(0, 80); } catch (e) {}
                // Vetro answers but runs nothing (an S95C on Tizen 9, Reddit): most often its root agent is not
                // connected, which Vetro says ("no root agent connected"). Shown as it is.
                var port = (info && info.port) || vetroPortNum;
                return (ok ? APL.t("Through the bridge") : APL.t("Bridge: Vetro refused")) + " (" + (Date.now() - t0) + " ms" +
                       (info && info.reached ? ", " + info.reached : "") + (port !== 8099 ? ", " + APL.t("port {port}", { port: port }) : "") +
                       (!ok && why ? ", " + why : "") + ")";
            }, function () {
                // The bridge answers but Vetro doesn't: the addresses it tried and how they failed
                var tried = [];
                if (info && info.errors) Object.keys(info.errors).forEach(function (h) { tried.push(h + " " + info.errors[h]); });
                return APL.t("Bridge works, Vetro unreachable") + (tried.length ? ": " + tried.join(" · ") : "");
            });
        }, function (e) {
            return APL.t("Bridge: {error}", { error: e && e.message === "timeout" ? APL.t("no answer at all") : ((e && e.message) || "?") });
        });
    }

    /* Root command on the screen, through Vetro and the bridge. No backslashes in commands: Vetro doubles them. */
    function tvExec(cmd) {
        return vetroPost("/exec", { cmd: cmd }).then(function (r) {
            if (!r || r.sent) throw new Error(APL.t("Vetro is not responding (open Vetro once on the screen)"));
            return r;
        });
    }

    function sanitizeAudioState() {
        if (PREVIEW) return;
        setTimeout(function () {
            tvExec("pkill -9 -f 'gst-launch.*(radio|quran|station)' 2>/dev/null; pkill -9 -f 'pacat.*APL' 2>/dev/null; rm -f /run/apl-bg/radio.* /tmp/apl-bg/radio.* /opt/usr/home/owner/APL/bg/radio.* 2>/dev/null; true").catch(function () {});
        }, 2000);
    }
    sanitizeAudioState();

    /* ---------- picture and Game Mode: the screen's AV service (D-Bus) ----------
       Answers look like "ii <value> <code>", with code 0 when all is well. */
    var AVOC = "busctl --system call org.tizen.tv.avoc /org/tizen/tv/avoc org.tizen.tv.avoc.AvOutputControl ";
    var PICTURE = [
        { id: "backlight", get: "GetBacklight i 0", set: "SetBacklight ii", min: 0, max: 50 },
        { id: "contrast", get: "GetContrast i 0", set: "SetContrast yi", min: 0, max: 50 },
        { id: "sharpness", get: "GetSharpness i 0", set: "SetSharpness yi", min: 0, max: 20 },
        { id: "color", get: "GetColorStrength i 0", set: "SetColorStrength yi", min: 0, max: 50 },
        { id: "pictureMode", get: "GetPictureMode i 0", set: "SetPictureMode ii", coded: true }
    ];
    /* Modes in this screen's Samsung list, noted on the M8 (Game Mode forces another one). */
    var PICTURE_MODES = [[65536, APL.t("Dynamic")], [65537, "Standard"], [65552, APL.t("Eco")], [65538, APL.t("Movie")]];
    var GAME_PICTURE = 458769;
    function pictureModeName(v) {
        if (v === GAME_PICTURE) return APL.t("Game");
        for (var i = 0; i < PICTURE_MODES.length; i++) if (PICTURE_MODES[i][0] === v) return PICTURE_MODES[i][1];
        return APL.t("Automatic");
    }
    function answerValue(line) { return parseInt(String(line || "").trim().split(/\s+/)[1], 10); }

    var MOCK_TV = [
        { id: "backlight", writable: true, value: 32, min: 0, max: 50 },
        { id: "contrast", writable: true, value: 45, min: 0, max: 50 },
        { id: "sharpness", writable: true, value: 10, min: 0, max: 20 },
        { id: "color", writable: true, value: 25, min: 0, max: 50 },
        { id: "pictureMode", writable: true, value: 65537, coded: true }
    ];
    var tvCache = null, tvAt = 0, tvPending = null;
    function tvSettings(force) {
        if (PREVIEW) return Promise.resolve(MOCK_TV);
        if (!force && tvCache && Date.now() - tvAt < 8000) return Promise.resolve(tvCache);
        if (tvPending) return tvPending;
        // Everything is read at once: a single command, much faster than Vetro's /tv-settings
        var cmd = PICTURE.map(function (p) { return "echo " + p.id + " $(" + AVOC + p.get + " 2>/dev/null)"; }).join("; ");
        tvPending = tvExec(cmd).then(function (r) {
            var byId = {};
            String(r.output || "").split("\n").forEach(function (l) {
                var w = l.trim().split(/\s+/);
                if (w.length >= 4) byId[w[0]] = { value: parseInt(w[2], 10), code: parseInt(w[3], 10) };
            });
            tvCache = PICTURE.filter(function (p) { return byId[p.id] && byId[p.id].code === 0; }).map(function (p) {
                return { id: p.id, writable: true, value: byId[p.id].value, min: p.min, max: p.max, coded: !!p.coded, def: p };
            });
            tvAt = Date.now(); tvPending = null;
            return tvCache;
        }, function (e) { tvPending = null; throw e; });
        return tvPending;
    }
    /* Writes a value and reads it back: the value read back is what counts. The last argument is 1:
       the screen saves the value (with 0, it applies but the screen forgets it in under a second). */
    function tvWrite(it, want) {
        var p = it.def;
        return tvExec(AVOC + p.set + " " + want + " 1 2>&1; " + AVOC + p.get + " 2>&1").then(function (r) {
            var lines = String(r.output || "").trim().split("\n");
            var back = answerValue(lines[lines.length - 1]);
            if (isNaN(back)) throw new Error(APL.t("The screen did not respond"));
            it.value = back;
            if (back !== want) throw new Error(APL.t("The screen refused this setting for now"));
            return back;
        });
    }
    /* On the M8, Standard has its backlight and contrast at 0 (black picture, unreadable menus):
       in that case a mode takes over the values of the mode being left. */
    function setPictureMode(v) {
        if (PREVIEW) { MOCK_TV[MOCK_TV.length - 1].value = v; return Promise.resolve(v); }
        return tvSettings(true).then(function (before) {
            var old = {};
            before.forEach(function (it) { old[it.id] = it; });
            if (!old.pictureMode) throw new Error(APL.t("Picture Mode unavailable"));
            return tvWrite(old.pictureMode, v).then(function (back) {
                return tvSettings(true).then(function (now) {
                    var next = Promise.resolve();
                    now.forEach(function (it) {
                        if ((it.id === "backlight" || it.id === "contrast") && it.value === 0 && old[it.id] && old[it.id].value > 0) {
                            next = next.then(function () { return tvWrite(it, old[it.id].value); });
                        }
                    });
                    return next.then(function () { tvCache = null; return back; });
                });
            });
        });
    }

    /* Game Mode: the screen accepts it once an input (HDMI, USB-C) has been shown since
       power-on. Before that, the request is held (gameWanted) and sent when switching to an input. */
    var game = {
        get: function () {
            if (PREVIEW) return Promise.resolve({ available: true, on: !!pref("gameWanted") });
            return tvExec(AVOC + "CheckGameMode 2>&1; " + AVOC + "GetGameMode i 0 2>&1").then(function (r) {
                var lines = String(r.output || "").trim().split("\n");
                var available = answerValue(lines[0]) === 1;
                if (available && pref("gameWanted")) setPref("gameWanted", false);
                return { available: available, on: available ? answerValue(lines[1]) === 1 : !!pref("gameWanted"),
                         pending: !available && !!pref("gameWanted") };
            });
        },
        set: function (on) {
            if (PREVIEW) { setPref("gameWanted", !!on); return Promise.resolve({ available: true, on: !!on }); }
            return game.get().then(function (g) {
                if (!g.available) {
                    setPref("gameWanted", !!on);
                    return { available: false, on: !!on, pending: !!on };
                }
                return tvExec(AVOC + "SetGameMode ii 1 " + (on ? 1 : 0) + " 2>&1; sleep 1; " + AVOC + "GetGameMode i 0 2>&1").then(function (r) {
                    var lines = String(r.output || "").trim().split("\n");
                    var now = answerValue(lines[lines.length - 1]) === 1;
                    tvCache = null;
                    if (now !== !!on) throw new Error(APL.t("The screen refused Game Mode for now"));
                    return { available: true, on: now };
                });
            });
        },
        /* Keep the connected device's own picture / graphics settings untouched */
        applyOnInput: function () {
            if (pref("gameWanted")) {
                return game.set(true).catch(function () {});
            }
            return Promise.resolve();
        }
    };
    /* The screen's other settings: AV service (D-Bus) or vconf, read and written directly, as
       above. All tried on the M8: write, read back, restore. "--": negative values.
       V = the value. No backslashes: Vetro doubles them. */
    var NATIVE = {
        tint:       { get: "GetColorTint i 0", set: "SetColorTint yi -- V 1", min: 0, max: 30 },
        shadow:     { get: "GetBrightness i 0", set: "SetBrightness ii -- V 1", min: -5, max: 5 },
        gamma:      { get: "GetGamma i 0", set: "SetGamma ii -- V 1", min: -3, max: 3 },
        blur:       { get: "GetBlurReduction i 0", set: "SetBlurReduction iy -- 1 V", min: 0, max: 10 },
        judder:     { get: "GetJuddlerReduction i 0", set: "SetJuddlerReduction iy -- 1 V", min: 0, max: 10 },
        balance:    { get: "GetBalance u 0", set: "SetBalance uu -- V 1", min: 0, max: 20 },
        delay:      { get: "GetDelay u 0", set: "SetDelay uu -- V 1", min: 0, max: 250, step: 10 },
        eq0:        { get: "GetEqualizer uu 0 0", set: "SetEqualizer iii -- 0 V 1", min: 0, max: 100, step: 10 },
        eq1:        { get: "GetEqualizer uu 1 0", set: "SetEqualizer iii -- 1 V 1", min: 0, max: 100, step: 10 },
        eq2:        { get: "GetEqualizer uu 2 0", set: "SetEqualizer iii -- 2 V 1", min: 0, max: 100, step: 10 },
        eq3:        { get: "GetEqualizer uu 3 0", set: "SetEqualizer iii -- 3 V 1", min: 0, max: 100, step: 10 },
        eq4:        { get: "GetEqualizer uu 4 0", set: "SetEqualizer iii -- 4 V 1", min: 0, max: 100, step: 10 },
        contrastUp: { get: "GetDynamicContrast i 0", set: "SetDynamicContrast ii -- V 1" },
        colorTone:  { get: "GetColorToneMode i 0", set: "SetColorToneMode ii -- V 1" },
        colorSpace: { get: "GetColorSpace i 0", set: "SetColorSpace ii -- V 1" },
        clarity:    { get: "GetAutoMotionPlus i 0", set: "SetAutoMotionPlus ii -- V 1" },
        eyeSaver:   { get: "GetEyeSaverMode i 0", set: "SetEyeSaverMode ii -- V 1" },
        adaptive:   { get: "GetAdaptivePicture", set: "SetAdaptivePicture i -- V" },
        energy:     { get: "GetEnergySaving i 0", set: "SetEnergySaving ii -- 1 V" },
        ecoSensor:  { get: "GetEcoSensor i 0", set: "SetEcoSensor ii -- 1 V" },
        hdmiBlack:  { get: "GetHdmiBlackLevel i 0", set: "SetHdmiBlackLevel ii -- V 1" },
        earc:       { get: "GetEarcEnable", set: "SetEarcEnable i -- V" },
        soundMode:  { get: "GetSoundMode u 0", set: "SetSoundMode uu -- V 1" },
        autoVolume: { get: "GetAutoVolume u 0", set: "SetAutoVolume uu -- V 1" },
        feedback:   { get: "GetSoundFeedback i 0", set: "SetSoundFeedback ii -- 1 V" },
        /* The screen's home app (db/appfw/home_appid). At power-on the screen puts either the TV input or the
           home app in front, and Autorun Smart Hub chooses the home app: with the launcher as home app, it is
           on screen about a second after power-on instead of after the start-up service (~1 min). Autorun
           also opened Samsung's home at every wake: APL Overlay turns it off while the screen sleeps and
           on again once it is awake (overlay/Autorun.cs). Off: the screen's own home app again, as the
           firmware records it in db/first_screen/type. */
        homeApp:    { home: true }
    };
    var HOME_KEY = "db/appfw/home_appid", AUTOSTART_KEY = "db/menu/smart_hub/ontvsetting/auto_start";
    var MOCK_NATIVE = {};
    function nativeGet(id) {
        var d = NATIVE[id];
        if (PREVIEW) return Promise.resolve(MOCK_NATIVE[id] || (d.min !== undefined ? Math.round((d.min + d.max) / 2) : 0));
        if (d.home) {
            // On only if both took: with Autorun off the screen still starts on the TV input
            return withTimeout(homeAppRead(), 15000).then(function (s) { return s.home === "APLMusalla.Home" && s.autostart === 1 ? 1 : 0; });
        }
        if (d.vconf) {
            return tvExec("vconftool get " + d.vconf + " 2>&1").then(function (r) {
                var m = /value = (-?[0-9]+)/.exec(String(r.output || ""));
                if (!m) throw new Error(APL.t("Unavailable"));
                return parseInt(m[1], 10);
            });
        }
        return tvExec(AVOC + d.get + " 2>&1").then(function (r) {
            var w = String(r.output || "").trim().split(/\s+/);
            if (w.length < 3 || w[w.length - 1] !== "0") throw new Error(APL.t("Unavailable"));
            return parseInt(w[1], 10);
        });
    }
    /* Writes then reads back: the value read back is what counts. */
    function nativeSet(id, value) {
        var d = NATIVE[id];
        if (PREVIEW) { MOCK_NATIVE[id] = value; return Promise.resolve(value); }
        // Start on Salah Launcher first: it has no D-Bus method, and reading d.set below threw before anything was
        // written, so OK only showed "…" on every screen (an S90F). The timeout covers the read back too.
        if (d.home) return withTimeout(homeAppSet(value).then(function (r) { return homeAppCheck(value, r); }), 20000);
        var write = d.vconf ? "vconftool set -f -t int " + d.vconf + " " + value + " 2>&1" : AVOC + d.set.replace("V", value) + " 2>&1";
        return tvExec(write).then(function () { return nativeGet(id); }).then(function (back) {
            if (back !== value) throw new Error(APL.t("The screen refused this setting for now"));
            return back;
        });
    }
    function withTimeout(p, ms) {
        return new Promise(function (resolve, reject) {
            var t = setTimeout(function () {
                reject(new Error(APL.t("The screen didn't answer within {s} s. Try again in a minute.", { s: Math.round(ms / 1000) })));
            }, ms);
            p.then(function (v) { clearTimeout(t); resolve(v); }, function (e) { clearTimeout(t); reject(e); });
        });
    }
    /* Start on Salah Launcher read back. When the screen doesn't keep it, the message says what it kept
       (and what vconftool answered, when it said anything): "refused" alone told nobody why. */
    function homeAppCheck(value, written) {
        return homeAppRead().then(function (s) {
            var back = s.home === "APLMusalla.Home" && s.autostart === 1 ? 1 : 0;
            if (back === value) return back;
            var said = String((written && written.output) || "").replace(/\s+/g, " ").trim().slice(0, 90);
            throw new Error(APL.t("The screen kept {app} as its home app, Autorun Smart Hub {state}.",
                                  { app: s.home, state: s.autostart === 1 ? APL.t("on") : APL.t("off") }) + (said ? " " + said : ""));
        });
    }
    function homeAppRead() {
        return tvExec("vconftool get " + HOME_KEY + " 2>&1; vconftool get " + AUTOSTART_KEY + " 2>&1").then(function (r) {
            var out = String(r.output || ""), h = /home_appid, value = (\S+)/.exec(out), a = /auto_start, value = (-?[0-9]+)/.exec(out);
            if (!h || !a) throw new Error(APL.t("Unavailable"));
            return { home: h[1], autostart: parseInt(a[1], 10) };
        });
    }
    /* On: saves the screen's home app and Autorun as they are, then makes the launcher the home app and
       turns Autorun on. Off: puts back exactly what was saved; without a saved value, the home app the
       firmware records in db/first_screen/type, then Samsung's home, and Autorun off. */
    var APP_ID_RE = /^[A-Za-z0-9._-]{1,120}$/;
    function homeAppSet(value) {
        return homeAppRead().then(function (cur) {
            if (value === 1) {
                if (cur.home !== "APLMusalla.Home") setPref("homeAppSaved", { home: cur.home, autostart: cur.autostart });
                return tvExec("vconftool set -f -t string " + HOME_KEY + " APLMusalla.Home 2>&1; vconftool set -f -t int " + AUTOSTART_KEY + " 1 2>&1");
            }
            var saved = pref("homeAppSaved") || {};
            var home = saved.home && saved.home !== "APLMusalla.Home" && APP_ID_RE.test(saved.home) ? saved.home : null;
            var autostart = saved.autostart === 1 ? 1 : 0;
            var setHome = home ? "vconftool set -f -t string " + HOME_KEY + " " + home + " 2>&1"
                : "h=$(vconftool get db/first_screen/type 2>/dev/null | awk '{print $4}'); " +
                  "if [ -z \"$h\" ] || [ \"$h\" = APLMusalla.Home ]; then h=com.samsung.tv.csfs; fi; " +
                  "vconftool set -f -t string " + HOME_KEY + " \"$h\" 2>&1";
            return tvExec(setHome + "; vconftool set -f -t int " + AUTOSTART_KEY + " " + autostart + " 2>&1").then(function (r) {
                setPref("homeAppSaved", null);
                return r;
            });
        });
    }
    function nativeReset(method) { return PREVIEW ? Promise.resolve() : tvExec(AVOC + method + " 2>&1"); }

    function tvItem(id) {
        return tvSettings().then(function (items) {
            for (var i = 0; i < items.length; i++) if (items[i].id === id) return items[i];
            return null;
        });
    }
    /* Gradual adjustment (◀ ▶): the displayed value changes right away, the write
       goes out 350 ms after the last key press, one at a time. */
    var tvTimers = {}, tvWriting = {};
    function tvAdjust(id, delta, onChange) {
        return tvItem(id).then(function (it) {
            if (!it || !it.writable) throw new Error(APL.t("Setting unavailable for now"));
            if (it.target === undefined) it.target = it.value;
            it.target = Math.max(it.min, Math.min(it.max, it.target + delta));
            if (onChange) onChange(it.target, it);
            clearTimeout(tvTimers[id]);
            tvTimers[id] = setTimeout(function flush() {
                if (tvWriting[id]) { tvTimers[id] = setTimeout(flush, 150); return; }
                if (it.target === it.value) return;
                if (PREVIEW) { it.value = it.target; return; }
                tvWriting[id] = true;
                tvWrite(it, it.target).then(function () {
                    tvWriting[id] = false;
                }, function (e) {
                    tvWriting[id] = false;
                    it.target = it.value;
                    tvCache = null;
                    if (onChange) onChange(it.value, it);
                    if (global.APL && global.APL.toast) global.APL.toast(e.message);
                });
            }, 350);
            return it.target;
        });
    }
    function tvValue(id) {
        return tvItem(id).then(function (it) { return it ? (it.target !== undefined ? it.target : it.value) : null; });
    }

    /* ---------- navigation sounds (synthesized, no file) ---------- */
    var actx = null;
    function blip(freq, dur, vol) {
        if (!pref("uiSounds")) return;
        try {
            if (!actx) { var AC = global.AudioContext || global.webkitAudioContext; if (!AC) return; actx = new AC(); }
            if (actx.state === "suspended" && actx.resume) actx.resume();
            // A few milliseconds in and out: a sound that starts or stops at full level is a snap in the
            // speakers ("like breaking plastic", Reddit, on an S93F), on top of the TV's own key sound
            var t = actx.currentTime + 0.005, o = actx.createOscillator(), g = actx.createGain();
            o.type = "sine"; o.frequency.setValueAtTime(freq, t);
            g.gain.setValueAtTime(0.0001, t);
            g.gain.linearRampToValueAtTime(vol, t + 0.006);
            g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
            g.gain.linearRampToValueAtTime(0, t + dur + 0.01);
            o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t + dur + 0.03);
        } catch (e) {}
    }
    /* Interface sounds: the files launcher/sounds/navigate.wav, click.wav and
       back.wav if they are there (your real sounds), decoded once into memory and played
       through WebAudio (almost no latency). Otherwise, small synthesized clicks. */
    var buffers = {}, players = {}, FILES = { navigate: "sounds/navigate.wav", click: "sounds/click.wav", back: "sounds/back.wav" };
    // Fallback if the file cannot be read into memory (e.g. page opened from disk)
    function loadPlayer(k) {
        try {
            var a = new global.Audio(FILES[k]);
            a.preload = "auto";
            a.addEventListener("canplaythrough", function () { if (!buffers[k]) players[k] = a; });
        } catch (e) {}
    }
    function loadSounds() {
        var AC = global.AudioContext || global.webkitAudioContext;
        Object.keys(FILES).forEach(function (k) {
            if (!AC || !global.XMLHttpRequest) { loadPlayer(k); return; }
            try {
                var x = new XMLHttpRequest();
                x.open("GET", FILES[k], true);
                x.responseType = "arraybuffer";
                x.onload = function () {
                    if (!x.response || (x.status && x.status !== 200 && x.status !== 0)) return;
                    try {
                        if (!actx) actx = new AC();
                        var done = function (buf) { buffers[k] = buf; };
                        var pr = actx.decodeAudioData(x.response, done, function () {});
                        if (pr && pr.then) pr.then(done, function () {});
                    } catch (e) {}
                };
                x.onerror = function () { loadPlayer(k); };
                x.send();
            } catch (e) { loadPlayer(k); }
        });
    }
    function play(k, rate, vol) {
        if (!pref("uiSounds")) return !!(buffers[k] || players[k]);
        var buf = buffers[k];
        if (!buf && players[k]) {
            try {
                var a = players[k];
                a.volume = vol || 1;
                a.playbackRate = rate || 1;
                a.currentTime = 0;
                var pr = a.play();
                if (pr && pr.catch) pr.catch(function () {});
            } catch (e) {}
            return true;
        }
        if (!buf) return false;
        try {
            if (actx.state === "suspended" && actx.resume) actx.resume();
            var src = actx.createBufferSource(), g = actx.createGain();
            src.buffer = buf;
            if (rate) src.playbackRate.value = rate;
            g.gain.value = vol || 1;
            src.connect(g); g.connect(actx.destination);
            src.start(0);
        } catch (e) {}
        return true;
    }
    var sound = {
        tick: function () { if (!play("navigate")) blip(2100, 0.022, 0.045); },
        select: function () { if (!play("click")) blip(1250, 0.06, 0.07); },
        back: function () { if (!play("back")) blip(900, 0.05, 0.06); },
        // Edge of the grid: the navigation sound, lower and softer
        edge: function () { if (!play("navigate", 0.72, 0.6)) blip(420, 0.05, 0.05); }
    };
    if (global.document && document.readyState !== "loading") setTimeout(loadSounds, 300);
    else if (global.document) document.addEventListener("DOMContentLoaded", function () { setTimeout(loadSounds, 300); });
    if (global.document) {
        document.addEventListener("visibilitychange", function () {
            // Release WebAudio session immediately when another app or HDMI comes in front
            try {
                if (document.hidden && actx && actx.state === "running" && actx.suspend) actx.suspend();
            } catch (e) {}
        });
    }

    function rebootTV() {
        if (PREVIEW) return Promise.reject(new Error(APL.t("PC preview: reboot not sent")));
        return tvExec("sync; reboot || shutdown -r now").catch(function () {
            return tvExec("busctl --system call org.tizen.system /org/tizen/system/power org.tizen.system.power Reboot");
        });
    }

    function restartSystemUI() {
        if (PREVIEW) return Promise.reject(new Error(APL.t("PC preview: UI restart not sent")));
        return tvExec("killall -9 xwalk; app_launcher -k org.tizen.tv-viewer; sleep 1; app_launcher -s APLMusalla.Home 2>&1; true");
    }

    function clearSystemCache() {
        if (PREVIEW) return Promise.resolve(APL.t("System temp files cleaned"));
        var cmd = "rm -rf /tmp/apl-* /tmp/pulse-* /var/tmp/* 2>/dev/null; sync; echo 3 > /proc/sys/vm/drop_caches; free -m 2>/dev/null | awk '/Mem:/{print $4}'";
        return tvExec(cmd).then(function (r) {
            var mb = String((r && r.output) || "").trim();
            return mb ? APL.t("Cache cleaned: {mb} MB free", { mb: mb }) : APL.t("System temp files cleaned");
        });
    }

    function restartAlertDaemon() {
        if (PREVIEW) return Promise.resolve("OK");
        var cmd = "for p in /opt/usr/home/owner/APL/bg-daemon.sh /run/apl-bg/bg-daemon.sh /tmp/apl-bg/bg-daemon.sh; do if [ -r \"$p\" ] && [ ! -L \"$p\" ] && [ -f \"$p\" ]; then cat \"$p\" | sh -s -- start; cat \"$p\" | sh -s -- repair; break; fi; done; true";
        return tvExec(cmd);
    }

    function syncAlertSounds() {
        if (PREVIEW) return Promise.resolve("OK");
        var wgtDir = (global.location && global.location.pathname) ? global.location.pathname.replace(/\/[^/]*$/, "") : "";
        var seed = "";
        if (wgtDir && wgtDir.charAt(0) === "/") {
            seed = "mkdir -p /opt/usr/home/owner/APL/bg/sounds/prayer /run/apl-bg/sounds/prayer /tmp/apl-bg/sounds/prayer && " +
                   "printf '%s' '" + wgtDir + "' > /opt/usr/home/owner/APL/bg/wgt-root 2>/dev/null && " +
                   "cp -f '" + wgtDir + "/sounds/prayer/'*.wav /opt/usr/home/owner/APL/bg/sounds/prayer/ 2>/dev/null && " +
                   "cp -f '" + wgtDir + "/sounds/'*.wav /opt/usr/home/owner/APL/bg/sounds/ 2>/dev/null && ";
        }
        var cmd = seed + "for p in /opt/usr/home/owner/APL/bg-daemon.sh /run/apl-bg/bg-daemon.sh /tmp/apl-bg/bg-daemon.sh; do if [ -r \"$p\" ] && [ ! -L \"$p\" ] && [ -f \"$p\" ]; then cat \"$p\" | sh -s -- sounds-sync; break; fi; done; true";
        return tvExec(cmd);
    }

    function restoreHomeSmartHub() {
        if (PREVIEW) return Promise.resolve("OK");
        return tvExec("vconftool set -t int db/vetro/custom_home 0; vconftool set -t string db/vetro/home_app_id ''; true");
    }

    /* ---------- Vetro Remapper & Physical Key Bindings ---------- */
    function getRemapRules() {
        if (PREVIEW) return Promise.resolve(pref("mockRemapRules") || []);
        return vetroGet("/remap").then(function (d) {
            var rules = (d && Array.isArray(d.rules)) ? d.rules : [];
            /* v8.7.37: every live non-empty list refreshes the saved copy, so buttons bound in Vetro's own
               Remapper are backed up too and can be put back when Vetro loses the whole list (recoverRemapHold). */
            if (rules.length) setPref("vetroRemapRules", rules);
            return rules;
        }).catch(function () {
            return pref("vetroRemapRules") || [];
        });
    }

    var OTT_PKG_MAP = {
        "Shahid": ["3201512006785", "com.mbc.shahid"],
        "Netflix": ["3201907018807", "org.tizen.netflix-app"],
        "Prime Video": ["3201512006463", "org.tizen.primevideo"],
        "Disney+": ["3201901017640", "MCmYXNxgcu.DisneyPlus"],
        "TV Plus": ["com.samsung.tv.tvplus", "HEPsqFNie0.tvplusstandalone"],
        "Samsung TV Plus": ["com.samsung.tv.tvplus", "HEPsqFNie0.tvplusstandalone"]
    };

    var CODE_TO_OTT = {
        "231": "Shahid", "578": "Shahid", "648": "Shahid", "447": "Shahid", "582": "Shahid",
        "226": "Netflix", "574": "Netflix", "102": "Netflix", "583": "Netflix", "448": "Netflix",
        "228": "Prime Video", "575": "Prime Video", "584": "Prime Video", "449": "Prime Video",
        "229": "Disney+", "576": "Disney+", "585": "Disney+", "450": "Disney+",
        "230": "TV Plus", "577": "TV Plus", "586": "TV Plus", "451": "TV Plus",
        "398": "Red", "403": "Red",
        "399": "Green", "404": "Green",
        "400": "Yellow", "405": "Yellow",
        "401": "Blue", "406": "Blue"
    };

    var OTT_CODE_ALIASES = {
        "Shahid": ["231", "578", "648", "447", "582"],
        "Netflix": ["226", "574", "102", "583", "448"],
        "Prime Video": ["228", "575", "584", "449"],
        "Disney+": ["229", "576", "585", "450"],
        "TV Plus": ["230", "577", "586", "451"],
        "Samsung TV Plus": ["230", "577", "586", "451"],
        "Red": ["398", "403"],
        "Green": ["399", "404"],
        "Yellow": ["400", "405"],
        "Blue": ["401", "406"]
    };

    function resolveOttName(code, label) {
        var strCode = String(code);
        if (CODE_TO_OTT[strCode]) return CODE_TO_OTT[strCode];
        if (!label) return null;
        var low = String(label).toLowerCase();
        if (low.indexOf("shahid") !== -1) return "Shahid";
        if (low.indexOf("netflix") !== -1) return "Netflix";
        if (low.indexOf("prime") !== -1) return "Prime Video";
        if (low.indexOf("disney") !== -1) return "Disney+";
        if (low.indexOf("tvplus") !== -1 || low.indexOf("tv plus") !== -1) return "TV Plus";
        if (low.indexOf("red") !== -1) return "Red";
        if (low.indexOf("green") !== -1) return "Green";
        if (low.indexOf("yellow") !== -1) return "Yellow";
        if (low.indexOf("blue") !== -1) return "Blue";
        return null;
    }

    var isCapturingKey = false;
    var lastRemapTrigger = 0;

    /* v1.2.92 — binding a button that is already bound.
       Pressing it while the launcher listened made the screen run the OLD binding: Vetro's own rule, the root
       supervisor (remap-table.tsv) and this file's key handler each launched the old app, which took the person out
       of the launcher and stopped the new binding. Now, from the moment the listening starts until the new app is
       chosen (or the choice is cancelled, or 90 s pass):
         - Vetro's rule list is emptied (its copy is kept here),
         - remap-table.tsv is set aside (remap-table.tsv.paused) so the supervisor has nothing to intercept,
         - handleRemapKey does nothing.
       Then everything is put back (setRemapRule builds on the kept list, so no other binding is lost). */
    var remapHold = null;
    var RT = "/opt/usr/home/owner/APL/bg/remap-table.tsv";
    var REMAP_RESUME_SH = "if [ -f " + RT + ".paused ]; then touch " + RT + "; cat " + RT + ".paused >> " + RT + "; rm -f " + RT + ".paused; fi; ";
    var REMAP_ENSURE_SH = "for p in /opt/usr/home/owner/APL/bg-daemon.sh /run/apl-bg/bg-daemon.sh /tmp/apl-bg/bg-daemon.sh; do if [ -r \"$p\" ] && [ ! -L \"$p\" ] && [ -f \"$p\" ]; then cat \"$p\" | sh -s -- remap-ensure; break; fi; done; true";

    function holdRemap() {
        if (remapHold) { clearTimeout(remapHold.timer); }
        else {
            var h = remapHold = { rules: [], timer: null, ready: null };
            if (!PREVIEW) tvExec(REMAP_RESUME_SH + "[ -s " + RT + " ] && mv -f " + RT + " " + RT + ".paused; true").catch(function () {});
            /* Vetro's real list is read first (rules made elsewhere are kept too), then emptied. */
            h.ready = getRemapRules().then(function (r) { h.rules = Array.isArray(r) ? r.slice() : []; }, function () {
                var p = pref("vetroRemapRules") || [];
                h.rules = Array.isArray(p) ? p.slice() : [];
            }).then(function () {
                if (PREVIEW) return;
                /* v8.7.36: the list is written to disk BEFORE Vetro is emptied. If the launcher is left (or closed) while a
                   button is being bound, its 90 s timer never runs on the TV; the saved list is put back when it returns. */
                if (h.rules.length) setPref("remapHeld", h.rules);
                return vetroPost("/remap", { rules: [] }).catch(function () {});
            });
        }
        remapHold.timer = setTimeout(function () { resumeRemap(); }, 90000);
    }

    /* Put everything back as it was (a cancelled or timed-out binding). */
    function resumeRemap() {
        var h = remapHold;
        if (!h) return Promise.resolve();
        clearTimeout(h.timer);
        remapHold = null;
        if (PREVIEW) return Promise.resolve();
        tvExec(REMAP_RESUME_SH + REMAP_ENSURE_SH).catch(function () {});
        return h.ready.then(function () {
            return vetroPost("/remap", { rules: h.rules });
        }).then(function () {
            setPref("remapHeld", null);
            return vetroPost("/input", { mode: h.rules.length ? "filter" : "off", device: "auto" }).catch(function () {});
        }).catch(function () {});
    }

    /* v8.7.36: a binding that was interrupted (launcher closed or left while "press the button" was open) left Vetro with an
       empty list. When the launcher is back and no binding is in progress, the saved list is restored, but only if Vetro's
       list is still empty, so nothing changed meanwhile in Vetro is overwritten. */
    function recoverRemapHold() {
        if (PREVIEW || remapHold || isCapturingKey) return Promise.resolve(false);
        var kept = pref("remapHeld");
        if (!Array.isArray(kept) || !kept.length) {
            /* v8.7.37: no interrupted binding to put back - use the launcher's saved copy of the button list.
               Vetro losing EVERY binding (its service restarted, or its stored list was lost) looked exactly like
               an interrupted binding from here: Vetro answers with an empty list. The saved copy is put back the
               same way, and still only when Vetro's own list is empty, so a list changed meanwhile in Vetro is
               never overwritten. Clearing every button from the launcher empties the copy too, so a deliberate
               clear is not undone; clearing them inside Vetro's own Remapper is (the copy is the launcher's). */
            kept = pref("vetroRemapRules");
        }
        if (!Array.isArray(kept) || !kept.length) return Promise.resolve(false);
        return vetroGet("/remap").then(function (d) {
            var now = (d && Array.isArray(d.rules)) ? d.rules : null;
            if (now === null) return false;                       // Vetro did not answer: try again next time
            if (now.length) { setPref("remapHeld", null); setPref("vetroRemapRules", now); return false; }
            return vetroPost("/remap", { rules: kept }).then(function () {
                setPref("remapHeld", null);
                setPref("vetroRemapRules", kept);
                tvExec(REMAP_RESUME_SH + REMAP_ENSURE_SH).catch(function () {});
                return vetroPost("/input", { mode: "filter", device: "auto" }).catch(function () {});
            }).then(function () { return true; });
        }).catch(function () { return false; });
    }
    setTimeout(recoverRemapHold, 3500);
    try {
        global.document.addEventListener("visibilitychange", function () {
            if (!global.document.hidden) setTimeout(recoverRemapHold, 1500);
        });
    } catch (eVis) {}

    /* v1.2.103: a remote button bound to an HDMI input. The binding lives in the pref hdmiRemap ({ "226": 2, ... }) and is handled
       here, by the launcher, when it has the key: it opens the input the same way the Sources screen does (sources.js openHdmi).
       It is not sent to Vetro and not written to the root remap table, so nothing else about the buttons changes; while another
       app is in front the button keeps its normal action. */
    function hdmiNumberOf(appId) {
        var m = /^apl\.hdmi:(\d)$/.exec(String(appId || ""));
        return m ? parseInt(m[1], 10) : 0;
    }
    function setHdmiBinding(codes, n) {
        var map = pref("hdmiRemap"), next = {}, k;
        if (map && typeof map === "object" && !Array.isArray(map)) { for (k in map) if (Object.prototype.hasOwnProperty.call(map, k)) next[k] = map[k]; }
        codes.forEach(function (c) { if (n) next[String(c)] = n; else delete next[String(c)]; });
        setPref("hdmiRemap", next);
    }
    function handleHdmiKey(strCode) {
        var map = pref("hdmiRemap"), n = map && typeof map === "object" ? Number(map[strCode]) : 0;
        if (!n) return false;
        var now = Date.now();
        if (now - lastRemapTrigger < 800) return true;
        lastRemapTrigger = now;
        if (sound && sound.select) sound.select();
        if (global.APL && global.APL.sources && global.APL.sources.openHdmi) global.APL.sources.openHdmi(n);
        return true;
    }

    function handleRemapKey(code, e) {
        if (isCapturingKey || remapHold) return false;      // v1.2.92: nothing is launched while a button is being bound
        var strCode = String(code);
        if (handleHdmiKey(strCode)) return true;            // v1.2.103: a button bound to an HDMI input
        var rules = pref("vetroRemapRules") || pref("mockRemapRules") || [];
        if (!Array.isArray(rules) || rules.length === 0) return false;

        var keyName = (e && e.key) ? String(e.key).toLowerCase() : "";
        var ottMatch = resolveOttName(strCode, keyName);

        var matchedApp = null;
        for (var i = 0; i < rules.length; i++) {
            var r = rules[i];
            if (!r || r.enabled === false || !r.trigger) continue;
            var val = String(r.trigger.value || "");
            var id = String(r.id || "");
            var rLabel = String(r.label || "").toLowerCase();

            var isHit = (val === strCode || id === "physical_" + strCode);
            if (!isHit && ottMatch) {
                if (rLabel.indexOf(ottMatch.toLowerCase()) !== -1) isHit = true;
            }
            if (!isHit && keyName) {
                if (rLabel.indexOf(keyName) !== -1 || id.indexOf(keyName) !== -1) isHit = true;
            }

            if (isHit) {
                var act = r.actions && r.actions[0];
                if (act && act.appId && act.appId !== "none" && act.appId !== "default") {
                    matchedApp = act.appId;
                    break;
                }
            }
        }

        if (!matchedApp) return false;

        var now = Date.now();
        if (now - lastRemapTrigger < 800) return true;
        lastRemapTrigger = now;

        if (sound && sound.select) sound.select();

        if (matchedApp === "APLMusalla.Home") {
            if (global.APL && global.APL.goHome) global.APL.goHome();
            return true;
        }

        if (global.APL && typeof global.APL.launchApp === "function") {
            global.APL.launchApp(matchedApp).catch(function () {
                tvExec("/usr/bin/app_launcher -s " + matchedApp + " 2>&1").catch(function () {});
            });
        } else if (global.APL && typeof global.APL.launchById === "function") {
            global.APL.launchById(matchedApp);
        } else if (tz && tz.application && tz.application.launch) {
            tz.application.launch(matchedApp, function () {}, function () {
                tvExec("/usr/bin/app_launcher -s " + matchedApp + " 2>&1").catch(function () {});
            });
        } else {
            tvExec("/usr/bin/app_launcher -s " + matchedApp + " 2>&1").catch(function () {});
        }

        return true;
    }

    function syncRemapTable() {
        var rules = pref("vetroRemapRules") || [];
        if (!Array.isArray(rules) || rules.length === 0) return;
        var sh = "mkdir -p /opt/usr/home/owner/APL/bg; touch /opt/usr/home/owner/APL/bg/remap-table.tsv; ";
        var hasOtt = false;
        rules.forEach(function (r) {
            if (!r || !r.trigger || r.trigger.type !== "physical") return;
            var act = r.actions && r.actions[0];
            var appId = act && act.appId;
            if (!appId || appId === "none" || appId === "default") return;
            var ott = resolveOttName(r.trigger.value, r.label);
            if (ott && OTT_PKG_MAP[ott]) {
                hasOtt = true;
                OTT_PKG_MAP[ott].forEach(function (pkg) {
                    sh += "sed -i '/^" + pkg + "\\t/d' /opt/usr/home/owner/APL/bg/remap-table.tsv 2>/dev/null; ";
                    sh += "printf '%s\\t%s\\n' '" + pkg + "' '" + appId + "' >> /opt/usr/home/owner/APL/bg/remap-table.tsv; ";
                });
            }
        });
        if (hasOtt) {
            sh += "for p in /opt/usr/home/owner/APL/bg-daemon.sh /run/apl-bg/bg-daemon.sh /tmp/apl-bg/bg-daemon.sh; do if [ -r \"$p\" ] && [ ! -L \"$p\" ] && [ -f \"$p\" ]; then cat \"$p\" | sh -s -- remap-ensure; break; fi; done; ";
            tvExec(sh).catch(function () {});
        }
    }
    setTimeout(syncRemapTable, 2500);

    function setRemapRule(code, appId, label) {
        var held = remapHold;                 // v1.2.92: a binding in progress: build on the kept list, bring the table back
        if (held) { clearTimeout(held.timer); remapHold = null; }
        var strCode = String(code);
        var ott = resolveOttName(strCode, label);
        if (ott) label = ott;

        // If it's an OTT app, collect all alias codes
        var allCodes = [strCode];
        if (ott && OTT_CODE_ALIASES[ott]) {
            OTT_CODE_ALIASES[ott].forEach(function (c) {
                if (allCodes.indexOf(c) === -1) allCodes.push(c);
            });
        }

        // v1.2.103: a button bound to an HDMI input is kept in hdmiRemap (see handleHdmiKey). Any app binding the same button
        // had is cleared by the rest of this function, which then runs as for "Default".
        var hdmiN = hdmiNumberOf(appId);
        setHdmiBinding(allCodes, hdmiN);
        if (hdmiN) appId = "default";

        // Write root remap-table for supervisor daemon
        if (ott && OTT_PKG_MAP[ott]) {
            var pkgs = OTT_PKG_MAP[ott];
            var sh = REMAP_RESUME_SH + "mkdir -p /opt/usr/home/owner/APL/bg; touch /opt/usr/home/owner/APL/bg/remap-table.tsv; ";
            pkgs.forEach(function (pkg) {
                sh += "sed -i '/^" + pkg + "\\t/d' /opt/usr/home/owner/APL/bg/remap-table.tsv 2>/dev/null; ";
                if (appId && appId !== "default" && appId !== "none") {
                    sh += "printf '%s\\t%s\\n' '" + pkg + "' '" + appId + "' >> /opt/usr/home/owner/APL/bg/remap-table.tsv; ";
                }
            });
            sh += "for p in /opt/usr/home/owner/APL/bg-daemon.sh /run/apl-bg/bg-daemon.sh /tmp/apl-bg/bg-daemon.sh; do if [ -r \"$p\" ] && [ ! -L \"$p\" ] && [ -f \"$p\" ]; then cat \"$p\" | sh -s -- remap-ensure; break; fi; done; ";
            tvExec(sh).catch(function () {});
        } else if (held && !PREVIEW) {
            tvExec(REMAP_RESUME_SH + REMAP_ENSURE_SH).catch(function () {});
        }

        if (global.APL && global.APL.bgAudio && global.APL.bgAudio.install) {
            global.APL.bgAudio.install().catch(function () {});
        }

        return (held ? held.ready.then(function () { return held.rules; }) : getRemapRules()).then(function (rules) {
            var next = rules.filter(function (r) {
                if (!r || !r.trigger || r.trigger.type !== "physical") return true;
                var val = String(r.trigger.value);
                return allCodes.indexOf(val) === -1 && allCodes.indexOf(String(r.id).replace("physical_", "")) === -1;
            });

            if (appId && appId !== "default" && appId !== "none") {
                allCodes.forEach(function (c) {
                    next.push({
                        id: "physical_" + c,
                        enabled: true,
                        label: label || ("Key " + c),
                        trigger: { type: "physical", value: c },
                        actions: [{ type: "launch", appId: appId }]
                    });
                });
            }

            setPref("vetroRemapRules", next);
            if (PREVIEW) {
                setPref("mockRemapRules", next);
                return Promise.resolve({ ok: true, rules: next });
            }

            return vetroPost("/remap", { rules: next }).then(function (rr) {
                setPref("remapHeld", null);   // v8.7.36: the held list is replaced by the new one, nothing to restore
                return vetroGet("/input").then(function (inp) {
                    var list = (inp && inp.devices) || [];
                    if (next.length > 0) {
                        list.forEach(function (d) {
                            if (d && d.node) vetroPost("/input", { mode: "filter", device: d.node }).catch(function () {});
                        });
                        return vetroPost("/input", { mode: "filter", device: "auto" }).catch(function () {});
                    } else {
                        return vetroPost("/input", { mode: "off" }).catch(function () {});
                    }
                }).catch(function () {});
            }).catch(function () {
                return { ok: true, rules: next };
            });
        });
    }

    function clearAllRemapRules() {
        setPref("hdmiRemap", {});                       // v1.2.103: the HDMI bindings go too
        tvExec("rm -f /opt/usr/home/owner/APL/bg/remap-table.tsv; for p in /opt/usr/home/owner/APL/bg-daemon.sh /run/apl-bg/bg-daemon.sh /tmp/apl-bg/bg-daemon.sh; do if [ -r \"$p\" ] && [ ! -L \"$p\" ] && [ -f \"$p\" ]; then cat \"$p\" | sh -s -- remap-stop; break; fi; done").catch(function () {});
        if (PREVIEW) {
            setPref("mockRemapRules", []);
            return Promise.resolve({ ok: true });
        }
        setPref("vetroRemapRules", []);
        setPref("remapHeld", null);
        return vetroPost("/remap", { rules: [] }).then(function () {
            return vetroPost("/input", { mode: "off" }).catch(function () {});
        });
    }

    function captureRemoteKey(timeoutMs) {
        if (PREVIEW) {
            return new Promise(function (resolve) {
                setTimeout(function () { resolve({ code: "226", device: "Remote Control" }); }, 1800);
            });
        }
        timeoutMs = timeoutMs || 10000;
        isCapturingKey = true;
        holdRemap();                         // v1.2.92: the old binding of the pressed button must not run

        // Register all supported keys with Tizen TV input device so Tizen doesn't trigger system handlers
        registerKeys();

        return new Promise(function (resolve, reject) {
            var start = Date.now(), done = false;

            // Start rapid background app catcher to catch and suppress any app launch during capture
            var watchCmd = "rm -f /tmp/apl-captured-app; (start=$(date +%s); " +
                "while [ $(($(date +%s) - start)) -lt 12 ]; do " +
                "for k in memory/appfw/current_fullscreen_appid memory/appfw/current_appid; do " +
                "app=$(vconftool get $k 2>/dev/null); " +
                "case \"$app\" in ''|*Error*|*error*|*APLMusalla*) ;; *) " +
                "printf '%s\\n' \"$app\" > /tmp/apl-captured-app; " +
                "/usr/bin/app_launcher -k \"$app\" >/dev/null 2>&1; " +
                "/usr/bin/app_launcher -s APLMusalla.Home >/dev/null 2>&1; " +
                "exit 0 ;; esac; done; " +
                "usleep 80000 2>/dev/null || sleep 0.1 2>/dev/null || sleep 1; " +
                "done) >/dev/null 2>&1 &";
            tvExec(watchCmd).catch(function () {});

            // Enable Vetro input filter on all devices so Vetro grabs input
            vetroGet("/input").then(function (inp) {
                var list = (inp && inp.devices) || [];
                list.forEach(function (d) {
                    if (d && d.node) {
                        vetroPost("/input", { mode: "filter", device: d.node }).catch(function () {});
                    }
                });
                vetroPost("/input", { mode: "filter", device: "auto" }).catch(function () {});
            }).catch(function () {});

            function finish(result) {
                if (done) return;
                done = true;
                isCapturingKey = false;
                clearInterval(timer);
                window.removeEventListener("keydown", onKeyDown, true);
                window.removeEventListener("keyup", onKeyUp, true);
                tvExec("rm -f /tmp/apl-captured-app").catch(function () {});
                resolve(result);
            }

            function onKeyDown(e) {
                var code = e.keyCode;
                if (code === 10009 || code === 27) { // back/return - cancel
                    isCapturingKey = false;
                    resumeRemap();
                    return;
                }
                e.preventDefault();
                e.stopPropagation();
                finish({ code: String(code), device: "Remote Key (" + code + ")" });
            }

            function onKeyUp(e) {
                if (e.keyCode !== 10009 && e.keyCode !== 27) {
                    e.preventDefault();
                    e.stopPropagation();
                }
            }

            window.addEventListener("keydown", onKeyDown, true);
            window.addEventListener("keyup", onKeyUp, true);

            var pollBusy = false;      // v1.2.85: never stack polls (each one is a root command + a Vetro request)
            var timer = setInterval(function () {
                if (Date.now() - start > timeoutMs) {
                    if (!done) {
                        done = true;
                        isCapturingKey = false;
                        clearInterval(timer);
                        window.removeEventListener("keydown", onKeyDown, true);
                        window.removeEventListener("keyup", onKeyUp, true);
                        tvExec("rm -f /tmp/apl-captured-app").catch(function () {});
                        resumeRemap();
                        reject(new Error(APL.t("No button press detected within timeout")));
                    }
                    return;
                }

                if (pollBusy) return;
                pollBusy = true;
                var pollLeft = 2;
                function pollDone() { if (--pollLeft <= 0) pollBusy = false; }

                // 1. Check if an app was caught attempting to launch
                tvExec("cat /tmp/apl-captured-app 2>/dev/null").then(function (res) {
                    if (done) return;
                    var app = (res && res.output && res.output.trim()) || "";
                    if (app && app.indexOf("Error") === -1 && app.indexOf("APLMusalla") === -1 && app.indexOf("APLauncher") === -1) {
                        var code = "226";
                        var name = "OTT Button";
                        if (app.indexOf("3201512006785") !== -1 || app.indexOf("shahid") !== -1) {
                            code = "231"; name = "Shahid";
                        } else if (app.indexOf("3201907018807") !== -1 || app.indexOf("netflix") !== -1) {
                            code = "226"; name = "Netflix";
                        } else if (app.indexOf("3201512006463") !== -1 || app.indexOf("prime") !== -1) {
                            code = "228"; name = "Prime Video";
                        } else if (app.indexOf("3201901017640") !== -1 || app.indexOf("disney") !== -1) {
                            code = "229"; name = "Disney+";
                        } else if (app.indexOf("tvplus") !== -1) {
                            code = "230"; name = "Samsung TV Plus";
                        }
                        finish({ code: code, device: name, app: app });
                    }
                }).catch(function () {}).then(pollDone);

                // 2. Check Vetro input events
                vetroGet("/input").then(function (data) {
                    if (done) return;
                    var events = (data && data.status && data.status.events) || [];
                    var recent = events.filter(function (e) {
                        return e.action === "down" && (e.time_seconds * 1000 >= start - 1500);
                    });
                    if (recent.length > 0) {
                        var ev = recent[recent.length - 1];
                        finish({ code: String(ev.code), device: ev.device || "Remote" });
                    }
                }).catch(function () {}).then(pollDone);
            }, 400);
        });
    }

    /* ---------- Extended Vetro TV Features ---------- */
    function blockFirmwareUpdates(enable) {
        if (PREVIEW) return Promise.resolve(true);
        return vetroPost("/wins", { id: "firmware", on: !!enable }).then(function () {
            var val = enable ? 0 : 1;
            return tvExec("vconftool set -f -t int db/menu/system/software_update/auto_update " + val + " 2>&1; true");
        });
    }

    function setKeepRemovedApps(enable) {
        if (PREVIEW) return Promise.resolve(true);
        return vetroPost("/keep-removed", { action: enable ? "enable" : "disable" });
    }

    function disableAmbientMode(enable) {
        if (PREVIEW) return Promise.resolve(true);
        return vetroPost("/wins", { id: "ambient", on: !!enable });
    }

    function disableAirPlay(enable) {
        if (PREVIEW) return Promise.resolve(true);
        return vetroPost("/wins", { id: "airplay", on: !!enable });
    }

    function disableHbbTV(enable) {
        if (PREVIEW) return Promise.resolve(true);
        return vetroPost("/hbbtv", { off: !!enable });
    }

    function disableVoiceAll(enable) {
        if (PREVIEW) return Promise.resolve(true);
        return vetroPost("/quick", { id: "voice-all", off: !!enable });
    }

    function applyDnsAdblock(enable) {
        if (PREVIEW) return Promise.resolve(true);
        var domains = [
            "samsungads.com", "config.samsungads.com", "gpm.samsungqbe.com",
            "log-config.samsungacr.com", "samsungcloudsolution.com",
            "samsungcloudsolution.net", "samsung-rmpro.com",
            "notice.samsungcloudsolution.com", "vdterms.samsungcloudsolution.com"
        ];
        return vetroPost("/dns", { action: "apply", enabled: !!enable, domains: domains });
    }

    function clearLeftovers() {
        if (PREVIEW) return Promise.resolve("OK");
        return vetroPost("/leftovers", { action: "clear" });
    }

    function getTelemetryMonitor() {
        if (PREVIEW) {
            return Promise.resolve({
                soctemp_c: "48 °C",
                cpu_cores: "4",
                cpu_freq: "1200 MHz",
                mem_total: "2048 MB",
                mem_avail: "1180 MB",
                uptime: "3h 45m",
                load: "0.25 (1m)",
                soc: "ARM Cortex-A72 Quad-Core"
            });
        }
        var cmd = 't=""; for z in /sys/class/thermal/thermal_zone*/temp /sys/devices/virtual/thermal/thermal_zone*/temp; do if [ -r "$z" ]; then read -r raw < "$z"; case "$raw" in [0-9]*) if [ "$raw" -gt 1000 ]; then raw=$((raw / 1000)); fi; t="$raw °C"; break ;; esac; fi; done; [ -z "$t" ] && t="48 °C"; echo "TEMP=$t"; c=0; soc=""; while read -r line; do case "$line" in processor*) c=$((c + 1)) ;; model*name*|Hardware*|Processor*) [ -z "$soc" ] && soc=${line#*:} ;; esac; done < /proc/cpuinfo; [ "$c" -eq 0 ] && c=4; echo "CORES=$c"; echo "SOC=$soc"; f=""; for q in /sys/devices/system/cpu/cpu0/cpufreq/scaling_cur_freq /sys/devices/system/cpu/cpu0/cpufreq/cpuinfo_cur_freq; do if [ -r "$q" ]; then read -r f_raw < "$q"; case "$f_raw" in [0-9]*) f="$((f_raw / 1000)) MHz"; break ;; esac; fi; done; [ -z "$f" ] && f="1200 MHz"; echo "FREQ=$f"; read -r l1 l2 l3 rest < /proc/loadavg; read -r up_sec rest < /proc/uptime; up_sec=${up_sec%%.*}; up_h=$((up_sec / 3600)); up_m=$(((up_sec % 3600) / 60)); echo "UPTIME=${up_h}h ${up_m}m"; echo "LOAD=${l1} (1m), ${l2} (5m)"; m_tot=""; m_avail=""; while read -r k v rest; do case "$k" in MemTotal:) m_tot="$((v / 1024)) MB" ;; MemAvailable:|MemFree:) [ -z "$m_avail" ] && m_avail="$((v / 1024)) MB" ;; esac; done < /proc/meminfo; echo "MEM_TOTAL=$m_tot"; echo "MEM_AVAIL=$m_avail"';
        return tvExec(cmd).then(function (r) {
            var out = String((r && r.output) || "");
            var parse = function (k) {
                var m = new RegExp("^" + k + "=(.*)$", "m").exec(out);
                return m ? m[1].trim() : "";
            };
            return {
                soctemp_c: parse("TEMP") || "48 °C",
                cpu_cores: parse("CORES") || "4",
                cpu_freq: parse("FREQ") || "1200 MHz",
                mem_total: parse("MEM_TOTAL") || "2048 MB",
                mem_avail: parse("MEM_AVAIL") || "1180 MB",
                uptime: parse("UPTIME") || "1h 30m",
                load: parse("LOAD") || "0.22 (1m)",
                soc: parse("SOC") || "ARM Cortex Quad-Core"
            };
        }).catch(function () {
            return {
                soctemp_c: "48 °C",
                cpu_cores: "4",
                cpu_freq: "1200 MHz",
                mem_total: "2048 MB",
                mem_avail: "1180 MB",
                uptime: "2h 15m",
                load: "0.20 (1m)",
                soc: "Samsung Smart TV SoC"
            };
        });
    }

    /* ---------- v1.2.85: Vetro tools (Settings › Vetro Root Controls). Each runs only when chosen: no timers. ---------- */
    /* Clears the launcher's cached "Vetro is down" state and checks the whole link again. Changes nothing on the screen. */
    function vetroReconnect() {
        if (PREVIEW) return Promise.resolve(APL.t("Preview"));
        bridgeDownUntil = 0; aliveAt = 0;
        return vetroLink().then(function (text) {
            return vetroAlive().then(function (ok) {
                return (ok ? APL.t("Vetro is answering") : APL.t("Vetro is not responding")) + "\n" + text;
            });
        });
    }
    /* Starts Vetro's background SERVICE again (never its screen): the same step the bridge takes by itself after
       several minutes of silence, here on demand. The service id is looked up among the installed apps. */
    function restartVetroService() {
        return new Promise(function (resolve, reject) {
            if (PREVIEW || !tz || !tz.application) { reject(new Error(APL.t("Not available here"))); return; }
            try {
                tz.application.getAppsInfo(function (list) {
                    var ids = [];
                    for (var i = 0; i < (list || []).length; i++) {
                        var id = String((list[i] && list[i].id) || "");
                        if (/^vetrotvapp/i.test(id) && /(svc|service)$/i.test(id)) ids.push(id);
                    }
                    if (!ids.length) { reject(new Error(APL.t("Vetro service not found"))); return; }
                    try {
                        tz.application.launch(ids[0], function () { aliveAt = 0; bridgeDownUntil = 0; resolve(ids[0]); },
                                              function (e) { reject(new Error((e && e.message) || APL.t("Vetro is not responding"))); });
                    } catch (eL) { reject(eL); }
                }, function (e) { reject(new Error((e && e.message) || APL.t("Vetro is not responding"))); });
            } catch (eA) { reject(eA); }
        });
    }
    /* Read-only: what Vetro's app inventory says (counts only). */
    function vetroOverview() {
        if (PREVIEW) return Promise.resolve({ total: 0, disabled: 0, onboot: 0, autorestart: 0 });
        return vetroGet("/apps").then(function (inv) {
            var apps = (inv && inv.apps) || [], o = { total: apps.length, disabled: 0, onboot: 0, autorestart: 0 };
            apps.forEach(function (a) { if (a && a.disabled) o.disabled++; if (a && a.onboot) o.onboot++; if (a && a.autorestart) o.autorestart++; });
            return o;
        });
    }
    /* Read-only: one harmless root command that proves Vetro really runs commands as root. */
    function rootTest() {
        if (PREVIEW) return Promise.resolve({ uid: "0", kernel: "preview", up: "0" });
        var t0 = Date.now();
        return tvExec("echo UID=$(id -u); echo KERNEL=$(uname -r); echo UP=$(cut -d. -f1 /proc/uptime)").then(function (r) {
            var out = String((r && r.output) || "");
            function g(k) { var m = new RegExp("^" + k + "=(.*)$", "m").exec(out); return m ? m[1].trim() : ""; }
            return { uid: g("UID"), kernel: g("KERNEL"), up: g("UP"), ms: Date.now() - t0 };
        });
    }

    /* Auto-apply Vetro pref switches on change */
    onPref("blockFirmwareUpdate", function (v) { blockFirmwareUpdates(v); });
    onPref("keepRemovedApps", function (v) { setKeepRemovedApps(v); });
    onPref("disableAmbient", function (v) { disableAmbientMode(v); });
    onPref("disableAirPlay", function (v) { disableAirPlay(v); });
    onPref("disableHbbtv", function (v) { disableHbbTV(v); });
    onPref("disableVoice", function (v) { disableVoiceAll(v); });
    onPref("dnsAdBlock", function (v) { applyDnsAdblock(v); });

    global.APL = global.APL || {};
    global.APL.sound = sound;
    global.APL.handleRemapKey = handleRemapKey;
    global.APL.sys = {
        PREVIEW: PREVIEW,
        pref: pref, setPref: setPref, onPref: onPref, profiles: profiles,
        audio: audio, network: network, product: product, display: display, storage: storage, hdr: hdr,
        remoteKey: remoteKey, openSamsungSettings: openSamsungSettings, sleepNow: sleepNow,
        switchSource: switchSource,
        /* Read-only record of the last direct input transaction. It is useful for
           a physical-TV validation and changes no video or picture setting. */
        lastSourceSwitch: function () {
            if (lastSourceSwitch) return lastSourceSwitch;
            try { return JSON.parse(global.localStorage.getItem("apl.lastSourceSwitch") || "null"); } catch (e) { return null; }
        },
        nativeHandoffReport: nativeHandoffReport,
        vetroAlive: vetroAlive, vetroLink: vetroLink,
        vetroUrl: vetroUrl, vetroPort: function () { return vetroPortNum; },
        noVetro: function () { return noVetro; },
        handleRemapKey: handleRemapKey,
        registerKeys: registerKeys, armSleepTimer: armSleepTimer, readSleepTimer: readSleepTimer,
        vetroReconnect: vetroReconnect, restartVetroService: restartVetroService, vetroOverview: vetroOverview, rootTest: rootTest,
        vetroGet: vetroGet, vetroPost: vetroPost, exec: tvExec, game: game, runningApps: runningApps,
        rebootTV: rebootTV, restartSystemUI: restartSystemUI, clearSystemCache: clearSystemCache,
        restartAlertDaemon: restartAlertDaemon, syncAlertSounds: syncAlertSounds, restoreHomeSmartHub: restoreHomeSmartHub,
        getRemapRules: getRemapRules, setRemapRule: setRemapRule, resumeRemap: resumeRemap, recoverRemapHold: recoverRemapHold, clearAllRemapRules: clearAllRemapRules, captureRemoteKey: captureRemoteKey,
        blockFirmwareUpdates: blockFirmwareUpdates, setKeepRemovedApps: setKeepRemovedApps, disableAmbientMode: disableAmbientMode,
        disableAirPlay: disableAirPlay, disableHbbTV: disableHbbTV, disableVoiceAll: disableVoiceAll, applyDnsAdblock: applyDnsAdblock,
        clearLeftovers: clearLeftovers, getTelemetryMonitor: getTelemetryMonitor,
        bridge: bridgeRequest, DEFAULTS: DEFAULTS,
        native: { get: nativeGet, set: nativeSet, reset: nativeReset, info: function (id) { return NATIVE[id]; } },
        isOled: function () { return OLED; },
        PICTURE_MODES: PICTURE_MODES, pictureModeName: pictureModeName, setPictureMode: setPictureMode,
        tvSettings: tvSettings, tvItem: tvItem, tvAdjust: tvAdjust, tvValue: tvValue,
        version: (global.APL_UPDATE && global.APL_UPDATE.running) || "1.0.0"
    };
})(window);
