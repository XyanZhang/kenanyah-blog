# Blog Monorepo

Full-stack blog with Next.js 15 + Hono + Prisma + PostgreSQL.

## Quick Reference

```bash
pnpm setup          # First time setup (install + docker + db)
pnpm dev            # Start all dev servers
pnpm test           # Run tests
pnpm build          # Build all packages
pnpm lint           # Lint code
```

## Structure

```text
apps/web/           # Next.js frontend
apps/api/           # Hono backend (routes -> services -> repositories)
packages/types/     # Shared TypeScript types
packages/validation/# Zod schemas
packages/utils/     # Utility functions
packages/config/    # Shared configs
```

## Tech Stack

- **Frontend**: Next.js 15, React 19, Tailwind CSS, shadcn/ui
- **Backend**: Hono, Prisma, PostgreSQL
- **Auth**: JWT + OAuth (Google/GitHub)
- **Testing**: Vitest, Playwright

## Database

```bash
pnpm docker:up      # Start PostgreSQL
pnpm db:migrate     # Run migrations
pnpm db:studio      # Open Prisma Studio
```

## Current Progress

- Phase 1-4: Complete (foundation, packages, backend core, API routes)
- Phase 5: Backend testing (in progress)
- Phase 6-9: Frontend + deployment (pending)

## Detailed Docs

- [docs/API.md](docs/API.md) - API endpoints reference
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) - Detailed architecture
- [docs/SCHEMA.md](docs/SCHEMA.md) - Database schema
- [DATABASE.md](DATABASE.md) - Database setup guide
