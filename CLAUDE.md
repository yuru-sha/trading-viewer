# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TradingViewer is a modern web-based financial charting application built as a TradingView clone. It provides real-time market data visualization, technical analysis tools, and interactive charting capabilities for traders and investors.

### Current Implementation Status

- ✅ **Core Infrastructure**: Monorepo setup with pnpm workspaces
- ✅ **Backend API**: Express server with Finnhub integration, WebSocket support
- ✅ **Frontend Foundation**: React app with routing, state management, responsive design
- ✅ **Real-time Data**: WebSocket connections for live market data
- ✅ **Chart Visualization**: TradingView Lightweight Charts integration
- ✅ **Technical Indicators**: SMA, EMA, RSI, MACD, Bollinger Bands
- ✅ **Advanced Features**: Drawing tools, annotations, trading simulation
- ✅ **Testing Suite**: Unit tests, integration tests, E2E tests with Playwright
- ✅ **CI/CD Pipeline**: GitHub Actions with quality gates and automated deployment

## Architecture

### Monorepo Structure (pnpm workspace)

The project uses a monorepo architecture with the following packages:

- **`apps/client`** - React frontend application (Vite + TypeScript)
- **`apps/server`** - Express backend API (Node.js + TypeScript ESM)
- **`packages/shared`** - Shared types, utilities, validation schemas (Zod)
- **`packages/ui`** - Reusable React UI components with TailwindCSS

### Technology Stack

- **Frontend**: React 18, TypeScript, Vite, TailwindCSS, TradingView Lightweight Charts
- **Backend**: Express.js, TypeScript (ESM), Prisma ORM, PostgreSQL
- **External APIs**: Finnhub API for market data
- **Real-time**: WebSocket connections for live data streaming
- **Testing**: Vitest, React Testing Library, Playwright for E2E

### Key Dependencies

- `@trading-viewer/shared` and `@trading-viewer/ui` are used across both apps
- Client uses `@tanstack/react-query` for server state management
- Server integrates with Finnhub API and uses Prisma for database operations
- All packages use workspace dependencies (`workspace:*`)

## Development Commands

### Core Development

```bash
# Start both client and server in development mode
pnpm dev

# Start individual applications
pnpm dev:client  # React dev server on :3000
pnpm dev:server  # Express server on :8000

# Build all packages
pnpm build

# Run all tests
pnpm test
pnpm test:unit
pnpm test:e2e    # Playwright E2E tests (client only)
```

### Code Quality

```bash
# Lint and format
pnpm lint
pnpm lint:fix
pnpm format
pnpm type-check

# Comprehensive quality check
pnpm quality-check  # Runs lint + type-check + test:unit
```

### Database Operations

```bash
# Prisma database commands (server-specific)
pnpm db:generate  # Generate Prisma client
pnpm db:migrate   # Run database migrations
pnpm db:seed      # Seed database with sample data
pnpm db:reset     # Reset database
pnpm db:studio    # Open Prisma Studio
```

### Package Management

```bash
# Install dependencies
pnpm install

# Clean and reset
pnpm clean  # Remove dist folders and node_modules
pnpm reset  # Clean + fresh install
```

### Workspace-Specific Commands

```bash
# Run commands on specific packages
pnpm --filter @trading-viewer/client [command]
pnpm --filter @trading-viewer/server [command]
pnpm --filter packages/shared [command]
pnpm --filter packages/ui [command]
```

## Data Flow Architecture

### API Integration

- Frontend communicates with backend via `/api` routes (proxied through Vite dev server)
- Backend fetches real-time and historical data from Finnhub API
- Data is cached in PostgreSQL database using Prisma ORM
- WebSocket connections provide real-time market data streaming

### Type Safety

- All API contracts defined in `packages/shared/src/types/api.ts`
- Chart-related types in `packages/shared/src/types/chart.ts`
- WebSocket message types in `packages/shared/src/types/websocket.ts`
- Request validation using Zod schemas in `packages/shared/src/validation/`

### Component Architecture

- Shared UI components in `packages/ui` (Button, Input, Modal, etc.)
- Client-specific components in `apps/client/src/components/`
- Chart components integrate with TradingView Lightweight Charts library
- State management using React Context API and TanStack Query

### Build System

- Each package builds independently with TypeScript + tsup (for libraries)
- Client builds with Vite, includes chunk splitting for vendor/charts/query
- Server builds with TypeScript compiler to `dist/` directory
- Type definitions generated automatically for shared packages

## Environment Configuration

- Environment variables configured via `.env` files
- Development: Client on port 3000, Server on port 8000
- Database connection via `DATABASE_URL`
- Finnhub API integration via `FINNHUB_API_KEY`
- CORS configured for frontend-backend communication

## Import Aliases

### Client (`apps/client`)

- `@/*` - Client source files
- `@shared` - Shared package types and utilities
- `@ui` - UI component package

### Server (`apps/server`)

- `@shared` - Shared package (types, validation, constants)

## Testing Strategy

- **Unit tests**: Vitest for frontend, Jest for backend
- **Integration tests**: API endpoint testing with Supertest
- **E2E tests**: Playwright for full user journey testing
- **Visual regression**: Playwright screenshot comparison
- **Performance tests**: Lighthouse CI for Core Web Vitals
- **Coverage targets**: 25% lines/functions, 20% branches (initial phase)
- Test files use `.test.ts` or `.test.tsx` extensions

### Test Commands

```bash
# Run unit tests with coverage
pnpm --filter @trading-viewer/client test:unit --coverage
pnpm --filter @trading-viewer/server test:unit --coverage

# Run E2E tests
pnpm --filter @trading-viewer/client test:e2e

# Run all tests
pnpm test
```

## Key Features

### Trading Tools

- **Drawing Tools**: Trend lines, support/resistance levels, Fibonacci retracements
- **Annotations**: Text notes, arrows, shapes with drag-and-drop
- **Trading Simulation**: Paper trading with portfolio tracking
- **Order Types**: Market, limit, stop-loss, take-profit orders
- **Alerts**: Price alerts and technical indicator notifications

### Chart Types

- **Candlestick charts** with customizable colors
- **Line charts** for simple price tracking
- **Area charts** with gradient fills
- **Volume bars** and indicators
- **Multi-timeframe analysis** (1m, 5m, 15m, 1h, 4h, 1D, 1W, 1M)

### Technical Analysis

- **Indicators**: SMA, EMA, RSI, MACD, Bollinger Bands, Volume
- **Overlays**: Support/resistance detection, trend lines
- **Chart patterns**: Automatic pattern recognition (planned)
- **Custom indicators**: User-defined formulas (planned)

## Security Considerations

- JWT authentication for user sessions
- Rate limiting on API endpoints
- Input validation with Zod schemas
- SQL injection prevention via Prisma ORM
- XSS protection with React's built-in escaping
- Environment variables for sensitive configuration
- CORS configuration for API access control
