#!/bin/bash
set -e

echo "=== NemesisAI DigitalOcean Deployment ==="
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

echo "Step 1: Install SSL certificate (if not done)"
if [ ! -d "/etc/letsencrypt/live/nemesiscreator.com" ]; then
  echo "Installing certbot and getting SSL certificate..."
  apt-get update && apt-get install -y certbot
  certbot certonly --standalone -d nemesiscreator.com -d www.nemesiscreator.com --non-interactive --agree-tos --email elbbucheli@gmail.com
  echo "SSL certificate installed!"
else
  echo "SSL certificate already exists."
fi

echo ""
echo "Step 2: Build and start containers"
docker compose down 2>/dev/null || true
docker compose up -d --build

echo ""
echo "Step 3: Wait for database to be ready..."
sleep 5

echo ""
echo "Step 4: Push database schema"
docker compose exec app node -e "
const { execSync } = require('child_process');
try { execSync('npx drizzle-kit push', { stdio: 'inherit' }); }
catch(e) { console.log('Schema push might need manual run'); }
"

echo ""
echo "=== Deployment complete! ==="
echo "Your app should be live at: https://nemesiscreator.com"
echo ""
echo "Useful commands:"
echo "  docker compose logs -f app     # View app logs"
echo "  docker compose logs -f nginx   # View nginx logs"
echo "  docker compose restart app     # Restart app"
echo "  docker compose down            # Stop everything"
echo "  docker compose up -d --build   # Rebuild and start"
