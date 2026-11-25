#!/bin/sh
# ============================================================
# APL Vetro Background Audio & Alert Supervisor Daemon (v4.11)
#   - Runs independently of the launcher UI through Vetro's root agent.
#   - Keeps the alert schedule and a detached root keeper alive across apps,
#     YouTube, Samsung TV+, IPTV and HDMI inputs.
#   - Uses PulseAudio's standard event role for Quran radio and alerts, then
#     re-binds them after every external foreground-app/source transition.
#   - Records compact, on-device diagnostics at each foreground audio handoff.
# ============================================================

DAEMON_VER="4.11"
trap '' HUP 2>/dev/null || true

export PATH="/usr/bin:/bin:/usr/sbin:/sbin:/usr/local/bin:$PATH"

# Tizen 6.5 User Execution Prevention refuses an unsigned shell file when it is
# passed to bash as a pathname, even after Vetro has written it as root. The
# daemon is deliberately loaded from its readable source through standard input
# to the signed system shell instead. Never execute $APL_DAEMON_SOURCE directly.
DAEMON_SOURCE="${APL_DAEMON_SOURCE:-/opt/usr/home/owner/APL/bg-daemon.sh}"
export APL_DAEMON_SOURCE="$DAEMON_SOURCE"
# v4.7: a file cannot carry a valid hash of itself (the old embedded SHA-256 never matched and blocked every
# spawn). Integrity is enforced OUTSIDE this file: the bridge/launcher refuse to pipe it unless it is a non-symlink
# owned by root ([ -O ], root is the effective uid). The same rule is re-checked here before every re-spawn.
verify_daemon_source() {
    if [ -L "$APL_DAEMON_SOURCE" ] || [ ! -r "$APL_DAEMON_SOURCE" ] || [ ! -f "$APL_DAEMON_SOURCE" ]; then
        type log_msg >/dev/null 2>&1 && log_msg "daemon source rejected (symlink, unreadable or missing): $APL_DAEMON_SOURCE"
        return 1
    fi
    return 0
}

# Radio URLs reach "sh -c" as root: allow only a plain http(s) URL without quotes, spaces, backticks, $ or backslashes.
valid_url() {
    case "$1" in http://?*|https://?*) ;; *) return 1 ;; esac
    case "$1" in *[!A-Za-z0-9._~:/?#@%+=,\&-]*) return 1 ;; esac
    return 0
}

daemon_pipe() {
    verify_daemon_source || return 1
    cat "$APL_DAEMON_SOURCE" | APL_DAEMON_SOURCE="$APL_DAEMON_SOURCE" sh -s -- "$@"
}

daemon_spawn() {
    verify_daemon_source || return 1
    # A POSIX shell function cannot be passed to setsid/nohup. Start a clean
    # signed /bin/sh, then feed it this same daemon source on stdin.
    if command -v setsid >/dev/null 2>&1; then
        setsid sh -c 'cat "$APL_DAEMON_SOURCE" | APL_DAEMON_SOURCE="$APL_DAEMON_SOURCE" sh -s -- "$@"' apl-daemon "$@" </dev/null >>"$LOGFILE" 2>&1 3>&- 4>&- 5>&- &
    else
        nohup sh -c 'cat "$APL_DAEMON_SOURCE" | APL_DAEMON_SOURCE="$APL_DAEMON_SOURCE" sh -s -- "$@"' apl-daemon "$@" </dev/null >>"$LOGFILE" 2>&1 3>&- 4>&- 5>&- &
    fi
}

# IMPORTANT FOR HDMI and external video apps:
#   1) Do NOT pin PULSE_SERVER globally. Foreground apps can replace the TV's
#      audio session; each GStreamer pipeline selects a freshly validated socket.
#   2) "notification" is not a standard PulseAudio media.role. Use the standard
#      event role for our alert-style stream, so the system policy can classify it
#      instead of silently treating it as ordinary background media.
unset PULSE_SERVER PULSE_RUNTIME_PATH 2>/dev/null || true
export PULSE_PROP="media.role=event application.name=APL_Launcher application.id=APLMusalla.Home"

setup_tls_env() {
    if [ -z "$XDG_RUNTIME_DIR" ] && [ -d /run ]; then
        export XDG_RUNTIME_DIR=/run
    fi
    for cert in /etc/ssl/certs/ca-certificates.crt /etc/pki/tls/certs/ca-bundle.crt /etc/ssl/cert.pem /etc/pki/tls/cert.pem; do
        if [ -f "$cert" ]; then
            export SSL_CERT_FILE="$cert"
            export CURL_CA_BUNDLE="$cert"
            export GTLS_SYSTEM_CA_FILE="$cert"
            break
        fi
    done
}
setup_tls_env

# Tizen builds put their Pulse socket in different per-user directories. Check the
# known locations first, then make one cheap fallback scan. This is only called by
# the detached supervisor / alert worker, never by the visible launcher UI.
pulse_socket_usable() {
    pdir="$1"
    [ -n "$pdir" ] && [ -S "$pdir/native" ] || return 1
    # A socket pathname may survive an app/source transition while its server
    # does not. When pactl is available, accept only the live session it can
    # actually query. Builds without pactl still let GStreamer test the socket.
    if command -v pactl >/dev/null 2>&1; then
        PULSE_RUNTIME_PATH="$pdir" PULSE_SERVER="unix:$pdir/native" pactl info >/dev/null 2>&1 || return 1
    fi
    return 0
}

# Tizen builds put their live Pulse socket in different per-user directories.
# Revalidate it on each route repair: YouTube and HDMI can recreate the session.
find_pulse_dir() {
    if [ -n "${APL_PULSE_DIR:-}" ] && pulse_socket_usable "$APL_PULSE_DIR"; then
        echo "$APL_PULSE_DIR"
        return 0
    fi
    for pdir in /run/user/*/pulse /var/run/user/*/pulse /run/pulse /var/run/pulse /tmp/pulse-* /home/*/.config/pulse; do
        if pulse_socket_usable "$pdir"; then
            APL_PULSE_DIR="$pdir"
            echo "$pdir"
            return 0
        fi
    done
    for sock in $(find /run /var/run /tmp -type s -path '*/pulse*/native' 2>/dev/null | head -n 12); do
        pdir=${sock%/native}
        if pulse_socket_usable "$pdir"; then
            APL_PULSE_DIR="$pdir"
            echo "$pdir"
            return 0
        fi
    done
    APL_PULSE_DIR=""
    return 1
}

# Keep our APL-owned event stream audible when a foreground app or HDMI transition
# changes the active sink. The APL name/role is set on every alert pipeline below,
# so this never changes the foreground app's own stream.
repair_pulse_streams() {
    command -v pactl >/dev/null 2>&1 || return 0
    pdir=$(find_pulse_dir) || return 0
    (
        export PULSE_RUNTIME_PATH="$pdir"
        export PULSE_SERVER="unix:$pdir/native"
        sink=$(pactl get-default-sink 2>/dev/null)
        [ -n "$sink" ] || sink=$(pactl info 2>/dev/null | awk -F': ' '/Default Sink:/{print $2; exit}')
        pactl list sink-inputs 2>/dev/null | awk '
            /^Sink Input #/ { sub(/#/, "", $3); id=$3; ours=0 }
            /media.name = "APL|application.name = "APL Launcher"|application.id = "APLMusalla.Home"|APL-Alert|APL Alert/ { ours=1 }
            /^$/ { if (id != "" && ours) print id; id="" }
            END { if (id != "" && ours) print id }
        ' | while read -r sid; do
            [ -n "$sid" ] || continue
            pactl set-sink-input-mute "$sid" 0 >/dev/null 2>&1
            pactl set-sink-input-volume "$sid" 100% >/dev/null 2>&1
            [ -n "$sink" ] && pactl move-sink-input "$sid" "$sink" >/dev/null 2>&1 || true
        done
    ) >/dev/null 2>&1 || true
}

unmute_pulse_streams() { repair_pulse_streams; }

# A compact view of only APL's Pulse stream. This deliberately does not dump the
# foreground app's media properties: the report is for routing state, not content.
pulse_stream_summary() {
    command -v pactl >/dev/null 2>&1 || { echo "PULSE_STREAM=pactl-missing"; return 0; }
    pdir=$(find_pulse_dir 2>/dev/null || echo "")
    [ -n "$pdir" ] || { echo "PULSE_STREAM=server-unavailable"; return 0; }
    PULSE_RUNTIME_PATH="$pdir" PULSE_SERVER="unix:$pdir/native" pactl list sink-inputs 2>/dev/null | awk '
        /^Sink Input #/ { emit(); id=$3; sub(/#/, "", id); sink="?"; cork="?"; mute="?"; role="?"; name="?"; app="?"; ours=0; seen=1 }
        /^[[:space:]]*Sink:/ { sink=$2 }
        /^[[:space:]]*Corked:/ { cork=$2 }
        /^[[:space:]]*Mute:/ { mute=$2 }
        /media.role =/ { role=$0; sub(/^.*media.role = "/, "", role); sub(/".*$/, "", role) }
        /media.name = "APL|application.name = "APL Launcher"|application.id = "APLMusalla.Home"/ { ours=1 }
        /media.name =/ { name=$0; sub(/^.*media.name = "/, "", name); sub(/".*$/, "", name) }
        /application.name =/ { app=$0; sub(/^.*application.name = "/, "", app); sub(/".*$/, "", app) }
        /^$/ { emit(); seen=0 }
        function emit() { if (seen && ours) { printf("APL_STREAM id=%s sink=%s corked=%s mute=%s role=%s name=%s app=%s\n", id, sink, cork, mute, role, name, app); found=1 } }
        END { emit(); if (!found) print "APL_STREAM=none" }
    '
}

# Pulse's full sink-input listing is expensive on several TV firmwares. The
# detached keeper, supervisor and bridge can all ask for a tick, so coalesce
# background maintenance without delaying an explicit source/alert repair.
repair_pulse_if_due() {
    now=$(date +%s 2>/dev/null || echo 0)
    prev=$(cat "$ROUTECHECK" 2>/dev/null)
    case "$now" in ''|*[!0-9]*) now=0 ;; esac
    case "$prev" in ''|*[!0-9]*) prev=0 ;; esac
    if [ "$now" -gt 0 ] && [ "$prev" -gt 0 ] && [ $((now - prev)) -lt 25 ]; then
        return 0
    fi
    [ "$now" -gt 0 ] && echo "$now" > "$ROUTECHECK" 2>/dev/null
    repair_pulse_streams
}

# Persistent state directory (survives /tmp cleanups and reboots)
DATADIR="/opt/usr/home/owner/APL/bg"
if ! mkdir -p "$DATADIR" 2>/dev/null; then
    DATADIR="/tmp/apl-bg-data"
    mkdir -p "$DATADIR" 2>/dev/null
fi
mkdir -p "$DATADIR/sounds/prayer" 2>/dev/null

# Secure runtime directory
RUNDIR=""
if [ -d /run ]; then
    mkdir -p /run/apl-bg 2>/dev/null
    chmod 755 /run/apl-bg 2>/dev/null
    if [ ! -L /run/apl-bg ] && [ -d /run/apl-bg ]; then
        RUNDIR="/run/apl-bg"
    fi
fi
if [ -z "$RUNDIR" ]; then
    mkdir -p /tmp/apl-bg 2>/dev/null
    chmod 755 /tmp/apl-bg 2>/dev/null
    if [ ! -L /tmp/apl-bg ] && [ -d /tmp/apl-bg ]; then
        RUNDIR="/tmp/apl-bg"
    fi
fi

PIDFILE="$RUNDIR/audio.pid"
URLFILE="$DATADIR/radio.url"
WANTFILE="$DATADIR/radio.want"
PAUSEFILE="$DATADIR/radio.paused"
SUPFILE="$RUNDIR/audio.sup"
LOCKDIR="$RUNDIR/audio.lock"
LOGFILE="$RUNDIR/audio.log"
PIPEFILE="$DATADIR/radio.pipe"
ROUTECHECK="$DATADIR/pulse-repair-at"
RETRYFILE="$RUNDIR/audio.retry"
BYTESFILE="$RUNDIR/audio.bytes"
STALLFILE="$RUNDIR/audio.stall"
HDMIFILE="$RUNDIR/audio.in_hdmi"
HDMINUDGE="$RUNDIR/audio.hdmi_nudge"
FOREGROUNDFILE="$DATADIR/foreground-app"

ALERTLOCK="$RUNDIR/alert.lock"
ALERTPID="$RUNDIR/alert.pid"
ALERTPLAYPID="$RUNDIR/alert.play.pid"
KEEPERPID="$DATADIR/alert-keeper.pid"
KEEPERLOCK="$RUNDIR/alert-keeper.lock"
KEEPERBEAT="$DATADIR/alert-keeper.beat"
PRAYERSCHED="$DATADIR/prayer-schedule.tsv"
TASKSCHED="$DATADIR/task-schedule.tsv"
ALERTCFG="$DATADIR/alert-config.env"
FIREDFILE="$DATADIR/alerts-fired.log"
LASTPRAYER="$DATADIR/last-prayer-fired"
LASTTASK="$DATADIR/last-task-fired"
WGTDIRCACHE="$DATADIR/wgt-root"
REMAPTABLE="$DATADIR/remap-table.tsv"
REMAPLOCK="$RUNDIR/remap.lock"
REMAPPID="$DATADIR/remap-watcher.pid"

FALLBACK_URLS="https://radio.xecod.com/station/quran-cairo https://backup.qurango.net/radio/tarateel"
PIPELINE_TOTAL=4
# A late wake after a heavy HDMI/app transition still gets a chance to play.
ALERT_GRACE=600

# Do not protect root-side player/keeper processes from the OOM killer. On a
# memory-constrained TV, protecting a GStreamer child can make WebRuntime (the
# visible launcher) the process that gets reclaimed instead.
protect_oom() { :; }

log_msg() {
    if [ -f "$LOGFILE" ]; then
        sz=$(wc -c < "$LOGFILE" 2>/dev/null || echo 0)
        case "$sz" in ''|*[!0-9]*) sz=0 ;; esac
        if [ "$sz" -gt 32768 ]; then
            tail -n 80 "$LOGFILE" > "$LOGFILE.tmp" 2>/dev/null && mv "$LOGFILE.tmp" "$LOGFILE" 2>/dev/null
        fi
    fi
    printf '%s %s\n' "$(date '+%H:%M:%S' 2>/dev/null || echo '--')" "$1" >> "$LOGFILE" 2>/dev/null
}

alive() {
    [ -n "$1" ] && kill -0 "$1" 2>/dev/null
}

running_pid() {
    if [ -f "$PIDFILE" ]; then
        pid=$(cat "$PIDFILE" 2>/dev/null)
        if alive "$pid"; then
            echo "$pid"
            return 0
        fi
    fi
    return 1
}

player_bin() {
    if command -v gst-launch-1.0 >/dev/null 2>&1; then echo "gst-launch-1.0"; return 0; fi
    if command -v gst-launch >/dev/null 2>&1; then echo "gst-launch"; return 0; fi
    echo ""
    return 1
}

has_curl() {
    command -v curl >/dev/null 2>&1
}

wanted() { [ -f "$WANTFILE" ]; }
paused() { [ -f "$PAUSEFILE" ]; }

is_hdmi_fg() {
    fg=""
    if [ "${FGSNAP_SET:-0}" = "1" ]; then
        fg="$FGSNAP"
    elif command -v vconftool >/dev/null 2>&1; then
        fg=$(vconftool get memory/appfw/current_fullscreen_appid 2>/dev/null)
    fi
    case "$fg" in
        *tv-viewer*|*tvviewer*|*live-tv*|*live_tv*|*source*) return 0 ;;
    esac
    return 1
}

load_alert_cfg() {
    PRAYER_ALERTS=1
    TASK_ALERTS=1
    PAUSE_RADIO=1
    ALERT_VOL="0.92"
    if [ -f "$ALERTCFG" ]; then
        while IFS='=' read -r k v; do
            case "$k" in
                PRAYER_ALERTS) PRAYER_ALERTS="$v" ;;
                TASK_ALERTS)   TASK_ALERTS="$v" ;;
                PAUSE_RADIO)   PAUSE_RADIO="$v" ;;
                ALERT_VOL)     ALERT_VOL="$v" ;;
            esac
        done < "$ALERTCFG"
    fi
}

supervise_needed() {
    [ -s "$REMAPTABLE" ] && return 0
    if wanted || paused; then return 0; fi
    load_alert_cfg
    if [ "$PRAYER_ALERTS" = "1" ] && [ -s "$PRAYERSCHED" ]; then return 0; fi
    if [ "$TASK_ALERTS" = "1" ] && [ -s "$TASKSCHED" ]; then return 0; fi
    return 1
}

# Unlike the old supervisor, this keeper stays alive while either class of alert
# is enabled even if a schedule was briefly empty during a refresh. It is a root
# process, detached from the WGT WebView, so suspension behind another app cannot
# stop the alert clock. The bridge heartbeat can also recreate it if firmware
# reclaims a background process.
keeper_needed() {
    [ -s "$REMAPTABLE" ] && return 0
    if wanted || paused; then return 0; fi
    load_alert_cfg
    [ "$PRAYER_ALERTS" = "1" ] || [ "$TASK_ALERTS" = "1" ]
}

remap_loop() {
    protect_oom
    echo $$ > "$REMAPPID"
    log_msg "remap supervisor started pid=$$"
    last_fg=""
    while [ -s "$REMAPTABLE" ]; do
        fg=$(vconftool get memory/appfw/current_fullscreen_appid 2>/dev/null)
        case "$fg" in
            ''|*Error*|*error*)
                fg=$(vconftool get memory/appfw/foreground_appid 2>/dev/null)
                ;;
        esac
        case "$fg" in
            ''|*Error*|*error*) ;;
            "$last_fg") ;;
            *APLMusalla*|*APLauncher*)
                last_fg="$fg"
                ;;
            *)
                last_fg="$fg"
                target=$(awk -v app="$fg" '
                    $1 != "" && $2 != "" {
                        if (index(app, $1) > 0 || index($1, app) > 0) {
                            print $2;
                            exit;
                        }
                    }
                ' "$REMAPTABLE" 2>/dev/null)
                if [ -n "$target" ] && [ "$target" != "none" ] && [ "$target" != "$fg" ]; then
                    log_msg "remap intercepted $fg -> launching $target"
                    pkg=$(awk -v app="$fg" '$1 != "" && (index(app, $1) > 0 || index($1, app) > 0) { print $1; exit }' "$REMAPTABLE" 2>/dev/null)
                    [ -n "$pkg" ] && /usr/bin/app_launcher -k "$pkg" >/dev/null 2>&1 || true
                    /usr/bin/app_launcher -s "$target" >/dev/null 2>&1 || true
                    sleep 1
                    last_fg=""
                fi
                ;;
        esac
        busybox usleep 300000 2>/dev/null || usleep 300000 2>/dev/null || sleep 0.3 2>/dev/null || sleep 1
    done
    rm -f "$REMAPPID"
    rmdir "$REMAPLOCK" 2>/dev/null || true
    log_msg "remap supervisor stopped (no rules)"
    exit 0
}

start_remap_watcher() {
    [ -s "$REMAPTABLE" ] || return 0
    rp=$(cat "$REMAPPID" 2>/dev/null)
    if [ -n "$rp" ] && alive "$rp"; then return 0; fi
    rm -rf "$REMAPLOCK" 2>/dev/null
    daemon_spawn _remap_watcher
    rp=$!
    echo "$rp" > "$REMAPPID" 2>/dev/null || true
    return 0
}

keeper_alive() {
    kp=$(cat "$KEEPERPID" 2>/dev/null)
    alive "$kp"
}

group_has_player() {
    grp="$1"
    [ -n "$grp" ] || return 1
    for st in /proc/[0-9]*/stat; do
        [ -r "$st" ] || continue
        line=$(cat "$st" 2>/dev/null) || continue
        after=${line#*)}
        set -- $after
        pgrp="$3"
        if [ "$pgrp" = "$grp" ]; then
            case "$line" in
                *gst-launch*|*ffplay*|*ffmpeg*|*mpg123*|*paplay*|*aplay*)
                    return 0
                    ;;
            esac
        fi
    done
    alive "$grp"
}

group_bytes() {
    grp="$1"
    total=0
    has_io=0
    for st in /proc/[0-9]*/stat; do
        [ -r "$st" ] || continue
        line=$(cat "$st" 2>/dev/null) || continue
        p=${st#/proc/}
        p=${p%/stat}
        after=${line#*)}
        set -- $after
        if [ "$3" = "$grp" ] && [ -r "/proc/$p/io" ]; then
            has_io=1
            rb=$(awk '/^rchar:/{print $2}' "/proc/$p/io" 2>/dev/null)
            case "$rb" in ''|*[!0-9]*) rb=0 ;; esac
            total=$((total + rb))
        fi
    done
    if [ "$has_io" = "0" ]; then
        echo "-1"
    else
        echo "$total"
    fi
}

kill_group() {
    pid="$1"
    if [ -n "$pid" ]; then
        kill -TERM "-$pid" 2>/dev/null || kill -TERM -- "-$pid" 2>/dev/null || kill -TERM "$pid" 2>/dev/null
        i=0
        while alive "$pid" && [ $i -lt 5 ]; do sleep 1; i=$((i + 1)); done
        if alive "$pid"; then
            kill -KILL "-$pid" 2>/dev/null || kill -KILL -- "-$pid" 2>/dev/null || kill -KILL "$pid" 2>/dev/null
            sleep 1
        fi
    fi
}

kill_player() {
    pid=$(running_pid)
    [ -n "$pid" ] && kill_group "$pid"
    pkill -9 -f 'gst-launch.*(radio|quran|station)' 2>/dev/null || true
    pkill -9 -f 'pacat.*APL' 2>/dev/null || true
    pkill -9 -f 'curl.*(quran-cairo|radiojar)' 2>/dev/null || true
    rm -f "$PIDFILE" "$BYTESFILE" "$STALLFILE" "$PIPEFILE"
}

advance_pipeline() {
    n="$1"; total="$2"
    case "$n" in ''|*[!0-9]*) n=0 ;; esac
    case "$total" in ''|*[!0-9]*|0) total=1 ;; esac
    echo $(( (n + 1) % total )) > "$PIPEFILE" 2>/dev/null
}

# ---------------------------------------------------------------- radio pipelines (Pulse only; strictly no ALSA hijacking)

pipe_cmd() {
    bin="$1"; url="$2"; nth="$3"
    pdir=$(find_pulse_dir 2>/dev/null || echo "")
    penv=""
    if [ -n "$pdir" ]; then
        penv="PULSE_RUNTIME_PATH='$pdir' PULSE_SERVER='unix:$pdir/native' PULSE_PROP='media.role=event application.name=APL_Launcher application.id=APLMusalla.Home'"
    fi
    pprops="props,media.role=event,media.name=APL Quran Radio,application.name=APL Launcher,application.id=APLMusalla.Home"
    case "$nth" in
        0) echo "$penv $bin -q playbin uri='$url' audio-sink='pulsesink stream-properties=\\\"$pprops\\\"'" ;;
        1) echo "$penv $bin -q playbin uri='$url' audio-sink=pulsesink" ;;
        2) echo "$penv $bin -q playbin uri='$url' audio-sink='audioconvert ! audioresample ! pulsesink'" ;;
        3) echo "$penv $bin -q playbin uri='$url'" ;;
        *) echo "" ;;
    esac
}

snapshot_radio_route() {
    pdir=$(find_pulse_dir 2>/dev/null || echo "")
    {
        echo "AUDIO_SNAPSHOT after-radio-spawn"
        echo "PULSE=${pdir:-none}"
        pulse_stream_summary
    } >> "$LOGFILE" 2>/dev/null
}

try_url_pipelines() {
    bin="$1"; turl="$2"; start_at="$3"
    total_pipes=$PIPELINE_TOTAL
    has_curl || total_pipes=6
    tried=0
    while [ "$tried" -lt "$total_pipes" ]; do
        nth=$(( (start_at + tried) % total_pipes ))
        cmd=$(pipe_cmd "$bin" "$turl" "$nth")
        if [ -n "$cmd" ]; then
            if command -v setsid >/dev/null 2>&1; then
                setsid sh -c "export PULSE_PROP='media.role=event application.name=APL_Launcher application.id=APLMusalla.Home'; $cmd" </dev/null >>"$LOGFILE" 2>&1 3>&- 4>&- 5>&- &
            else
                nohup sh -c "export PULSE_PROP='media.role=event application.name=APL_Launcher application.id=APLMusalla.Home'; $cmd" </dev/null >>"$LOGFILE" 2>&1 3>&- 4>&- 5>&- &
            fi
            newpid=$!
            echo "$newpid" > "$PIDFILE"
            sleep 2
            if alive "$newpid" && group_has_player "$newpid"; then
                case "$nth" in
                    0|1|2|3|4|5|6)
                        # PulseSink can leave a gst-launch process alive even after
                        # its server terminates the stream. Wait briefly for the
                        # named sink input before declaring this route playable.
                        psok=0
                        j=0
                        while [ "$j" -lt 3 ]; do
                            if radio_pulse_stream_present; then psok=1; break; fi
                            sleep 1
                            j=$((j + 1))
                        done
                        if [ "$psok" != "1" ]; then
                            log_msg "radio Pulse route $nth has no sink input; trying fallback"
                            kill_group "$newpid"
                            rm -f "$PIDFILE"
                            tried=$((tried + 1))
                            continue
                        fi
                        ;;
                esac
                unmute_pulse_streams
                echo "$nth" > "$PIPEFILE"
                rm -f "$RETRYFILE" "$BYTESFILE" "$STALLFILE"
                log_msg "radio playing pid=$newpid pipe=$nth url=$turl"
                # The process being alive is insufficient evidence of audible
                # output. Capture the actual Pulse sink-input state shortly after.
                ( sleep 3; snapshot_radio_route ) >/dev/null 2>&1 &
                echo "PLAYING $newpid $turl"
                return 0
            fi
            kill_group "$newpid"
            rm -f "$PIDFILE"
        fi
        tried=$((tried + 1))
    done
    return 1
}

spawn_player() {
    url="$1"
    [ -n "$url" ] || url=$(cat "$URLFILE" 2>/dev/null)
    [ -n "$url" ] || { echo "NOURL"; return 1; }
    valid_url "$url" || { echo "BADURL"; return 1; }
    bin=$(player_bin)
    [ -n "$bin" ] || { echo "NOGST"; return 1; }

    start_at=$(cat "$PIPEFILE" 2>/dev/null)
    case "$start_at" in ''|*[!0-9]*) start_at=0 ;; esac

    if try_url_pipelines "$bin" "$url" "$start_at"; then
        return 0
    fi

    for fb in $FALLBACK_URLS; do
        [ "$fb" = "$url" ] && continue
        if try_url_pipelines "$bin" "$fb" 0; then
            return 0
        fi
    done

    rm -f "$PIPEFILE"
    log_msg "radio spawn failed for $url"
    echo "FAILED"
    return 1
}

radio_pulse_stream_present() {
    command -v pactl >/dev/null 2>&1 || return 0
    pdir=$(find_pulse_dir 2>/dev/null || echo "")
    # If the active server cannot be queried, leave GStreamer to report a
    # genuine failure; a missing name alone must not cause a restart loop.
    [ -n "$pdir" ] || return 0
    PULSE_RUNTIME_PATH="$pdir" PULSE_SERVER="unix:$pdir/native" \
        pactl list sink-inputs 2>/dev/null | grep -Eq 'APL Quran Radio|application.name = "APL Launcher"|application.id = "APLMusalla.Home"'
}

check_radio_health() {
    pid=$(running_pid)
    if [ -z "$pid" ]; then
        return 1
    fi
    if ! group_has_player "$pid"; then
        log_msg "player child exited in group $pid; advancing route"
        advance_pipeline "$(cat "$PIPEFILE" 2>/dev/null)" "$PIPELINE_TOTAL"
        kill_player
        return 1
    fi
    route=$(cat "$PIPEFILE" 2>/dev/null)
    case "$route" in
        0|1|2|3)
            if ! radio_pulse_stream_present; then
                log_msg "radio Pulse stream vanished; advancing route"
                advance_pipeline "$route" "$PIPELINE_TOTAL"
                kill_player
                return 1
            fi
            ;;
    esac
    repair_pulse_if_due
    b=$(group_bytes "$pid")
    if [ "$b" != "-1" ]; then
        prev=$(cat "$BYTESFILE" 2>/dev/null)
        echo "$b" > "$BYTESFILE"
        if [ -n "$prev" ] && [ "$b" = "$prev" ]; then
            st=$(cat "$STALLFILE" 2>/dev/null)
            case "$st" in ''|*[!0-9]*) st=0 ;; esac
            st=$((st + 1))
            echo "$st" > "$STALLFILE"
            if [ "$st" -ge 2 ]; then
                log_msg "radio stalled ($st checks, bytes=$b), advancing route & restarting"
                advance_pipeline "$(cat "$PIPEFILE" 2>/dev/null)" "$PIPELINE_TOTAL"
                kill_player
                return 1
            fi
        else
            rm -f "$STALLFILE"
        fi
    fi
    return 0
}

# A Samsung TV can keep a Pulse client process alive but revoke its audible
# route when *any* external video app acquires the foreground—not only HDMI.
# Save the raw vconf value because its exact formatting varies by firmware.
foreground_app_read() {
    command -v vconftool >/dev/null 2>&1 || return 1
    for key in memory/appfw/current_fullscreen_appid memory/appfw/current_appid memory/appfw/foreground_appid; do
        value=$(vconftool get "$key" 2>/dev/null)
        case "$value" in ''|*Error*|*error*) continue ;; esac
        printf '%s' "$value" | tr '\r\n' ' '
        return 0
    done
    return 1
}

# v4.9: the supervisor reads the foreground app ONCE per tick (FGSNAP) and every check in that tick reuses it,
# instead of forking vconftool two or three times per tick. Outside the supervisor loop nothing is cached.
foreground_app() {
    if [ "${FGSNAP_SET:-0}" = "1" ]; then
        [ -n "$FGSNAP" ] || return 1
        printf '%s' "$FGSNAP"
        return 0
    fi
    foreground_app_read
}

is_apl_foreground() {
    case "$1" in *APLMusalla*|*APLauncher*|*apl-launcher*) return 0 ;; esac
    return 1
}

audio_snapshot() {
    tag="$1"
    {
        printf '%s AUDIO_SNAPSHOT %s\n' "$(date '+%H:%M:%S' 2>/dev/null || echo '--')" "$tag"
        printf 'FOREGROUND=%s\n' "$(foreground_app 2>/dev/null || echo unavailable)"
        printf 'RADIO wanted=%s paused=%s pid=%s pipe=%s\n' \
            "$(wanted && echo yes || echo no)" "$(paused && echo yes || echo no)" \
            "$(running_pid 2>/dev/null || echo none)" "$(cat "$PIPEFILE" 2>/dev/null || echo none)"
        pulse_stream_summary
    } >> "$LOGFILE" 2>/dev/null
}

rebind_radio_after_foreground_change() {
    # Let the TV finish its output/device change before creating a new event
    # stream. Recreating the client is required because an uncork/move does not
    # revive a stream attached to the previous foreground audio session.
    sleep 2
    repair_pulse_streams
    check_all_schedules
    if wanted && ! paused && [ ! -d "$ALERTLOCK" ]; then
        rm -f "$PIPEFILE"
        kill_player >/dev/null 2>&1
        spawn_player "$(cat "$URLFILE" 2>/dev/null)" >/dev/null 2>&1
        repair_pulse_streams
    fi
}

check_foreground_transition() {
    APL_FG_REBOUND=0
    now_fg=$(foreground_app 2>/dev/null || echo "")
    [ -n "$now_fg" ] || return 0
    # Check remapped apps table
    if [ -f "$DATADIR/remap-table.tsv" ]; then
        for fg_part in $now_fg; do
            target_app=$(awk -v app="$fg_part" '$1 == app { print $2; exit }' "$DATADIR/remap-table.tsv" 2>/dev/null)
            if [ -n "$target_app" ] && [ "$target_app" != "none" ]; then
                log_msg "foreground transition: intercepted $fg_part -> launching $target_app"
                /usr/bin/app_launcher -k "$fg_part" >/dev/null 2>&1 || true
                /usr/bin/app_launcher -s "$target_app" >/dev/null 2>&1 || true
                return 0
            fi
        done
    fi
    prev_fg=$(cat "$FOREGROUNDFILE" 2>/dev/null)
    [ "$now_fg" = "$prev_fg" ] && return 0
    printf '%s\n' "$now_fg" > "$FOREGROUNDFILE" 2>/dev/null
    # First observation merely establishes the baseline. The next external app
    # change does the actual recovery.
    [ -n "$prev_fg" ] || return 0
    if is_apl_foreground "$now_fg"; then
        log_msg "foreground returned to launcher"
        repair_pulse_streams
        return 0
    fi
    # When an external media app (YouTube, Netflix, etc.) opens, yield audio to avoid conflicts
    if wanted; then
        log_msg "external app in foreground ($now_fg); yielding audio to prevent conflicts"
        kill_player >/dev/null 2>&1
    fi
}

# Detect transition into HDMI (org.tizen.tv-viewer) or explicit HDMI recovery nudge
check_hdmi_transition() {
    prev_hdmi=$(cat "$HDMIFILE" 2>/dev/null)
    [ -z "$prev_hdmi" ] && prev_hdmi="0"
    now_hdmi="0"
    if is_hdmi_fg; then
        now_hdmi="1"
    fi
    nudge="0"
    if [ -f "$HDMINUDGE" ]; then
        rm -f "$HDMINUDGE"
        nudge="1"
    fi
    echo "$now_hdmi" > "$HDMIFILE"

    # Entered HDMI just now (or explicit switchSource nudge): wait for AVOC hardware
    # audio routing to settle, unmute streams, and re-bind radio cleanly onto post-HDMI mixer
    if { [ "$now_hdmi" = "1" ] && [ "$prev_hdmi" = "0" ]; } || [ "$nudge" = "1" ]; then
        if [ "${APL_FG_REBOUND:-0}" = "1" ]; then
            log_msg "HDMI transition already recovered by foreground watcher"
        else
            log_msg "HDMI transition detected (now=$now_hdmi nudge=$nudge) — settling audio route"
            rebind_radio_after_foreground_change
        fi
    elif [ "$now_hdmi" = "0" ] && [ "$prev_hdmi" = "1" ]; then
        log_msg "Returned from HDMI — verifying audio route"
        unmute_pulse_streams
    fi
}

# ---------------------------------------------------------------- prayer & task alerts

find_wgt_root() {
    if [ -f "$WGTDIRCACHE" ]; then
        cached=$(cat "$WGTDIRCACHE" 2>/dev/null)
        if [ -n "$cached" ] && { [ -f "$cached/sounds/prayer/isha.wav" ] || [ -f "$cached/sounds/prayer/isha.mp3" ]; }; then
            echo "$cached"
            return 0
        fi
    fi
    for d in \
        "$DATADIR" \
        "/opt/usr/home/owner/apps_rw/APLMusalla/res/wgt" \
        "/opt/usr/home/owner/apps_rw/APLMusalla.Home/res/wgt" \
        "/home/owner/apps_rw/APLMusalla/res/wgt" \
        "/home/owner/apps_rw/APLMusalla.Home/res/wgt" \
        "/opt/usr/apps/APLMusalla/res/wgt" \
        "/opt/usr/apps/APLMusalla.Home/res/wgt" \
        "/usr/apps/APLMusalla/res/wgt" \
        "/usr/apps/APLMusalla.Home/res/wgt" \
        "/opt/usr/apps/APLMusalla" \
        "/opt/usr/apps/APLMusalla.Home" \
        "/opt/usr/home/owner/apps_rw/APLMusalla" \
        "/opt/usr/home/owner/apps_rw/APLMusalla.Home" \
        "/home/owner/apps_rw/APLMusalla" \
        "/home/owner/apps_rw/APLMusalla.Home" \
        "/home/owner/share/APLMusalla" \
        "/home/owner/share/APLMusalla.Home"
    do
        if [ -f "$d/sounds/prayer/isha.wav" ] || [ -f "$d/sounds/prayer/isha.mp3" ]; then
            echo "$d" > "$WGTDIRCACHE" 2>/dev/null
            echo "$d"
            return 0
        fi
    done
    found=$(find /opt /usr /home -maxdepth 14 -name "isha.wav" 2>/dev/null | grep -v "$DATADIR" | head -n 1)
    [ -n "$found" ] || found=$(find /opt /usr /home -maxdepth 14 -name "isha.wav" 2>/dev/null | grep -v "$DATADIR" | head -n 1)
    if [ -n "$found" ]; then
        root=${found%/sounds/prayer/isha.*}
        echo "$root" > "$WGTDIRCACHE" 2>/dev/null
        echo "$root"
        return 0
    fi
    echo ""
    return 1
}

find_real_wgt_root() {
    if [ -f "$WGTDIRCACHE" ]; then
        cached=$(cat "$WGTDIRCACHE" 2>/dev/null)
        if [ -n "$cached" ] && [ -f "$cached/sounds/prayer/isha.wav" ]; then
            echo "$cached"
            return 0
        fi
    fi
    for d in \
        "/opt/usr/home/owner/apps_rw/APLMusalla/res/wgt" \
        "/opt/usr/home/owner/apps_rw/APLMusalla.Home/res/wgt" \
        "/home/owner/apps_rw/APLMusalla/res/wgt" \
        "/home/owner/apps_rw/APLMusalla.Home/res/wgt" \
        "/opt/usr/apps/APLMusalla/res/wgt" \
        "/opt/usr/apps/APLMusalla.Home/res/wgt" \
        "/usr/apps/APLMusalla/res/wgt" \
        "/usr/apps/APLMusalla.Home/res/wgt" \
        "/opt/usr/apps/APLMusalla" \
        "/opt/usr/apps/APLMusalla.Home" \
        "/opt/usr/home/owner/apps_rw/APLMusalla" \
        "/opt/usr/home/owner/apps_rw/APLMusalla.Home" \
        "/home/owner/apps_rw/APLMusalla" \
        "/home/owner/apps_rw/APLMusalla.Home" \
        "/home/owner/share/APLMusalla" \
        "/home/owner/share/APLMusalla.Home"
    do
        if [ -f "$d/sounds/prayer/isha.wav" ]; then
            echo "$d" > "$WGTDIRCACHE" 2>/dev/null
            echo "$d"
            return 0
        fi
    done
    found=$(find /opt /usr /home -maxdepth 14 -path "*/sounds/prayer/isha.wav" 2>/dev/null | grep -v "$DATADIR" | head -n 1)
    if [ -n "$found" ]; then
        root="${found%/sounds/prayer/isha.wav}"
        echo "$root" > "$WGTDIRCACHE" 2>/dev/null
        echo "$root"
        return 0
    fi
    echo ""
    return 1
}

find_sound_file() {
    key="$1"
    case "$key" in
        fajr|dhuhr|asr|maghrib|isha)
            for ext in wav mp3; do
                rel="sounds/prayer/$key.$ext"
                if [ -f "$DATADIR/$rel" ]; then echo "$DATADIR/$rel"; return 0; fi
                root=$(find_wgt_root)
                if [ -n "$root" ] && [ -f "$root/$rel" ]; then echo "$root/$rel"; return 0; fi
            done
            ;;
        ramadan-cannon|cannon)
            rel="sounds/ramadan-cannon.wav"
            if [ -f "$DATADIR/$rel" ]; then echo "$DATADIR/$rel"; return 0; fi
            root=$(find_wgt_root)
            if [ -n "$root" ] && [ -f "$root/$rel" ]; then echo "$root/$rel"; return 0; fi
            # v4.11: the exact package folder the launcher wrote down, then the real package folders, then a search by name
            root=$(cat "$DATADIR/wgt-root" 2>/dev/null)
            if [ -n "$root" ] && [ -f "$root/$rel" ]; then echo "$root/$rel"; return 0; fi
            root=$(find_real_wgt_root)
            if [ -n "$root" ] && [ -f "$root/$rel" ]; then echo "$root/$rel"; return 0; fi
            found=$(find /opt /usr /home -maxdepth 14 -name ramadan-cannon.wav -path "*/sounds/*" 2>/dev/null | grep -v "$DATADIR" | head -n 1)
            if [ -n "$found" ] && [ -f "$found" ]; then echo "$found"; return 0; fi
            ;;
        task)
            rel="sounds/task-alert.wav"
            if [ -f "$DATADIR/$rel" ]; then echo "$DATADIR/$rel"; return 0; fi
            root=$(find_wgt_root)
            if [ -n "$root" ] && [ -f "$root/$rel" ]; then echo "$root/$rel"; return 0; fi
            ;;
        *)
            for ext in wav mp3; do
                rel="sounds/prayer/isha.$ext"
                if [ -f "$DATADIR/$rel" ]; then echo "$DATADIR/$rel"; return 0; fi
                root=$(find_wgt_root)
                if [ -n "$root" ] && [ -f "$root/$rel" ]; then echo "$root/$rel"; return 0; fi
            done
            ;;
    esac
    echo ""
    return 1
}

run_single_alert_cmd() {
    cmd="$1"
    attempt="$LOGFILE.alert.$$"
    rm -f "$attempt"
    if command -v setsid >/dev/null 2>&1; then
        setsid sh -c "export PULSE_PROP='media.role=event application.name=APL_Launcher application.id=APLMusalla.Home'; exec $cmd" </dev/null >>"$attempt" 2>&1 &
    else
        sh -c "export PULSE_PROP='media.role=event application.name=APL_Launcher application.id=APLMusalla.Home'; exec $cmd" </dev/null >>"$attempt" 2>&1 &
    fi
    apid=$!
    # ALERTPID belongs to the worker. Keeping the two PIDs separate prevents a
    # second scheduled event from racing in while the worker is between routes.
    echo "$apid" > "$ALERTPLAYPID"
    ( sleep 1; repair_pulse_streams; sleep 2; repair_pulse_streams ) >/dev/null 2>&1 &
    ( sleep 28; if kill -0 "$apid" 2>/dev/null; then kill -TERM "-$apid" 2>/dev/null || kill -TERM "$apid" 2>/dev/null; fi ) >/dev/null 2>&1 &
    wd=$!
    wait "$apid" 2>/dev/null
    rc=$?
    kill "$wd" 2>/dev/null
    cat "$attempt" >> "$LOGFILE" 2>/dev/null
    if grep -Eqi 'ERROR:|Failed to|doesn.t want to preroll|Connection terminated|GStreamer-CRITICAL' "$attempt" 2>/dev/null; then
        rc=1
    fi
    rm -f "$attempt" "$ALERTPLAYPID"
    return "$rc"
}

play_pulse_sample() {
    wav="$1"
    pdir=$(find_pulse_dir 2>/dev/null || echo "")
    [ -n "$pdir" ] && [ -f "$wav" ] || return 1
    sample="apl-alert-$$"
    penv="PULSE_RUNTIME_PATH='$pdir' PULSE_SERVER='unix:$pdir/native'"
    # Unmute and set default sink volume if possible
    sink=$(PULSE_RUNTIME_PATH="$pdir" PULSE_SERVER="unix:$pdir/native" pactl get-default-sink 2>/dev/null)
    [ -n "$sink" ] || sink=$(PULSE_RUNTIME_PATH="$pdir" PULSE_SERVER="unix:$pdir/native" pactl info 2>/dev/null | awk -F': ' '/Default Sink:/{print $2; exit}')
    if [ -n "$sink" ]; then
        sh -c "$penv pactl set-sink-mute '$sink' 0" >/dev/null 2>&1 || true
        sh -c "$penv pactl set-sink-volume '$sink' 100%" >/dev/null 2>&1 || true
    fi
    sh -c "$penv pactl upload-sample '$wav' '$sample'" >>"$LOGFILE" 2>&1 || return 1
    if [ -n "$sink" ]; then
        sh -c "$penv pactl play-sample '$sample' '$sink'" >>"$LOGFILE" 2>&1 || sh -c "$penv pactl play-sample '$sample'" >>"$LOGFILE" 2>&1 || {
            sh -c "$penv pactl remove-sample '$sample'" >/dev/null 2>&1
            return 1
        }
    else
        sh -c "$penv pactl play-sample '$sample'" >>"$LOGFILE" 2>&1 || {
            sh -c "$penv pactl remove-sample '$sample'" >/dev/null 2>&1
            return 1
        }
    fi
    # v4.11: wait for the whole sound (16-bit mono 22050 Hz is about 44100 bytes a second), not a fixed 6 s that cut the cannon
    bytes=$(wc -c < "$wav" 2>/dev/null | tr -dc '0-9'); [ -n "$bytes" ] || bytes=0
    secs=$((bytes / 40000 + 2)); [ "$secs" -lt 6 ] && secs=6; [ "$secs" -gt 25 ] && secs=25
    sleep "$secs"
    sh -c "$penv pactl remove-sample '$sample'" >/dev/null 2>&1 || true
    return 0
}

play_file_blocking() {
    sfile="$1"; vol="$2"
    bin=$(player_bin)
    [ -z "$vol" ] && vol="0.92"
    pdir=$(find_pulse_dir 2>/dev/null || echo "")

    if [ -n "$bin" ]; then
        # Prefer the verified Pulse server for the bundled PCM chime. Direct
        # ALSA is busy on this TV and GStreamer PulseSink is terminated.
        # v4.5: a prayer key plays its own adhan PCM wav (the TV cannot decode
        # MP3 in the background); anything else keeps the task chime.
        wav=""
        case "$key" in
            fajr|dhuhr|asr|maghrib|isha)
                wav="$DATADIR/sounds/prayer/$key.wav"
                if [ ! -f "$wav" ]; then
                    wroot=$(find_real_wgt_root)
                    if [ -n "$wroot" ] && [ -f "$wroot/sounds/prayer/$key.wav" ]; then wav="$wroot/sounds/prayer/$key.wav"; else wav=""; fi
                fi
                ;;
            ramadan-cannon|cannon)
                # v4.11: the same lookup as the worker (find_sound_file), and NEVER the task chime for the cannon:
                # if the file cannot be found, say so in the log and stay silent instead of playing the wrong sound.
                wav="$(find_sound_file ramadan-cannon)"
                if [ -z "$wav" ] || [ ! -f "$wav" ]; then
                    log_msg "cannon wav NOT FOUND (DATADIR=$DATADIR wgt-root=$(cat "$DATADIR/wgt-root" 2>/dev/null))"
                    return 1
                fi
                log_msg "cannon wav: $wav ($(wc -c < "$wav" 2>/dev/null) bytes)"
                ;;
        esac
        if [ -z "$wav" ]; then
            wav="$DATADIR/sounds/task-alert.wav"
            [ -f "$wav" ] || wav="$(find_sound_file task)"
        fi
        if [ -n "$wav" ] && [ -f "$wav" ] && play_pulse_sample "$wav"; then
            log_msg "alert Pulse sample completed key=$key file=$wav"
            return 0
        fi
        if [ -n "$sfile" ] && [ -f "$sfile" ]; then
            uri="file://$sfile"
            # event is a standard PulseAudio role (unlike "notification"). On TV
            # firmware it is the closest system-event path for mixing over a video;
            # direct ALSA remains the fallback if no live Pulse server exists.
            if [ -n "$pdir" ]; then
                modes="pulse_notif pulse_plain alsasink alsasink_def default auto"
            else
                modes="alsasink alsasink_def default auto pulse_plain"
            fi
            for mode in $modes; do
                case "$mode" in
                    alsasink)     cmd="$bin -q playbin uri='$uri' volume=$vol audio-sink=alsasink" ;;
                    alsasink_def) cmd="$bin -q playbin uri='$uri' volume=$vol audio-sink='alsasink device=default'" ;;
                    default)      cmd="$bin -q playbin uri='$uri' volume=$vol" ;;
                    auto)         cmd="$bin -q playbin uri='$uri' volume=$vol audio-sink=autoaudiosink" ;;
                    pulse_notif)
                        cmd="env PULSE_RUNTIME_PATH='$pdir' PULSE_SERVER='unix:$pdir/native' PULSE_PROP='media.role=event application.name=APL_Launcher application.id=APLMusalla.Home' $bin -q playbin uri='$uri' volume=$vol audio-sink='pulsesink stream-properties=\"props,media.role=event,media.name=APL Alert,application.name=APL Launcher,application.id=APLMusalla.Home\"'"
                        ;;
                    pulse_plain)
                        if [ -n "$pdir" ]; then
                            cmd="env PULSE_RUNTIME_PATH='$pdir' PULSE_SERVER='unix:$pdir/native' PULSE_PROP='media.role=event application.name=APL_Launcher application.id=APLMusalla.Home' $bin -q playbin uri='$uri' volume=$vol audio-sink=pulsesink"
                        else
                            cmd="$bin -q playbin uri='$uri' volume=$vol audio-sink=pulsesink"
                        fi
                        ;;
                esac
                repair_pulse_streams
                if run_single_alert_cmd "$cmd"; then
                    repair_pulse_streams
                    return 0
                fi
            done
        fi
        # The TV's OMX MP3 decoder can fail with caps/buffer errors. The bundled
        # PCM task chime bypasses it and remains an audible prayer-time fallback.
        wav="$DATADIR/sounds/task-alert.wav"
        [ -f "$wav" ] || wav="$(find_sound_file task)"
        if [ -n "$wav" ] && [ -f "$wav" ]; then
            if command -v aplay >/dev/null 2>&1 && run_single_alert_cmd "aplay -q '$wav'"; then
                log_msg "alert PCM fallback completed key=$key via=aplay"
                return 0
            fi
            for wsink in "alsasink" "alsasink device=default" "autoaudiosink"; do
                if run_single_alert_cmd "$bin -q playbin uri='file://$wav' volume=$vol audio-sink='$wsink'"; then
                    log_msg "alert PCM fallback completed key=$key sink=$wsink"
                    return 0
                fi
            done
        fi
        # Synthesized chime fallback if the packaged audio file was unavailable.
        for sink in "pulsesink" "alsasink" "alsasink device=default" "autoaudiosink"; do
            $bin -q audiotestsrc wave=sine freq=880 num-buffers=18 volume=0.35 ! audioconvert ! audioresample ! $sink >/dev/null 2>&1 && {
                $bin -q audiotestsrc wave=sine freq=660 num-buffers=22 volume=0.35 ! audioconvert ! audioresample ! $sink >/dev/null 2>&1
                return 0
            }
        done
    fi
    if [ -n "$sfile" ] && command -v aplay >/dev/null 2>&1; then
        aplay -q "$sfile" >/dev/null 2>&1 && return 0
    fi
    if [ -n "$sfile" ] && command -v paplay >/dev/null 2>&1; then
        if [ -n "$pdir" ]; then
            PULSE_RUNTIME_PATH="$pdir" PULSE_SERVER="unix:$pdir/native" PULSE_PROP="media.role=event application.name=APL_Launcher application.id=APLMusalla.Home" paplay "$sfile" >/dev/null 2>&1 && return 0
        else
            PULSE_PROP="media.role=event application.name=APL_Launcher application.id=APLMusalla.Home" paplay "$sfile" >/dev/null 2>&1 && return 0
        fi
    fi
    return 1
}
cleanup_alert_worker() {
    rm -f "$ALERTPID" "$ALERTPLAYPID"
    rmdir "$ALERTLOCK" 2>/dev/null || rm -rf "$ALERTLOCK"
}

run_alert_worker() {
    key="$1"; vol="$2"; pause_rad="$3"
    if ! mkdir "$ALERTLOCK" 2>/dev/null; then
        ap=$(cat "$ALERTPID" 2>/dev/null)
        if alive "$ap"; then exit 0; fi
        rm -rf "$ALERTLOCK"
        mkdir "$ALERTLOCK" 2>/dev/null || exit 0
    fi
    protect_oom
    echo $$ > "$ALERTPID"
    trap 'cleanup_alert_worker; exit 1' HUP INT TERM
    load_alert_cfg
    [ -z "$vol" ] && vol="$ALERT_VOL"
    [ -z "$pause_rad" ] && pause_rad="$PAUSE_RADIO"

    did_pause=0
    if [ "$pause_rad" = "1" ] && wanted && ! paused; then
        : > "$PAUSEFILE"
        kill_player >/dev/null 2>&1
        did_pause=1
        sleep 1
    fi

    if [ "$key" = "maghrib_ramadan" ]; then
        cfile=$(find_sound_file "ramadan-cannon")
        if [ -n "$cfile" ] && [ -f "$cfile" ]; then
            log_msg "playing Ramadan cannon before Maghrib Adhan: $cfile"
            repair_pulse_streams
            # v4.10: play_file_blocking picks its wav from $key. While the key was still "maghrib_ramadan" it matched no
            # case and fell back to the task chime, so the cannon was never heard (the task alert sounded instead).
            key="ramadan-cannon"
            play_file_blocking "$cfile" "$vol"
            sleep 1
        fi
        key="maghrib"
    fi

    sfile=$(find_sound_file "$key")
    log_msg "playing alert key=$key file=${sfile:-tone} paused_radio=$did_pause"
    repair_pulse_streams
    played=0
    if play_file_blocking "$sfile" "$vol"; then
        played=1
    elif [ "$did_pause" = "0" ] && [ -n "$(running_pid)" ]; then
        # Single-open ALSA cards are yielded as a final fallback. This is reached
        # only after event-role Pulse and direct routes were already tried.
        : > "$PAUSEFILE"
        kill_player >/dev/null 2>&1
        did_pause=1
        sleep 1
        play_file_blocking "$sfile" "$vol" && played=1
    fi
    repair_pulse_streams
    [ "$played" = "1" ] && log_msg "alert completed key=$key" || log_msg "alert playback failed key=$key"

    if [ "$did_pause" = "1" ]; then
        rm -f "$PAUSEFILE"
        if wanted; then
            spawn_player "$(cat "$URLFILE" 2>/dev/null)" >/dev/null 2>&1
        fi
    fi
    cleanup_alert_worker
    trap - HUP INT TERM
    exit 0
}

trigger_alert_bg() {
    key="$1"; vol="$2"; pause_rad="$3"
    daemon_spawn _alert_worker "$key" "$vol" "$pause_rad"
    echo "ALERTING $key"
}

already_fired() {
    [ -f "$FIREDFILE" ] && grep -Fqx "$1" "$FIREDFILE" 2>/dev/null
}

mark_fired() {
    stamp="$1"; kind="$2"
    echo "$stamp" >> "$FIREDFILE" 2>/dev/null
    if [ -f "$FIREDFILE" ]; then
        tail -n 200 "$FIREDFILE" > "$FIREDFILE.tmp" 2>/dev/null && mv "$FIREDFILE.tmp" "$FIREDFILE" 2>/dev/null
    fi
    if [ "$kind" = "prayer" ]; then
        echo "$stamp" > "$LASTPRAYER" 2>/dev/null
    else
        echo "$stamp" > "$LASTTASK" 2>/dev/null
    fi
}

check_schedule_file() {
    sfile="$1"; expected_kind="$2"; now_ts="$3"
    [ -s "$sfile" ] || return 0
    while IFS='	' read -r ts stamp kind skey; do
        case "$ts" in ''|*[!0-9]*) continue ;; esac
        diff=$((now_ts - ts))
        if [ "$diff" -ge 0 ] && [ "$diff" -le "$ALERT_GRACE" ]; then
            if ! already_fired "$stamp"; then
                mark_fired "$stamp" "$expected_kind"
                log_msg "scheduled $expected_kind alert due: $stamp (delta=${diff}s)"
                trigger_alert_bg "${skey:-$expected_kind}" "$ALERT_VOL" "$PAUSE_RADIO" >/dev/null 2>&1
                return 2
            fi
        fi
    done < "$sfile"
    return 0
}

check_all_schedules() {
    # Wait if an alert is currently playing so simultaneous prayer + task alerts play sequentially
    if [ -d "$ALERTLOCK" ]; then
        ap=$(cat "$ALERTPID" 2>/dev/null)
        if alive "$ap"; then return 0; fi
        # A process reclaimed by firmware must never leave alerts permanently locked.
        cleanup_alert_worker
    fi
    load_alert_cfg
    now_ts=$(date +%s 2>/dev/null)
    case "$now_ts" in ''|*[!0-9]*) return 0 ;; esac
    if [ "$PRAYER_ALERTS" = "1" ]; then
        check_schedule_file "$PRAYERSCHED" "prayer" "$now_ts"
        [ $? -eq 2 ] && return 0
    fi
    if [ "$TASK_ALERTS" = "1" ]; then
        check_schedule_file "$TASKSCHED" "task" "$now_ts"
    fi
}

# ---------------------------------------------------------------- supervisor

supervise_loop() {
    protect_oom
    echo $$ > "$SUPFILE"
    log_msg "supervisor v$DAEMON_VER started pid=$$"
    sup_tick=0
    while supervise_needed; do
        FGSNAP_SET=0
        FGSNAP=$(foreground_app_read 2>/dev/null)
        FGSNAP_SET=1
        check_all_schedules
        check_foreground_transition
        check_hdmi_transition

        sup_tick=$((sup_tick + 1))
        if [ "$sup_tick" -ge 2 ]; then
            sup_tick=0
            if wanted && ! paused && [ ! -d "$ALERTLOCK" ]; then
                if ! check_radio_health; then
                    waitfor=$(cat "$RETRYFILE" 2>/dev/null)
                    case "$waitfor" in ''|*[!0-9]*) waitfor=2 ;; esac
                    sleep "$waitfor"
                    if wanted && ! paused && [ ! -d "$ALERTLOCK" ]; then
                        spawn_player "$(cat "$URLFILE" 2>/dev/null)" >/dev/null 2>&1
                        waitfor=$((waitfor * 2))
                        [ "$waitfor" -gt 20 ] && waitfor=20
                        echo "$waitfor" > "$RETRYFILE"
                    fi
                else
                    rm -f "$RETRYFILE"
                fi
            fi
        fi
        sleep 5
    done
    log_msg "supervisor exiting cleanly (nothing to watch)"
    rm -f "$SUPFILE"
    rmdir "$LOCKDIR" 2>/dev/null
    exit 0
}

start_supervisor() {
    supervise_needed || return 0
    if mkdir "$LOCKDIR" 2>/dev/null; then
        :
    else
        sp=$(cat "$SUPFILE" 2>/dev/null)
        if alive "$sp"; then return 0; fi
        rm -rf "$LOCKDIR"
        mkdir "$LOCKDIR" 2>/dev/null || return 0
    fi
    daemon_spawn _supervise
    sleep 1
    return 0
}

keeper_loop() {
    protect_oom
    echo $$ > "$KEEPERPID"
    log_msg "alert keeper v$DAEMON_VER started pid=$$"
    while keeper_needed; do
        date +%s > "$KEEPERBEAT" 2>/dev/null || true
        # tick is idempotent: it repairs the sink, reaps a stale alert lock and
        # recreates the schedule supervisor if the OS reclaimed it.
        daemon_pipe tick >/dev/null 2>&1 || true
        sleep 60
    done
    log_msg "alert keeper stopped (all alerts disabled)"
    rm -f "$KEEPERPID" "$KEEPERBEAT"
    rmdir "$KEEPERLOCK" 2>/dev/null || true
    exit 0
}

start_keeper() {
    keeper_needed || return 0
    if mkdir "$KEEPERLOCK" 2>/dev/null; then
        :
    else
        if keeper_alive; then return 0; fi
        rm -rf "$KEEPERLOCK"
        mkdir "$KEEPERLOCK" 2>/dev/null || return 0
    fi
    daemon_spawn _keeper
    kp=$!
    echo "$kp" > "$KEEPERPID" 2>/dev/null || true
    return 0
}

# ---------------------------------------------------------------- commands

do_start() {
    url="$1"
    [ -n "$url" ] || url=$(cat "$URLFILE" 2>/dev/null)
    [ -n "$url" ] || { echo "NOURL"; return 1; }
    valid_url "$url" || { echo "BADURL"; return 1; }

    old=$(cat "$URLFILE" 2>/dev/null)
    pid=$(running_pid)
    echo "$url" > "$URLFILE"
    rm -f "$PAUSEFILE"
    : > "$WANTFILE"

    if [ -n "$pid" ] && [ "$old" = "$url" ] && group_has_player "$pid"; then
        unmute_pulse_streams
        start_supervisor
        echo "PLAYING $pid $url"
        return 0
    fi

    [ -n "$pid" ] && kill_player >/dev/null 2>&1
    out=$(spawn_player "$url")
    start_supervisor
    echo "$out"
    [ "${out%% *}" = "PLAYING" ] && return 0
    return 1
}

do_stop() {
    rm -f "$WANTFILE" "$PAUSEFILE"
    kill_player >/dev/null 2>&1
    rm -f "$RETRYFILE"
    if ! supervise_needed; then
        sp=$(cat "$SUPFILE" 2>/dev/null)
        [ -n "$sp" ] && kill "$sp" 2>/dev/null
        rm -f "$SUPFILE"
        rmdir "$LOCKDIR" 2>/dev/null
    fi
    echo "STOPPED"
}

do_pause() {
    url=$(cat "$URLFILE" 2>/dev/null)
    if wanted; then
        : > "$PAUSEFILE"
        kill_player >/dev/null 2>&1
        echo "PAUSED $url"
        return 0
    fi
    echo "NOTHING"
    return 1
}

do_resume() {
    url=$(cat "$URLFILE" 2>/dev/null)
    if [ -z "$url" ]; then echo "NOTHING"; return 1; fi
    rm -f "$PAUSEFILE"
    do_start "$url"
}

do_ensure() {
    start_keeper
    start_supervisor
    repair_pulse_streams
    wanted || { echo "STOPPED"; return 1; }
    paused && { echo "PAUSED $(cat "$URLFILE" 2>/dev/null)"; return 1; }
    pid=$(running_pid)
    if [ -n "$pid" ] && group_has_player "$pid"; then
        echo "PLAYING $pid $(cat "$URLFILE" 2>/dev/null)"
        return 0
    fi
    do_start "$(cat "$URLFILE" 2>/dev/null)"
}

do_hdmi_recover() {
    : > "$HDMINUDGE"
    repair_pulse_streams
    check_all_schedules
    start_keeper
    start_supervisor
    # If supervisor wasn't running (no schedules/radio), nothing else to do;
    # if radio is wanted and supervisor is running, check_hdmi_transition will re-bind cleanly.
    echo "HDMI_RECOVER"
}

do_status() {
    url=$(cat "$URLFILE" 2>/dev/null)
    pid=$(running_pid)
    if [ -n "$pid" ] && group_has_player "$pid"; then echo "PLAYING $pid $url"; return 0; fi
    if paused; then echo "PAUSED $url"; return 0; fi
    if wanted; then echo "STARTING $url"; return 0; fi
    echo "STOPPED"
    return 0
}

do_tick() {
    repair_pulse_if_due
    check_all_schedules
    start_keeper
    start_supervisor
    start_remap_watcher
    do_status
}

do_health() {
    kp=$(cat "$KEEPERPID" 2>/dev/null); sp=$(cat "$SUPFILE" 2>/dev/null); ap=$(cat "$ALERTPID" 2>/dev/null)
    kstate=0; sstate=0; astate=0; hstate=0
    alive "$kp" && kstate=1
    alive "$sp" && sstate=1
    alive "$ap" && astate=1
    is_hdmi_fg && hstate=1
    pdir=$(find_pulse_dir 2>/dev/null || echo "")
    echo "HEALTH keeper=$kstate supervisor=$sstate alert=$astate hdmi=$hstate pulse=${pdir:-none}"
}

do_decoder_snapshot() {
    echo "APL_DECODER_CAPABILITY_SNAPSHOT"
    if ! command -v gst-inspect-1.0 >/dev/null 2>&1; then
        echo "GST_INSPECT=missing"
        return 0
    fi
    echo "GST_INSPECT=present"
    for element in avdec_mp3 mpg123audiodec mad omxaudiodec omxaudiodeco mpegaudioparse decodebin uridecodebin pulsesink alsasink; do
        if gst-inspect-1.0 "$element" >/dev/null 2>&1; then
            echo "$element=yes"
        else
            echo "$element=no"
        fi
    done
}

do_pulse_snapshot() {
    echo "APL_PULSE_CONNECTION_SNAPSHOT"
    echo "ID=$(id 2>/dev/null || echo unknown)"
    echo "DEFAULT_PACTL=$(pactl info >/dev/null 2>&1; echo $?)"
    tools=""
    for tool in pactl paplay pacat mpg123 ffplay ffmpeg aplay gst-launch-1.0; do
        command -v "$tool" >/dev/null 2>&1 && tools="$tools $tool"
    done
    echo "AUDIO_TOOLS=${tools# }"
    seen=""
    for pdir in /run/pulse /var/run/pulse /run/user/*/pulse /var/run/user/*/pulse; do
        [ -S "$pdir/native" ] || continue
        case " $seen " in *" $pdir "*) continue ;; esac
        seen="$seen $pdir"
        perms=$(ls -ld "$pdir" "$pdir/native" 2>/dev/null | tr '\n' '|')
        info=$(PULSE_RUNTIME_PATH="$pdir" PULSE_SERVER="unix:$pdir/native" pactl info 2>&1)
        rc=$?
        server=$(printf '%s\n' "$info" | awk -F': ' '/^Server String:/{print $2; exit}')
        sink=$(printf '%s\n' "$info" | awk -F': ' '/^Default Sink:/{print $2; exit}')
        err=$(printf '%s' "$info" | tr '\r\n' '  ' | tail -c 180)
        echo "SOCKET=$pdir/native"
        echo "PERMS=$perms"
        echo "PACTL_RC=$rc"
        echo "SERVER=${server:-none}"
        echo "DEFAULT_SINK=${sink:-none}"
        [ "$rc" = "0" ] || echo "PACTL_ERROR=${err:-none}"
    done
    [ -n "$seen" ] || echo "SOCKET=none"
}

do_diagnostic() {
    echo "APL_AUDIO_DIAGNOSTIC daemon=$DAEMON_VER"
    echo "TIME=$(date '+%Y-%m-%d %H:%M:%S' 2>/dev/null || echo unknown)"
    echo "FOREGROUND=$(foreground_app 2>/dev/null || echo unavailable)"
    echo "RADIO wanted=$(wanted && echo yes || echo no) paused=$(paused && echo yes || echo no) pid=$(running_pid 2>/dev/null || echo none) pipe=$(cat "$PIPEFILE" 2>/dev/null || echo none)"
    pdir=$(find_pulse_dir 2>/dev/null || echo "")
    echo "PULSE=${pdir:-none} pactl=$(command -v pactl >/dev/null 2>&1 && echo yes || echo no)"
    echo "PLAYER_BIN=$(player_bin 2>/dev/null || echo none)"
    echo "PLAYER_PID=$(running_pid 2>/dev/null || echo none)"
    echo "KEEPER_PID=$(cat "$KEEPERPID" 2>/dev/null || echo none)"
    echo "SUPERVISOR_PID=$(cat "$SUPFILE" 2>/dev/null || echo none)"
    pulse_stream_summary
    echo "RECENT_EVENTS"
    tail -n 48 "$LOGFILE" 2>/dev/null || true
}

do_sounds_check() {
    for k in fajr dhuhr asr maghrib isha task; do
        f=$(find_sound_file "$k")
        if [ -z "$f" ] || [ ! -f "$f" ]; then
            echo "MISSING $k"
            return 1
        fi
    done
    rroot=$(find_real_wgt_root)
    for k in fajr dhuhr asr maghrib isha; do
        if [ ! -f "$DATADIR/sounds/prayer/$k.wav" ] && { [ -z "$rroot" ] || [ ! -f "$rroot/sounds/prayer/$k.wav" ]; }; then
            echo "MISSING $k.wav"
            return 1
        fi
    done
    echo "OK $(find_wgt_root)"
    return 0
}

# v4.6: the root daemon copies the sounds from the installed package itself
# (one fast cp per file) instead of the launcher uploading them in many chunks.
do_sounds_sync() {
    rroot=$(find_real_wgt_root)
    if [ -z "$rroot" ]; then echo "NOROOT"; return 1; fi
    mkdir -p "$DATADIR/sounds/prayer" 2>/dev/null
    for k in fajr dhuhr asr maghrib isha; do
        for ext in wav mp3; do
            src="$rroot/sounds/prayer/$k.$ext"
            dst="$DATADIR/sounds/prayer/$k.$ext"
            [ -f "$src" ] || continue
            cmp -s "$src" "$dst" 2>/dev/null || cp -f "$src" "$dst" 2>/dev/null
        done
    done
    if [ -f "$rroot/sounds/task-alert.wav" ]; then
        cmp -s "$rroot/sounds/task-alert.wav" "$DATADIR/sounds/task-alert.wav" 2>/dev/null || cp -f "$rroot/sounds/task-alert.wav" "$DATADIR/sounds/task-alert.wav" 2>/dev/null
    fi
    if [ -f "$rroot/sounds/ramadan-cannon.wav" ]; then
        cmp -s "$rroot/sounds/ramadan-cannon.wav" "$DATADIR/sounds/ramadan-cannon.wav" 2>/dev/null || cp -f "$rroot/sounds/ramadan-cannon.wav" "$DATADIR/sounds/ramadan-cannon.wav" 2>/dev/null
    fi
    echo "SYNCED $rroot"
    return 0
}

do_last_fired() {
    lp=$(cat "$LASTPRAYER" 2>/dev/null | tr -d '\r\n')
    lt=$(cat "$LASTTASK" 2>/dev/null | tr -d '\r\n')
    printf 'PRAYER=%s\tTASK=%s\n' "$lp" "$lt"
}

case "$1" in
    start)         do_start "$2" ;;
    stop)          do_stop ;;
    pause)         do_pause ;;
    resume)        do_resume ;;
    ensure)        do_ensure ;;
    hdmi-recover)  do_hdmi_recover ;;
    status)        do_status ;;
    tick|heartbeat) do_tick ;;
    alert)           start_keeper; trigger_alert_bg "$2" "$3" "$4" ;;
    repair)           repair_pulse_streams; echo REPAIRED ;;
    health)           do_health ;;
    diagnostic)       do_diagnostic ;;
    pulse-snapshot)   do_pulse_snapshot ;;
    decoder-snapshot) do_decoder_snapshot ;;
    sounds-ok)        do_sounds_check ;;
    sounds-sync)      do_sounds_sync ;;
    last-fired)    do_last_fired ;;
    version)       echo "$DAEMON_VER" ;;
    log)           tail -n 25 "$LOGFILE" 2>/dev/null ;;
    remap-ensure)  start_remap_watcher; echo "REMAP_OK" ;;
    remap-stop)    rm -f "$REMAPPID"; echo "REMAP_STOPPED" ;;
    _supervise)     supervise_loop ;;
    _keeper)         keeper_loop ;;
    _remap_watcher)  remap_loop ;;
    _alert_worker)   run_alert_worker "$2" "$3" "$4" ;;
    *)
        echo "USAGE start|stop|pause|resume|ensure|hdmi-recover|status|tick|heartbeat|alert|repair|health|diagnostic|sounds-ok|sounds-sync|last-fired|version|log"
        ;;
esac
exit 0
