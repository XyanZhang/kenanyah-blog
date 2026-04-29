# Quick Start

This guide starts the current workspace locally: API, public web app, admin app,
PostgreSQL, migrations, and seed data.

## Prerequisites

- Node.js 20+
- pnpm 9+
- Docker and Docker Compose

## Install

```bash
pnpm install
```

## Start PostgreSQL

```bash
pnpm docker:up
```

The local compose files use PostgreSQL with pgvector support.

## Prepare the Database

```bash
pnpm db:generate
pnpm db:migrate:test
pnpm db:seed
```

Use `db:migrate:test` for the local test/development database used by the
current dev scripts. It applies committed migrations without interactive Prisma
prompts.

## Start Development Servers

```bash
pnpm dev
```

Or run one service:

```bash
pnpm dev:blog
pnpm dev:api
pnpm dev:admin
```

Typical local URLs:

| Service        | URL                                                  |
| -------------- | ---------------------------------------------------- |
| Web            | `http://localhost:3000`                              |
| API root       | `http://localhost:3001/api`                          |
| API health     | `http://localhost:3001/api/health`                   |
| Uploaded files | `http://localhost:3001/uploads/...`                  |
| Static files   | `http://localhost:3001/statics/...`                  |
| Admin          | Vite prints the dev URL when `pnpm dev:admin` starts |

## Main Routes To Try

Public web routes:

- `/` dashboard/home
- `/blog`
- `/search`
- `/about`
- `/pictures`
- `/projects`
- `/tools`
- `/works`
- `/thoughts`
- `/bookmarks`
- `/ai-chat`
- `/pdf-agent`

Admin routes:

- `/login`
- `/`
- `/posts`
- `/comments`
- `/bookmarks`
- `/thoughts`
- `/projects`
- `/photos`
- `/taxonomy`
- `/media`

## Useful Commands

```bash
pnpm build
pnpm test
pnpm type-check
pnpm lint
pnpm format
pnpm db:studio
pnpm docker:logs
pnpm docker:reset
```

## Notes

- API routes are mounted under `/api`.
- File routes are mounted at root-level `/uploads` and `/statics`.
- API local environment values come from `apps/api/.env` or the env file used by
  the dev scripts.
- Web public environment values must use `NEXT_PUBLIC_*`.
- Production environment behavior is documented in [docs/ENV.md](docs/ENV.md).

## More Documentation

- [README](README.md)
- [Database guide](DATABASE.md)
- [Architecture](docs/ARCHITECTURE.md)
- [API reference](docs/API.md)
- [Schema overview](docs/SCHEMA.md)
- [Deployment](docs/DEPLOYMENT.md)
