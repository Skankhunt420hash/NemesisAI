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
- **Error Handling**: Standardized structured errors `{ error, code, action }`.
- **Role-Based Access**: Email whitelisting for SUPERADMIN_EMAILS and PREMIUM_EMAILS environment variables.
- **Password Reset**: Secure flow with token-based reset.
- **Preview System**: Backend endpoints for managing preview server status, starting/stopping, auto-fixing, and retrieving logs.

### Data Storage
- **Database**: PostgreSQL with Drizzle ORM
- **Schema**: Defined in `shared/schema.ts`
- **Tables**: `users`, `generatedApps`, `conversations`, `messages`, `password_reset_tokens`.

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

## External Dependencies

- **AI Services**:
    - **OpenAI API**: For code generation and audio transcription (via Replit AI Integrations).
- **Payment Processing**:
    - **Stripe**: For subscription management and billing, integrated with `stripe-replit-sync`.
- **Database**:
    - **PostgreSQL**: Primary data store, accessed via `DATABASE_URL`.
- **Replit Integrations**:
    - Utilized for various functionalities including AI model access, image generation, batch processing, and chat helpers.
- **Deployment**:
    - **DigitalOcean**: Deployment files (`Dockerfile`, `docker-compose.yml`, `nginx.conf`, `deploy.sh`) are prepared for DigitalOcean infrastructure.