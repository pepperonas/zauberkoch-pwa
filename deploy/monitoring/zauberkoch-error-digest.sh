#!/usr/bin/env bash
# Runs on the VPS (cron, daily 06:30): ntfy digest when the API logged errors
# in the last 24h. Silent when everything is fine.
set -u

TOPIC=$(cat /opt/zauberkoch-api/.ntfy-topic)
ERRORS=$(journalctl -u zauberkoch-api --since "-24 hours" --no-pager -o cat 2>/dev/null \
  | grep -E '"level": "(ERROR|CRITICAL)"' | head -20)

if [ -n "$ERRORS" ]; then
  COUNT=$(printf '%s\n' "$ERRORS" | wc -l)
  curl -s -m 10 -H "Title: ⚠️ Zauberkoch: $COUNT Fehler in 24h" \
    -d "$(printf '%s' "$ERRORS" | head -c 3500)" "https://ntfy.sh/$TOPIC" >/dev/null
fi
