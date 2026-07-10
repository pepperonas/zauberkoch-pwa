#!/usr/bin/env bash
# Runs on raspi3 (cron, every 5 min): alert via ntfy when zauberkoch.de is down.
# 30-minute alert cooldown so a long outage doesn't spam.
set -u

TOPIC_FILE="/home/pi/.zauberkoch-ntfy-topic"
STATE="/tmp/zauberkoch-health-alerted"
TOPIC=$(cat "$TOPIC_FILE")

if curl -sf -m 10 https://zauberkoch.de/api/v1/health >/dev/null 2>&1; then
  if [ -f "$STATE" ]; then
    rm -f "$STATE"
    curl -s -m 10 -H "Title: Zauberkoch wieder online" -d "health OK" "https://ntfy.sh/$TOPIC" >/dev/null
  fi
  exit 0
fi

# down — alert unless we alerted in the last 30 minutes
if [ -f "$STATE" ] && [ $(( $(date +%s) - $(stat -c %Y "$STATE") )) -lt 1800 ]; then
  exit 0
fi
touch "$STATE"
curl -s -m 10 -H "Title: 🔴 zauberkoch.de DOWN" -H "Priority: high" \
  -d "Healthcheck fehlgeschlagen um $(date '+%H:%M')" "https://ntfy.sh/$TOPIC" >/dev/null
