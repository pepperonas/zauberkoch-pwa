#!/usr/bin/env bash
# Runs on raspi3 (cron, daily 05:00): pull the newest DB backup off the VPS.
# Off-site copy — the VPS backup timer alone protects only against app bugs,
# not against loss of the VPS itself.
set -euo pipefail

VPS="root@69.62.121.168"
DEST="/home/pi/zauberkoch-backup"
KEEP_DAYS=14

mkdir -p "$DEST"
LATEST=$(ssh -i /home/pi/.ssh/id_zauberkoch_backup "$VPS" 'ls -t /var/backups/zauberkoch/*.gz 2>/dev/null | head -1')
if [ -z "$LATEST" ]; then
  echo "no backup found on VPS" >&2
  exit 1
fi
scp -q -i /home/pi/.ssh/id_zauberkoch_backup "$VPS:$LATEST" "$DEST/"
find "$DEST" -name '*.gz' -mtime +"$KEEP_DAYS" -delete
echo "pulled $(basename "$LATEST")"
