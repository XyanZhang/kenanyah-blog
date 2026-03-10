# Database Setup with Docker

This project uses PostgreSQL as the database, which can be easily set up using Docker Compose.

## Prerequisites

- Docker and Docker Compose installed on your system
- pnpm package manager

## Quick Start

### 1. Start the Database

```bash
# Start PostgreSQL containers (development + test databases)
docker-compose up -d

# Check if containers are running
docker-compose ps

# View logs
docker-compose logs -f postgres
```

### 2. Setup Environment Variables

```bash
# Copy the example env file
cp apps/api/.env.example apps/api/.env

# The default DATABASE_URL is already configured for Docker:
# postgresql://blog_user:blog_password@localhost:5432/blog_dev?schema=public
```

### 3. Run Database Migrations

```bash
# Generate Prisma Client
pnpm --filter api prisma:generate

# Run migrations to create tables
pnpm --filter api prisma:migrate

# Seed the database with sample data
pnpm --filter api prisma:seed
```

### 4. Start the API Server

```bash
# Start the development server
pnpm --filter api dev

# Or start all services (frontend + backend)
pnpm dev
```

## Database Management

### 导出/导入备份

```bash
# 导出 blog_dev 到 backups/ 目录（带时间戳的 .sql 文件）
pnpm db:export

# 导出为压缩格式 (.dump，体积更小，适合迁移）
pnpm db:export:custom

# 仅导出表结构（不含数据）
pnpm db:export:schema

# 从备份恢复（会提示确认）
pnpm db:import backups/blog_dev_20250305_120000.sql

# 跳过确认直接导入（用于脚本自动化）
pnpm db:import backups/blog_dev_20250305_120000.sql -y
```

### Access PostgreSQL CLI

```bash
# Connect to development database
docker-compose exec postgres psql -U blog_user -d blog_dev

# Connect to test database
docker-compose exec postgres_test psql -U blog_user -d blog_test
```

### Prisma Studio (Database GUI)

```bash
# Open Prisma Studio to view/edit data
pnpm --filter api prisma:studio
```

### Stop and Remove Containers

```bash
# Stop containers
docker-compose stop

# Stop and remove containers (data persists in volumes)
docker-compose down

# Remove containers AND volumes (deletes all data)
docker-compose down -v
```

## Database Configuration

### Development Database
- **Host**: localhost
- **Port**: 5432
- **Database**: blog_dev
- **User**: blog_user
- **Password**: blog_password

### Test Database
- **Host**: localhost
- **Port**: 5433
- **Database**: blog_test
- **User**: blog_user
- **Password**: blog_password

## Troubleshooting

### Port Already in Use

If port 5432 is already in use:

```bash
# Check what's using the port
lsof -i :5432

# Stop existing PostgreSQL service
# macOS (Homebrew)
brew services stop postgresql

# Linux (systemd)
sudo systemctl stop postgresql
```

### Reset Database

```bash
# Stop containers and remove volumes
docker-compose down -v

# Start fresh
docker-compose up -d

# Re-run migrations
pnpm --filter api prisma:migrate
pnpm --filter api prisma:seed
```

### View Container Logs

```bash
# All containers
docker-compose logs -f

# Specific container
docker-compose logs -f postgres
```

## Production Deployment

For production, use a managed PostgreSQL service like:
- AWS RDS
- Google Cloud SQL
- Azure Database for PostgreSQL
- Supabase
- Railway
- Render

Update the `DATABASE_URL` environment variable with your production database connection string.
