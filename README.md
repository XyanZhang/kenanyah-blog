# Blog Workspace

A personal knowledge and publishing workspace built as a pnpm monorepo. The
current app is more than a simple blog: it includes a public site, an admin
console, AI-assisted writing and chat, PDF knowledge tools, bookmarks,
photography, project entries, thoughts, uploads, and production deployment
scripts.

## Apps

| App                 | Path                       | Purpose                                                 |
| ------------------- | -------------------------- | ------------------------------------------------------- |
| Web                 | `apps/web`                 | Next.js public site and personal dashboard              |
| API                 | `apps/api`                 | Hono API, Prisma data layer, file handling, AI services |
| Admin               | `apps/admin`               | Vite admin console for content and media management     |
| Browser extension   | `apps/browser-extension`   | Chrome extension MVP for bookmark capture               |
| Task loop           | `apps/task-loop`           | Local CLI for persistent engineering task loops         |
| Codex observability | `apps/codex-observability` | Local indexing/query helper for Codex work logs         |

## Current User-Facing Features

- Public home dashboard with configurable cards, navigation, saved templates,
  weather, countdowns, calendar, music, profile, stats, and post lists.
- Blog reading and editing flows with posts, categories, tags, comments,
  featured posts, published dates, and semantic search.
- AI features for rewriting, expanding, shrinking, summarizing, heading
  generation, full article generation, theme recommendation, cover generation,
  chat conversations, workflow runs, and voice transcription.
- PDF agent for upload, parsing, chunk indexing, document search, draft
  generation, and saving generated content as posts.
- Bookmarks from the web UI, API, and browser extension, with metadata,
  health checks, enrichment, and conversion to other content.
- Thoughts, photography entries, project entries, works/tools pages, public
  search, and static/uploaded media serving.
- Admin console for dashboard metrics, posts, comments, taxonomy, media,
  bookmarks, thoughts, projects, and photos.

## Tech Stack

- Workspace: pnpm 9, Turborepo, TypeScript
- Web: Next.js 15, React 19, Tailwind CSS 4, Zustand, dnd-kit, Three.js
- Admin: Vite, React 19, TanStack Router, Recharts, Tailwind CSS 4
- API: Hono, Prisma 7, PostgreSQL with pgvector, Zod, JWT, Nodemailer, Sharp
- AI: OpenAI-compatible chat/embedding providers, DashScope/Qwen support,
  LangChain helpers, Whisper integration
- Testing: Vitest, Playwright, Node test runner
- Deployment: Docker Compose, Nginx, local preflight checks, image export scripts

## Quick Start

```bash
pnpm install
pnpm docker:up
pnpm db:generate
pnpm db:migrate:test
pnpm db:seed
pnpm dev
```

Typical local URLs:

| Service             | URL                                                                         |
| ------------------- | --------------------------------------------------------------------------- |
| Web                 | `http://localhost:3000`                                                     |
| API                 | `http://localhost:3001/api`                                                 |
| API health          | `http://localhost:3001/api/health`                                          |
| Upload/static files | `http://localhost:3001/uploads/...` and `http://localhost:3001/statics/...` |
| Admin               | Vite dev URL shown by `pnpm dev:admin`                                      |

See [QUICKSTART.md](QUICKSTART.md) for the local setup flow.

## Common Commands

```bash
pnpm dev                 # Start all workspace dev tasks through Turbo
pnpm dev:blog            # Start only the public web app
pnpm dev:admin           # Start only the admin app
pnpm dev:api             # Start only the API
pnpm build               # Build all packages/apps
pnpm test                # Run tests
pnpm type-check          # Run TypeScript checks
pnpm lint                # Run lint tasks where configured
pnpm format              # Format source and docs
```

Database and production helpers:

```bash
pnpm docker:up
pnpm docker:down
pnpm db:migrate:test
pnpm db:seed
pnpm db:studio
pnpm predeploy:prod
pnpm predeploy:prod:docker
./scripts/build-save.sh
```

## Documentation

- [Quick start](QUICKSTART.md)
- [Database guide](DATABASE.md)
- [Architecture](docs/ARCHITECTURE.md)
- [API reference](docs/API.md)
- [Schema overview](docs/SCHEMA.md)
- [Environment variables](docs/ENV.md)
- [Deployment](docs/DEPLOYMENT.md)
- [AI capability contracts](docs/AI-CAPABILITY-CONTRACTS.md)

## Repository Layout

```text
blog/
├── apps/
│   ├── admin/
│   ├── api/
│   ├── browser-extension/
│   ├── codex-observability/
│   ├── task-loop/
│   └── web/
├── packages/
│   ├── config/
│   ├── types/
│   ├── utils/
│   └── validation/
├── docs/
├── nginx/
├── scripts/
├── docker-compose.yml
├── docker-compose.test.yml
├── docker-compose.prod.yml
└── package.json
```

## Production

Production deployment is documented in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).
Before a production release, run:

```bash
pnpm predeploy:prod
```

Use `pnpm predeploy:prod:docker` when Dockerfiles, native dependencies, or
build-time environment variables changed.
