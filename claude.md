# Blog Monorepo

## Project Overview

A full-stack blog application built with modern web technologies, organized as a monorepo. The project features a Next.js frontend with TypeScript and a Hono backend API, all managed with pnpm workspaces and Turborepo for optimal development experience.

**Key Features**:
- User authentication (JWT + OAuth with Google/GitHub)
- Blog posts with categories and tags
- Nested comments system
- Server-side rendering and static generation
- Comprehensive test coverage (80%+)

## Architecture

### Monorepo Structure

```
blog/
├── apps/
│   ├── web/              # Next.js 15 frontend application
│   └── api/              # Hono backend API server
├── packages/
│   ├── types/            # Shared TypeScript type definitions
│   ├── validation/       # Shared Zod validation schemas
│   ├── utils/            # Shared utility functions
│   └── config/           # Shared configuration (ESLint, TS, Prettier)
├── pnpm-workspace.yaml   # pnpm workspace configuration
├── turbo.json            # Turborepo build pipeline
└── package.json          # Root package with workspace scripts
```

### Frontend Architecture (Next.js App Router)

- **App Router**: Leverages Next.js 15 App Router for file-based routing
- **Server Components**: Uses React Server Components for optimal performance
- **Static Generation**: Blog posts are statically generated with ISR
- **Client Components**: Interactive features use client-side React
- **API Client**: ky-based HTTP client for backend communication

### Backend Architecture (Hono + Prisma)

- **Hono Framework**: Lightweight, fast web framework
- **Prisma ORM**: Type-safe database access with PostgreSQL
- **Layered Architecture**:
  - **Routes**: HTTP endpoint handlers
  - **Services**: Business logic layer (immutable patterns)
  - **Repositories**: Data access layer (Prisma queries)
  - **Middleware**: Authentication, error handling, rate limiting

### Shared Packages

- **types**: Common TypeScript interfaces shared between frontend and backend
- **validation**: Zod schemas for input validation (used by both apps)
- **utils**: Utility functions (date formatting, slug generation, pagination)
- **config**: Shared ESLint, TypeScript, and Prettier configurations

## Technology Stack

### Core Technologies
- **Monorepo**: pnpm 9.x + Turborepo
- **Frontend**: Next.js 15.1+, React 19, TypeScript 5.7+
- **Backend**: Hono 4.x
- **Database**: PostgreSQL 16+ + Prisma 6.x
- **Validation**: Zod 3.x
- **Authentication**: JWT + OAuth (Google, GitHub)

### Development Tools
- **Testing**: Vitest (unit/integration), Playwright (E2E)
- **Styling**: Tailwind CSS 4.x + shadcn/ui
- **Linting**: ESLint 9.x + Prettier 3.x
- **Git Hooks**: Husky + lint-staged

### Additional Libraries
- **Date Handling**: date-fns (immutable, tree-shakeable)
- **HTTP Client**: ky (modern fetch wrapper)
- **State Management**: Zustand (lightweight)
- **Forms**: React Hook Form + Zod resolver
- **Rich Text**: Tiptap or MDX
- **Rate Limiting**: @hono/rate-limiter
- **Password Hashing**: bcrypt or argon2
- **OAuth**: @hono/oauth-providers

## Directory Structure

### Frontend (apps/web)
```
apps/web/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/            # Auth route group
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   └── oauth/
│   │   ├── (blog)/            # Blog route group
│   │   │   ├── posts/
│   │   │   ├── categories/
│   │   │   └── tags/
│   │   ├── layout.tsx         # Root layout
│   │   └── page.tsx           # Homepage
│   ├── components/            # React components
│   │   ├── posts/
│   │   ├── comments/
│   │   ├── layout/
│   │   └── ui/                # shadcn/ui components
│   ├── hooks/                 # Custom React hooks
│   ├── lib/                   # Client utilities
│   │   └── api-client.ts      # API client
│   └── styles/                # Global styles
├── public/                    # Static assets
├── package.json
├── tsconfig.json
└── next.config.js
```

### Backend (apps/api)
```
apps/api/
├── src/
│   ├── routes/                # API route handlers
│   │   ├── auth.ts
│   │   ├── posts.ts
│   │   ├── comments.ts
│   │   ├── categories.ts
│   │   ├── tags.ts
│   │   └── users.ts
│   ├── services/              # Business logic
│   │   ├── auth-service.ts
│   │   ├── post-service.ts
│   │   ├── comment-service.ts
│   │   └── user-service.ts
│   ├── repositories/          # Data access
│   │   ├── post-repository.ts
│   │   ├── comment-repository.ts
│   │   └── user-repository.ts
│   ├── middleware/            # Hono middleware
│   │   ├── auth.ts
│   │   ├── error-handler.ts
│   │   ├── rate-limit.ts
│   │   └── validation.ts
│   ├── lib/                   # Server utilities
│   │   ├── db.ts              # Prisma client
│   │   ├── jwt.ts             # JWT utilities
│   │   ├── oauth.ts           # OAuth utilities
│   │   └── password.ts        # Password hashing
│   ├── index.ts               # App entry point
│   └── env.ts                 # Environment validation
├── prisma/
│   ├── schema.prisma          # Database schema
│   ├── migrations/            # Migration files
│   └── seed.ts                # Seed data
├── package.json
└── tsconfig.json
```

## Development Workflow

### Initial Setup

```bash
# Install dependencies
pnpm install

# Setup database (PostgreSQL must be running)
pnpm db:migrate

# Seed database with test data
pnpm db:seed
```

### Development

```bash
# Start all development servers (frontend + backend)
pnpm dev

# Start only frontend
pnpm --filter web dev

# Start only backend
pnpm --filter api dev

# Open Prisma Studio (database GUI)
pnpm db:studio
```

### Testing

```bash
# Run all tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Run E2E tests
pnpm --filter web test:e2e

# Run specific test file
pnpm --filter api test src/__tests__/unit/services/post-service.test.ts
```

### Building

```bash
# Build all packages
pnpm build

# Build specific package
pnpm --filter web build
pnpm --filter api build

# Type check all packages
pnpm type-check
```

### Database Operations

```bash
# Create a new migration
pnpm db:migrate

# Push schema changes without migration (dev only)
pnpm db:push

# Reset database (WARNING: deletes all data)
pnpm db:reset

# Generate Prisma client
pnpm --filter api prisma generate
```

### Code Quality

```bash
# Lint all packages
pnpm lint

# Format all files
pnpm format

# Fix linting issues
pnpm lint:fix
```

## API Documentation

### Authentication Endpoints

#### POST /auth/register
Register a new user with email/password.

**Request Body**:
```json
{
  "email": "user@example.com",
  "username": "johndoe",
  "password": "securepassword",
  "name": "John Doe"
}
```

**Response**: User object + JWT tokens in httpOnly cookies

#### POST /auth/login
Login with email/password.

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response**: User object + JWT tokens in httpOnly cookies

#### POST /auth/logout
Logout current user (clears cookies).

#### POST /auth/refresh
Refresh access token using refresh token.

#### GET /auth/google
Initiate Google OAuth flow.

#### GET /auth/google/callback
Google OAuth callback handler.

#### GET /auth/github
Initiate GitHub OAuth flow.

#### GET /auth/github/callback
GitHub OAuth callback handler.

### Posts Endpoints

#### GET /posts
List all posts with pagination and filters.

**Query Parameters**:
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10)
- `category` (string): Filter by category slug
- `tag` (string): Filter by tag slug
- `published` (boolean): Filter by published status

**Response**:
```json
{
  "success": true,
  "data": [...],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 10
  }
}
```

#### GET /posts/:slug
Get a single post by slug.

#### POST /posts
Create a new post (authentication required).

**Request Body**:
```json
{
  "title": "My Blog Post",
  "content": "Post content...",
  "excerpt": "Short description",
  "published": false,
  "categoryIds": ["cat1", "cat2"],
  "tagIds": ["tag1", "tag2"]
}
```

#### PATCH /posts/:id
Update a post (authentication required, author only).

#### DELETE /posts/:id
Delete a post (authentication required, author only).

### Comments Endpoints

#### GET /posts/:postId/comments
List all comments for a post (includes nested replies).

#### POST /posts/:postId/comments
Create a new comment (authentication required).

**Request Body**:
```json
{
  "content": "Great post!",
  "parentId": "optional-parent-comment-id"
}
```

#### PATCH /comments/:id
Update a comment (authentication required, author only).

#### DELETE /comments/:id
Delete a comment (authentication required, author only).

### Categories Endpoints

#### GET /categories
List all categories.

#### GET /categories/:slug
Get a category with its posts.

#### POST /categories
Create a new category (admin only).

### Tags Endpoints

#### GET /tags
List all tags.

#### GET /tags/:slug
Get a tag with its posts.

#### POST /tags
Create a new tag (admin only).

### Users Endpoints

#### GET /users/:username
Get user profile by username.

#### PATCH /users/:id
Update user profile (authentication required, own profile only).

## Database Schema

### User Model
- `id`: CUID (primary key)
- `email`: String (unique)
- `username`: String (unique)
- `passwordHash`: String (nullable for OAuth users)
- `name`: String (optional)
- `bio`: String (optional)
- `avatar`: String (optional)
- `role`: Enum (USER, ADMIN, MODERATOR)
- `provider`: Enum (local, google, github)
- `providerId`: String (optional, OAuth provider ID)
- `createdAt`: DateTime
- `updatedAt`: DateTime

### Post Model
- `id`: CUID (primary key)
- `slug`: String (unique, SEO-friendly)
- `title`: String
- `excerpt`: String (optional)
- `content`: Text
- `coverImage`: String (optional)
- `published`: Boolean
- `publishedAt`: DateTime (optional)
- `viewCount`: Integer
- `authorId`: Foreign key to User
- `createdAt`: DateTime
- `updatedAt`: DateTime

### Category Model
- `id`: CUID (primary key)
- `slug`: String (unique)
- `name`: String
- `description`: String (optional)
- `createdAt`: DateTime
- `updatedAt`: DateTime

### Tag Model
- `id`: CUID (primary key)
- `slug`: String (unique)
- `name`: String
- `createdAt`: DateTime
- `updatedAt`: DateTime

### Comment Model
- `id`: CUID (primary key)
- `content`: Text
- `approved`: Boolean (for moderation)
- `postId`: Foreign key to Post
- `authorId`: Foreign key to User
- `parentId`: Foreign key to Comment (optional, for nested replies)
- `createdAt`: DateTime
- `updatedAt`: DateTime

### Relationships
- User has many Posts
- User has many Comments
- Post belongs to User (author)
- Post has many Comments
- Post has many Categories (many-to-many via PostCategory)
- Post has many Tags (many-to-many via PostTag)
- Comment belongs to Post
- Comment belongs to User (author)
- Comment has many Comments (nested replies)

## Progress Tracker

### Phase 1: Foundation Setup ✅
- [x] Create claude.md documentation
- [x] Create root package.json
- [x] Create pnpm-workspace.yaml
- [x] Create turbo.json
- [x] Setup directory structure
- [x] Create .gitignore
- [x] Create shared configs (TypeScript, ESLint, Prettier)
- [x] Initialize Git repository

### Phase 2: Shared Packages ✅
- [x] Create packages/types
- [x] Create packages/validation
- [x] Create packages/utils
- [x] Create packages/config

### Phase 3: Backend Core ⏳
- [ ] Initialize Hono app
- [ ] Setup Prisma with PostgreSQL
- [ ] Create database schema
- [ ] Implement JWT utilities
- [ ] Implement OAuth utilities
- [ ] Create authentication middleware
- [ ] Create error handler middleware
- [ ] Create rate limiter middleware

### Phase 4: Backend Features
- [ ] Implement Auth routes
- [ ] Implement Posts routes
- [ ] Implement Comments routes
- [ ] Implement Categories routes
- [ ] Implement Tags routes
- [ ] Implement Users routes
- [ ] Create service layer
- [ ] Create repository layer

### Phase 5: Backend Testing
- [ ] Setup Vitest
- [ ] Write unit tests for services
- [ ] Write unit tests for repositories
- [ ] Write integration tests for routes
- [ ] Achieve 80%+ coverage

### Phase 6: Frontend Foundation
- [ ] Initialize Next.js app
- [ ] Setup Tailwind CSS + shadcn/ui
- [ ] Create root layout
- [ ] Create authentication pages
- [ ] Create API client
- [ ] Create authentication hooks
- [ ] Create layout components

### Phase 7: Frontend Features
- [ ] Create post listing page
- [ ] Create post detail page
- [ ] Create category pages
- [ ] Create tag pages
- [ ] Create comment components
- [ ] Implement post components

### Phase 8: Frontend Testing
- [ ] Setup Vitest for components
- [ ] Write component tests
- [ ] Write hook tests
- [ ] Setup Playwright
- [ ] Write E2E tests
- [ ] Achieve 80%+ coverage

### Phase 9: Security & Deployment
- [ ] Run security audit
- [ ] Verify security checklist
- [ ] Setup production environment
- [ ] Deploy backend API
- [ ] Deploy frontend
- [ ] Setup database backups
- [ ] Configure monitoring

## Changelog

### 2026-01-26
- **Project Initialization**: Created project structure and documentation
- **Phase 1 Complete**: Foundation setup with monorepo configuration
  - Created root package.json with pnpm workspace scripts
  - Setup pnpm-workspace.yaml and turbo.json
  - Created directory structure (apps/, packages/)
  - Setup shared configs (TypeScript, ESLint, Prettier)
  - Initialized Git repository
- **Phase 2 Complete**: Shared packages implementation
  - Created @blog/types with all TypeScript interfaces
  - Created @blog/validation with Zod schemas
  - Created @blog/utils with utility functions (slug, date, pagination, string)
  - Created @blog/config with shared configurations

