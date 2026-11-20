/* ============================================================
   background-engine.js — Vetro root audio and alert engine (v4.6).

   Deploys a detached root alert keeper plus the audio supervisor to persistent
   TV storage. Schedules and alert audio survive when the WGT WebView is
   suspended behind YouTube, IPTV, Samsung TV+, or an HDMI input.
   ============================================================ */
(function (global) {
    "use strict";

    var APL = global.APL, sys = APL && APL.sys;
    if (!APL || !sys) return;

    var PERSIST_DIR = "/opt/usr/home/owner/APL";
    var PERSIST_SCRIPT = PERSIST_DIR + "/bg-daemon.sh";
    var RUN_SCRIPT = "/run/apl-bg/bg-daemon.sh";
    var DATA_DIR = PERSIST_DIR + "/bg";
    var DAEMON_VERSION = "4.9";

    var installed = false, installing = null, checking = null, queues = {};
    var soundsChecked = false, soundsSyncing = null, soundsFallbackTried = false;
    var state = { playing: false, starting: false, paused: false, phase: "STOPPED", url: "", pid: "", why: "" };
    var cachedCfg = { prayerAlerts: true, taskAlerts: true, pauseRadio: true, alertVol: "0.92" };

    function preview() { return !!sys.PREVIEW; }
    function script() { return global.APL_BG_DAEMON || ""; }

    function runExec(cmd) {
        return sys.exec(cmd).then(function (r) {
            if (!r) throw new Error("Vetro root command returned empty response");
            if (r.ok === false) {
                var why = String(r.error || r.stderr || r.output || "root command failed").replace(/[\r\n]+/g, " ").trim();
                throw new Error(why.slice(0, 260));
            }
            if (r.exit_code !== undefined && Number(r.exit_code) !== 0) {
                var why = String(r.error || r.stderr || r.output || "root command exit " + r.exit_code).replace(/[\r\n]+/g, " ").trim();
                throw new Error(why.slice(0, 260));
            }
            return String(r.output !== undefined ? r.output : (r.result !== undefined ? r.result : "")).trim();
        });
    }

    function execCheck(cmd) {
        return sys.exec(cmd).then(function (r) {
            if (!r) return false;
            if (r.ok === false) return false;
            if (r.exit_code !== undefined && Number(r.exit_code) !== 0) return false;
            return true;
        }, function () { return false; });
    }

    // Tizen 6.5 UEP rejects an unsigned shell pathname from writable storage.
    // The source is readable, so feed it to the signed system shell on stdin.
    function daemonRun(path, args) {
        return "APL_DAEMON_SOURCE='" + path + "'; export APL_DAEMON_SOURCE; cat '" + path + "' | sh -s -- " + args;
    }

    function validDaemonTest(path) {
        // Some Tizen BusyBox grep builds do not support the option combination
        // used in v1.2.19. Keep this verification entirely POSIX: the shell
        // strips the final newline from v, then compares the exact version.
        // Quotes below are shell quotes, not literal backslash-quote characters.
        var versionRun = "APL_DAEMON_SOURCE='" + path + "' sh -c 'cat \"$APL_DAEMON_SOURCE\" | sh -s -- version' 2>/dev/null";
        return "[ -r '" + path + "' ] && [ ! -L '" + path + "' ] && [ -O '" + path + "' ] && v=$(" + versionRun + ") && [ \"$v\" = '" + DAEMON_VERSION + "' ]";
    }

    // Prefer the persistent copy, but only if its stdin-loaded command reports
    // the exact daemon version expected by this build. A failed persistent upload
    // must never mask the verified /run fallback on Tizen 6.5.
    function runner(args) {
        return "if " + validDaemonTest(PERSIST_SCRIPT) + "; then " + daemonRun(PERSIST_SCRIPT, args) +
               "; elif " + validDaemonTest(RUN_SCRIPT) + "; then " + daemonRun(RUN_SCRIPT, args) +
               "; else echo MISSING_DAEMON; fi";
    }

    function toBase64Utf8(str) {
        var utf8 = unescape(encodeURIComponent(String(str || "")));
        return global.btoa(utf8);
    }

    function arrayBufferToBase64(buf) {
        var bytes = new Uint8Array(buf);
        var chunks = [], step = 8192;
        for (var i = 0; i < bytes.length; i += step) {
            chunks.push(String.fromCharCode.apply(null, bytes.subarray(i, Math.min(i + step, bytes.length))));
        }
        return global.btoa(chunks.join(""));
    }

    function fetchLocalBinaryBase64(relPath) {
        var resolved = relPath && global.APL_ASSET ? global.APL_ASSET(relPath) : relPath;
        return new Promise(function (resolve, reject) {
            try {
                var xhr = new XMLHttpRequest();
                xhr.open("GET", resolved, true);
                xhr.responseType = "arraybuffer";
                xhr.onload = function () {
                    if ((xhr.status === 200 || xhr.status === 0) && xhr.response && xhr.response.byteLength > 0) {
                        resolve(arrayBufferToBase64(xhr.response));
                    } else {
                        reject(new Error("sound load failed: " + relPath));
                    }
                };
                xhr.onerror = function () { reject(new Error("sound xhr error: " + relPath)); };
                xhr.send();
            } catch (e) { reject(e); }
        });
    }

    // Stage every root-side file and rename it atomically. The detached keeper can
    // read schedules/config at any moment, so it must never see a half-written file.
    function writeRemoteBase64(destPath, b64, executable) {
        /* Tizen 6.5 MessagePort accepts replies in chunks but does not chunk outgoing
           commands. 24 KB base64 commands can silently disappear on some TVs even
           while small bridge checks succeed. Keep every upload command well below
           the message-port limit. */
        var chunkLen = 6000;
        var dir = destPath.slice(0, destPath.lastIndexOf("/"));
        var stage = destPath + ".apl-next";
        var parts = [];
        for (var i = 0; i < b64.length; i += chunkLen) parts.push(b64.slice(i, i + chunkLen));
        var p = runExec("mkdir -p '" + dir + "' && rm -f '" + stage + "' '" + stage + ".b64' && : > '" + stage + ".b64'");
        parts.forEach(function (part) {
            p = p.then(function () {
                return runExec("printf '%s' '" + part + "' >> '" + stage + ".b64'");
            });
        });
        return p.then(function () {
            var tail = executable ? " && chmod 755 '" + stage + "'" : "";
            var exists = executable ? "[ -x '" + destPath + "' ]" : "[ -f '" + destPath + "' ]";
            // Do not depend on echo output here: this TV's Vetro relay returns
            // a reliable exit code but an empty stdout even for `echo`.
            return runExec("base64 -d '" + stage + ".b64' > '" + stage + "' && [ -s '" + stage + "' ]" + tail +
                           " && mv -f '" + stage + "' '" + destPath + "' && " + exists +
                           " && rm -f '" + stage + ".b64'").then(function () { return true; });
        });
    }

    function ensureSounds() {
        if (soundsChecked) return Promise.resolve(true);
        if (soundsSyncing) return soundsSyncing;
        /* v1.2.45: the root daemon copies the sounds out of the installed package itself
           (a few fast cp commands). The launcher no longer uploads the adhan files in
           hundreds of chunks, which made the first alert wait (or never play). */
        var wgtDir = (global.location && global.location.pathname) ? global.location.pathname.replace(/\/[^/]*$/, "") : "";
        var seedCmd = "";
        if (wgtDir && wgtDir.charAt(0) === "/") {
            seedCmd = "mkdir -p '" + DATA_DIR + "/sounds/prayer' && printf '%s' '" + wgtDir + "' > '" + DATA_DIR + "/wgt-root' 2>/dev/null; " +
                      "cp -f '" + wgtDir + "/sounds/prayer/'*.wav '" + DATA_DIR + "/sounds/prayer/' 2>/dev/null; " +
                      "cp -f '" + wgtDir + "/sounds/'*.wav '" + DATA_DIR + "/sounds/' 2>/dev/null; ";
        }
        soundsSyncing = execCheck(seedCmd + runner("sounds-sync") + " >/dev/null 2>&1").then(function () {
            return execCheck(runner("sounds-ok") + " >/dev/null 2>&1");
        }).then(function (ok) {
            if (ok || soundsFallbackTried) return ok;
            soundsFallbackTried = true;
            /* Last resort, once per launch: only the small task chime is uploaded. */
            return fetchLocalBinaryBase64("sounds/task-alert.wav").then(function (b64) {
                return writeRemoteBase64(DATA_DIR + "/sounds/task-alert.wav", b64, false);
            }).catch(function () {}).then(function () {
                return execCheck(runner("sounds-ok") + " >/dev/null 2>&1");
            });
        }).then(function (ok) {
            soundsChecked = !!ok;
            soundsSyncing = null;
            return soundsChecked;
        }, function () {
            soundsSyncing = null;
            return false;
        });
        return soundsSyncing;
    }

    function parseStatusLine(out) {
        var f = String(out || "").trim().split(/\s+/), phase = (f[0] || "STOPPED").toUpperCase();
        state.phase = phase;
        state.playing = phase === "PLAYING";
        state.starting = phase === "STARTING";
        state.paused = phase === "PAUSED";
        if (phase === "PLAYING") {
            state.pid = f[1] || "";
            state.url = f[2] || "";
            state.why = "";
        } else {
            state.pid = "";
            state.url = f[1] || state.url || "";
        }
        return state;
    }

    function binaryRadioStatus() {
        var pauseCheck = "test -f '" + DATA_DIR + "/radio.paused' || test -f /run/apl-bg/radio.paused || test -f /tmp/apl-bg/radio.paused";
        var wantedCheck = "test -f '" + DATA_DIR + "/radio.want' || test -f /run/apl-bg/radio.want || test -f /tmp/apl-bg/radio.want";
        var pidCheck = "p=$(cat /run/apl-bg/audio.pid /tmp/apl-bg/audio.pid 2>/dev/null | head -1); test -n \"$p\" && kill -0 \"$p\" 2>/dev/null";
        return execCheck(pauseCheck).then(function (pausedNow) {
            if (pausedNow) return parseStatusLine("PAUSED");
            return execCheck(pidCheck).then(function (live) {
                if (live) return parseStatusLine("PLAYING");
                return execCheck(wantedCheck).then(function (wantedNow) {
                    return parseStatusLine(wantedNow ? "STARTING" : "STOPPED");
                });
            });
        });
    }

    function status() {
        if (preview()) return Promise.resolve(state);
        return runExec(runner("status") + " 2>/dev/null | tail -1").then(function (out) {
            // Some Vetro root agents preserve exit status but strip stdout. In that
            // case the daemon did answer; obtain its state through file/PID checks.
            if (!out || out === "MISSING_DAEMON") return binaryRadioStatus();
            return parseStatusLine(out);
        }, function (e) {
            state.playing = false; state.phase = "UNKNOWN";
            state.why = (e && e.message) || "vetro";
            return state;
        });
    }

    function available() {
        if (preview()) return Promise.resolve(false);
        if (checking) return checking;
        checking = sys.exec("command -v gst-launch-1.0 >/dev/null 2>&1 || command -v gst-launch >/dev/null 2>&1").then(function (r) {
            checking = null;
            if (!r || typeof r.ok !== "boolean" || r.exit_code === undefined) { state.why = "vetro unreachable (port 8099)"; return false; }
            if (r.ok !== true || Number(r.exit_code) !== 0) { state.why = "no gstreamer"; return false; }
            state.why = "";
            return true;
        }, function (e) {
            checking = null;
            state.why = (e && e.message) || "vetro";
            return false;
        });
        return checking;
    }

    function daemonReady() {
        // && and || have the same left-associative precedence in POSIX sh.
        // Group each complete test so a valid persistent daemon does not then
        // accidentally require the missing /run fallback to pass as well.
        return execCheck("if { " + validDaemonTest(PERSIST_SCRIPT) + "; } || { " +
                         validDaemonTest(RUN_SCRIPT) + "; }; then exit 0; else exit 1; fi");
    }

    function deployDaemonAt(path, b64, label) {
        return writeRemoteBase64(path, b64, false).then(function () {
            return execCheck(validDaemonTest(path));
        }).then(function (ok) {
            if (!ok) throw new Error(label + " verification failed");
            return path;
        });
    }

    function install() {
        if (preview()) return Promise.reject(new Error(APL.t("Preview: the background player is set on the screen")));
        if (installed) return Promise.resolve(true);
        if (installing) return installing;
        var text = script();
        if (!text) return Promise.reject(new Error("daemon script missing"));

        installing = daemonReady().then(function (ready) {
            if (ready) return true;
            var b64 = toBase64Utf8(text);
            // /opt is preferred because it survives a reboot. If this firmware or
            // root agent rejects that location, a verified /run copy still lets us
            // collect the current-session audio evidence.
            return deployDaemonAt(PERSIST_SCRIPT, b64, "persistent daemon").catch(function (persistentError) {
                return deployDaemonAt(RUN_SCRIPT, b64, "runtime daemon").catch(function (runtimeError) {
                    throw new Error("persistent: " + ((persistentError && persistentError.message) || "failed") +
                                    " | runtime: " + ((runtimeError && runtimeError.message) || "failed"));
                });
            });
        }).then(function () {
            return daemonReady();
        }).then(function (ready) {
            if (!ready) throw new Error("daemon verification failed");
            installed = true;
            installing = null;
            return true;
        }, function (e) {
            installing = null;
            throw e;
        });
        return installing;
    }

    function binaryReport(title, reason) {
        var compact = String((reason && reason.message) || reason || "").replace(/[\r\n]+/g, " ").slice(0, 360);
        var pulseList = "p=$(find /run /var/run /tmp -type s -path '*/pulse*/native' 2>/dev/null | head -n 1); test -n \"$p\" && PULSE_RUNTIME_PATH=\"${p%/native}\" PULSE_SERVER=\"unix:$p\" pactl list sink-inputs 2>/dev/null | grep -E -q 'APLauncher.Home|APL Launcher|APL Radio|APL Alert'";
        var fg = "{ vconftool get memory/appfw/current_fullscreen_appid 2>/dev/null; vconftool get memory/appfw/current_appid 2>/dev/null; vconftool get memory/appfw/foreground_appid 2>/dev/null; }";
        var checks = [
            ["ROOT_EXEC", "true"],
            ["PERSIST_DAEMON", validDaemonTest(PERSIST_SCRIPT)],
            ["RUN_DAEMON", validDaemonTest(RUN_SCRIPT)],
            ["BASE64", "command -v base64 >/dev/null 2>&1"],
            ["TMP_WRITE", "t=/tmp/.apl-write-probe; : > \"$t\" 2>/dev/null && rm -f \"$t\""],
            ["PERSIST_WRITE", "t='" + PERSIST_DIR + "/.apl-write-probe'; mkdir -p '" + PERSIST_DIR + "' 2>/dev/null && : > \"$t\" 2>/dev/null && rm -f \"$t\""],
            ["RADIO_WANTED", "test -f '" + DATA_DIR + "/radio.want' || test -f /run/apl-bg/radio.want || test -f /tmp/apl-bg/radio.want"],
            ["RADIO_PAUSED", "test -f '" + DATA_DIR + "/radio.paused' || test -f /run/apl-bg/radio.paused || test -f /tmp/apl-bg/radio.paused"],
            ["RADIO_PID_ALIVE", "p=$(cat /run/apl-bg/audio.pid /tmp/apl-bg/audio.pid 2>/dev/null | head -1); test -n \"$p\" && kill -0 \"$p\" 2>/dev/null"],
            ["PULSE_SOCKET", "find /run /var/run /tmp -type s -path '*/pulse*/native' -print -quit 2>/dev/null | grep -q ."],
            ["PACTL", "command -v pactl >/dev/null 2>&1"],
            ["APL_STREAM", pulseList],
            ["FG_YOUTUBE", fg + " | grep -qi youtube"],
            ["FG_HDMI", fg + " | grep -Eqi 'org.tizen.tv-viewer|hdmi'"],
            ["FG_APL", fg + " | grep -qi APLauncher"],
            ["LOG_FOREGROUND_REBIND", "grep -q 'foreground audio transition detected' /run/apl-bg/audio.log /tmp/apl-bg/audio.log 2>/dev/null"],
            ["LOG_REBIND_SNAPSHOT", "grep -q 'after-foreground-rebind' /run/apl-bg/audio.log /tmp/apl-bg/audio.log 2>/dev/null"]
        ];
        var lines = [title, "ROOT_STDOUT=unavailable; exit-status probes", compact ? "NOTE=" + compact : ""], chain = Promise.resolve();
        checks.forEach(function (pair) {
            chain = chain.then(function () {
                return execCheck(pair[1]).then(function (ok) { lines.push(pair[0] + "=" + (ok ? "yes" : "no")); });
            });
        });
        return chain.then(function () { return lines.filter(function (x) { return x !== ""; }).join("\n"); });
    }

    function bootstrapDiagnostic(reason) {
        return binaryReport("APL_AUDIO_DIAGNOSTIC_BOOTSTRAP", reason);
    }

    function safeArg(s) {
        return "'" + String(s || "").replace(/'/g, "%27") + "'";
    }

    function command(action, argLine) {
        if (queues[action]) return queues[action];
        var fullArgs = action + (argLine ? " " + argLine : "");
        var p = install().then(function () {
            return runExec(runner(fullArgs) + " 2>&1 | tail -1");
        }).then(function (out) {
            if (out === "MISSING_DAEMON") {
                installed = false;
                return install().then(function () {
                    return runExec(runner(fullArgs) + " 2>&1 | tail -1");
                });
            }
            return out;
        }).then(function (out) {
            queues[action] = null;
            return out;
        }, function (e) {
            queues[action] = null;
            throw e;
        });
        queues[action] = p;
        return p;
    }

    function start(url) {
        return command("start", safeArg(url)).then(function (out) {
            // A successful root command with no stdout is the normal response on
            // this Vetro agent. do_start exits non-zero if GStreamer could not
            // start, so reaching here is sufficient to enter background mode.
            if (!out || /^PLAYING|^STARTING/.test(out)) {
                state.playing = true; state.starting = !/^PLAYING/.test(out || "STARTING");
                state.paused = false; state.phase = state.starting ? "STARTING" : "PLAYING";
                state.url = url; state.why = "";
                return true;
            }
            return status().then(function (s) {
                if (s.playing || s.starting) return true;
                throw new Error(/NOGST/.test(out) ? APL.t("No player on this screen") : APL.t("The background player did not start"));
            });
        });
    }

    function stop() {
        return command("stop").then(function () { return status(); }).then(function () { state.playing = false; return true; });
    }

    function pause() {
        return command("pause").then(function () { return status(); }).then(function () { state.playing = false; return true; });
    }

    function resume() {
        return command("resume").then(function (out) {
            if (!out || /^PLAYING/.test(out)) { state.playing = true; state.paused = false; state.phase = "PLAYING"; return true; }
            return status().then(function (s) { state.playing = s.playing; return s.playing; });
        });
    }

    function ensure() {
        if (preview()) return Promise.resolve(state);
        return command("ensure").then(function (out) {
            if (!out || /^PLAYING|^STARTING|^PAUSED/.test(out)) return status();
            var u = state.url || "";
            if (!u) return status();
            return start(u).then(function () { return status(); }, function () { return status(); });
        }, function (e) {
            state.playing = false; state.why = (e && e.message) || "vetro";
            return state;
        });
    }

    function writeAlertConfig() {
        var content = [
            "PRAYER_ALERTS=" + (cachedCfg.prayerAlerts ? "1" : "0"),
            "TASK_ALERTS=" + (cachedCfg.taskAlerts ? "1" : "0"),
            "PAUSE_RADIO=" + (cachedCfg.pauseRadio ? "1" : "0"),
            "ALERT_VOL=" + cachedCfg.alertVol
        ].join("\n") + "\n";
        return writeRemoteBase64(DATA_DIR + "/alert-config.env", toBase64Utf8(content), false);
    }

    function syncPrayerSchedule(entries, cfg) {
        if (preview()) return Promise.resolve(false);
        if (cfg) {
            if ("prayerAlerts" in cfg) cachedCfg.prayerAlerts = !!cfg.prayerAlerts;
            if ("pauseRadio" in cfg) cachedCfg.pauseRadio = !!cfg.pauseRadio;
            if ("alertVol" in cfg && isFinite(cfg.alertVol)) {
                cachedCfg.alertVol = String(Math.max(0.1, Math.min(1.5, Number(cfg.alertVol))).toFixed(2));
            }
        }
        return install().then(ensureSounds).then(function () {
            var lines = (entries || []).map(function (e) {
                return [Math.floor(Number(e.epoch) || 0), String(e.id || ""), "prayer", String(e.key || "isha")].join("\t");
            }).filter(function (l) { return /^[1-9]/.test(l); }).join("\n") + "\n";
            return writeRemoteBase64(DATA_DIR + "/prayer-schedule.tsv", toBase64Utf8(lines), false);
        }).then(writeAlertConfig).then(function () {
            return command("tick");
        });
    }

    function syncTaskSchedule(entries, enabled) {
        if (preview()) return Promise.resolve(false);
        if (typeof enabled === "boolean") cachedCfg.taskAlerts = enabled;
        return install().then(ensureSounds).then(function () {
            var lines = (entries || []).map(function (e) {
                return [Math.floor(Number(e.epoch) || 0), String(e.id || ""), "task", "task"].join("\t");
            }).filter(function (l) { return /^[1-9]/.test(l); }).join("\n") + "\n";
            return writeRemoteBase64(DATA_DIR + "/task-schedule.tsv", toBase64Utf8(lines), false);
        }).then(writeAlertConfig).then(function () {
            return command("tick");
        });
    }

    function playAlert(key, volume, pauseRadio) {
        if (preview()) return Promise.reject(new Error("preview"));
        var vol = isFinite(volume) ? String(Math.max(0.1, Math.min(1.5, Number(volume))).toFixed(2)) : cachedCfg.alertVol;
        var pr = pauseRadio === false ? "0" : "1";
        // Alerts, unlike a read-only report, need the durable local sound library.
        return install().then(ensureSounds).then(function () {
            return command("alert", safeArg(key || "isha") + " " + safeArg(vol) + " " + safeArg(pr));
        }).then(function (out) {
            return !out || /^ALERTING/.test(out || "");
        });
    }

    function health() {
        if (preview()) return Promise.resolve({ keeper: false, supervisor: false, alert: false });
        return install().then(function () {
            return runExec(runner("health") + " 2>/dev/null | tail -1");
        }).then(function (line) {
            var out = {}, re = /([a-z]+)=([^\s]+)/g, m;
            while ((m = re.exec(line || ""))) out[m[1]] = m[2];
            return { keeper: out.keeper === "1", supervisor: out.supervisor === "1", alert: out.alert === "1", hdmi: out.hdmi === "1", pulse: out.pulse || "" };
        }, function () { return { keeper: false, supervisor: false, alert: false, pulse: "" }; });
    }

    function repairAudio() { return command("repair"); }

    /* Alert readiness: what the prayer/task alerts need, as plain yes/no lines. Read-only: starts no audio. */
    function readiness() {
        if (preview()) return Promise.resolve("Preview: nothing to check here");
        var lines = [], out = {};
        function row(k, v) { out[k] = v; lines.push(k + ": " + (v === true ? "OK" : v === false ? "NO" : v)); }
        function chk(label, cmd) { return execCheck(cmd).then(function (ok) { row(label, ok); return ok; }); }
        return available().then(function (up) {
            row("Vetro reachable (port 8099) + GStreamer", up);
            if (!up) { lines.push("Why: " + (state.why || "unknown")); return null; }
            return install().then(function () { row("Daemon installed", true); }, function (e) {
                row("Daemon installed", false); lines.push("Why: " + String((e && e.message) || e).slice(0, 200));
            }).then(function () {
                return chk("Pulse socket found", "find /run /var/run /tmp -type s -path '*/pulse*/native' -print -quit 2>/dev/null | grep -q .");
            }).then(function () { return chk("pactl available", "command -v pactl >/dev/null 2>&1"); })
              .then(function () { return chk("Alert sounds stored on the TV", runner("sounds-ok") + " >/dev/null 2>&1"); })
              .then(function () { return health().then(function (h) { row("Alert keeper running", !!h.keeper); row("Pulse route", h.pulse || "unknown"); }); });
        }).then(function () {
            lines.push("");
            lines.push(out["Pulse socket found"] === true && out["pactl available"] === true
                ? "Next: press \"Play a Test Alert\" with YouTube or an HDMI input in front, and listen."
                : "The test alert is not likely to be heard until the NO lines above are fixed.");
            return lines.join("\n");
        });
    }

    // Read-only decoder availability snapshot. It executes no playback command.
    function decoderSnapshot() {
        if (preview()) return Promise.resolve("APL_DECODER_CAPABILITY_SNAPSHOT preview");
        return install().then(function () {
            return runExec(runner("decoder-snapshot") + " 2>&1");
        }).then(function (out) {
            return "APL_DECODER_CAPABILITY_SNAPSHOT\n" + String(out || "no decoder snapshot returned").slice(0, 1600);
        }, function (e) {
            return "APL_DECODER_CAPABILITY_SNAPSHOT\nERROR=" + String((e && e.message) || e || "unknown").replace(/[\r\n]+/g, " ").slice(0, 420);
        });
    }

    // Read-only Pulse connectivity snapshot. It executes no playback command.
    function pulseSnapshot() {
        if (preview()) return Promise.resolve("APL_PULSE_CONNECTION_SNAPSHOT preview");
        return install().then(function () {
            return runExec(runner("pulse-snapshot") + " 2>&1");
        }).then(function (out) {
            return "APL_PULSE_CONNECTION_SNAPSHOT\n" + String(out || "no snapshot returned").slice(0, 2400);
        }, function (e) {
            return "APL_PULSE_CONNECTION_SNAPSHOT\nERROR=" + String((e && e.message) || e || "unknown").replace(/[\r\n]+/g, " ").slice(0, 420);
        });
    }

    // Read-only report used after reproducing an external-video handoff. The
    // direct MessagePort response is shown first because some older root-agent /
    // Vetro combinations resolve commands but lose their JSON body on the way
    // back to the WebView. Do not infer "yes" from such an empty reply.
    function transportProbe() {
        if (!sys.bridge) return Promise.resolve({ usable: false, report: "APL_VETRO_TRANSPORT\nBRIDGE_API=missing" });
        return sys.bridge("POST", "/exec", JSON.stringify({ cmd: "printf APL_TRANSPORT_PROBE" }), 12000).then(function (r) {
            var status = r && r.status, raw = String((r && r.body) || ""), data = null;
            try { data = JSON.parse(raw); } catch (e) {}
            var lines = [
                "APL_VETRO_TRANSPORT",
                "HTTP_STATUS=" + (status || 0),
                "REPLY_BYTES=" + raw.length,
                "JSON_REPLY=" + (data ? "yes" : "no")
            ];
            if (data) {
                lines.push("JSON_KEYS=" + Object.keys(data).sort().join(","));
                lines.push("EXEC_OK=" + (data.ok === true ? "yes" : data.ok === false ? "no" : "missing"));
                lines.push("EXIT_CODE=" + (data.exit_code === undefined ? "missing" : data.exit_code));
                lines.push("OUTPUT_BYTES=" + String(data.output || "").length);
                lines.push("STDERR_BYTES=" + String(data.stderr || "").length);
                if (data.error !== undefined) lines.push("VETRO_ERROR=" + String(data.error || "").replace(/[\r\n]+/g, " ").slice(0, 420));
                lines.push("PROBE_OUTPUT=" + String(data.output || "").replace(/[\r\n]+/g, " ").slice(0, 100));
            } else if (raw) {
                lines.push("RAW_REPLY=" + raw.replace(/[\r\n]+/g, " ").slice(0, 420));
            }
            return { usable: !!(data && typeof data.ok === "boolean" && data.exit_code !== undefined), report: lines.join("\n") };
        }, function (e) {
            return { usable: false, report: "APL_VETRO_TRANSPORT\nBRIDGE_ERROR=" + String((e && e.message) || e || "unknown").replace(/[\r\n]+/g, " ").slice(0, 420) };
        });
    }

    function installFailureReport(reason) {
        var why = String((reason && reason.message) || reason || "daemon install failed").replace(/[\r\n]+/g, " ").slice(0, 360);
        var probe = [
            "echo APL_DAEMON_INSTALL_DEBUG",
            "echo FAILURE=" + why.replace(/[^A-Za-z0-9 ._:/=-]/g, "_"),
            "for p in '" + PERSIST_SCRIPT + "' '" + RUN_SCRIPT + "'; do",
            "echo PATH=$p",
            "if [ -e \"$p\" ]; then",
            "ls -l \"$p\" 2>&1",
            "wc -c < \"$p\" 2>/dev/null | sed 's/^/BYTES=/'",
            "head -n 1 \"$p\" 2>/dev/null | sed 's/^/FIRST=/'",
            "sh -n < \"$p\" 2>/dev/null; echo SYNTAX_EXIT=$?",
            "v=$(APL_DAEMON_SOURCE=\"$p\" sh -c 'cat \"$APL_DAEMON_SOURCE\" | sh -s -- version' 2>&1); rc=$?; echo \"VERSION=$v\"; echo VERSION_EXIT=$rc",
            "else echo MISSING; fi",
            "done"
        ].join("\n");
        return runExec(probe).then(function (out) {
            return "APL_DAEMON_INSTALL_DEBUG\n" + String(out || "no debug output").slice(0, 2600);
        }, function (e) {
            return "APL_DAEMON_INSTALL_DEBUG\nFAILURE=" + why + "\nDEBUG_COMMAND_ERROR=" +
                   String((e && e.message) || e || "unknown").replace(/[\r\n]+/g, " ").slice(0, 420);
        });
    }

    function diagnostic() {
        if (preview()) return Promise.resolve("APL_AUDIO_DIAGNOSTIC preview");
        return transportProbe().then(function (probe) {
            // With no verifiable raw response, the old result could only mark every
            // check yes. Return the transport facts instead of a misleading report.
            if (!probe.usable) return probe.report;
            return install().then(function () {
                return runExec(runner("diagnostic") + " 2>&1");
            }).then(function (out) {
                if (out && out !== "MISSING_DAEMON") return probe.report + "\n\n" + out;
                return binaryReport("APL_AUDIO_DIAGNOSTIC", "daemon command completed; root stdout unavailable").then(function (report) {
                    return probe.report + "\n\n" + report;
                });
            }, function (e) {
                return installFailureReport(e).then(function (report) {
                    return probe.report + "\n\n" + report;
                });
            });
        });
    }

    function lastFired() {
        if (preview()) return Promise.resolve({ prayer: "", task: "" });
        return install().then(function () {
            return runExec(runner("last-fired") + " 2>/dev/null | tail -1");
        }).then(function (line) {
            var mp = /PRAYER=([^\t\r\n]*)/.exec(line || "");
            var mt = /TASK=([^\t\r\n]*)/.exec(line || "");
            return { prayer: mp ? mp[1] : "", task: mt ? mt[1] : "" };
        }, function () { return { prayer: "", task: "" }; });
    }

    APL.bgAudio = {
        scriptPath: PERSIST_SCRIPT,
        available: available,
        install: install,
        start: start,
        stop: stop,
        ensure: ensure,
        hdmiRecover: function () { return command("hdmi-recover"); },
        repairAudio: repairAudio,
        decoderSnapshot: decoderSnapshot,
        pulseSnapshot: pulseSnapshot,
        diagnostic: diagnostic,
        health: health,
        readiness: readiness,
        pause: pause,
        resume: resume,
        status: status,
        state: function () { return state; },
        playAlert: playAlert,
        test: function (key) { return playAlert(key || "dhuhr"); },
        syncPrayerSchedule: syncPrayerSchedule,
        syncTaskSchedule: syncTaskSchedule,
        lastFired: lastFired,
        log: function () { return runExec(runner("log") + " 2>/dev/null | tail -12"); }
    };
})(window);
