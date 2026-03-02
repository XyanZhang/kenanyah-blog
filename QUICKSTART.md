# Quick Start Guide

Get the blog application up and running in minutes!

## Prerequisites

- Node.js 20+ installed
- pnpm 9+ installed
- Docker and Docker Compose installed

## One-Command Setup

```bash
pnpm setup
```

This single command will:
1. ✅ Install all dependencies
2. ✅ Start PostgreSQL in Docker
3. ✅ Generate Prisma Client
4. ✅ Run database migrations
5. ✅ Seed database with sample data

## Start Development

```bash
# Start all services (frontend + backend)
pnpm dev
```

The application will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **API Health Check**: http://localhost:3001/health

## Default Test Accounts

After seeding, you can login with:

**Admin Account:**
- Email: `admin@blog.com`
- Password: `admin123`
- Role: ADMIN

**Regular User:**
- Email: `user@blog.com`
- Password: `user123`
- Role: USER

## Useful Commands

```bash
# Database management
pnpm db:studio          # Open Prisma Studio (database GUI)
pnpm db:migrate         # Run new migrations
pnpm db:seed            # Seed database with test data
pnpm db:reset           # Reset database (WARNING: deletes all data)

# Docker management
pnpm docker:up          # Start PostgreSQL containers
pnpm docker:down        # Stop containers
pnpm docker:logs        # View container logs
pnpm docker:reset       # Reset database containers

# Development
pnpm dev                # Start all services
pnpm build              # Build all packages
pnpm test               # Run all tests
pnpm lint               # Lint all packages
pnpm format             # Format code with Prettier
```

## API Endpoints

Once the backend is running, you can access:

- `GET /health` - Health check
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login
- `GET /posts` - List all posts
- `GET /categories` - List all categories
- `GET /tags` - List all tags

See [CLAUDE.md](CLAUDE.md) for complete API documentation.

## Project Structure

```
blog/
├── apps/
│   ├── web/              # Next.js frontend (coming soon)
│   └── api/              # Hono backend API
├── packages/
│   ├── types/            # Shared TypeScript types
│   ├── validation/       # Zod validation schemas
│   ├── utils/            # Utility functions
│   └── config/           # Shared configs
└── docker-compose.yml    # PostgreSQL setup
```

## Troubleshooting

### Port 5432 already in use

```bash
# Stop local PostgreSQL
brew services stop postgresql  # macOS
sudo systemctl stop postgresql # Linux
```

### Database connection error

```bash
# Check if containers are running
docker-compose ps

# Restart containers
pnpm docker:reset
```

### Prisma Client not generated

```bash
pnpm db:generate
```

## Next Steps

1. Explore the API with Postman or curl
2. Check out [DATABASE.md](DATABASE.md) for database details
3. Read [CLAUDE.md](CLAUDE.md) for full documentation
4. Start building the frontend (Phase 6)

## Need Help?

- Check the [CLAUDE.md](CLAUDE.md) documentation
- Review the [DATABASE.md](DATABASE.md) guide
- Inspect the code in `apps/api/src/`

Happy coding! 🚀
