#!/bin/bash
set -e

echo "=== NemesisAI Deployment ==="
echo ""

if [ ! -f .env ]; then
  echo "Creating .env file..."
  cat > .env << 'ENVFILE'
# Database
DATABASE_URL=postgresql://nemesis:nemesis_secure_pw_2026@db:5432/nemesisai
POSTGRES_PASSWORD=nemesis_secure_pw_2026

# Session
SESSION_SECRET=CHANGE_ME_TO_A_RANDOM_STRING_64_CHARS

# OpenAI
AI_INTEGRATIONS_OPENAI_API_KEY=sk-your-openai-key-here

# Stripe
STRIPE_SECRET_KEY=sk_live_your-stripe-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret

# Role Whitelists
SUPERADMIN_EMAILS=elbbucheli@gmail.com,elija.fantasy@gmail.com,buchelielija@gmail.com,elbbucheli5000@gmail.com
PREMIUM_EMAILS=elbbucheli@gmail.com,elija.fantasy@gmail.com,buchelielija@gmail.com,elbbucheli5000@gmail.com,joshua.bucheli97@gmail.com
ENVFILE
  echo "IMPORTANT: Edit .env with your real secrets before deploying!"
  echo ""
fi

VERSION=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
echo "Deploying version: $VERSION"
echo ""

echo "Step 1: Pull latest code"
git pull

echo ""
echo "Step 2: Build containers"
APP_VERSION=$VERSION docker compose build

echo ""
echo "Step 3: Push database schema (Drizzle)"
APP_VERSION=$VERSION docker compose run --rm app npx drizzle-kit push --force 2>/dev/null || echo "Schema push will run on first start"

echo ""
echo "Step 4: Start containers"
APP_VERSION=$VERSION docker compose up -d

echo ""
echo "Step 5: Wait for readiness..."
sleep 5

for i in $(seq 1 10); do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/ready 2>/dev/null || echo "000")
  if [ "$STATUS" = "200" ]; then
    echo "App is ready!"
    break
  fi
  echo "Waiting... ($i/10)"
  sleep 3
done

echo ""
echo "=== Deployment complete! ==="
echo "Version: $VERSION"
echo "Your app should be live at: https://nemesiscreator.com"
echo ""
echo "Health check:  curl https://nemesiscreator.com/api/health"
echo "Ready check:   curl https://nemesiscreator.com/api/ready"
echo ""
echo "Useful commands:"
echo "  docker compose logs -f app     # View app logs"
echo "  docker compose logs -f nginx   # View nginx logs"
echo "  docker compose restart app     # Restart app"
echo "  docker compose down            # Stop everything"
echo "  docker compose up -d --build   # Rebuild and start"
