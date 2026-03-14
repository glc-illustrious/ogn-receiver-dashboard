#!/bin/bash
# OGN Dashboard Pi Health Push - Installer
# Run this on the Raspberry Pi to set up health monitoring.
#
# Usage:
#   curl -sL https://raw.githubusercontent.com/glc-illustrious/ogn-receiver-dashboard/main/pi/install.sh | bash
#
# Or manually:
#   bash install.sh

set -euo pipefail

SCRIPTS_DIR="/home/pi/scripts"
CONFIG_FILE="/home/pi/.ogn-dashboard.env"

echo "=== OGN Dashboard Health Push Installer ==="
echo ""

# Create scripts directory
mkdir -p "$SCRIPTS_DIR"

# Download scripts
echo "→ Downloading scripts..."
REPO_BASE="https://raw.githubusercontent.com/glc-illustrious/ogn-receiver-dashboard/main/pi"
curl -sL "$REPO_BASE/ogn-diagnostics.sh" -o "$SCRIPTS_DIR/ogn-diagnostics.sh"
curl -sL "$REPO_BASE/ogn-push-health.sh" -o "$SCRIPTS_DIR/ogn-push-health.sh"
chmod +x "$SCRIPTS_DIR/ogn-diagnostics.sh" "$SCRIPTS_DIR/ogn-push-health.sh"
echo "  ✓ Scripts installed to $SCRIPTS_DIR"

# Create config if it doesn't exist
if [ ! -f "$CONFIG_FILE" ]; then
    echo ""
    echo "→ Creating config file..."

    read -rp "  Dashboard URL [https://ogn.besters.digital]: " DASHBOARD_URL
    DASHBOARD_URL="${DASHBOARD_URL:-https://ogn.besters.digital}"

    read -rp "  Receiver ID (e.g., EHGR): " RECEIVER_ID
    if [ -z "$RECEIVER_ID" ]; then
        echo "ERROR: Receiver ID is required"
        exit 1
    fi

    read -rp "  API Key: " API_KEY
    if [ -z "$API_KEY" ]; then
        echo "ERROR: API Key is required"
        exit 1
    fi

    cat > "$CONFIG_FILE" <<EOF
OGN_DASHBOARD_URL=$DASHBOARD_URL
OGN_RECEIVER_ID=$RECEIVER_ID
OGN_DASHBOARD_API_KEY=$API_KEY
EOF
    chmod 600 "$CONFIG_FILE"
    echo "  ✓ Config written to $CONFIG_FILE"
else
    echo "  ✓ Config already exists at $CONFIG_FILE"
fi

# Create log file with correct permissions
sudo touch /var/log/ogn-diagnostics.log
sudo chown pi:pi /var/log/ogn-diagnostics.log
sudo touch /var/log/ogn-push-health.log
sudo chown pi:pi /var/log/ogn-push-health.log

# Set up crontab
echo ""
echo "→ Setting up crontab..."
CRON_DIAG="* * * * * $SCRIPTS_DIR/ogn-diagnostics.sh"
CRON_PUSH="* * * * * sleep 30 && $SCRIPTS_DIR/ogn-push-health.sh >> /var/log/ogn-push-health.log 2>&1"

# Check if entries already exist
CURRENT_CRON=$(crontab -l 2>/dev/null || echo "")
CHANGED=false

if ! echo "$CURRENT_CRON" | grep -qF "ogn-diagnostics.sh"; then
    CURRENT_CRON=$(echo "$CURRENT_CRON"; echo "$CRON_DIAG")
    CHANGED=true
fi

if ! echo "$CURRENT_CRON" | grep -qF "ogn-push-health.sh"; then
    CURRENT_CRON=$(echo "$CURRENT_CRON"; echo "$CRON_PUSH")
    CHANGED=true
fi

if [ "$CHANGED" = true ]; then
    echo "$CURRENT_CRON" | crontab -
    echo "  ✓ Crontab entries added"
else
    echo "  ✓ Crontab entries already present"
fi

# Run diagnostics once to generate initial log
echo ""
echo "→ Running initial diagnostics collection..."
"$SCRIPTS_DIR/ogn-diagnostics.sh"
echo "  ✓ Diagnostics collected"

# Test the push
echo ""
echo "→ Testing health push..."
if "$SCRIPTS_DIR/ogn-push-health.sh"; then
    echo "  ✓ Health push successful!"
else
    echo "  ✗ Health push failed. Check your config."
    exit 1
fi

echo ""
echo "=== Installation complete! ==="
echo ""
echo "Health data will be pushed to the dashboard every minute."
echo "View logs: tail -f /var/log/ogn-push-health.log"
echo "View diagnostics: tail -f /var/log/ogn-diagnostics.log"
