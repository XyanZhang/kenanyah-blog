# Architecture

## Monorepo Structure

```
blog/
├── apps/
│   ├── web/              # Next.js 15 frontend
│   └── api/              # Hono backend
├── packages/
│   ├── types/            # Shared TypeScript types
│   ├── validation/       # Zod schemas
│   ├── utils/            # Utility functions
│   └── config/           # ESLint, TS, Prettier configs
├── pnpm-workspace.yaml
├── turbo.json
└── package.json
```

## Frontend (apps/web)

```
src/
├── app/                  # Next.js App Router
│   ├── (auth)/          # Auth pages (login, register, oauth)
│   ├── (blog)/          # Blog pages (posts, categories, tags)
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── posts/
│   ├── comments/
│   ├── layout/
│   └── ui/              # shadcn/ui
├── hooks/               # Custom hooks
├── lib/
│   └── api-client.ts    # ky-based API client
└── styles/
```

**Key Patterns**:
- App Router with route groups
- React Server Components by default
- Client components for interactivity
- Static generation with ISR for posts

## Backend (apps/api)

```
src/
├── routes/              # HTTP handlers
├── services/            # Business logic (immutable)
├── repositories/        # Data access (Prisma)
├── middleware/          # Auth, error, rate-limit
├── lib/                 # Utilities (db, jwt, oauth)
├── index.ts             # Entry point
└── env.ts               # Environment validation
```

**Layered Architecture**:
```
Routes → Services → Repositories → Prisma → PostgreSQL
```

- **Routes**: HTTP endpoint handlers, request/response
- **Services**: Business logic, validation, immutable patterns
- **Repositories**: Data access, Prisma queries
- **Middleware**: Cross-cutting concerns

## Shared Packages

| Package | Purpose |
|---------|---------|
| @blog/types | TypeScript interfaces (User, Post, etc.) |
| @blog/validation | Zod schemas for input validation |
| @blog/utils | Utilities (slug, date, pagination) |
| @blog/config | Shared ESLint, TS, Prettier configs |

## Data Flow

```
Client Request
     ↓
Middleware (auth, rate-limit)
     ↓
Route Handler
     ↓
Service (business logic)
     ↓
Repository (data access)
     ↓
Prisma → PostgreSQL
```

## Authentication Flow

1. **Local**: Email/password → bcrypt verify → JWT tokens
2. **OAuth**: Provider redirect → callback → user upsert → JWT tokens
3. **Tokens**: Access token (15m) + Refresh token (7d) in httpOnly cookies
