/* ============================================================
   icons.js — line pictograms, in the spirit of SF Symbols.
   APL.icon("wifi", 40) -> SVG string (color = currentColor).
   ============================================================ */
(function (global) {
    "use strict";

    var P = {
        power:      '<path d="M12 3v8.5"/><path d="M6.4 6.6a8 8 0 1 0 11.2 0"/>',
        moon:       '<path d="M20 14.6A8.2 8.2 0 0 1 9.4 4 8.2 8.2 0 1 0 20 14.6z"/>',
        wifi:       '<path d="M2.5 9a14 14 0 0 1 19 0"/><path d="M5.5 12.4a9.6 9.6 0 0 1 13 0"/><path d="M8.6 15.8a5 5 0 0 1 6.8 0"/><circle cx="12" cy="19.3" r="1.3" fill="currentColor" stroke="none"/>',
        wifiOff:    '<path d="M2.5 9a14 14 0 0 1 19 0"/><path d="M5.5 12.4a9.6 9.6 0 0 1 13 0"/><path d="M3 3l18 18"/>',
        search:     '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.4 15.4 21 21"/>',
        source:     '<rect x="2.5" y="4" width="19" height="13" rx="2.2"/><path d="M8 21h8"/><path d="M12 7.5v6"/><path d="M9.3 10.9 12 13.6l2.7-2.7"/>',
        tv:         '<rect x="2.5" y="7.5" width="19" height="12.5" rx="2.2"/><path d="M8.5 3 12 6.5 15.5 3"/><path d="M9 22h6"/>',
        speaker:    '<path d="M3.5 9.5h3.6L11.5 6v12l-4.4-3.5H3.5z"/><path d="M15 9.2a4 4 0 0 1 0 5.6"/><path d="M17.6 6.6a7.6 7.6 0 0 1 0 10.8"/>',
        speakerMute:'<path d="M3.5 9.5h3.6L11.5 6v12l-4.4-3.5H3.5z"/><path d="M15.5 9.5l5 5M20.5 9.5l-5 5"/>',
        timer:      '<circle cx="12" cy="13.5" r="7.8"/><path d="M12 9.5v4l2.6 2.6"/><path d="M9.5 2.8h5"/>',
        photo:      '<rect x="3" y="5" width="18" height="14" rx="2.2"/><path d="M3.5 16.5 8.5 11.5l4 4 3-3 5 5"/><circle cx="16" cy="9.3" r="1.5"/>',
        access:     '<circle cx="12" cy="4.6" r="1.9"/><path d="M4.5 8.6 12 10l7.5-1.4"/><path d="M12 10v5"/><path d="M8.8 21 12 15l3.2 6"/>',
        gear:       '<circle cx="12" cy="12" r="3.1"/><path d="M12 2.6v2.6M12 18.8v2.6M2.6 12h2.6M18.8 12h2.6M5.4 5.4l1.8 1.8M16.8 16.8l1.8 1.8M5.4 18.6l1.8-1.8M16.8 7.2l1.8-1.8"/><circle cx="12" cy="12" r="6.6"/>',
        person:     '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
        headphones: '<path d="M4 15.5V12a8 8 0 0 1 16 0v3.5"/><rect x="3" y="14" width="4.6" height="6.6" rx="1.7"/><rect x="16.4" y="14" width="4.6" height="6.6" rx="1.7"/>',
        airplayAudio: '<path d="M7 15.6a7 7 0 1 1 10 0"/><path d="M9.5 13.1a3.5 3.5 0 1 1 5 0"/><path d="M12 15.2l3.6 5H8.4z" fill="currentColor" stroke-linejoin="round"/>',
        usbc:       '<rect x="3" y="8" width="18" height="8" rx="4"/><path d="M8 12h8"/>',
        plus:       '<path d="M12 5v14M5 12h14"/>',
        minus:      '<path d="M5 12h14"/>',
        grid:       '<rect x="3.5" y="3.5" width="7" height="7" rx="1.8"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.8"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.8"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.8"/>',
        eyeOff:     '<path d="M2.5 12s3.5-6.5 9.5-6.5c1.6 0 3 .4 4.3 1.1M21.5 12s-1.3 2.4-3.7 4.3M14.3 17.9c-.7.2-1.5.3-2.3.3-6 0-9.5-6.2-9.5-6.2"/><path d="M9.6 9.7a3.2 3.2 0 0 0 4.6 4.5"/><path d="M3.5 3.5l17 17"/>',
        trash:      '<path d="M4 6.5h16"/><path d="M9.5 6.5V4.5h5v2"/><path d="M6 6.5l1 13.2a1.5 1.5 0 0 0 1.5 1.3h7a1.5 1.5 0 0 0 1.5-1.3l1-13.2"/><path d="M10 10.5v6.5M14 10.5v6.5"/>',
        arrows:     '<path d="M12 3v18M3 12h18"/><path d="M9 6l3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3M18 9l3 3-3 3"/>',
        display:    '<rect x="2.5" y="4" width="19" height="13" rx="2.2"/><path d="M8 21h8M12 17v4"/>',
        airplay:    '<path d="M6 17H4.5a2 2 0 0 1-2-2V5.5a2 2 0 0 1 2-2h15a2 2 0 0 1 2 2V15a2 2 0 0 1-2 2H18"/><path d="M12 14.5 17 21H7z"/>',
        remote:     '<rect x="8" y="2.5" width="8" height="19" rx="4"/><circle cx="12" cy="7.2" r="1.7"/><path d="M12 12.2v.01M12 15.2v.01M12 18.2v.01"/>',
        apps:       '<rect x="3" y="3" width="7.5" height="7.5" rx="1.8"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.8"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.8"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.8"/>',
        globe:      '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
        sliders:    '<path d="M4 6h9.5M18.5 6H20M4 12h3.5M12.5 12H20M4 18h11.5M20 18h0"/><circle cx="16" cy="6" r="2.2"/><circle cx="10" cy="12" r="2.2"/><circle cx="18" cy="18" r="2.2"/>',
        info:       '<circle cx="12" cy="12" r="9"/><path d="M12 11v6"/><circle cx="12" cy="7.6" r="1.1" fill="currentColor" stroke="none"/>',
        shield:     '<path d="M12 3 20 6v6c0 5-3.6 8-8 9-4.4-1-8-4-8-9V6z"/>',
        bluetooth:  '<path d="M7 7.5 17 16.5l-5 4.5V3l5 4.5L7 16.5"/>',
        sound:      '<path d="M3 10v4M7 7v10M11 4v16M15 8v8M19 11v2"/>',
        sparkle:    '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 16l.7 1.8 1.8.7-1.8.7L19 21l-.7-1.8-1.8-.7 1.8-.7z"/>',
        update:     '<path d="M20 12a8 8 0 1 1-2.3-5.6"/><path d="M20 4v5h-5"/>',
        lock:       '<rect x="5" y="10.5" width="14" height="10" rx="2.2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>',
        mic:        '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/>',
        leaf:       '<path d="M5 19c0-8 5-13 14-14 0 9-5 14-13 14z"/><path d="M5 19 13 11"/>',
        reset:      '<path d="M4 12a8 8 0 1 0 2.3-5.6"/><path d="M4 4v5h5"/>',
        gamepad:    '<path d="M7 8h10a4.5 4.5 0 0 1 4.3 5.8l-1.1 3.6a2 2 0 0 1-3.4.7L14.6 16H9.4l-2.2 2.1a2 2 0 0 1-3.4-.7l-1.1-3.6A4.5 4.5 0 0 1 7 8z"/><path d="M8 11v3M6.5 12.5h3"/><circle cx="16" cy="11.5" r=".9" fill="currentColor" stroke="none"/><circle cx="17.5" cy="13.3" r=".9" fill="currentColor" stroke="none"/>',
        sun:        '<circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/>',
        book:       '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
        eye:        '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
        split:      '<rect x="2.5" y="5" width="19" height="14" rx="2.2"/><path d="M12 5v14"/>',
        folder:     '<path d="M3 6.5A1.5 1.5 0 0 1 4.5 5H9l2 2.5h8.5A1.5 1.5 0 0 1 21 9v9.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5z"/>',
        mouse:      '<rect x="7" y="3" width="10" height="18" rx="5"/><path d="M12 3v6"/>',
        music:      '<path d="M9 18V5.5l11-2V16"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>',
        help:       '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.3a2.6 2.6 0 0 1 5 .9c0 1.7-2.5 2.2-2.5 3.8"/><circle cx="12" cy="17.2" r="1" fill="currentColor" stroke="none"/>',
        chevron:    '<path d="M9 5l7 7-7 7"/>',
        external:   '<path d="M9 5h10v10"/><path d="M19 5 7.5 16.5"/><path d="M5 9v10h10"/>',
        check:      '<path d="M5 12.5l4.5 4.5L19 7"/>',
        hdmi:       '<path d="M3 8h18v5l-3 3H6l-3-3z"/><path d="M7 11h10"/>'
    };

    function icon(name, size, strokeWidth) {
        var s = size || 24;
        return '<svg class="ico" width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' +
               (strokeWidth || 1.8) + '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (P[name] || P.info) + '</svg>';
    }

    /* Apple's "Settings" icon (metal gear on gray), redrawn as vectors:
       sharp at every size, with no image file. */
    var artN = 0;
    function cogPath(n, rTip, rRoot, rHole) {
        var d = "", pitch = 2 * Math.PI / n, hr = pitch * (n > 20 ? 0.29 : 0.25), ht = pitch * (n > 20 ? 0.19 : 0.16);
        function pt(r, a) { return (r * Math.sin(a)).toFixed(2) + " " + (-r * Math.cos(a)).toFixed(2); }
        for (var i = 0; i < n; i++) {
            var t = i * pitch;
            d += (i ? "L" : "M") + pt(rRoot, t - hr) + "L" + pt(rTip, t - ht) + "L" + pt(rTip, t + ht) + "L" + pt(rRoot, t + hr);
        }
        d += "Z";
        if (rHole) d += "M0 " + (-rHole) + "A" + rHole + " " + rHole + " 0 1 0 0 " + rHole + "A" + rHole + " " + rHole + " 0 1 0 0 " + (-rHole) + "Z";
        return d;
    }
    function ring(r1, r2) {
        return "M0 " + (-r1) + "A" + r1 + " " + r1 + " 0 1 1 0 " + r1 + "A" + r1 + " " + r1 + " 0 1 1 0 " + (-r1) + "Z" +
               "M0 " + (-r2) + "A" + r2 + " " + r2 + " 0 1 0 0 " + r2 + "A" + r2 + " " + r2 + " 0 1 0 0 " + (-r2) + "Z";
    }
    function settingsArt(size) {
        var k = "aplg" + (++artN), spokes = "";
        for (var i = 0; i < 6; i++) {
            spokes += '<rect x="-2.6" y="-19" width="5.2" height="10" transform="rotate(' + (i * 60) + ')"/>';
        }
        return '<svg class="settings-art" width="' + size + '" height="' + size + '" viewBox="-50 -50 100 100" aria-hidden="true">' +
            '<defs>' +
              '<linearGradient id="' + k + 'o" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#727278"/><stop offset="1" stop-color="#3a3a3e"/></linearGradient>' +
              '<linearGradient id="' + k + 'l" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ededf1"/><stop offset="1" stop-color="#b9b9c0"/></linearGradient>' +
              '<linearGradient id="' + k + 'w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5d5d63"/><stop offset="1" stop-color="#2e2e32"/></linearGradient>' +
            '</defs>' +
            '<circle r="39" fill="url(#' + k + 'l)"/>' +
            // outer ring with fine teeth
            '<path fill="url(#' + k + 'o)" fill-rule="evenodd" d="' + cogPath(48, 46.5, 42.8, 38.6) + '"/>' +
            // inner gear with large teeth, open in the middle
            '<path fill="url(#' + k + 'w)" fill-rule="evenodd" d="' + cogPath(12, 34, 28.6, 18.4) + '"/>' +
            // hub joined by six spokes
            '<g fill="url(#' + k + 'w)">' + spokes + '<circle r="10.6"/></g>' +
            '<circle r="5.4" fill="url(#' + k + 'l)"/>' +
            '</svg>';
    }

    /* Epic Prayer & Quran icon: defaults to Mosaly (image-6), optional Mosque & Crescent (image-5), Top Cinema, or vector */
    function prayerArt(size) {
        var s = size || 100;
        var mode = (global.APL && global.APL.sys && global.APL.sys.pref("prayerTileIcon")) || "mosaly";
        if (mode === "mosaly") {
            return '<img src="images/icon-mosaly.png" class="prayer-art prayer-art--img" width="' + s + '" height="' + s + '" alt="الصلاة والقرآن" style="width:' + s + 'px;height:' + s + 'px;border-radius:22%;object-fit:cover;display:block;" />';
        }
        if (mode === "mosque") {
            return '<img src="images/icon-mosque.png" class="prayer-art prayer-art--img" width="' + s + '" height="' + s + '" alt="الصلاة والقرآن" style="width:' + s + 'px;height:' + s + 'px;border-radius:22%;object-fit:cover;display:block;" />';
        }
        if (mode === "topcinema") {
            return '<img src="images/icon-topcinema.png" class="prayer-art prayer-art--img" width="' + s + '" height="' + s + '" alt="توب سينما" style="width:' + s + 'px;height:' + s + 'px;border-radius:22%;object-fit:cover;display:block;" />';
        }
        var k = "aplp" + (++artN);
        return '<svg class="prayer-art" width="' + s + '" height="' + s + '" viewBox="0 0 100 100" aria-hidden="true">' +
            '<defs>' +
              '<linearGradient id="' + k + 'bg" x1="0" y1="0" x2="0" y2="1">' +
                '<stop offset="0%" stop-color="#10b981"/>' +
                '<stop offset="50%" stop-color="#047857"/>' +
                '<stop offset="100%" stop-color="#022c22"/>' +
              '</linearGradient>' +
              '<linearGradient id="' + k + 'gold" x1="0" y1="0" x2="1" y2="1">' +
                '<stop offset="0%" stop-color="#fef08a"/>' +
                '<stop offset="45%" stop-color="#fbbf24"/>' +
                '<stop offset="100%" stop-color="#b45309"/>' +
              '</linearGradient>' +
              '<radialGradient id="' + k + 'glow" cx="50%" cy="40%" r="50%">' +
                '<stop offset="0%" stop-color="#fef08a" stop-opacity="0.45"/>' +
                '<stop offset="60%" stop-color="#10b981" stop-opacity="0.1"/>' +
                '<stop offset="100%" stop-color="#022c22" stop-opacity="0"/>' +
              '</radialGradient>' +
            '</defs>' +
            '<rect width="100" height="100" rx="22" fill="url(#' + k + 'bg)"/>' +
            '<circle cx="50" cy="42" r="38" fill="url(#' + k + 'glow)"/>' +
            '<circle cx="24" cy="22" r="1" fill="#fef08a" opacity="0.8"/>' +
            '<circle cx="76" cy="20" r="1.2" fill="#fef08a" opacity="0.9"/>' +
            '<circle cx="34" cy="14" r="0.8" fill="#fef08a" opacity="0.6"/>' +
            '<circle cx="66" cy="12" r="1" fill="#fef08a" opacity="0.75"/>' +
            '<path d="M50 10a7 7 0 1 0 7 7 5.5 5.5 0 1 1-7-7z" fill="url(#' + k + 'gold)"/>' +
            '<path d="M30 64 C30 42, 42 34, 50 28 C58 34, 70 42, 70 64 Z" fill="url(#' + k + 'gold)"/>' +
            '<line x1="50" y1="28" x2="50" y2="22" stroke="url(#' + k + 'gold)" stroke-width="1.8" stroke-linecap="round"/>' +
            '<circle cx="50" cy="21" r="1.4" fill="#fef08a"/>' +
            '<rect x="26" y="64" width="48" height="24" rx="2" fill="#064e3b" stroke="url(#' + k + 'gold)" stroke-width="1.2"/>' +
            '<path d="M43 88 V72 C43 67 47 64 50 64 C53 67 57 64 57 72 V88 Z" fill="#fef08a" opacity="0.95"/>' +
            '<path d="M45 88 V73 C45 69 48 67 50 67 C52 69 55 67 55 73 V88 Z" fill="#b45309"/>' +
            '<rect x="15" y="42" width="6.5" height="46" rx="1.5" fill="#047857" stroke="url(#' + k + 'gold)" stroke-width="0.8"/>' +
            '<rect x="13.5" y="40" width="9.5" height="3" rx="0.8" fill="url(#' + k + 'gold)"/>' +
            '<path d="M15 40 L18.25 28 L21.5 40 Z" fill="url(#' + k + 'gold)"/>' +
            '<line x1="18.25" y1="28" x2="18.25" y2="24" stroke="url(#' + k + 'gold)" stroke-width="1"/>' +
            '<rect x="78.5" y="42" width="6.5" height="46" rx="1.5" fill="#047857" stroke="url(#' + k + 'gold)" stroke-width="0.8"/>' +
            '<rect x="77" y="40" width="9.5" height="3" rx="0.8" fill="url(#' + k + 'gold)"/>' +
            '<path d="M78.5 40 L81.75 28 L85 40 Z" fill="url(#' + k + 'gold)"/>' +
            '<line x1="81.75" y1="28" x2="81.75" y2="24" stroke="url(#' + k + 'gold)" stroke-width="1"/>' +
            '<path d="M22 64 C22 55, 27 52, 30 50 C30 57, 30 64, 30 64 Z" fill="url(#' + k + 'gold)" opacity="0.9"/>' +
            '<path d="M78 64 C78 55, 73 52, 70 50 C70 57, 70 64, 70 64 Z" fill="url(#' + k + 'gold)" opacity="0.9"/>' +
            '</svg>';
    }

    /* Epic HDMI icon with port badge and gold connector */
    function hdmiArt(portNumber, size) {
        var num = portNumber || 1;
        var s = size || 100;
        var k = "aplhdmi" + num + "_" + (++artN);
        var is1 = (num === 1);
        var c1 = is1 ? "#2563eb" : "#0d9488";
        var c2 = is1 ? "#1d4ed8" : "#0f766e";
        var cDark = is1 ? "#0f172a" : "#022c22";
        var glow = is1 ? "#60a5fa" : "#2dd4bf";
        return '<svg class="hdmi-art" width="' + s + '" height="' + s + '" viewBox="0 0 100 100" aria-hidden="true">' +
            '<defs>' +
              '<linearGradient id="' + k + 'bg" x1="0" y1="0" x2="0" y2="1">' +
                '<stop offset="0%" stop-color="' + c1 + '"/>' +
                '<stop offset="55%" stop-color="' + c2 + '"/>' +
                '<stop offset="100%" stop-color="' + cDark + '"/>' +
              '</linearGradient>' +
              '<linearGradient id="' + k + 'metal" x1="0" y1="0" x2="1" y2="1">' +
                '<stop offset="0%" stop-color="#f1f5f9"/>' +
                '<stop offset="35%" stop-color="#cbd5e1"/>' +
                '<stop offset="70%" stop-color="#64748b"/>' +
                '<stop offset="100%" stop-color="#334155"/>' +
              '</linearGradient>' +
              '<linearGradient id="' + k + 'gold" x1="0" y1="0" x2="0" y2="1">' +
                '<stop offset="0%" stop-color="#fef08a"/>' +
                '<stop offset="50%" stop-color="#eab308"/>' +
                '<stop offset="100%" stop-color="#a16207"/>' +
              '</linearGradient>' +
              '<radialGradient id="' + k + 'glow" cx="50%" cy="38%" r="48%">' +
                '<stop offset="0%" stop-color="' + glow + '" stop-opacity="0.5"/>' +
                '<stop offset="100%" stop-color="' + cDark + '" stop-opacity="0"/>' +
              '</radialGradient>' +
            '</defs>' +
            '<rect width="100" height="100" rx="22" fill="url(#' + k + 'bg)"/>' +
            '<circle cx="50" cy="38" r="40" fill="url(#' + k + 'glow)"/>' +
            '<path d="M22 28 H78 V44 L68 54 H32 L22 44 Z" fill="url(#' + k + 'metal)" stroke="rgba(255,255,255,0.4)" stroke-width="1.2"/>' +
            '<path d="M26 31 H74 V42 L65 51 H35 L26 42 Z" fill="#090d16" stroke="url(#' + k + 'gold)" stroke-width="1.2"/>' +
            '<g fill="url(#' + k + 'gold)">' +
              '<rect x="32" y="34" width="3" height="11" rx="1"/>' +
              '<rect x="38" y="34" width="3" height="11" rx="1"/>' +
              '<rect x="44" y="34" width="3" height="11" rx="1"/>' +
              '<rect x="50" y="34" width="3" height="11" rx="1"/>' +
              '<rect x="56" y="34" width="3" height="11" rx="1"/>' +
              '<rect x="62" y="34" width="3" height="11" rx="1"/>' +
            '</g>' +
            '<text x="50" y="72" font-family="-apple-system, BlinkMacSystemFont, Roboto, sans-serif" font-size="15" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="1.5">HDMI</text>' +
            '<circle cx="50" cy="85" r="9" fill="' + glow + '"/>' +
            '<text x="50" y="89" font-family="-apple-system, BlinkMacSystemFont, Roboto, sans-serif" font-size="12" font-weight="900" fill="#0f172a" text-anchor="middle">' + num + '</text>' +
            '</svg>';
    }

    global.APL = global.APL || {};
    global.APL.icon = icon;
    global.APL.settingsArt = settingsArt;
    global.APL.prayerArt = prayerArt;
    global.APL.hdmiArt = hdmiArt;
})(window);
