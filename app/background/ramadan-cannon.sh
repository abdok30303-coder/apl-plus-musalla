#!/bin/sh
# APL v7.0.0: isolated ONE-SHOT Ramadan cannon. Untested on the TV.
# No daemon/radio/AVPlay changes, no global sink volume/mute changes.
# Reads only the bundled cannon WAV. Never touches the TV's Quran/Eid files.
# Run through the signed shell on stdin, NOT as an executable writable script.

wav="$1"
reason="$2"
rundir=/run/apl-bg
mkdir -p "$rundir" 2>/dev/null; chmod 700 "$rundir" 2>/dev/null
if [ -L "$rundir" ] || [ ! -d "$rundir" ] || [ ! -O "$rundir" ]; then echo CANNON_UNSAFE_RUNDIR; exit 1; fi
lock="$rundir/cannon.lock"
status="$rundir/cannon.status"
sample="apl-ramadan-cannon-$$"
owned=0
uploaded=0

report() { printf '%s\n' "$1" > "$status"; printf '%s\n' "$1"; }
cleanup() {
    if [ "$uploaded" = 1 ]; then pactl remove-sample "$sample" >/dev/null 2>&1 || true; fi
    if [ "$owned" = 1 ]; then rm -f "$lock/pid"; rmdir "$lock" 2>/dev/null || true; fi
}
trap 'cleanup' EXIT
trap 'exit 1' HUP INT TERM

case "$wav" in
    /*/sounds/ramadan-cannon.wav) ;;
    *) report CANNON_INVALID_FILE; exit 1 ;;
esac
[ -r "$wav" ] || { report CANNON_FILE_MISSING; exit 1; }
command -v pactl >/dev/null 2>&1 || { report CANNON_NO_PACTL; exit 1; }
if ! mkdir "$lock" 2>/dev/null; then
    old=$(cat "$lock/pid" 2>/dev/null)
    case "$old" in
        ''|*[!0-9]*) report CANNON_BUSY; exit 0 ;;
        *) if kill -0 "$old" 2>/dev/null; then report CANNON_BUSY; exit 0; fi ;;
    esac
    rm -f "$lock/pid"; rmdir "$lock" 2>/dev/null || { report CANNON_BUSY; exit 0; }
    mkdir "$lock" 2>/dev/null || { report CANNON_BUSY; exit 0; }
fi
owned=1
printf '%s\n' "$$" > "$lock/pid"
report CANNON_QUEUED

# The existing prayer supervisor ALWAYS gets the first turn at Maghrib.
# Only observe its lock/PID; never acquire, remove or modify its files.
[ "$reason" = iftar ] && sleep 9
waited=0
while :; do
    ap=$(cat /run/apl-bg/alert.pid 2>/dev/null | head -n 1)
    busy=0
    [ -d /run/apl-bg/alert.lock ] && busy=1
    case "$ap" in ''|*[!0-9]*) ;; *) kill -0 "$ap" 2>/dev/null && busy=1 ;; esac
    [ "$busy" = 0 ] && break
    [ "$waited" -ge 45 ] && { report CANNON_SKIPPED_ALERT_BUSY; exit 0; }
    sleep 1; waited=$((waited + 1))
done

# Exactly the Pulse sample route already used successfully by the old alerts,
# but a unique sample, no alert-worker lock and NO sink/stream reconfiguration.
found=0
if pactl info >/dev/null 2>&1; then
    found=1
else
    for d in /run/user/*/pulse /var/run/user/*/pulse /run/pulse /var/run/pulse /tmp/pulse-* /home/*/.config/pulse; do
        [ -S "$d/native" ] || continue
        if PULSE_RUNTIME_PATH="$d" PULSE_SERVER="unix:$d/native" pactl info >/dev/null 2>&1; then
            PULSE_RUNTIME_PATH="$d"; PULSE_SERVER="unix:$d/native"
            export PULSE_RUNTIME_PATH PULSE_SERVER
            found=1; break
        fi
    done
fi
[ "$found" = 1 ] || { report CANNON_NO_PULSE; exit 1; }
PULSE_PROP='media.role=event application.name=APL_Ramadan_Cannon application.id=APLMusalla.Home'
export PULSE_PROP
pactl upload-sample "$wav" "$sample" || { report CANNON_UPLOAD_FAILED; exit 1; }
uploaded=1
# Avoid starting over a prayer that began while Pulse was being discovered.
[ -d /run/apl-bg/alert.lock ] && { report CANNON_SKIPPED_ALERT_BUSY; exit 0; }
pactl play-sample "$sample" || { report CANNON_PLAY_FAILED; exit 1; }
report CANNON_PLAY_REQUESTED
# Bundled Egyptian Radio cannon WAV lasts 7.7 s. Leave a margin, then remove only our own sample.
sleep 9
report CANNON_FINISHED
exit 0
