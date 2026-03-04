#!/bin/bash
set -e

echo "=== NemesisAI Self-Hosted Deployment ==="
echo ""

if [ ! -f .env ]; then
  echo "No .env file found. Creating from .env.example..."
  if [ -f .env.example ]; then
    cp .env.example .env
  else
    cat > .env << 'ENVFILE'
# ===== REQUIRED =====
SESSION_SECRET=CHANGE_ME_TO_A_RANDOM_STRING_64_CHARS
OPENAI_API_KEY=sk-your-openai-key-here

# ===== DATABASE (auto-configured for docker-compose) =====
POSTGRES_USER=nemesis
POSTGRES_PASSWORD=CHANGE_ME_TO_A_SECURE_PASSWORD
POSTGRES_DB=nemesisai

# ===== OPTIONAL =====
# APP_DOMAIN=yourdomain.com
# STRIPE_SECRET_KEY=
# STRIPE_PUBLISHABLE_KEY=
# STRIPE_WEBHOOK_SECRET=
# SUPERADMIN_EMAILS=admin@example.com
# PREMIUM_EMAILS=premium@example.com
# SELF_HOST_OPEN_ACCESS=true
ENVFILE
  fi
  echo ""
  echo "IMPORTANT: Edit .env with your real secrets before deploying!"
  echo "At minimum, set SESSION_SECRET and OPENAI_API_KEY"
  echo ""
  exit 1
fi

VERSION=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
echo "Deploying version: $VERSION"
echo ""

echo "Step 1: Build containers"
APP_VERSION=$VERSION docker compose build

echo ""
echo "Step 2: Start database"
APP_VERSION=$VERSION docker compose up -d db
echo "Waiting for database to be ready..."
sleep 5

echo ""
echo "Step 3: Push database schema"
APP_VERSION=$VERSION docker compose run --rm app npx drizzle-kit push --force 2>/dev/null || echo "Schema push will run on app start"

echo ""
echo "Step 4: Start all services"
APP_VERSION=$VERSION docker compose up -d

echo ""
echo "Step 5: Wait for readiness..."
sleep 5

for i in $(seq 1 15); do
  STATUS=$(curl -s -o /tmp/nemesis-ready.json -w "%{http_code}" http://localhost:5000/api/ready 2>/dev/null || echo "000")
  if [ "$STATUS" = "200" ]; then
    echo "App is ready!"
    break
  fi
  if [ "$i" = "15" ]; then
    echo "App is not ready yet. Check logs: docker compose logs -f app"
    if [ -f /tmp/nemesis-ready.json ]; then
      echo "Last /api/ready response:"
      cat /tmp/nemesis-ready.json
      echo ""
    fi
  else
    echo "Waiting... ($i/15)"
    sleep 3
  fi
done

DOMAIN=$(grep APP_DOMAIN .env 2>/dev/null | grep -v "^#" | cut -d= -f2 | tr -d ' ')

echo ""
echo "=== Deployment complete! ==="
echo "Version: $VERSION"
if [ -n "$DOMAIN" ]; then
  echo "Your app: https://$DOMAIN"
  echo "Health:   curl https://$DOMAIN/api/health"
else
  echo "Your app: http://localhost:5000"
  echo "Health:   curl http://localhost:5000/api/health"
fi
echo ""
echo "Commands:"
echo "  docker compose logs -f app proxy   # View app/proxy logs"
echo "  docker compose restart app     # Restart app"
echo "  docker compose down            # Stop everything"
echo "  docker compose up -d --build   # Rebuild and start"
