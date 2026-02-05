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

### FINISH Button with Privacy Options
- POST `/api/projects/:id/finalize` marks project complete with `isPublished` parameter
- Users can choose "Private" (only visible to owner) or "Published" (visible in library)
- Private apps show violet lock badge, Published apps show green users badge
- Private apps can be published later via Archive page

### Cursor-Style Preview System
- **TaskTimeline Component**: Shows build steps (scaffold, dependencies, generate, server, preview) with status icons
- **RuntimeInspector Component**: Terminal logs, console logs, network requests tabs
- **Preview Status Bar**: Shows current status (idle/installing/starting/running/error) with framework detection
- **Auto-Heal Functionality**: 
  - Start Preview button to initialize dev server simulation
  - Fix Preview button for one-click auto-repair when errors occur
  - Restart button for quick preview refresh
- **Build Step Tracking**: Each code generation updates timeline with success/error states
- **Backend Preview Endpoints**:
  - GET `/api/projects/:id/preview/status`: Get preview status and framework detection
  - POST `/api/projects/:id/preview/start`: Start preview server simulation
  - POST `/api/projects/:id/preview/stop`: Stop preview
  - POST `/api/projects/:id/preview/fix`: Auto-fix preview issues
  - GET `/api/projects/:id/preview/logs`: Get terminal logs

### Simulation Theory Loading Screens
- Scientific facts about simulation theory during code generation
- Quotes from Nick Bostrom, Max Tegmark, John Wheeler
- Quantum mechanics, holographic principle, observer effect explanations

### Enterprise AI Features (Feb 2026)

#### GOD-MODE AGENT
- Autonomous builder that detects and fixes issues without asking
- Scans for: broken imports, wrong ports, missing root elements, JSX class→className
- Works in loops: detect → analyze → fix → verify
- Auto-Fix toggle for automatic or manual fix application
- Real-time action log showing all agent activities

#### LIVE SELF-TESTING AI
- Tests the app like a human user would
- Validates: page visibility, button click handlers, form submissions, navigation links, user flows
- Detects: empty pages, buttons without handlers, forms without onSubmit, dead links
- Auto-fix capability for common issues
- Pass/Fail/Fixed summary with detailed test results

#### DECISION MEMORY
- Stores user preferences: frameworks, styling, architecture, workflow choices
- Categories: Framework, Styling, Architecture, Workflow, Custom
- Learns from code patterns automatically
- Usage tracking per preference
- Persists across sessions in localStorage
- "After 3+ projects, feels like a personal CTO"

#### VISUAL APP BRAIN (Graph View)
- Visual map of app structure
- Node types: Components, State, API calls, Pages, Dependencies
- Connection lines show relationships
- Click to select and see details
- Filter by node type
- Zoom in/out controls
- Edit button for direct code access

#### RUNTIME AWARENESS ENGINE
- Real-time monitoring dashboard
- Tracks: Dev server (online/offline/error), Build status, Memory usage, API health
- Framework auto-detection
- Uptime tracking
- Error and warning detection
- Live status indicator: Preview Live / Needs Fix / Waiting

#### FILE SAVE/LOAD
- Save unfinished apps as .nemesis files
- Download projects for offline backup
- Load previously saved projects
- Quick save/load to localStorage
- Preserves code, chat history, and preferences

#### ONE-CLICK APP HARDENING
- Production-ready button
- Security audit (XSS, CSRF, injection)
- ENV leak detection
- Debug code removal
- Bundle optimization analysis
- Lazy loading suggestions
- Risk score: LOW/MEDIUM/HIGH

#### INTENT-DRIVEN DEVELOPMENT
- Emotion-first development approach
- Presets: Feel Safe, Move Fast, Feel Welcome, Have Fun, Stay Focused
- Custom intent input
- Auto-adjusts UX, colors, copy, flow, button placement
- Ultra-rare emotion-driven apps

#### MULTI-AGENT SWARM
- 5 specialized agents working together:
  - Architect Agent (System Design)
  - UI/UX Agent (User Experience)
  - Security Agent (Vulnerability Analysis)
  - QA Agent (Quality Assurance)
  - Runtime Agent (Performance)
- Internal discussion with visible results
- Consensus-based decisions

#### EXPLAIN-MY-APP MODE
- One-button app explanation
- Architecture overview
- Data flow analysis
- Dependency mapping
- Impact analysis for changes
- ADHD-friendly, perfect for handoffs

#### APP DNA EXPORT
- Export architecture decisions
- Design patterns capture
- Build strategies
- Agent memory preferences
- Apply DNA to new projects
- IP-level value preservation

#### REVENUE-AWARE AI
- Economic thinking built-in
- Monetization suggestions
- Conversion break detection
- Paywall optimization
- User flow analysis
- Growth hacker functionality

#### PANIC BUTTON / SAFE MODE
- One-click restore to last stable state
- Automatic checkpoint creation
- Mark current as stable
- Recent checkpoints history
- Mental safety for developers

#### NEMESIS CONFIDENCE SCORE™
- Stability Score
- Security Score
- UX Quality Score
- Scalability Score
- Ship recommendation: "I would ship this."

### Pricing
- Pro subscription: $19/month
- Features: Voice control, live preview, all 4 app types, native export, iterative workflow, 14 AI Tools