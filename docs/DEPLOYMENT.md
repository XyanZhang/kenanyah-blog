# Linux 服务器部署指南

本文档提供在 Linux 服务器上快速部署 Blog 应用的完整步骤。

## 目录

- [前置要求](#前置要求)
- [部署方式概览](#部署方式概览)
- [方式一：服务器上构建](#方式一服务器上构建)
- [方式二：本地 build → 导出 tar → 上传服务器 load → up](#方式二本地-build--导出-tar--上传服务器-load--up)
- [SSL 配置](#ssl-配置)
- [常用命令](#常用命令)
- [故障排查](#故障排查)

---

## 前置要求

### 服务器要求

- **操作系统**: Ubuntu 20.04+ / CentOS 7+ / Debian 10+
- **内存**: 最低 2GB，推荐 4GB+
- **磁盘**: 最低 20GB
- **端口**: 80, 443 (HTTP/HTTPS)

### 安装 Docker

```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# 重新登录使权限生效
exit
# 重新 SSH 登录

# 验证安装
docker --version
docker-compose --version
```

---

## 部署方式概览

| 方式 | 适用场景 | 说明 |
|------|----------|------|
| **方式一** | 服务器性能足够、希望一条龙在服务器完成 | 在服务器上 `build` + `up`，使用 `docker-compose.prod.yml` |
| **方式二** | 不想在服务器上构建、不用镜像仓库 | 本地 build → `docker save` 成 tar → 上传服务器 → `docker load` → `up`（无需镜像仓库与登录） |

---

## 方式一：服务器上构建

### 快速部署

```bash
# 1. 克隆项目
git clone <your-repo-url> blog
cd blog

# 2. 创建环境配置
cp .env.prod.example .env.prod

# 3. 编辑环境变量（重要！）
nano .env.prod

# 4. 构建并启动
chmod +x scripts/deploy.sh
./scripts/deploy.sh check
./scripts/deploy.sh build
./scripts/deploy.sh start
```

部署完成后访问 `http://your-server-ip`。

---

## 方式二：本地 build → 导出 tar → 上传服务器 load → up

适合：**不用镜像仓库**，在本地构建后用 tar 包上传到服务器，在服务器上 `docker load` 再 `up` 部署。无需 Docker 登录、无需公网拉镜像。

### 步骤 1：本地构建并导出 tar

在项目根目录执行（会读取 `.env.prod` 中的 `HOST`、`NEXT_PUBLIC_*` 等）：

```bash
./scripts/build-save.sh
# 默认生成 blog-images.tar；也可指定路径： ./scripts/build-save.sh /tmp/blog-images.tar
```

脚本会构建 `blog-api:latest`、`blog-web:latest` 并导出到 `blog-images.tar`。

### 步骤 2：上传 tar 到服务器

用 `scp`、`rsync` 等把 tar 传到服务器（若服务器上已有项目目录，可传到该目录下）：

```bash
scp blog-images.tar user@your-server:/path/to/blog/
```

### 步骤 3：服务器上 load 并启动

在服务器上：

```bash
cd /path/to/blog

# 若尚未有项目，先克隆并配置 .env.prod
# git clone <repo> blog && cd blog && cp .env.prod.example .env.prod && nano .env.prod

# 加载镜像（无需 docker login）
docker load -i blog-images.tar

# 确保 .env.prod 中有（没有则手动添加）：
#   DOCKER_IMAGE_API=blog-api:latest
#   DOCKER_IMAGE_WEB=blog-web:latest

# 启动（与方式二相同，使用 docker-compose.prod.pull.yml）
docker compose -f docker-compose.prod.pull.yml --env-file .env.prod up -d

# 可选：数据库迁移
docker compose -f docker-compose.prod.pull.yml --env-file .env.prod exec api npx prisma migrate deploy
```

### 说明

- **无需镜像仓库、无需登录**：镜像只通过 tar 文件传输，适合内网或不想用 Docker Hub/ACR 的场景。
- 服务器仍需有**代码目录**（含 `docker-compose.prod.pull.yml`、`nginx/`、`.env.prod` 等），只有 web/api 两个服务用本地 load 的镜像；postgres、nginx 仍由 compose 拉取或使用本地镜像。
- 后续更新：重新在本地执行 `./scripts/build-save.sh`，上传新的 tar，在服务器上再次 `docker load -i blog-images.tar` 后执行 `docker compose ... up -d` 即可。

---

## 详细步骤（方式一）

### 1. 准备服务器

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装必要工具
sudo apt install -y git curl nano

# 安装 Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# 重新登录
exit
```

### 2. 克隆项目

```bash
git clone <your-repo-url> blog
cd blog
```

### 3. 配置环境变量

```bash
# 复制示例配置
cp .env.prod.example .env.prod

# 编辑配置
nano .env.prod
```

**必须修改的配置项：**

```bash
# 数据库密码（必须修改）
DB_PASSWORD=your-secure-password-here

# JWT 密钥（必须修改，使用下面的命令生成）
JWT_SECRET=$(openssl rand -base64 32)
JWT_REFRESH_SECRET=$(openssl rand -base64 32)

# 应用 URL（必须修改为你的域名）
NEXT_PUBLIC_API_URL=https://your-domain.com/api
NEXT_PUBLIC_APP_URL=https://your-domain.com
CORS_ORIGIN=https://your-domain.com
UPLOAD_BASE_URL=https://your-domain.com
```

**生成密钥：**

```bash
# 生成 JWT 密钥
echo "JWT_SECRET=$(openssl rand -base64 32)"
echo "JWT_REFRESH_SECRET=$(openssl rand -base64 32)"
```

### 4. 启动服务

```bash
# 添加执行权限
chmod +x scripts/deploy.sh

# 检查配置
./scripts/deploy.sh check

# 构建并启动
./scripts/deploy.sh build
./scripts/deploy.sh start
```

### 5. 上传目录与图片 404

API 通过宿主机目录 `./apps/api/uploads` 挂载到容器提供图片。若生产环境是全新部署或未同步过该目录，`/uploads/covers/xxx.png` 会返回 404（请求已到 API，但容器内找不到文件）。

**处理方式：** 把本地或 CI 上的 `apps/api/uploads` 同步到服务器项目根下同名目录，再重启 API 或等 volume 生效即可。例如在**本机**执行：

```bash
# 将本机 uploads 同步到服务器（替换为你的服务器用户与主机）
rsync -avz --progress ./apps/api/uploads/ user@your-server:/path/to/blog/apps/api/uploads/
```

同步完成后无需重建镜像，重启 API 容器即可：`docker compose -f docker-compose.prod.yml restart api`。

若之前使用的是 **Docker 命名卷**（如 `uploads_data`），后来改为绑定挂载 `./apps/api/uploads`，旧图片会留在命名卷中导致 404。请参考 [Uploads 卷迁移指南](UPLOADS-VOLUME-MIGRATION.md) 将旧卷数据拷贝到新目录。

### 6. 验证部署

```bash
# 查看服务状态
./scripts/deploy.sh status

# 查看日志
./scripts/deploy.sh logs

# 检查特定服务日志
./scripts/deploy.sh logs web
./scripts/deploy.sh logs api
./scripts/deploy.sh logs postgres
```

---

## SSL 配置

### 使用 Let's Encrypt (推荐)

```bash
# 安装 certbot
sudo apt install -y certbot

# 获取证书（先停止 nginx）
docker-compose -f docker-compose.prod.yml stop nginx

# 获取证书
sudo certbot certonly --standalone -d your-domain.com

# 证书位置
# /etc/letsencrypt/live/your-domain.com/fullchain.pem
# /etc/letsencrypt/live/your-domain.com/privkey.pem

# 复制证书到项目目录
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem nginx/ssl/
sudo chown $USER:$USER nginx/ssl/*

# 修改 nginx 配置
nano nginx/nginx.conf
# 取消注释 HTTPS server 块，注释掉 HTTP server 块

# 重启服务
./scripts/deploy.sh restart
```

### 自动续期

```bash
# 添加定时任务
sudo crontab -e

# 添加以下行（每天凌晨 3 点检查续期）
0 3 * * * certbot renew --quiet && cp /etc/letsencrypt/live/your-domain.com/*.pem /path/to/blog/nginx/ssl/ && cd /path/to/blog && docker-compose -f docker-compose.prod.yml restart nginx
```

---

## 常用命令

**方式一（服务器上 build）**：使用 `./scripts/deploy.sh` 或直接操作 `docker-compose.prod.yml`。

```bash
# 启动 / 停止 / 重启
./scripts/deploy.sh start
./scripts/deploy.sh stop
./scripts/deploy.sh restart

# 状态与日志
./scripts/deploy.sh status
./scripts/deploy.sh logs
./scripts/deploy.sh logs api
./scripts/deploy.sh logs web

# 数据库迁移、备份、更新
./scripts/deploy.sh migrate
./scripts/deploy.sh backup
./scripts/deploy.sh update

# 完全重置（危险！会删除所有数据）
./scripts/deploy.sh reset
```

**方式二（本地 build 导出 tar 后 load 部署）**：在服务器上 load 完镜像后，用 `docker-compose.prod.pull.yml` 启动。

```bash
COMPOSE="docker compose -f docker-compose.prod.pull.yml --env-file .env.prod"

$COMPOSE up -d
$COMPOSE ps
$COMPOSE logs -f
$COMPOSE exec api npx prisma migrate deploy
$COMPOSE down
```

---

## 故障排查

### 查看日志

```bash
# 所有服务日志
./scripts/deploy.sh logs

# 特定服务日志
docker-compose -f docker-compose.prod.yml logs api
docker-compose -f docker-compose.prod.yml logs web
docker-compose -f docker-compose.prod.yml logs postgres
```

### 常见问题

#### 1. 端口被占用

```bash
# 查看端口占用
sudo lsof -i :80
sudo lsof -i :443

# 停止占用端口的服务
sudo systemctl stop nginx  # 如果系统安装了 nginx
sudo systemctl stop apache2  # 如果系统安装了 apache
```

#### 2. 数据库连接失败

```bash
# 检查数据库状态
docker-compose -f docker-compose.prod.yml ps postgres

# 查看数据库日志
docker-compose -f docker-compose.prod.yml logs postgres

# 重启数据库
docker-compose -f docker-compose.prod.yml restart postgres
```

#### 3. API 启动失败

```bash
# 检查 API 日志
docker-compose -f docker-compose.prod.yml logs api

# 常见原因：
# - 数据库未就绪：等待几秒后重试
# - 环境变量错误：检查 .env.prod 文件
# - JWT 密钥未设置：确保 JWT_SECRET 已配置
```

#### 4. 构建失败

```bash
# 清理 Docker 缓存重新构建
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d
```

### 进入容器调试

```bash
# 进入 API 容器
docker-compose -f docker-compose.prod.yml exec api sh

# 进入数据库容器
docker-compose -f docker-compose.prod.yml exec postgres psql -U blog_user -d blog_prod
```

---

## 文件结构

```
blog/
├── docker-compose.prod.yml      # 生产环境 Docker Compose（服务器上 build）
├── docker-compose.prod.pull.yml # 生产环境仅拉取镜像部署（方式二）
├── Dockerfile.api               # API Dockerfile
├── Dockerfile.web               # Web Dockerfile
├── .env.prod                    # 生产环境变量（需创建）
├── .env.prod.example            # 环境变量示例
├── nginx/
│   ├── nginx.conf               # Nginx 配置
│   └── ssl/                     # SSL 证书目录
├── scripts/
│   ├── deploy.sh                # 部署脚本（方式一）
│   └── build-save.sh            # 本地构建并导出 tar（方式二）
└── backups/                     # 数据库备份目录
```

---

## 安全建议

1. **修改默认密码**: 数据库密码、JWT 密钥必须使用强密码
2. **配置防火墙**: 只开放必要端口 (80, 443, 22)
3. **定期备份**: 设置自动备份任务
4. **更新系统**: 定期更新系统和 Docker
5. **启用 SSL**: 生产环境必须使用 HTTPS

```bash
# 配置防火墙 (Ubuntu)
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

---

## 性能优化

### 调整 Docker 资源限制

编辑 `docker-compose.prod.yml`，添加资源限制：

```yaml
services:
  api:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
        reservations:
          memory: 512M
```

### 数据库优化

```yaml
services:
  postgres:
    command:
      - postgres
      - -c
      - shared_buffers=256MB
      - -c
      - max_connections=200
```

---

如有问题，请查看 [故障排查](#故障排查) 或提交 Issue。