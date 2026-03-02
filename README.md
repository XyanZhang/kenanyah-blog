# Blog Monorepo

A modern, full-stack blog application built with Next.js, Hono, and PostgreSQL.

## Features

- 🔐 **Authentication** - JWT + OAuth (Google, GitHub)
- 📝 **Blog Posts** - Create, edit, publish posts with categories and tags
- 💬 **Comments** - Nested comment system with moderation
- 👥 **User Management** - Profiles, roles (User, Admin, Moderator)
- 🎨 **Modern Stack** - Next.js 15, React 19, TypeScript, Prisma
- 📦 **Monorepo** - pnpm workspaces + Turborepo
- 🐳 **Docker** - PostgreSQL setup included
- ✅ **Type-Safe** - End-to-end type safety with TypeScript and Zod

## Quick Start

```bash
# One-command setup
pnpm setup

# Start development
pnpm dev
```

See [QUICKSTART.md](QUICKSTART.md) for detailed instructions.

## Documentation

- [📖 QUICKSTART.md](QUICKSTART.md) - Get started in 5 minutes
- [📚 CLAUDE.md](CLAUDE.md) - Complete project documentation
- [🗄️ DATABASE.md](DATABASE.md) - Database setup and management

## Tech Stack

### Frontend (Coming Soon)
- Next.js 15 with App Router
- React 19
- TypeScript 5.7+
- Tailwind CSS 4
- shadcn/ui

### Backend
- Hono 4.x (Fast web framework)
- Prisma 6.x (ORM)
- PostgreSQL 16+
- JWT Authentication
- Zod Validation

### Development
- pnpm 9.x (Package manager)
- Turborepo (Build system)
- Vitest (Testing)
- Playwright (E2E testing)
- ESLint + Prettier

## Project Status

- ✅ Phase 1: Foundation Setup
- ✅ Phase 2: Shared Packages
- ✅ Phase 3: Backend Core
- ✅ Phase 4: Backend API Routes
- ⏳ Phase 5: Backend Testing
- 📋 Phase 6: Frontend Foundation
- 📋 Phase 7: Frontend Features
- 📋 Phase 8: Frontend Testing
- 📋 Phase 9: Security & Deployment

## API Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login with email/password
- `POST /auth/logout` - Logout
- `GET /auth/me` - Get current user

### Posts
- `GET /posts` - List posts (with pagination)
- `GET /posts/:slug` - Get post by slug
- `POST /posts` - Create post (auth required)
- `PATCH /posts/:id` - Update post (author/admin)
- `DELETE /posts/:id` - Delete post (author/admin)

### Categories & Tags
- `GET /categories` - List all categories
- `GET /tags` - List all tags
- `POST /categories` - Create category (admin only)
- `POST /tags` - Create tag (admin only)

### Comments
- `GET /comments/post/:postId` - Get post comments
- `POST /comments` - Create comment (auth required)
- `PATCH /comments/:id` - Update comment (author/admin)
- `DELETE /comments/:id` - Delete comment (author/admin)

See [CLAUDE.md](CLAUDE.md) for complete API documentation.

## Development

```bash
# Install dependencies
pnpm install

# Start PostgreSQL
pnpm docker:up

# Run migrations
pnpm db:migrate

# Seed database
pnpm db:seed

# Start development servers
pnpm dev

# Run tests
pnpm test

# Build for production
pnpm build
```

## License

MIT

## Contributing

Contributions are welcome! Please read the documentation before submitting PRs.
