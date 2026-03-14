#!/bin/bash
# OGN Diagnostics Collector
# Collects system health metrics and appends them to the diagnostics log.
# This script should run every minute via crontab.
#
# Install:
#   1. Copy to /home/pi/scripts/ogn-diagnostics.sh
#   2. chmod +x /home/pi/scripts/ogn-diagnostics.sh
#   3. Add to crontab:
#      * * * * * /home/pi/scripts/ogn-diagnostics.sh
#
# Output format (one line per run, appended to log):
#   2026-03-14T12:00:00Z uptime=86400 cpu_temp=45.2 core_voltage=1.2250 throttle=0x0 cpu_load=0.15 mem_avail=512 wifi_ssid=MyNetwork wifi_signal=-55 usb_rtl=1 ogn_rf=RUNNING ogn_decode=RUNNING aprs_lines=1234

set -euo pipefail

LOG_FILE="${OGN_DIAGNOSTICS_LOG:-/var/log/ogn-diagnostics.log}"

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# System uptime in seconds
UPTIME=$(awk '{print int($1)}' /proc/uptime)

# CPU temperature (Raspberry Pi)
CPU_TEMP=""
if [ -f /sys/class/thermal/thermal_zone0/temp ]; then
    RAW_TEMP=$(cat /sys/class/thermal/thermal_zone0/temp)
    CPU_TEMP=$(echo "scale=1; $RAW_TEMP / 1000" | bc)
fi

# Core voltage (Raspberry Pi vcgencmd)
CORE_VOLTAGE=""
if command -v vcgencmd &>/dev/null; then
    CORE_VOLTAGE=$(vcgencmd measure_volts core | grep -oP '[\d.]+')
fi

# Throttle status (Raspberry Pi vcgencmd)
THROTTLE=""
if command -v vcgencmd &>/dev/null; then
    THROTTLE=$(vcgencmd get_throttled | grep -oP '0x[0-9a-fA-F]+')
fi

# CPU load (1-minute average)
CPU_LOAD=$(awk '{print $1}' /proc/loadavg)

# Available memory in MB
MEM_AVAIL=$(awk '/MemAvailable/ {printf "%d", $2/1024}' /proc/meminfo)

# WiFi info
WIFI_SSID=""
WIFI_SIGNAL=""
if command -v iwgetid &>/dev/null; then
    WIFI_SSID=$(iwgetid -r 2>/dev/null || echo "")
fi
if command -v iwconfig &>/dev/null; then
    WIFI_SIGNAL=$(iwconfig 2>/dev/null | grep -oP 'Signal level=\K-?\d+' | head -1 || echo "")
fi

# USB RTL-SDR dongle count
USB_RTL=0
if command -v lsusb &>/dev/null; then
    USB_RTL=$(lsusb 2>/dev/null | grep -ci 'RTL' || echo "0")
fi

# OGN process status
OGN_RF="DEAD"
if pgrep -x ogn-rf &>/dev/null; then
    OGN_RF="RUNNING"
fi

OGN_DECODE="DEAD"
if pgrep -x ogn-decode &>/dev/null; then
    OGN_DECODE="RUNNING"
fi

# APRS lines sent (from OGN log if available)
APRS_LINES=""
OGN_LOG="/var/log/ogn-rf.log"
if [ -f "$OGN_LOG" ]; then
    APRS_LINES=$(wc -l < "$OGN_LOG" 2>/dev/null || echo "")
fi

# Build output line
LINE="$TIMESTAMP"
LINE+=" uptime=$UPTIME"
[ -n "$CPU_TEMP" ] && LINE+=" cpu_temp=$CPU_TEMP"
[ -n "$CORE_VOLTAGE" ] && LINE+=" core_voltage=$CORE_VOLTAGE"
[ -n "$THROTTLE" ] && LINE+=" throttle=$THROTTLE"
LINE+=" cpu_load=$CPU_LOAD"
LINE+=" mem_avail=$MEM_AVAIL"
[ -n "$WIFI_SSID" ] && LINE+=" wifi_ssid=$WIFI_SSID"
[ -n "$WIFI_SIGNAL" ] && LINE+=" wifi_signal=$WIFI_SIGNAL"
LINE+=" usb_rtl=$USB_RTL"
LINE+=" ogn_rf=$OGN_RF"
LINE+=" ogn_decode=$OGN_DECODE"
[ -n "$APRS_LINES" ] && LINE+=" aprs_lines=$APRS_LINES"

echo "$LINE" >> "$LOG_FILE"

# Rotate log (keep last 1440 lines = 24 hours at 1/min)
if [ "$(wc -l < "$LOG_FILE")" -gt 2000 ]; then
    tail -n 1440 "$LOG_FILE" > "${LOG_FILE}.tmp"
    mv "${LOG_FILE}.tmp" "$LOG_FILE"
fi
