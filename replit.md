# NemesisAI - App Creator Platform

## Overview

NemesisAI is an AI-powered application generator that allows users to describe an app in natural language and receive generated code. The platform features user authentication, a subscription-based Pro tier with Stripe integration, and supports multiple programming languages for code generation.

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
- Audio processing utilities for voice chat (speech-to-text, text-to-speech)
- Image generation capabilities
- Batch processing utilities with rate limiting
- Chat storage and routing helpers