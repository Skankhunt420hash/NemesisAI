# NemesisAI - Creator App

## Overview

NemesisAI - Creator App is a high-end AI-powered SaaS platform designed for iterative app development. It allows users to describe applications using text or voice commands, generating code with a live preview. The platform aims to provide a seamless development experience, enabling rapid prototyping and deployment across various platforms. Key capabilities include voice control, a split-screen interface for development and preview, incremental code updates driven by AI, and multi-platform export options for web apps and React Native. The project envisions becoming a leading tool for developers, offering an "everything is possible" approach to application creation.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter
- **State Management**: TanStack React Query for server state, React Context for authentication
- **UI Components**: shadcn/ui on Radix UI primitives
- **Styling**: Tailwind CSS with custom CSS variables, dark mode with gold accent
- **Build Tool**: Vite with HMR
- **UI/UX Design**: "100M$ UI" with Deep Space Black (#070A0F), glassmorphism, neon cyan/violet/gold accents. Uses Sora font for headings and Inter for body text. Features Framer Motion for animations.
- **Key Features**: Split-screen chat/voice panel with live preview, Forge for app type selection (Web, 3D Game, VR, Native), Archive for project library, Workspace IDE with Monaco Editor, file explorer, agent chat, terminal, and resizable panels. TaskTimeline and RuntimeInspector for preview status and logs.

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **API Pattern**: RESTful JSON API endpoints
- **Session Management**: express-session with PostgreSQL store
- **Authentication**: Session-based with bcrypt hashing; supports public, authenticated, and Pro subscription access levels.
- **AI Integration**: OpenAI API for code generation, integrated via Replit AI.
- **Core Workflow**: Iterative App Factory for persistent project sessions, incremental code updates via Server-Sent Events (SSE), and AI-driven code modification based on user prompts.
- **Admin System**: Admin bypass for Pro features, `requireAdmin` middleware.
- **Error Handling**: Standardized structured errors `{ error, code, action }` with specific codes: `INVALID_CREDENTIALS`, `DB_DOWN`, `DB_NOT_CONFIGURED`, `VALIDATION_ERROR`, `EMAIL_EXISTS`, `SERVER_ERROR`.
- **Role-Based Access**: Email whitelisting for SUPERADMIN_EMAILS and PREMIUM_EMAILS environment variables.
- **Password Reset**: Secure flow with token-based reset.
- **Health Endpoints**: `GET /api/health` (basic ok + version), `GET /api/ready` (DB + ENV checks, returns 503 if not ready).
- **Safe Mode**: Frontend polls `/api/ready` every 30s. If not ready, login/register are disabled with an amber "Safe Mode" banner showing the specific error reason.
- **APP_VERSION**: Exposed via health/ready endpoints, displayed in UI footer. Set via Docker build arg from git SHA in deploy.sh.
- **Preview System**: Backend endpoints for managing preview server status, starting/stopping, auto-fixing, and retrieving logs.

### Data Storage
- **Database**: PostgreSQL with Drizzle ORM
- **Schema**: Defined in `shared/schema.ts`
- **Tables**: `users`, `generatedApps`, `conversations`, `messages`, `password_reset_tokens`, `releases`.

### Enterprise AI Features (High-Level)
- **GOD-MODE AGENT**: Autonomous issue detection and fixing.
- **LIVE SELF-TESTING AI**: AI-driven testing of app functionality.
- **DECISION MEMORY**: Learns user preferences for frameworks, styling, etc.
- **VISUAL APP BRAIN**: Graph-based visualization of app structure.
- **RUNTIME AWARENESS ENGINE**: Real-time monitoring of dev server, build status, and API health.
- **ONE-CLICK APP HARDENING**: Production-ready checks and optimizations.
- **INTENT-DRIVEN DEVELOPMENT**: AI adjusts UX/UI based on emotional intent.
- **MULTI-AGENT SWARM**: Specialized agents (Architect, UI/UX, Security, QA, Runtime) for collaborative development.
- **EXPLAIN-MY-APP MODE**: Generates architecture overviews and data flow analysis.
- **APP DNA EXPORT**: Captures and re-applies architectural decisions.
- **REVENUE-AWARE AI**: Provides monetization and conversion optimization suggestions.
- **PANIC BUTTON / SAFE MODE**: One-click restore to a stable state.
- **NEMESIS CONFIDENCE SCORE™**: Provides stability, security, UX, and scalability scores.

### Self-Hosted Deployment
- **Fully Decoupled from Replit**: All Replit-specific features (audio integration, Stripe connector, Vite plugins) are optional with graceful fallbacks.
- **Docker Compose**: `docker compose up -d` starts web app + PostgreSQL + nginx (HTTPS reverse proxy).
- **Session Store**: In-memory for development, PostgreSQL (`connect-pg-simple`) for production.
- **Stripe**: Fully optional. Accepts `STRIPE_SECRET_KEY` env var directly or Replit connector. If neither is set, payment features are disabled gracefully.
- **OpenAI**: Accepts `OPENAI_API_KEY` or `AI_INTEGRATIONS_OPENAI_API_KEY` (Replit).
- **Audio Transcription**: Falls back to OpenAI Whisper if Replit audio integration is unavailable.
- **Configuration**: `.env.example` documents all required and optional environment variables.
- **Deploy Script**: `deploy.sh` handles build, schema push, and readiness checks.

## External Dependencies

- **AI Services**:
    - **OpenAI API**: For code generation and audio transcription. Supports direct `OPENAI_API_KEY` or Replit AI integration.
- **Payment Processing (Optional)**:
    - **Stripe**: For subscription management. Works with `STRIPE_SECRET_KEY` env var or Replit Stripe connector. Disabled if not configured.
- **Database**:
    - **PostgreSQL**: Primary data store. Auto-configured via docker-compose or set `DATABASE_URL` directly.
- **Replit Integrations (Optional)**:
    - Audio transcription, image generation, batch processing, chat helpers - all degrade gracefully when unavailable.
- **Deployment**:
    - **Self-Hosted**: Docker Compose with web app + PostgreSQL + nginx. Works on any Linux server (DigitalOcean, AWS, etc.).
    - **deploy.sh flow**: Build containers → Start DB → Schema push → Start all → Readiness check.
    - **Cache Busting**: Vite production builds use content-hashed filenames by default (`[name]-[hash].js`).
    - **Docker Healthcheck**: Dockerfile includes `HEALTHCHECK` pointing to `/api/health`.