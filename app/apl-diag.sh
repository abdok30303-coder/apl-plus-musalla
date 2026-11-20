#!/bin/sh
# apl-diag.sh — Read-only diagnostic inspector for APL Launcher & Background Daemon
# Can be run via Vetro Root Bridge or directly via sdb shell.

VERDICT="OK"
FAIL_REASONS=""

note_fail() {
    VERDICT="FAIL"
    if [ -z "$FAIL_REASONS" ]; then
        FAIL_REASONS="$1"
    else
        FAIL_REASONS="$FAIL_REASONS,$1"
    fi
}

# 1. Check root privileges
IS_ROOT=0
if [ "$(id -u 2>/dev/null)" = "0" ]; then
    IS_ROOT=1
else
    echo "WARN: Not running as root (current uid=$(id -u 2>/dev/null)). /run/apl-bg (mode 700 root) may not be readable directly."
fi

# 2. Check daemon rejection in logs
REJECTED_COUNT=0
for log in /run/apl-bg/audio.log /tmp/apl-bg/audio.log /tmp/apl-bg-audio.log; do
    if [ -r "$log" ]; then
        c=$(grep -c "daemon source rejected" "$log" 2>/dev/null || echo 0)
        REJECTED_COUNT=$((REJECTED_COUNT + c))
    fi
done
if [ "$REJECTED_COUNT" -gt 0 ]; then
    note_fail "daemon_source_rejected($REJECTED_COUNT)"
fi

# 3. Check daemon source file ownership and permissions
DAEMON_FILE=""
for p in /opt/usr/home/owner/APL/bg-daemon.sh /run/apl-bg/bg-daemon.sh; do
    if [ -f "$p" ]; then
        DAEMON_FILE="$p"
        break
    fi
done

DAEMON_VER="UNKNOWN"
if [ -n "$DAEMON_FILE" ]; then
    if [ -L "$DAEMON_FILE" ]; then
        note_fail "daemon_is_symlink"
    fi
    if [ "$IS_ROOT" = "1" ] && [ ! -O "$DAEMON_FILE" ]; then
        note_fail "daemon_not_root_owned"
    fi
    DAEMON_VER=$(cat "$DAEMON_FILE" 2>/dev/null | grep '^DAEMON_VER=' | head -n 1 | cut -d'"' -f2)
fi

# Print initial Verdict line
if [ "$VERDICT" = "OK" ]; then
    echo "APL_DIAG_VERDICT=OK"
else
    echo "APL_DIAG_VERDICT=FAIL($FAIL_REASONS)"
fi

echo "--- APL DIAGNOSTIC SUMMARY ---"
echo "TIMESTAMP=$(date -u +'%Y-%m-%dT%H:%M:%SZ' 2>/dev/null || date)"
echo "IS_ROOT=$IS_ROOT"
echo "DAEMON_FILE=${DAEMON_FILE:-NONE}"
echo "DAEMON_VERSION=${DAEMON_VER}"
echo "DAEMON_SOURCE_REJECTED_COUNT=$REJECTED_COUNT"

echo "\n--- RUNTIME DIRECTORY (/run/apl-bg) ---"
if [ -d /run/apl-bg ]; then
    ls -la /run/apl-bg 2>/dev/null || echo "Cannot list /run/apl-bg (permission denied)"
else
    echo "/run/apl-bg does not exist"
fi

echo "\n--- RAMADAN CANNON STATUS ---"
if [ -f /run/apl-bg/cannon.status ]; then
    echo "CANNON_STATUS=$(cat /run/apl-bg/cannon.status 2>/dev/null)"
else
    echo "CANNON_STATUS=NONE"
fi
if [ -f /run/apl-bg/cannon.lock ] || [ -d /run/apl-bg/cannon.lock ]; then
    echo "CANNON_LOCKED=YES"
else
    echo "CANNON_LOCKED=NO"
fi

echo "\n--- AUDIO LOG TAIL (LAST 50 LINES) ---"
if [ -r /run/apl-bg/audio.log ]; then
    tail -n 50 /run/apl-bg/audio.log
elif [ -r /tmp/apl-bg/audio.log ]; then
    echo "(Reading fallback /tmp/apl-bg/audio.log)"
    tail -n 50 /tmp/apl-bg/audio.log
else
    echo "audio.log not found or unreadable"
fi

echo "\n--- MEMORY INFO ---"
if [ -r /proc/meminfo ]; then
    grep -E '^(MemTotal|MemFree|MemAvailable|Buffers|Cached|SwapTotal|SwapFree):' /proc/meminfo 2>/dev/null
fi

echo "\n--- RELEVANT PROCESSES ---"
ps -o pid,user,vsz,rss,comm -A 2>/dev/null | grep -E 'node|sh|gst|pactl|pulse|dotnet|APL' | head -n 30

echo "\n--- TOP 8 PROCESSES BY RSS ---"
ps -o pid,user,vsz,rss,comm -A --sort=-rss 2>/dev/null | head -n 9 2>/dev/null || ps -o pid,user,vsz,rss,comm -A 2>/dev/null | head -n 9
