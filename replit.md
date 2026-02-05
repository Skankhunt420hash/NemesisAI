# NemesisAI - Creator App

**Everything is possible if you want it.**

## Overview

NemesisAI - Creator App is a high-end AI-powered SaaS platform ($19/month) for iterative app development. Users can describe apps using text or voice commands and receive generated code with live preview. The platform features:

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

### The Forge - 4-Tier App Selection
- New `/forge` page replaces dashboard as main interface
- 4 luxury selection cards with Cyber-Luxury design:
  - **WEB APP**: React + TypeScript + Tailwind
  - **3D GAME**: Three.js + React Three Fiber
  - **VR WORLD**: A-Frame + WebXR
  - **NATIVE APP**: React Native + Expo
- Split-screen chat opens after selection

### Admin Bypass System
- Admin email: `elbbucheli@gmail.com` auto-set as admin on registration
- Admins have full Pro access without Stripe subscription checks
- Admin middleware: `requireAdmin` for protected endpoints

### The Archive - Project Library
- New `/archive` page for published projects
- Users can publish/unpublish their apps
- Preview functionality with live iframe rendering
- Filter by published/draft status

### Mobile-First Design
- Bottom navigation: Forge, Archive, Profile, Settings
- Responsive layouts with mobile breakpoints
- Touch-friendly interfaces

### Cyber-Luxury Design System
- Deep obsidian background (`.obsidian-bg`)
- Neon-purple glow effects (`.neon-purple-border`, `.neon-purple-glow`)
- Gold accent colors for primary actions
- Glass-style cards (`.forge-card`, `.cyber-glass`)

### Voice Control Feature
- Added `useVoiceRecorder` hook for microphone recording
- Created `/api/transcribe` endpoint using OpenAI Whisper API
- VoiceButton component with recording state indicators

### React Native Export
- POST `/api/export-native` generates ZIP packages
- Includes package.json, app.json, App.js, README.md
- Ready for Expo deployment

### Iterative App Factory Workflow
- Persistent project sessions with chat history stored in database
- POST `/api/projects` creates new project with unique viewToken
- POST `/api/projects/:id/iterate` for SSE streaming code updates
- Code is modified incrementally based on user prompts, not replaced
- Chat history displayed in left panel, preserves conversation context
- "Continue Working" section shows recent projects on Forge homepage

### Live Link System
- Primary public URL: GET `/launch/:id` serves live HTML preview using project ID
- Legacy route: GET `/view/:token` redirects to `/launch/:id`
- Works for React, Three.js, and A-Frame apps
- Live link displayed in chat panel and archive with copy and external link buttons
- Archive page has "Launch" button for each project to open in new tab

### FINISH Button
- POST `/api/projects/:id/finalize` marks project complete
- Sets `isFinalized=true` and `isPublished=true`
- Published badge shown in UI after finalization

### Simulation Theory Loading Screens
- Scientific facts about simulation theory during code generation
- Quotes from Nick Bostrom, Max Tegmark, John Wheeler
- Quantum mechanics, holographic principle, observer effect explanations

### Pricing
- Pro subscription: $19/month
- Features: Voice control, live preview, all 4 app types, native export, iterative workflow