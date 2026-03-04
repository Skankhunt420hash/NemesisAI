# AGENTS.md

## Cursor Cloud specific instructions

### Overview

NemesisAI Creator App is a full-stack TypeScript application (React 18 + Express.js + PostgreSQL) for AI-powered app generation. See `replit.md` for architecture details.

### Prerequisites

- **Node.js 20** (the Dockerfile targets `node:20-alpine`; use `nvm use 20`)
- **PostgreSQL 16** running locally on port 5432

### Environment

The app does **not** auto-load `.env` files. You must export environment variables before running:

```sh
set -a && source .env && set +a
```

Required variables: `DATABASE_URL`, `SESSION_SECRET`. See `.env.example` for all options.

### Running services

1. **Start PostgreSQL**: `sudo pg_ctlcluster 16 main start`
2. **Push DB schema** (if tables missing): `DATABASE_URL=... npx drizzle-kit push`
3. **Start dev server**: `set -a && source .env && set +a && npm run dev`
   - Serves frontend (Vite HMR) + backend on `http://localhost:5000`
   - Health check: `GET /api/health`
   - Readiness check: `GET /api/ready`

### Key scripts (from `package.json`)

| Command | Purpose |
|---------|---------|
| `npm run dev` | Development server (tsx + Vite HMR) on port 5000 |
| `npm run build` | Production build via esbuild |
| `npm run check` | TypeScript type checking (`tsc --noEmit`) |
| `npm run db:push` | Push Drizzle schema to PostgreSQL |

### Known issues

- `npm run check` reports ~11 pre-existing TypeScript errors in `server/replit_integrations/` files. These are optional Replit-specific integrations and do not affect runtime.
- The app uses in-memory session store in development. Sessions are lost on server restart.
- AI code generation requires `OPENAI_API_KEY` to be set. Without it, the Forge agent returns an error but the rest of the UI works normally.
- Stripe integration is fully optional; payment UI is hidden when unconfigured.
