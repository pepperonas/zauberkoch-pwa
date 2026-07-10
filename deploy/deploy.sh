#!/usr/bin/env bash
# Zauberkoch deploy: tests -> build -> rsync -> restart -> healthcheck
# Usage: ./deploy/deploy.sh [backend|frontend|all]   (default: all)
set -euo pipefail

TARGET="${1:-all}"
VPS="root@69.62.121.168"
REPO="$(cd "$(dirname "$0")/.." && pwd)"

log() { printf '\n\033[1;33m▶ %s\033[0m\n' "$*"; }

# --- Tests (always, both suites) ---
log "Backend-Tests"
(cd "$REPO/backend" && .venv/bin/pytest -q)
log "Frontend-Tests"
(cd "$REPO/frontend" && npm test -- --run)

if [[ "$TARGET" == "backend" || "$TARGET" == "all" ]]; then
  log "Backend-Sync"
  rsync -avz --delete \
    --exclude '.venv' --exclude 'data' --exclude '.env' \
    --exclude '__pycache__' --exclude '.pytest_cache' --exclude 'tests' \
    "$REPO/backend/" "$VPS:/opt/zauberkoch-api/"
  log "Backend: deps + migrations + restart"
  ssh "$VPS" 'set -e; cd /opt/zauberkoch-api
    .venv/bin/pip install -q -r requirements.txt
    .venv/bin/alembic upgrade head
    systemctl restart zauberkoch-api
    systemctl is-active zauberkoch-api'
fi

if [[ "$TARGET" == "frontend" || "$TARGET" == "all" ]]; then
  log "Frontend-Build"
  (cd "$REPO/frontend" && npm run build)
  log "Frontend-Sync"
  rsync -avz --delete "$REPO/frontend/dist/" "$VPS:/var/www/zauberkoch.de/"
fi

log "Healthcheck"
sleep 1
curl -sf https://zauberkoch.de/api/v1/health && printf '\n\033[1;32m✔ Deploy OK\033[0m\n'
