# System Architecture

## Version Reference
- **This Document**: 02-ARCHITECTURE.md v1.0
- **Linked Documents**:
  - env-manifest.json

## Document Purpose

This document provides Architecture Decision Records (ADRs), directory structure templates, configuration guidance, and environment validation patterns for the AI Data Foundry platform. It is a human-readable reference for implementation - NOT a required build artifact. Claude Code can build from the JSON specifications alone, but this document provides valuable context for implementation decisions.

---

## ADR-001: Runtime & Framework Selection

**Decision:** Node.js + Express backend, React + Vite frontend, TypeScript throughout.

**Rationale:**
- TypeScript provides compile-time safety across the full stack
- Express is mature, well-documented, and has extensive middleware ecosystem
- Vite provides fast HMR in development and optimised production builds
- React + Tailwind CSS enables rapid UI development for the configuration-driven interface

**Stack:**
- Runtime: Node.js 20 LTS
- Backend: Express 4.x with TypeScript
- Frontend: React 18.x with Vite 5.x
- Styling: Tailwind CSS 3.x with shadcn/ui components
- Validation: Zod (shared schemas between client and server)
- State management: TanStack React Query v5 (server state)

---

## ADR-002: Database & ORM

**Decision:** PostgreSQL via Neon (serverless) with Drizzle ORM.

**Rationale:**
- PostgreSQL provides JSONB support for flexible field mappings and schema definitions
- Neon serverless driver eliminates connection pooling complexity in deployment
- Drizzle ORM provides type-safe queries with minimal abstraction overhead
- Drizzle Kit handles schema migrations with `dialect` field support (v0.20+)

**Driver Selection by Environment:**
- Production/Serverless: `@neondatabase/serverless` with `drizzle-orm/neon-http`
- Local development: `pg` with `drizzle-orm/node-postgres`
- Detection: `NODE_ENV === 'production'` or `DATABASE_URL.includes('neon.tech')`

**Dependency Version Selection:**
- `drizzle-orm` ^0.36.0 (latest stable with dialect field support)
- `@neondatabase/serverless` ^0.10.0 (required peer dependency for drizzle-orm v0.36+)
- `drizzle-kit` ^0.20.0 (dev dependency, requires `dialect` field in config)
- `pg` ^8.11.0 (dev dependency for local development only)

Compatibility verified: drizzle-orm v0.36.0 requires @neondatabase/serverless ^0.10.0 per peer dependency declaration.

---

## ADR-003: Authentication Strategy

**Decision:** JWT-based authentication with access/refresh token pattern.

**Rationale:**
- Stateless authentication suits the serverless deployment model
- Invite-only onboarding (per scope-manifest) means no self-registration flow
- JWT_SECRET signs both access tokens (short-lived) and refresh tokens (long-lived)
- Organisation isolation enforced at middleware level - every authenticated request carries organisationId

**Token Configuration:**
- Access token: 15-minute expiry, carried in Authorization header
- Refresh token: 7-day expiry, HTTP-only secure cookie
- Algorithm: HMAC-SHA256

**Organisation Scoping:**
- JWT payload includes `userId` and `organisationId`
- Auth middleware extracts and validates both on every request
- All database queries filter by `organisationId` (except canonicalSchemas which are platform-level)

---

## ADR-004: Port Configuration

**Decision:** Port 5000 as primary external-facing port, port 3001 as backend API port in development.

**Production:**
- Express serves both the SPA (static files) and API routes on port 5000
- Single process, bound to `0.0.0.0:5000`
- No separate frontend server

**Development (dual-server setup):**
- Vite dev server runs on port 5000 (primary external port, controlled by `PORT` env var)
- Express API server runs on port 3001 (backend, hardcoded constant)
- Vite proxies `/api` requests to `http://localhost:3001`
- This enables Vite HMR for frontend while Express handles API requests

**Vite Proxy Configuration (development):**
```typescript
// vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
});
```

**Cross-consistency:** The `PORT` default of `5000` in env-manifest.json matches this ADR's production binding port.

---

## ADR-005: CORS Configuration

**Decision:** Explicit origin from `APP_URL` in production. Reflect-origin in development only.

**Production:**
- CORS origin set to `APP_URL` environment variable (e.g., `https://app.example.com`)
- Literal wildcard `origin: '*'` is FORBIDDEN in all environments
- Credentials: `true` (required for HTTP-only refresh token cookie)

**Development:**
- CORS `origin: true` (reflect request origin header) is ALLOWED for local convenience
- This is NOT a wildcard - it echoes the requesting origin, enabling cross-port development
- Production MUST use explicit origin(s) from `APP_URL`

**Implementation Pattern:**
```typescript
// server/middleware/cors.ts
import cors from 'cors';
import { env } from '../lib/env';

const isProduction = env.NODE_ENV === 'production';

export const corsMiddleware = cors({
  origin: isProduction ? env.APP_URL : true,
  credentials: true
});
```

**Enforcement:** Enforced by Agent 6 generated `verify-no-wildcard-cors.sh` gate during build phase. The gate checks for literal wildcard string `origin: '*'` only - `origin: true` is permitted.

---

## ADR-006: Encryption Architecture

**Decision:** AES-256-GCM encryption for source file data at rest during 30-day retention window.

**Encryption at Rest (reversible):**
- Protects raw source files that contain PII during the 30-day cache period
- ENCRYPTION_KEY (32 bytes / 64 hex chars) used for AES-256-GCM
- Each encrypted blob has a unique IV (initialisation vector)
- Decryption is used only for re-processing (re-running jobs against cached source data)
- When source data expires (30-day TTL), encrypted data is purged

**De-identification (irreversible):**
- Separate concern from encryption at rest
- Applied during processing pipeline: mask, hash, redact, drop actions
- Output datasets contain ONLY de-identified data
- Dataset outputs MUST NOT require decryption of PII - PII is already removed or irreversibly transformed during processing
- No decrypt paths should exist for dataset reads

**Boundary:** Encryption protects raw source data within the retention window. De-identification produces irreversible outputs in datasets. These are two separate concerns and MUST NOT be conflated. Downstream agents MUST NOT build decrypt paths for dataset reads.

**Conditional Requirement:**
- ENCRYPTION_KEY is in `conditionallyRequired[]` because this application handles PII source data
- Production: startup fails if ENCRYPTION_KEY is missing
- Development: logs warning but continues (allows local dev without full security setup)

---

## ADR-007: File Upload Architecture

**Decision:** Multer middleware for file uploads with MIME validation.

**Supported Formats (from scope-manifest):**
- `text/csv` (CSV)
- `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` (Excel)
- `application/json` (JSON)

**Validation:**
- MIME type validation required at upload middleware
- Magic number validation optional but recommended
- Maximum file size: 50MB (`MAX_FILE_SIZE_BYTES` env var, default 52428800)
- Files stored temporarily in server filesystem or memory during processing

**Upload Flow:**
1. Client sends multipart form data to upload endpoint
2. Multer middleware validates MIME type and file size
3. File content is encrypted at rest (ENCRYPTION_KEY) and stored
4. Source record created with `status: 'pending'`
5. Automatic column detection runs on ingested data
6. Source transitions to `status: 'ready'` on success or `status: 'error'` on failure

---

## ADR-008: Health Check Endpoint

**Decision:** `/api/health` endpoint with database connectivity verification.

**Response Schema:**
```json
{
  "status": "healthy",
  "timestamp": "2026-02-06T00:00:00.000Z",
  "checks": {
    "database": {
      "status": "healthy",
      "latencyMs": 12
    }
  }
}
```

**Behaviour:**
- Returns 200 when healthy, 503 when degraded
- Database check: executes `SELECT 1` and measures latency
- No authentication required (infrastructure endpoint)

---

## Directory Structure Template

```
/
├── client/
│   ├── src/
│   │   ├── components/          # Reusable UI components
│   │   │   └── ui/              # shadcn/ui primitives
│   │   ├── hooks/               # Custom React hooks
│   │   ├── lib/                 # Client utilities (api client, auth helpers)
│   │   ├── pages/               # Route-level page components
│   │   └── App.tsx              # Root component with router
│   ├── index.html
│   └── vite.config.ts
├── server/
│   ├── db/
│   │   ├── schema/              # Drizzle schema definitions
│   │   │   └── index.ts         # Schema barrel export (no .js extensions)
│   │   ├── migrations/          # Generated migration files
│   │   └── index.ts             # Database connection (env-aware driver)
│   ├── lib/
│   │   ├── env.ts               # Environment validation (Zod)
│   │   ├── auth.ts              # JWT token generation/verification
│   │   ├── encryption.ts        # AES-256-GCM encryption (conditional)
│   │   └── config.ts            # App configuration derived from env
│   ├── middleware/
│   │   ├── auth.ts              # Authentication middleware
│   │   ├── cors.ts              # CORS configuration
│   │   └── upload.ts            # Multer file upload middleware
│   ├── routes/                  # Express route handlers
│   │   └── health.routes.ts     # Health check endpoint
│   ├── services/                # Business logic layer
│   └── index.ts                 # Express app setup and listen
├── docs/                        # Specification artifacts
├── scripts/                     # Verification gates (generated by gate-splitter.sh)
├── drizzle.config.ts            # Drizzle Kit configuration
├── package.json
├── tsconfig.json
└── tailwind.config.ts
```

---

## Required Configuration Files

### drizzle.config.ts

```typescript
import type { Config } from 'drizzle-kit';

export default {
  schema: './server/db/schema/index.ts',
  out: './server/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!
  }
} satisfies Config;
```

**Critical:** `dialect` is REQUIRED in Drizzle Kit v0.20+. Schema imports MUST NOT use `.js` extensions.

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": ".",
    "baseUrl": ".",
    "paths": {
      "@/*": ["client/src/*"],
      "@server/*": ["server/*"]
    }
  },
  "include": ["client/src/**/*", "server/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### tailwind.config.ts

```typescript
import type { Config } from 'tailwindcss';

export default {
  content: ['./client/src/**/*.{ts,tsx}', './client/index.html'],
  theme: {
    extend: {}
  },
  plugins: []
} satisfies Config;
```

### vite.config.ts

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'client/src')
    }
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist/client'
  }
});
```

---

## Environment Validation Pattern

This pattern MUST be used by Agent 6 when generating `server/lib/env.ts`. It demonstrates correct handling of all three variable categories from env-manifest.json.

```typescript
// server/lib/env.ts
import { z } from 'zod';

// Required variables: always fail if missing or invalid
const baseSchema = z.object({
  DATABASE_URL: z.string().startsWith('postgresql://'),
  JWT_SECRET: z.string().min(32),
  APP_URL: z.string().url().refine(url => !url.endsWith('/'), 'No trailing slash'),
  // Optional variables: use defaults
  PORT: z.string().default('5000'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  MAX_FILE_SIZE_BYTES: z.string().default('52428800'),
});

// Parse base schema first - fails immediately if required vars missing
const baseEnv = baseSchema.parse(process.env);

// Conditionally required: ENCRYPTION_KEY
// - Production: MUST be present (fail if missing)
// - Development/Test: SHOULD be present (warn if missing)
let ENCRYPTION_KEY: string | undefined;

if (process.env.ENCRYPTION_KEY) {
  if (process.env.ENCRYPTION_KEY.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes)');
  }
  ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
} else if (baseEnv.NODE_ENV === 'production') {
  throw new Error(
    'ENCRYPTION_KEY is required in production. ' +
    'Reason: Source data contains PII that must be encrypted at rest per GDPR compliance.'
  );
} else {
  console.warn(
    '[WARN] ENCRYPTION_KEY not set - source file encryption disabled. ' +
    'This is acceptable in development but MUST be set in production.'
  );
}

export const env = {
  ...baseEnv,
  ENCRYPTION_KEY,
};
```

**Key Points:**
1. `required[]` variables use Zod schema and fail immediately if invalid
2. `conditionallyRequired[]` variables are validated separately with environment-aware logic
3. Production mode enforces security requirements strictly (startup fails)
4. Development mode warns but allows startup for local convenience
5. `optional[]` variables have sensible defaults in the Zod schema
6. The warning message explains WHY the variable matters

---

## Package.json Scripts

```json
{
  "scripts": {
    "dev": "concurrently \"npm run dev:server\" \"npm run dev:client\"",
    "dev:server": "tsx watch server/index.ts",
    "dev:client": "vite",
    "build": "vite build && tsc -p tsconfig.server.json",
    "start": "node dist/server/index.js",
    "db:push": "drizzle-kit push",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate"
  }
}
```

---

## Dependency Architecture Decision Log

### Dependency: drizzle-orm

**Version**: ^0.36.0
**Purpose**: Type-safe ORM for PostgreSQL with Drizzle Kit migration support
**Alternatives Considered**: Prisma (heavier runtime, slower cold starts), Knex (less type safety)
**Selection Rationale**: Minimal abstraction, excellent TypeScript inference, serverless-friendly
**Known Limitations**: Requires @neondatabase/serverless ^0.10.0 as peer dependency at v0.36+
**Update Policy**: Update within 0.x range; evaluate 1.0 when stable

### Dependency: @neondatabase/serverless

**Version**: ^0.10.0
**Purpose**: PostgreSQL client optimised for serverless environments (Replit, Vercel)
**Alternatives Considered**: node-postgres (pg) - used for local dev only
**Selection Rationale**: Native serverless support, connection pooling, zero cold-start overhead
**Known Limitations**: Requires Neon-specific connection strings in production
**Update Policy**: Update to latest 0.x when security patches released

### Dependency: express

**Version**: ^4.18.0
**Purpose**: HTTP server framework for API routes and SPA serving
**Alternatives Considered**: Fastify (faster but smaller ecosystem), Hono (too new for production)
**Selection Rationale**: Mature, well-documented, extensive middleware ecosystem
**Known Limitations**: Callback-based error handling requires explicit async wrapping
**Update Policy**: Stay on 4.x until 5.x is battle-tested

### Dependency: zod

**Version**: ^3.22.0
**Purpose**: Runtime schema validation for environment variables, API inputs, and shared types
**Alternatives Considered**: Joi (no TypeScript inference), Yup (weaker inference)
**Selection Rationale**: First-class TypeScript inference, composable schemas, lightweight
**Known Limitations**: None significant
**Update Policy**: Update within 3.x range

---

## CORS Production Defaults

**Literal wildcard `origin: '*'` is FORBIDDEN in all environments.**

- Production: CORS origin set to `APP_URL` environment variable
- Development: `origin: true` (reflect request origin) is permitted for local convenience
- `origin: true` is NOT a wildcard - it echoes the requesting origin back in the `Access-Control-Allow-Origin` header, enabling cross-port development (Vite on 5000 → Express on 3001)
- Credentials are always enabled (required for HTTP-only refresh token cookies)

**Enforcement:** Enforced by Agent 6 generated `verify-no-wildcard-cors.sh` gate during build phase.
