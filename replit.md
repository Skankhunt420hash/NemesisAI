# NemesisAI - The Ultimate Creator

## Overview

NemesisAI is a high-end AI-powered SaaS platform ($19/month) for iterative app development. Users can describe apps using text or voice commands and receive generated code with live preview. The platform features:

- **Voice Control**: Speech-to-text using OpenAI Whisper API for hands-free development
- **Split-Screen Interface**: Chat/voice panel on left, live preview on right
- **Incremental Updates**: AI modifies code step-by-step based on user commands
- **Multi-Platform Export**: Web apps with instant preview, React Native ZIP packages
- **"Eternal Night" Design**: Pure black background, gold accents, violet glow effects

The application follows a full-stack TypeScript architecture with a React frontend and Express backend, using PostgreSQL for data persistence.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack React Query for server state, React Context for auth state
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom CSS variables for theming (dark mode with gold accent color scheme)
- **Build Tool**: Vite with HMR support

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **API Pattern**: RESTful JSON API endpoints under `/api/*`
- **Session Management**: express-session with PostgreSQL session store (connect-pg-simple)
- **Authentication**: Session-based auth with bcrypt password hashing
- **AI Integration**: OpenAI API via Replit AI Integrations for code generation

### Data Storage
- **Database**: PostgreSQL with Drizzle ORM
- **Schema Location**: `shared/schema.ts` contains all table definitions
- **Tables**:
  - `users`: User accounts with email/password, admin/pro flags, Stripe IDs
  - `generatedApps`: Stored generated applications linked to users
  - `conversations` and `messages`: Chat history for AI interactions

### Authentication & Authorization
- Session-based authentication stored in PostgreSQL
- Three access levels: public, authenticated, and Pro subscription
- Middleware functions: `requireAuth`, `requirePro`, `requireAdmin`
- Stripe integration for subscription management

### Build System
- Development: Vite dev server with HMR proxied through Express
- Production: Vite builds frontend to `dist/public`, esbuild bundles server to `dist/index.cjs`
- Database migrations: Drizzle Kit with `db:push` command

## External Dependencies

### AI Services
- **OpenAI API**: Used for code generation via Replit AI Integrations
- Environment variables: `AI_INTEGRATIONS_OPENAI_API_KEY`, `AI_INTEGRATIONS_OPENAI_BASE_URL`

### Payment Processing
- **Stripe**: Subscription billing for Pro tier
- Uses `stripe-replit-sync` for webhook handling and schema management
- Credentials fetched dynamically via Replit Connectors API

### Database
- **PostgreSQL**: Primary data store
- Connection via `DATABASE_URL` environment variable
- Drizzle ORM for type-safe queries

### Replit Integrations
- Audio transcription using OpenAI gpt-4o-mini-transcribe model
- Image generation capabilities
- Batch processing utilities with rate limiting
- Chat storage and routing helpers

## Recent Changes (Feb 2026)

### Voice Control Feature
- Added `useVoiceRecorder` hook for microphone recording
- Created `/api/transcribe` endpoint using OpenAI Whisper API
- VoiceButton component with recording state indicators
- Audio converted to WAV via FFmpeg before transcription

### Split-Screen Dashboard
- Left panel (400px): Chat history, voice/text input, app settings
- Right panel: Tabbed interface with Live Preview, Code, and History
- SimulationFact component shows Matrix-style messages during generation

### Incremental Code Updates
- Context-aware prompting detects modification commands
- Preserves existing code when user requests changes
- Supports commands: change, update, modify, add, remove, fix

### Pricing
- Pro subscription: $19/month (changed from $29)
- Features: Voice control, live preview, web/native export