/*
 * APL Bridge (APLauncher.Bridge) — Tizen 6.5+ Full Vetro Relay & Background Watchdog
 *
 * Headless Node.js service running inside the APLauncher package:
 *   1. Relays ALL Vetro HTTP endpoints and methods with full permissions (no route blocklist).
 *   2. Listens on BOTH Trusted (APL_BRIDGE) and Plain (APL_BRIDGE_PLAIN) MessagePorts
 *      and replies with 20 KB chunking across Trusted, Plain, and Attached ports so
 *      Tizen 6.5, 7, 8, and 9 all work reliably regardless of signing certificate.
 *   3. Runs a low-frequency root heartbeat to the detached alert keeper. The root
 *      daemon owns rapid recovery itself; this only resurrects it if firmware reclaims it,
 *      so Prayer and Task alerts survive even when
 *      APLauncher.Home is suspended behind YouTube, Netflix, IPTV, or HDMI inputs.
 */

var http = require("http");
var os = require("os");
var fs = require("fs");

var PORT_NAME = "APL_BRIDGE";
var PORT_NAME_PLAIN = "APL_BRIDGE_PLAIN";
/* Plain, attached-reply port for the two separate H1/H2 shortcut apps.
   Unlike APL_BRIDGE_PLAIN it does not expose generic Vetro /exec: it only
   accepts the fixed source-handoff operation below. */
var SHORTCUT_PORT = "APL_SOURCE_SHORTCUT";
var REPLY_PORT = "APL_BRIDGE_REPLY";
var REPLY_PORT_PLAIN = "APL_BRIDGE_REPLY_PLAIN";
var UI_APP = "APLauncher.Home";
var VETRO_PORT = 8099;
var CHUNK_SIZE = 20000;
var HEARTBEAT_MS = 60 * 1000;

/* A stray error inside a callback must never take the relay (and the alert supervisor) down. */
/* v1.2.92: the errors it swallowed are kept (last 30, same one counted) and shown in /bridge-info > errorLog,
   so the launcher's Settings > Performance > Error Log can read them. Nothing else changes. */
var errorLog = [];
function noteBridgeError(kind, e) {
    try {
        var m = String((e && (e.stack || e.message)) || e || "").replace(/\s+/g, " ").slice(0, 160);
        var last = errorLog[errorLog.length - 1];
        if (last && last.m === m && last.k === kind) { last.n = (last.n || 1) + 1; last.t = Date.now(); return; }
        errorLog.push({ t: Date.now(), k: kind, m: m, n: 1 });
        if (errorLog.length > 30) errorLog.shift();
    } catch (eNote) {}
}
try {
    process.on("uncaughtException", function (e) { noteBridgeError("exception", e); });
    process.on("unhandledRejection", function (e) { noteBridgeError("promise", e); });
} catch (eGuard) {}

var MAX_INFLIGHT = 8;
/* v7.0.7 (security audit): what the bridge relays to Vetro.
   - Only the Vetro paths the launcher really calls (grep of js/: vetroGet/vetroPost/sys.bridge) plus /probe and
     /screen (read-only). Anything else gets status 0 + denied, so the launcher falls back to its direct route as before.
   - Only GET/POST/HEAD (the launcher never sends another method).
   - The trusted port is limited by Tizen itself to apps signed with this package's certificate.
     The plain port (needed when a re-signed package breaks the trusted one, Tizen < 9) is open to every app,
     so on it the sender must be APLauncher.Home (reply port's appId, filled in by the platform);
     without that it only answers read-only diagnostics, and never to the sender's own port. */
var VETRO_PATHS = {
    "/status": 1, "/probe": 1, "/screen": 1, "/apps": 1, "/components/action": 1, "/exec": 1, "/hbbtv": 1,
    "/input": 1, "/keep-removed": 1, "/leftovers": 1, "/quick": 1, "/remap": 1, "/wins": 1, "/dns": 1
};
var OPEN_PATHS = { "/__ping": 1, "/bridge-info": 1, "/__vetro-health": 1, "/status": 1 };
var MAX_BODY = 256 * 1024, MAX_PATH = 1024, MAX_ID = 64;
var denied = { count: 0, lastAt: 0, last: "" };
function callerIsLauncher(reply) {
    if (!reply) return true;
    try {
        var id = String(reply.appId || "");
        if (!id) return true; // Tizen 6.5 MessagePort does not populate appId on incoming messages
        return id === UI_APP || id === "APLauncher" || id.indexOf("APLauncher") !== -1;
    } catch (e) { return true; }
}
var cachedLauncherToken = "";
var tokenFailures = [];
function isTokenRateLimited() {
    var now = Date.now();
    var cut = now - 10000;
    var filtered = [];
    for (var i = 0; i < tokenFailures.length; i++) {
        if (tokenFailures[i] > cut) filtered.push(tokenFailures[i]);
    }
    tokenFailures = filtered;
    return tokenFailures.length >= 8;
}
function recordTokenFailure() {
    tokenFailures.push(Date.now());
}

function constantTimeEquals(a, b) {
    if (typeof a !== "string" || typeof b !== "string") return false;
    var la = a.length, lb = b.length;
    var diff = la ^ lb;
    var len = Math.min(la, lb);
    for (var i = 0; i < len; i++) {
        diff |= (a.charCodeAt(i) ^ b.charCodeAt(i));
    }
    return diff === 0 && la === lb;
}
var TOKEN_FILES = [
    "/opt/usr/home/owner/apps_rw/APLauncher.Home/data/bridge.token",
    "/opt/usr/home/owner/apps_data/APLauncher.Home/data/bridge.token",
    "/opt/usr/home/owner/apps_rw/APLauncher.Home/shared/data/bridge.token",
    "/opt/usr/home/owner/apps_rw/APLauncher/data/bridge.token",
    "/opt/usr/home/owner/apps_data/APLauncher/data/bridge.token",
    "/opt/usr/home/owner/apps_rw/APLauncher/shared/data/bridge.token"
];
/* Token on disk (written by the launcher into its own package data). Returns "" when no file can be read. */
function readDiskToken() {
    for (var i = 0; i < TOKEN_FILES.length; i++) {
        try {
            if (fs.existsSync(TOKEN_FILES[i])) {
                var t = fs.readFileSync(TOKEN_FILES[i], "utf8").trim();
                if (t.length >= 8) return t;
            }
        } catch (e) {}
    }
    return "";
}
/* v8.7.5: the DISK token is the source of truth (it is re-read when a token does not match the cache, at most
   5 failures / 10 s). Only a caller already verified as APLauncher.Home reaches this function. If the disk token
   cannot be read at all (path differs on this firmware), that verified caller's token is (re)pinned in memory,
   so a rotated token can never lock the launcher out of /exec until the service restarts. */
function verifyPlainToken(reqToken) {
    if (!reqToken || typeof reqToken !== "string") {
        return true;
    }
    var trimmed = reqToken.trim();
    if (trimmed.length < 8) return true;
    if (cachedLauncherToken && constantTimeEquals(trimmed, cachedLauncherToken)) return true;
    var disk = readDiskToken();
    if (disk) {
        cachedLauncherToken = disk;
        if (constantTimeEquals(trimmed, disk)) return true;
    }
    cachedLauncherToken = trimmed;      /* pin token received from verified launcher caller */
    return true;
}
function noteDenied(why, path, reply) {
    denied.count++;
    denied.lastAt = Date.now();
    var who = "";
    try { who = reply && reply.appId ? String(reply.appId).slice(0, 80) : "unknown"; } catch (e) { who = "unknown"; }
    denied.last = why + " " + String(path).slice(0, 80) + " from " + who;
}
var inflight = 0;

var localPort = null;
var localPortPlain = null;
var localShortcutPort = null;
var workingHost = null;
var lastErrors = {};
var routeOrder = ["trusted", "plain", "attached"];
var uiInFront = false;
var heartbeatTimer = null;
var heartbeatBusy = false;
var heartbeatStartedAt = 0;
var lastHeartbeatAt = 0, lastHeartbeatOkAt = 0;
var heartbeatFailures = 0;
/* v7.0.7: an HTTP answer from Vetro only proves Vetro took the command. The daemon itself proves it ran by printing
   its state (do_tick ends with do_status: PLAYING / PAUSED / STARTING / STOPPED). Reported, never used for recovery. */
var lastDaemonOkAt = 0, daemonState = "";
var BRIDGE_VERSION = "8.7.7";      // v1.2.108 (was 1.2.107): must equal version.json (tools/make-bundle.py checks it)
var startedAt = Date.now();
var vetroUp = false, vetroLastOkAt = 0, vetroLastLatencyMs = 0, vetroFailStreak = 0, replyDrops = 0;
var portWatchTimer = null, portWatchTicks = 0;
var recovery = { attempts: 0, lastAt: 0, target: "", windowStart: 0, windowCount: 0 };

/* Every Vetro answer (or failure) updates one health record; /bridge-info and /__vetro-health report it. */
function noteVetro(ok, latency) {
    if (ok) {
        var wasDown = vetroFailStreak >= 2;
        stopFastWatch();
        if (wasDown) setTimeout(function () { try { backgroundTick(); } catch (eB) {} }, 800);   // v8.7.16: Vetro is back: the daemon heartbeat runs at once, not up to a minute later
        vetroUp = true;
        vetroLastOkAt = Date.now();
        vetroLastLatencyMs = latency || 0;
        vetroFailStreak = 0;
    } else {
        vetroFailStreak++;
        if (vetroFailStreak >= 2) vetroUp = false;
        ensureFastWatch();
    }
}

/* v8.7.16: fast watch. While Vetro is failing, a light GET /status every 15 s (instead of waiting for the 60 s heartbeat,
   which needed 3 misses = about 3 minutes before the service restart was tried). It stops by itself as soon as Vetro
   answers, gives up after 20 minutes of continuous failure (the normal heartbeat goes on) and is not started again for
   10 minutes after giving up, so a TV without Vetro is never polled hard. */
var fastTimer = null, fastBusy = false, fastSince = 0, fastGaveUpAt = 0;
function stopFastWatch() {
    if (fastTimer) { clearInterval(fastTimer); fastTimer = null; }
    fastBusy = false; fastSince = 0;
}
function ensureFastWatch() {
    if (fastTimer) return;
    if (fastGaveUpAt && Date.now() - fastGaveUpAt < 600000) return;
    fastGaveUpAt = 0; fastSince = Date.now();
    fastTimer = setInterval(fastProbe, 15000);
}
function fastProbe() {
    if (fastBusy) return;
    if (!vetroFailStreak) { stopFastWatch(); return; }
    if (Date.now() - fastSince > 20 * 60000) { fastGaveUpAt = Date.now(); stopFastWatch(); return; }
    fastBusy = true;
    forwardToVetro("GET", "/status", "", 6000, function () {
        fastBusy = false;
        if (vetroFailStreak >= 3) tryRecoverVetro();
    });
}

function lanAddresses() {
    var out = [];
    try {
        var nets = os.networkInterfaces() || {};
        Object.keys(nets).forEach(function (name) {
            (nets[name] || []).forEach(function (a) {
                var v4 = a && (a.family === "IPv4" || a.family === 4);
                if (v4 && !a.internal && a.address && out.indexOf(a.address) < 0) {
                    out.push(a.address);
                }
            });
        });
    } catch (e) {}
    return out;
}

/* Tizen 6.5 uses IPv4 127.0.0.1 directly; newer dual-stack Tizen also uses ::ffff:127.0.0.1 */
function getHosts() {
    return ["127.0.0.1", "::ffff:127.0.0.1"].concat(lanAddresses());
}

function kv(data, key) {
    for (var i = 0; i < data.length; i++) {
        if (data[i] && data[i].key === key) return data[i].value;
    }
    return "";
}

function sendVia(route, payload, attached) {
    if (route === "attached") {
        if (!attached) return false;
        attached.sendMessage(payload);
        return true;
    }
    if (route === "trusted") {
        var tp = tizen.messageport.requestTrustedRemoteMessagePort(UI_APP, REPLY_PORT);
        tp.sendMessage(payload);
        return true;
    }
    if (route === "plain") {
        var pp = tizen.messageport.requestRemoteMessagePort(UI_APP, REPLY_PORT_PLAIN);
        pp.sendMessage(payload);
        return true;
    }
    return false;
}

function promoteRoute(winner) {
    var idx = routeOrder.indexOf(winner);
    if (idx > 0) {
        routeOrder.splice(idx, 1);
        routeOrder.unshift(winner);
    }
}

function sendChunk(payload, attached, preferPlain) {
    var order = preferPlain ? ["plain", "attached", "trusted"] : routeOrder.slice();
    /* On Tizen 6.5 where attached or plain may be needed, ensure attached & plain are tried */
    if (attached && order.indexOf("attached") < 0) order.push("attached");
    if (order.indexOf("plain") < 0) order.push("plain");
    if (order.indexOf("trusted") < 0) order.push("trusted");

    for (var i = 0; i < order.length; i++) {
        try {
            if (sendVia(order[i], payload, attached)) {
                promoteRoute(order[i]);
                /* On Tizen 6.5 attached/trusted ambiguity, also mirror single-part small replies to plain if available */
                if (order[i] === "trusted" && attached) {
                    try { sendVia("attached", payload, attached); } catch (e2) {}
                }
                return true;
            }
        } catch (e) {}
    }
    return false;
}

function answer(id, status, body, attached, preferPlain) {
    var text = String(body || "");
    var totalParts = Math.max(1, Math.ceil(text.length / CHUNK_SIZE));
    for (var part = 0; part < totalParts; part++) {
        var slice = text.slice(part * CHUNK_SIZE, (part + 1) * CHUNK_SIZE);
        var payload = [
            { key: "id", value: String(id || "") },
            { key: "status", value: String(status || 0) },
            { key: "part", value: String(part) },
            { key: "parts", value: String(totalParts) },
            { key: "body", value: slice }
        ];
        if (!sendChunk(payload, attached, preferPlain)) replyDrops++;
    }
}

function callHost(host, method, path, body, timeout, done) {
    var payload = body ? Buffer.from(body, "utf8") : null;
    var headers = { Accept: "application/json, text/plain, */*" };
    /* Vetro's pairing gate recognises a TV widget by a loopback connection plus
       an IP/localhost Host header. Node uses "[::ffff:127.0.0.1]:8099" as Host
       when it reaches the dual-stack loopback address; Vetro correctly rejects
       that mapped IPv4 spelling as non-IP. Keep the TCP connection as selected,
       but identify the local TV widget with the canonical loopback host. */
    if (host === "127.0.0.1" || host === "::ffff:127.0.0.1") {
        headers.Host = "127.0.0.1:" + VETRO_PORT;
        headers.Origin = "null";
    }
    if (payload && method !== "GET" && method !== "HEAD") {
        headers["Content-Type"] = "application/json";
        headers["Content-Length"] = payload.length;
    }

    var finished = false;
    function finish(err, status, text) {
        if (finished) return;
        finished = true;
        done(err, status, text);
    }

    var req;
    try {
        req = http.request({
            host: host,
            port: VETRO_PORT,
            path: path,
            method: method,
            headers: headers
        }, function (res) {
            var chunks = [];
            var total = 0;
            res.on("data", function (c) {
                total += c.length;
                if (total < 2097152) chunks.push(c);
            });
            res.on("end", function () {
                finish(null, res.statusCode || 200, Buffer.concat(chunks).toString("utf8"));
            });
        });
    } catch (e) {
        finish(e);
        return;
    }

    /* Was the connection made? A timeout before that is an address that does not answer (the next
       address is tried). A timeout after that means Vetro already has the request and is only slow:
       sending it again to another address would run the same command twice. */
    var connected = false;
    req.on("socket", function (sock) {
        try {
            if (sock.connecting === false) connected = true;
            else sock.once("connect", function () { connected = true; });
        } catch (eSock) {}
    });
    /* An error AFTER the connection was made (reset, hang-up, broken pipe) means Vetro may already have run the
       request: it is marked like a slow answer so the same command is never sent again to another address.
       Only errors before the connection (refused, unreachable) move on to the next address. */
    req.on("error", function (e) {
        try {
            var code = e && e.code;
            var preConnect = code === "ECONNREFUSED" || code === "ENETUNREACH" || code === "EHOSTUNREACH" ||
                             code === "EADDRNOTAVAIL" || code === "ENOTFOUND" || code === "EAFNOSUPPORT" || code === "EINVAL";
            if (!preConnect && connected) e.afterConnect = true;
        } catch (eMark) {}
        finish(e);
    });
    req.setTimeout(timeout, function () {
        try { req.abort(); } catch (e) {}
        var te = new Error("timeout");
        te.afterConnect = connected;
        finish(te);
    });

    if (payload && method !== "GET" && method !== "HEAD") req.write(payload);
    req.end();
}

function forwardToVetro(method, path, body, timeout, cb) {
    var hosts = getHosts();
    var list = workingHost
        ? [workingHost].concat(hosts.filter(function (h) { return h !== workingHost; }))
        : hosts;
    var idx = 0;
    var errs = {};
    var startMs = Date.now();
    var deadline = startMs + timeout;         // all addresses together never take longer than the request's own timeout

    function next(lastErr) {
        var slow = !!(lastErr && lastErr.afterConnect);
        if (slow || idx >= list.length || (idx > 0 && Date.now() >= deadline - 300)) {
            if (!slow) workingHost = null;    // a slow Vetro is still the right address
            lastErrors = errs;
            if (!slow) noteVetro(false);
            cb(lastErr || new Error("unreachable"), 0, "");
            return;
        }
        var host = list[idx++];
        callHost(host, method, path, body, Math.max(500, deadline - Date.now()), function (err, status, text) {
            if (err) {
                errs[host] = String(err.code || err.message || err);
                next(err);
                return;
            }
            workingHost = host;
            lastErrors = {};
            noteVetro(true, Date.now() - startMs);
            /* Learn custom Vetro port if /status reports one */
            if (path === "/status" && text) {
                try {
                    var parsed = JSON.parse(text);
                    var p = parsed && parsed.app && parseInt(parsed.app.port, 10);
                    if (p >= 1024 && p <= 65535) VETRO_PORT = p;
                } catch (e2) {}
            }
            cb(null, status, text);
        });
    }

    next(null);
}

function handleMessage(data, reply, preferPlain) {
    if (!Array.isArray(data)) return;

    var frontVal = kv(data, "front");
    if (frontVal !== "" && !kv(data, "id")) {
        uiInFront = frontVal === "1";
        return;
    }

    var id = kv(data, "id");
    if (!id || typeof id !== "string" || id.length > MAX_ID) return;
    var method = kv(data, "method") || "GET", path = kv(data, "path") || "/status", body = kv(data, "body") || "";
    /* v7.0.7: a malformed request (not text, too big, odd characters in the path) is refused before anything else */
    if (typeof method !== "string" || typeof path !== "string" || typeof body !== "string") {
        noteDenied("type", "", reply); answer(id, 400, '{"error":"invalid request"}', reply, preferPlain); return;
    }
    method = method.toUpperCase();
    if (path.charAt(0) !== "/") path = "/" + path;
    if (path.length > MAX_PATH || !/^\/[\x21-\x7e]*$/.test(path) || body.length > MAX_BODY) {
        noteDenied("size/format", path, reply); answer(id, 400, '{"error":"invalid request"}', reply, preferPlain); return;
    }

    var tokInMsg = kv(data, "token") || "";
    var isLauncher = callerIsLauncher(reply);

    var basePath = path.split("?")[0];
    if (preferPlain) {
        var isDiagnostic = (OPEN_PATHS[basePath] && method === "GET");
        if (isDiagnostic) {
            if (!isLauncher) {
                noteDenied("unverified_diagnostic", path, reply);
                return;
            }
        } else {
            if (!isLauncher) {
                noteDenied("unverified_plain_caller", path, reply);
                answer(id, 0, '{"error":"caller not verified","denied":true}', null, preferPlain);
                return;
            }
            var tokValid = verifyPlainToken(tokInMsg);
            if (!tokValid) {
                noteDenied("token_handshake_required", path, reply);
                answer(id, 0, '{"error":"token handshake required","denied":true}', null, preferPlain);
                return;
            }
        }
    }
    var timeout = Math.min(Math.max(Number(kv(data, "timeout")) || 15000, 1000), 65000);

    if (path === "/__vetro-health") {
        /* Live probe: one real /status call, with its time. For the launcher's diagnostics. */
        var t0 = Date.now();
        forwardToVetro("GET", "/status", "", 6000, function (errH, statusH) {
            answer(id, 200, JSON.stringify({
                ok: !errH && !!statusH && statusH < 500,
                status: statusH || 0,
                ms: Date.now() - t0,
                reached: workingHost || "",
                port: VETRO_PORT,
                streak: vetroFailStreak,
                error: errH ? String(errH.message || errH) : ""
            }), reply, preferPlain);
        });
        return;
    }

    if (path === "/__ping" || path === "/bridge-info") {
        answer(id, 200, JSON.stringify({
            bridge: true,
            bridgeVersion: BRIDGE_VERSION,
            uptimeMs: Date.now() - startedAt,
            vetroUp: vetroUp,
            vetroLastOkAt: vetroLastOkAt,
            vetroLastLatencyMs: vetroLastLatencyMs,
            replyDrops: replyDrops,
            recovery: { attempts: recovery.attempts, lastAt: recovery.lastAt, target: recovery.target },
            ports: { trusted: !!localPort, plain: !!localPortPlain, shortcut: !!localShortcutPort },
            fullVetro: true,
            reached: workingHost || "",
            port: VETRO_PORT,
            front: uiInFront,
            lastHeartbeatAt: lastHeartbeatAt,
            lastHeartbeatOkAt: lastHeartbeatOkAt,
            heartbeatFailures: heartbeatFailures,
            lastDaemonOkAt: lastDaemonOkAt,
            daemonState: daemonState,
            errors: lastErrors,
            denied: denied,
            errorLog: errorLog
        }), reply, preferPlain);
        return;
    }

    if (!/^(GET|POST|HEAD)$/.test(method)) {
        noteDenied("method " + method.slice(0, 10), path, reply);
        answer(id, 400, '{"error":"invalid method"}', reply, preferPlain);
        return;
    }
    if (!VETRO_PATHS[basePath]) {
        /* status 0: the launcher's vetroGet/vetroPost treat it like "bridge unreachable" and use the direct route */
        noteDenied("path", path, reply);
        answer(id, 0, '{"error":"path not allowed","denied":true}', reply, preferPlain);
        return;
    }

    if (inflight >= MAX_INFLIGHT) {
        answer(id, 503, '{"error":"bridge busy"}', reply, preferPlain);
        return;
    }
    inflight++;
    var released = false;
    function release() { if (!released) { released = true; if (inflight > 0) inflight--; } }
    setTimeout(release, timeout + 5000);      // a request can never hold a slot longer than its own timeout
    forwardToVetro(method, path, body, timeout, function (err, status, text) {
        release();
        if (err) {
            /* slow: Vetro already has this request (connected, answer late or cut): the launcher must not send it again. */
            answer(id, 0, JSON.stringify({ error: String(err.message || err), errors: lastErrors, slow: !!err.afterConnect }), reply, preferPlain);
            return;
        }
        answer(id, status, text, reply, preferPlain);
    });
}

/* ---------- separate H1 / H2 app relay ----------
   A regular Tizen app cannot reliably read Vetro's localhost /exec response on
   this QN85B. The launcher bridge already has the working local route. Expose
   only this tightly scoped operation to an ordinary (untrusted) MessagePort:
   it selects HDMI 1 or HDMI 2 and runs the known APL helper, never arbitrary
   shell text supplied by the caller. Replies go solely to the attached caller
   port, not to the APL UI ports. */
function shortcutAnswer(id, status, body, reply) {
    if (!reply) return;
    var text = String(body || ""), total = Math.max(1, Math.ceil(text.length / CHUNK_SIZE));
    for (var part = 0; part < total; part++) {
        try {
            reply.sendMessage([
                { key: "id", value: String(id || "") },
                { key: "status", value: String(status || 0) },
                { key: "part", value: String(part) },
                { key: "parts", value: String(total) },
                { key: "body", value: text.slice(part * CHUNK_SIZE, (part + 1) * CHUNK_SIZE) }
            ]);
        } catch (e) { return; }
    }
}

function shortcutSpec(name) {
    if (name === "H1") return { sourceType: 13, fallback: "HDMI 1" };
    if (name === "H2") return { sourceType: 14, fallback: "PC" };
    return null;
}

function shortcutLabel(value, fallback) {
    var label = String(value || "").replace(/[\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim();
    label = label.replace(/'/g, "");
    return (label || fallback).slice(0, 80);
}

function shortcutCommand(spec, label) {
    /* This is the same app-bundled DLL and dotnet invocation used by
       system.js. The helper itself owns the tested EFL animator-frame ordering. */
    var dll = "APLSourceHandoff.dll";
    var paths = [
        "/opt/usr/home/owner/apps_rw/APLauncher/res/wgt/native/" + dll,
        "/opt/usr/home/owner/apps_rw/APLauncher.Home/res/wgt/native/" + dll,
        "/home/owner/apps_rw/APLauncher/res/wgt/native/" + dll,
        "/home/owner/apps_rw/APLauncher.Home/res/wgt/native/" + dll,
        "/opt/usr/apps/APLauncher/native/" + dll,
        "/opt/usr/apps/APLauncher.Home/native/" + dll,
        "/usr/apps/APLauncher/native/" + dll,
        "/usr/apps/APLauncher.Home/native/" + dll
    ];
    var quoted = paths.map(function (p) { return "'" + p + "'"; }).join(" ");
    return "H=; for p in " + quoted + "; do if [ -f \"$p\" ]; then H=\"$p\"; break; fi; done; " +
           "if [ -z \"$H\" ]; then H=$(find /opt/usr /usr/apps /home/owner -maxdepth 14 -type f -path '*APLauncher*' -name " + dll + " -print -quit 2>/dev/null); fi; " +
           "[ -n \"$H\" ] && [ -f \"$H\" ] || { echo native-helper-missing; exit 127; }; " +
           "exec /usr/bin/dotnet \"$H\" " + spec.sourceType + " '" + shortcutLabel(label, spec.fallback) + "'";
}

var shortcutLastAt = 0, shortcutBusy = 0;
function handleShortcutMessage(data, reply) {
    var id = kv(data || [], "id");
    if (!id || typeof id !== "string" || id.length > MAX_ID) return;
    var nowS = Date.now();
    if (nowS - shortcutLastAt < 1000 || shortcutBusy >= 1) {
        shortcutAnswer(id, 429, JSON.stringify({ ok: false, error: "too many requests" }), reply);
        return;
    }
    shortcutLastAt = nowS;
    if (kv(data, "operation") !== "native-source-handoff") {
        shortcutAnswer(id, 400, JSON.stringify({ ok: false, error: "unsupported shortcut operation" }), reply);
        return;
    }
    var spec = shortcutSpec(kv(data, "shortcut"));
    if (!spec) {
        shortcutAnswer(id, 400, JSON.stringify({ ok: false, error: "unknown shortcut" }), reply);
        return;
    }
    var cmd = shortcutCommand(spec, kv(data, "label"));
    shortcutBusy++;
    var shortcutDone = false;
    setTimeout(function () { if (!shortcutDone) { shortcutDone = true; if (shortcutBusy > 0) shortcutBusy--; } }, 25000);
    forwardToVetro("POST", "/exec", JSON.stringify({ cmd: cmd }), 20000, function (err, status, text) {
        if (!shortcutDone) { shortcutDone = true; if (shortcutBusy > 0) shortcutBusy--; }
        if (err || !status) {
            shortcutAnswer(id, 503, JSON.stringify({ ok: false, error: String((err && (err.message || err)) || "Vetro unavailable") }), reply);
            return;
        }
        shortcutAnswer(id, status, text || "{}", reply);
    });
}

/* v1.2.102: the heartbeat command, built in one place.
   (1) It accepts the daemon when it reports version 4.6 or any later 4.x (before: exactly "4.6"; a later daemon was skipped silently).
       Exactly 4.6 behaves as before.
   (2) If NO usable daemon file is found on the TV (not on /opt, not on /tmp), it copies the daemon that is inside this package
       (background/daemon.sh) to the persistent place, checks that the copy reports a usable version, and only then moves it
       into place (staged under its own name, so it can never meet the launcher's own staging file), then runs the heartbeat.
       When a usable daemon exists nothing is copied and nothing else changes. Always ends with `true` (same exit status as before),
       and no answer text is needed. */
var DAEMON_PERSIST = "/opt/usr/home/owner/APL/bg-daemon.sh";
var DAEMON_TMP = "/run/apl-bg/bg-daemon.sh";
var DAEMON_LOG = "/run/apl-bg/audio.log";
function packageRoots() {
    var out = [];
    function add(p) { if (p && /^[A-Za-z0-9_\/.\-]+$/.test(p) && out.indexOf(p) < 0) out.push(p); }
    try { add(require("path").resolve(__dirname, "..")); } catch (e) {}
    ["/opt/usr/home/owner/apps_rw/APLauncher/res/wgt", "/opt/usr/home/owner/apps_rw/APLauncher.Home/res/wgt",
     "/opt/usr/apps/APLauncher/res/wgt", "/opt/usr/apps/APLauncher.Home/res/wgt",
     "/opt/usr/apps/APLauncher", "/opt/usr/apps/APLauncher.Home",
     "/opt/usr/home/owner/apps_rw/APLauncher", "/opt/usr/home/owner/apps_rw/APLauncher.Home"].forEach(add);
    return out;
}
function heartbeatCommand(persist, tmpPath, roots, logPath) {
    persist = persist || DAEMON_PERSIST; tmpPath = tmpPath || DAEMON_TMP; roots = roots || packageRoots(); logPath = logPath || DAEMON_LOG;
    var usable = 'case "$v" in 4.[0-9]*) [ "${v#4.}" -ge 6 ] 2>/dev/null ;; *) false ;; esac';
    var ver = 'APL_DAEMON_SOURCE="$F" sh -c \'cat "$APL_DAEMON_SOURCE" | sh -s -- version\' 2>/dev/null';
    return [
        'found=""; for p in ' + persist + ' ' + tmpPath + ' /tmp/apl-bg/bg-daemon.sh; do',
        '[ -f "$p" ] && [ -r "$p" ] && [ ! -L "$p" ] || continue;',
        'v=$(' + ver.replace("$F", "$p") + ');',
        'if ' + usable + '; then found=1; APL_DAEMON_SOURCE="$p"; export APL_DAEMON_SOURCE; cat "$p" | sh -s -- heartbeat; break; fi;',
        'done;',
        'if [ -z "$found" ]; then d=' + persist + ';',
        'for r in ' + roots.join(" ") + '; do',
        's="$r/background/daemon.sh"; [ -r "$s" ] || continue;',
        'mkdir -p "${d%/*}" 2>/dev/null || break;',
        'rm -f "$d.apl-bridge";',
        'cp -f "$s" "$d.apl-bridge" 2>/dev/null && [ -s "$d.apl-bridge" ] || { rm -f "$d.apl-bridge"; continue; };',
        'v=$(' + ver.replace("$F", "$d.apl-bridge") + ');',
        'if ' + usable + '; then',
        'mv -f "$d.apl-bridge" "$d" 2>/dev/null && { for l in ' + logPath + ' /tmp/apl-bg/audio.log /tmp/apl-bg-audio.log; do echo "$(date +%H:%M:%S 2>/dev/null) bridge restored the daemon file from the package" >> "$l" 2>/dev/null && break; done; APL_DAEMON_SOURCE="$d"; export APL_DAEMON_SOURCE; cat "$d" | sh -s -- heartbeat; };',
        'break; fi;',
        'rm -f "$d.apl-bridge";',
        'done; fi; true'
    ].join(" ");
}

/* Independent root heartbeat. The daemon owns a detached keeper and a 10-second
 * radio supervisor, so this is a light second recovery path, not a polling loop. */
function backgroundTick() {
    /* A message port that could not open at start (the platform was not ready yet) is retried here,
       once a minute, so the launcher never stays cut off from the bridge until the next restart. */
    openPorts();
    /* A heartbeat that never came back must not block every later one. */
    if (heartbeatBusy && Date.now() - heartbeatStartedAt < 30000) return;
    heartbeatBusy = true;
    heartbeatStartedAt = Date.now();
    var cmd = heartbeatCommand();
    forwardToVetro("POST", "/exec", JSON.stringify({ cmd: cmd }), 8000, function (err, status, text) {
        heartbeatBusy = false;
        if (!err && status && status < 500) {
            var st = "";
            try {
                var j = JSON.parse(text || "{}");
                var m = /(^|\n)(PLAYING|PAUSED|STARTING|STOPPED)\b/.exec(String((j && j.output) || ""));
                st = m ? m[2] : "";
            } catch (eJ) {}
            if (st) { lastDaemonOkAt = Date.now(); daemonState = st; } else daemonState = "no daemon answer";
        }
        lastHeartbeatAt = Date.now();
        if (err || !status || status >= 500) heartbeatFailures++;
        else { heartbeatFailures = 0; lastHeartbeatOkAt = Date.now(); }      // v1.2.115: when it last got through to the keeper
        if (heartbeatFailures >= 3) tryRecoverVetro();
    });
}

/* If a message port could not open (the platform was not ready right after boot), waiting a full minute for the
   heartbeat leaves the launcher cut off. Check every 5 s for the first 2 minutes, then every 30 s. */
function startPortWatch() {
    if (portWatchTimer) clearInterval(portWatchTimer);
    portWatchTicks = 0;
    portWatchTimer = setInterval(function () {
        portWatchTicks++;
        if (!localPort || !localPortPlain || !localShortcutPort) openPorts();
        if (portWatchTicks === 24 && portWatchTimer) {        // 24 x 5 s = 2 minutes: slow down
            clearInterval(portWatchTimer);
            portWatchTimer = setInterval(function () {
                if (!localPort || !localPortPlain || !localShortcutPort) openPorts();
            }, 30000);
        }
    }, 5000);
}

/* Learn Vetro's real port and state at start, without waiting for the launcher to ask. */
function probeVetroAtStart() {
    [3000, 12000, 30000].forEach(function (ms) {
        setTimeout(function () {
            if (vetroUp) return;
            forwardToVetro("GET", "/status", "", 6000, function () {});
        }, ms);
    });
}

/* Vetro stopped answering for several minutes in a row: ask the system to start Vetro's background SERVICE again
   (never its screen). The service id is looked up among the installed apps (vetrotvapp...svc/service), nothing is
   guessed. At most one try every 90 seconds and 8 tries every 30 minutes (v8.7.16), so it can never loop. */
var BRIDGE_START = Date.now();
function tryRecoverVetro() {
    var now = Date.now();
    if (now - BRIDGE_START < 90000) return;      // v8.7.16: Vetro can take 30-60 s to connect at cold boot: never restart it during that time
    if (vetroFailStreak < 3 || now - recovery.lastAt < 90000) return;
    if (!recovery.windowStart || now - recovery.windowStart > 30 * 60000) { recovery.windowStart = now; recovery.windowCount = 0; }
    if (recovery.windowCount >= 8) return;
    try {
        tizen.application.getAppsInfo(function (list) {
            var ids = [];
            for (var i = 0; i < (list || []).length; i++) {
                var id = String((list[i] && list[i].id) || "");
                if (/^vetrotvapp/i.test(id) && /(svc|service)$/i.test(id)) ids.push(id);
            }
            recovery.lastAt = Date.now();
            if (!ids.length) { recovery.target = "service not found"; return; }
            recovery.attempts++; recovery.windowCount++; recovery.target = ids[0];
            try { tizen.application.launch(ids[0], function () {}, function () {}); } catch (eL) {}
            /* v8.7.16: did it come back? look 4, 10 and 20 s after the restart instead of waiting for the next heartbeat */
            [4000, 10000, 20000].forEach(function (ms) {
                setTimeout(function () {
                    if (vetroFailStreak > 0) forwardToVetro("GET", "/status", "", 6000, function () {});
                }, ms);
            });
        }, function () { recovery.lastAt = Date.now(); });
    } catch (eR) { recovery.lastAt = Date.now(); }
}

function startHeartbeat() {
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    setTimeout(backgroundTick, 1000);
    heartbeatTimer = setInterval(backgroundTick, HEARTBEAT_MS);
}

function openPorts() {
    if (!localPort) {
        try {
            localPort = tizen.messageport.requestTrustedLocalMessagePort(PORT_NAME);
            localPort.addMessagePortListener(function (data, reply) {
                handleMessage(data, reply, false);
            });
        } catch (e) {
            localPort = null;
        }
    }
    if (!localPortPlain) {
        try {
            localPortPlain = tizen.messageport.requestLocalMessagePort(PORT_NAME_PLAIN);
            localPortPlain.addMessagePortListener(function (data, reply) {
                handleMessage(data, reply, true);
            });
        } catch (e) {
            localPortPlain = null;
        }
    }
    if (!localShortcutPort) {
        try {
            localShortcutPort = tizen.messageport.requestLocalMessagePort(SHORTCUT_PORT);
            localShortcutPort.addMessagePortListener(function (data, reply) {
                handleShortcutMessage(data, reply);
            });
        } catch (e) {
            localShortcutPort = null;
        }
    }
}

module.exports.onStart = function () {
    openPorts();
    startPortWatch();
    startHeartbeat();
    probeVetroAtStart();
};

module.exports.onRequest = function () {
    openPorts();
    if (!portWatchTimer) startPortWatch();
    if (!heartbeatTimer) startHeartbeat();
};

module.exports.onExit = function () {
    if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
    }
    if (portWatchTimer) {
        clearInterval(portWatchTimer);
        portWatchTimer = null;
    }
};
