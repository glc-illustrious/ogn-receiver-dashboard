#!/bin/bash
# OGN Dashboard Health Push Script
# Parses the last line of ogn-diagnostics.log and POSTs to the dashboard API.
#
# Install:
#   1. Copy to /home/pi/scripts/ogn-push-health.sh
#   2. chmod +x /home/pi/scripts/ogn-push-health.sh
#   3. Create /home/pi/.ogn-dashboard.env with:
#      OGN_DASHBOARD_URL=https://ogn-dashboard.example.com
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

# Parse diagnostics fields
parse_field() {
    echo "$LAST_LINE" | grep -oP "$1" | head -1 || echo ""
}

UPTIME=$(parse_field 'uptime=\K\d+' || echo "")
CPU_TEMP=$(parse_field 'cpu_temp=\K[\d.]+' || echo "")
CORE_VOLTAGE=$(parse_field 'core_voltage=\K[\d.]+' || echo "")
THROTTLE_RAW=$(parse_field 'throttle=\K0x[0-9a-fA-F]+' || echo "")
CPU_LOAD=$(parse_field 'cpu_load=\K[\d.]+' || echo "")
MEM_AVAIL=$(parse_field 'mem_avail=\K\d+' || echo "")
WIFI_SSID=$(parse_field 'wifi_ssid=\K[^\s]+' || echo "")
WIFI_SIGNAL=$(parse_field 'wifi_signal=\K-?\d+' || echo "")
USB_RTL=$(parse_field 'usb_rtl=\K\d+' || echo "")
OGN_RF=$(parse_field 'ogn_rf=\K\w+' || echo "")
OGN_DECODE=$(parse_field 'ogn_decode=\K\w+' || echo "")
APRS_LINES=$(parse_field 'aprs_lines=\K\d+' || echo "")

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
WARNINGS=""
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

# Build JSON payload
JSON=$(cat <<EOF
{
  "timestamp": "$TIMESTAMP",
  "uptime_s": ${UPTIME:-null},
  "cpu_temp_c": ${CPU_TEMP:-null},
  "core_voltage": ${CORE_VOLTAGE:-null},
  "throttle_raw": ${THROTTLE_RAW:+\"$THROTTLE_RAW\"},
  "throttle_flags": ${THROTTLE_FLAGS:+\"$THROTTLE_FLAGS\"},
  "cpu_load": ${CPU_LOAD:-null},
  "mem_avail_mb": ${MEM_AVAIL:-null},
  "wifi_ssid": ${WIFI_SSID:+\"$WIFI_SSID\"},
  "wifi_signal": ${WIFI_SIGNAL:-null},
  "usb_rtl_count": ${USB_RTL:-null},
  "ogn_rf_status": ${OGN_RF:+\"$OGN_RF\"},
  "ogn_decode_status": ${OGN_DECODE:+\"$OGN_DECODE\"},
  "aprs_lines": ${APRS_LINES:-null},
  "warnings": ${WARNINGS:+\"$WARNINGS\"}
}
EOF
)

# Clean up null strings for missing optional fields
JSON=$(echo "$JSON" | sed 's/: ,/: null,/g; s/: $/: null/g; s/: }$/: null}/g')

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
