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

# Run migrations to create tables（会使用 prisma.config 或当前环境的 DATABASE_URL）
pnpm db:migrate

# 测试库（docker-compose.test.yml、端口 5434）：用 deploy 应用迁移，读取根目录 .env.test 中的 DATABASE_URL
pnpm db:migrate:test

# Seed the database with sample data
pnpm db:seed
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

### Create Admin User

Use the manual SQL template when you need to create or reset an admin portal user:

```bash
apps/api/prisma/templates/create-admin-user.sql
```

Generate a bcrypt password hash first:

```bash
pnpm --filter api gen-password 'YourStrongPassword123'
```

Then connect to the database and run the template:

```bash
psql "postgresql://blog_user:<DB_PASSWORD>@127.0.0.1:15432/blog_prod"
\i apps/api/prisma/templates/create-admin-user.sql
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

## 为什么数据库和 schema 不同步？

- **多个库、一个迁移历史**：生产、测试、本地 dev 可能连的是不同库（如 5432/blog_dev、5434/blog_test_env），但迁移文件只有一份。`pnpm db:migrate`（即 `prisma migrate dev`）只会对你**当前 DATABASE_URL 指向的库**应用迁移。
- **prisma.config 默认值**：未设置 `DATABASE_URL` 时，Prisma CLI 使用 `prisma.config.ts` 里的默认（如 `postgres:5432/blog_prod`），在本机跑时往往连不上，或连的是别的库。
- **dev 实际连的库**：`pnpm run dev` 通过 `.env.development` 的 `DATABASE_URL` 连到 **localhost:5434/blog_test_env**。若从没对这个库跑过迁移，就会少表（如 `verification_codes`）或少列（如 `users.emailVerified`）。

**做法**：只要 API/dev 连的是测试库，拉代码或改过 schema 后执行一次：

```bash
pnpm db:migrate:test
```

脚本会合并 `.env.test` 与 `apps/api/.env` 中的 `DATABASE_URL`，并执行 `prisma migrate deploy`。请确保根目录存在 `.env.test` 且 `DATABASE_URL` 指向你的测试 Postgres（例如 `postgresql://blog_user:blog_password@localhost:5434/blog_test_env?schema=public`）。

**不要用 `pnpm db:migrate` 对测试库**：它会跑 `migrate dev`，容易连错库、需要交互或 shadow DB。测试/预发环境一律用 `db:migrate:test` 或手动 `DATABASE_URL=... prisma migrate deploy`。

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
