# Architecture

## Overview

This repository is a pnpm/Turborepo workspace for a personal publishing and
knowledge app. The main runtime is split into:

- `apps/web`: public Next.js app and personal dashboard.
- `apps/api`: Hono API with Prisma, PostgreSQL, file storage, AI, and search.
- `apps/admin`: Vite admin console for private content management.
- `apps/browser-extension`: unpacked Chrome extension MVP for bookmarks.
- `apps/task-loop`: local CLI for persistent task-loop notes and handoffs.
- `apps/codex-observability`: local helper for indexing/querying Codex work data.

## Repository Structure

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
└── turbo.json
```

## Web App

`apps/web` uses Next.js App Router.

Important route groups and pages:

- `(main)`: public shell, navigation, dashboard, blog, search, about, pictures,
  projects, tools, works, thoughts, bookmarks, AI chat, and PDF agent.
- `(auth)`: login and setup-profile flows.
- `app/api/geocode` and `app/api/weather`: Next route handlers used by web UI
  helpers.

Important client areas:

- `components/dashboard`: draggable/resizable home cards, card config dialogs,
  saved templates, navigation config, and layout helpers.
- `components/navigation`: configurable navigation shell and item definitions.
- `components/music`, `components/pictures`, `components/thoughts`,
  `components/bookmarks`, `components/projects`: feature-specific UI.
- `lib/*-api.ts`: web-side API clients for feature routes.
- `store`: Zustand stores for dashboard, navigation, theme, music, and canvas.

## API App

`apps/api` exposes a root Hono app:

- `/api/*`: JSON API.
- `/uploads/*`: uploaded file serving.
- `/statics/*`: static image/file serving with optional transforms.

The API is organized around route modules, shared libs, middleware, agents, and
orchestrators:

```text
src/
├── routes/
├── middleware/
├── lib/
├── agents/
├── orchestrators/
├── tools/
├── generated/prisma/
├── env.ts
└── index.ts
```

Main route domains:

- Auth and users
- Posts, categories, tags, comments
- Home dashboard config and templates
- AI writing tools, chat, and blog workflow
- Semantic search
- PDF document upload, parsing, indexing, and generation
- Bookmarks and browser-extension sync
- Thoughts, pictures, projects, calendar, countdown, weather, voice
- Admin APIs for dashboard, posts, comments, taxonomy, media, bookmarks,
  thoughts, projects, and photos

## Admin App

`apps/admin` is a Vite/React app with TanStack Router. It has protected admin
routes for:

- Dashboard
- Posts
- Comments
- Bookmarks
- Thoughts
- Projects
- Photos
- Taxonomy
- Media

Admin authentication is separate from public user authentication and uses the
`AdminUser` model plus `/api/admin/auth/*` routes.

## Data Flow

```text
Browser
  -> apps/web or apps/admin
  -> apps/api Hono routes
  -> middleware
  -> route handlers and feature libs
  -> Prisma
  -> PostgreSQL / pgvector
```

Uploaded and generated files are stored under the configured upload/static
directories and served through `/uploads` or `/statics`.

## Shared Packages

| Package            | Purpose                        |
| ------------------ | ------------------------------ |
| `@blog/types`      | Shared TypeScript interfaces   |
| `@blog/validation` | Shared Zod schemas             |
| `@blog/utils`      | Shared utility functions       |
| `@blog/config`     | Shared TypeScript/config files |

## Authentication

Public users use JWT access/refresh cookies or bearer tokens through the auth
middleware. Supported flows include:

- Register/login
- Logout/refresh
- Current user lookup
- Email verification code send/verify
- Setup profile

Admin users use a separate admin JWT flow and protected admin middleware.

## AI and Search

The API supports:

- OpenAI-compatible chat and embedding providers.
- DashScope/Qwen text and image-generation integration.
- Post, thought, conversation, and PDF embeddings through pgvector-backed
  tables.
- AI writing endpoints, chat streaming, blog workflow orchestration, and PDF
  document generation.
