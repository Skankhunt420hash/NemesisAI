#!/usr/bin/env bash
set -euo pipefail

DOMAIN="${1:-${APP_DOMAIN:-}}"

echo "=== NemesisAI Server Diagnose ==="
echo

echo "[1] Docker services"
docker compose ps
echo

echo "[2] Recent logs (app/proxy)"
docker compose logs --tail=80 app proxy || true
echo

echo "[3] Local health check"
curl -sS -i http://localhost:5000/api/health || true
echo

if [ -n "$DOMAIN" ]; then
  echo "[4] Domain health check: $DOMAIN"
  curl -sS -I "http://$DOMAIN" || true
  curl -sS -I "https://$DOMAIN" || true
  curl -sS -I "https://$DOMAIN/api/health" || true
fi
