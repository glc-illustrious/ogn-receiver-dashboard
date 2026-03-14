#!/bin/bash
# OGN Dashboard Health Push Script
# Parses the last line of ogn-diagnostics.log and POSTs to the dashboard API.
#
# Expected log format (from ogn-diagnostics.sh):
#   2026-03-14 18:47:01 | up=95622s temp=38.4C vcore=0.8500V throttle=0x0 load=1.05 mem=1328MB | wifi=GLC-Veld(81%) usb_rtl=1 | rf=ok(15240) dec=ok(15416) aprs=0 | OK
#
# Install:
#   1. Copy to /home/pi/scripts/ogn-push-health.sh
#   2. chmod +x /home/pi/scripts/ogn-push-health.sh
#   3. Create /home/pi/.ogn-dashboard.env with:
#      OGN_DASHBOARD_URL=https://ogn.besters.digital
#      OGN_RECEIVER_ID=EHGR
#      OGN_DASHBOARD_API_KEY=<your-api-key>
#   4. Add to crontab:
#      * * * * * sleep 30 && /home/pi/scripts/ogn-push-health.sh >> /var/log/ogn-push-health.log 2>&1

set -euo pipefail

CONFIG_FILE="${OGN_DASHBOARD_CONFIG:-/home/pi/.ogn-dashboard.env}"

if [ ! -f "$CONFIG_FILE" ]; then
    echo "ERROR: Config file not found: $CONFIG_FILE"
    exit 1
fi

# shellcheck source=/dev/null
source "$CONFIG_FILE"

: "${OGN_DASHBOARD_URL:?OGN_DASHBOARD_URL not set}"
: "${OGN_RECEIVER_ID:?OGN_RECEIVER_ID not set}"
: "${OGN_DASHBOARD_API_KEY:?OGN_DASHBOARD_API_KEY not set}"

LOG_FILE="${OGN_DIAGNOSTICS_LOG:-/var/log/ogn-diagnostics.log}"

if [ ! -f "$LOG_FILE" ]; then
    echo "ERROR: Diagnostics log not found: $LOG_FILE"
    exit 1
fi

LAST_LINE=$(tail -n 1 "$LOG_FILE")
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Parse diagnostics fields from actual log format:
#   up=95622s temp=38.4C vcore=0.8500V throttle=0x0 load=1.05 mem=1328MB
#   wifi=GLC-Veld(81%) usb_rtl=1 rf=ok(15240) dec=ok(15416) aprs=0
parse_field() {
    echo "$LAST_LINE" | grep -oP "$1" | head -1 || echo ""
}

UPTIME=$(parse_field 'up=\K\d+')
CPU_TEMP=$(parse_field 'temp=\K[\d.]+')
CORE_VOLTAGE=$(parse_field 'vcore=\K[\d.]+')
THROTTLE_RAW=$(parse_field 'throttle=\K0x[0-9a-fA-F]+')
CPU_LOAD=$(parse_field 'load=\K[\d.]+')
MEM_AVAIL=$(parse_field 'mem=\K\d+')
WIFI_SSID=$(parse_field 'wifi=\K[^(]+')
WIFI_SIGNAL=$(parse_field 'wifi=[^(]+\(\K\d+')
USB_RTL=$(parse_field 'usb_rtl=\K\d+')
OGN_RF_RAW=$(parse_field 'rf=\K\w+')
OGN_DECODE_RAW=$(parse_field 'dec=\K\w+')
APRS_LINES=$(parse_field 'aprs=\K\d+')

# Map rf/dec status: "ok" → "RUNNING", anything else → "DEAD"
OGN_RF=""
if [ -n "$OGN_RF_RAW" ]; then
    [ "$OGN_RF_RAW" = "ok" ] && OGN_RF="RUNNING" || OGN_RF="DEAD"
fi

OGN_DECODE=""
if [ -n "$OGN_DECODE_RAW" ]; then
    [ "$OGN_DECODE_RAW" = "ok" ] && OGN_DECODE="RUNNING" || OGN_DECODE="DEAD"
fi

# Parse throttle flags
THROTTLE_FLAGS=""
if [ -n "$THROTTLE_RAW" ]; then
    THROTTLE_VAL=$((THROTTLE_RAW))
    FLAGS=()
    [ $((THROTTLE_VAL & 0x1)) -ne 0 ] && FLAGS+=("UNDERVOLT")
    [ $((THROTTLE_VAL & 0x2)) -ne 0 ] && FLAGS+=("FREQ_CAP")
    [ $((THROTTLE_VAL & 0x4)) -ne 0 ] && FLAGS+=("THROTTLED")
    [ $((THROTTLE_VAL & 0x8)) -ne 0 ] && FLAGS+=("TEMP_LIMIT")
    THROTTLE_FLAGS=$(IFS=,; echo "${FLAGS[*]}")
fi

# Build warnings list
WARN_LIST=()
[ -n "$THROTTLE_FLAGS" ] && WARN_LIST+=("$THROTTLE_FLAGS")
[ "$OGN_RF" = "DEAD" ] && WARN_LIST+=("OGN_RF_DEAD")
[ "$OGN_DECODE" = "DEAD" ] && WARN_LIST+=("OGN_DECODE_DEAD")
[ "$USB_RTL" = "0" ] && WARN_LIST+=("USB_MISSING")
if [ -n "$CPU_TEMP" ]; then
    TEMP_INT=${CPU_TEMP%.*}
    [ "$TEMP_INT" -ge 80 ] 2>/dev/null && WARN_LIST+=("HIGH_TEMP")
fi
WARNINGS=$(IFS=,; echo "${WARN_LIST[*]}")

# JSON helper: output number or null
json_num() { [ -n "$1" ] && echo "$1" || echo "null"; }
# JSON helper: output quoted string or null
json_str() { [ -n "$1" ] && echo "\"$1\"" || echo "null"; }

# Build JSON payload
JSON=$(cat <<EOF
{
  "timestamp": "$TIMESTAMP",
  "uptime_s": $(json_num "$UPTIME"),
  "cpu_temp_c": $(json_num "$CPU_TEMP"),
  "core_voltage": $(json_num "$CORE_VOLTAGE"),
  "throttle_raw": $(json_str "$THROTTLE_RAW"),
  "throttle_flags": $(json_str "$THROTTLE_FLAGS"),
  "cpu_load": $(json_num "$CPU_LOAD"),
  "mem_avail_mb": $(json_num "$MEM_AVAIL"),
  "wifi_ssid": $(json_str "$WIFI_SSID"),
  "wifi_signal": $(json_num "$WIFI_SIGNAL"),
  "usb_rtl_count": $(json_num "$USB_RTL"),
  "ogn_rf_status": $(json_str "$OGN_RF"),
  "ogn_decode_status": $(json_str "$OGN_DECODE"),
  "aprs_lines": $(json_num "$APRS_LINES"),
  "warnings": $(json_str "$WARNINGS")
}
EOF
)

# POST to dashboard
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $OGN_DASHBOARD_API_KEY" \
    -d "$JSON" \
    "${OGN_DASHBOARD_URL}/api/receivers/${OGN_RECEIVER_ID}/health")

if [ "$HTTP_CODE" = "200" ]; then
    echo "$(date -u +"%Y-%m-%dT%H:%M:%SZ") OK"
else
    echo "$(date -u +"%Y-%m-%dT%H:%M:%SZ") ERROR: HTTP $HTTP_CODE"
fi
