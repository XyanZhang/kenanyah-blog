# Linux 服务器部署指南

本文档对应当前仓库的推荐生产发布方式：`单机 + 单 PostgreSQL + 安全迁移 + 可选短暂 green 应用切换`。

## 适用场景

- 个人项目 / 小流量站点
- 单机 Docker Compose
- `2C2G` 这类资源紧张的服务器
- 默认接受 `10-30 秒` 的短切换窗口

## 当前生产架构

- 一套生产数据库：`postgres`
- 一套主应用：`api` + `web`
- 一套反向代理：`nginx`
- 可选的临时 green 应用：`api-green` + `web-green`
- 数据库迁移通过独立 one-off 任务 `migrate` 执行，不再在 API 启动时自动执行

## 发布原则

### 1. 默认不做双数据库蓝绿

- 生产只保留一套 PostgreSQL
- 不维护常驻 `db-blue / db-green`
- 只有大规模数据导入、跨库切换、极高风险数据库改造时，才临时起第二套数据库

### 2. 所有常规发布遵循固定顺序

```bash
本地 predeploy
-> 本地 build + export tar
-> 上传服务器并 docker load
-> 生产库备份
-> 独立执行 prisma migrate deploy
-> 启动新应用
-> verify
```

### 3. 常规迁移只允许兼容式变更

允许：

- `ADD COLUMN`
- 新表 / 新索引
- 可空字段
- 双写字段 + 后台回填

禁止直接进入日常发布：

- `DROP COLUMN`
- 危险类型直接变更
- 大表重写
- 长时间锁表的 DDL

### 4. 删除类变更必须走 expand-contract

1. 第一次发布：新增兼容结构，代码兼容旧字段和新字段
2. 第二次发布：回填数据，切换读写
3. 第三次发布：删除旧结构

### 5. `pgvector` 数据单独看待

- embedding / vector 相关表可视为“可重建数据”
- 可以更激进，但不要把这套策略直接用于核心业务表

## 环境建议

### 本地开发

- 使用 `docker-compose.yml`
- 快速迁移、重置、seed
- 不追求零停机

### 本地预演

- 使用 `docker-compose.test.yml`
- 导入接近生产的脱敏数据快照
- 每次生产发布前完整演练一遍迁移和启动流程

### 生产

- 推荐使用 `docker-compose.prod.pull.yml`
- 本地构建镜像并导出 tar，服务器只负责 `docker load + migrate + up`

## 首次生产部署

### 1. 准备服务器

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

重新登录后：

```bash
git clone <your-repo-url> blog
cd blog
cp .env.prod.example .env.prod
```

### 2. 编辑 `.env.prod`

必须至少配置：

- `DB_PASSWORD`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `HOST`
- `DOCKER_IMAGE_API`
- `DOCKER_IMAGE_WEB`

可选但推荐配置：

- `VERIFY_POST_PATH`
- `VERIFY_UPLOAD_PATH`
- `VERIFY_WRITE_URL`
- `VERIFY_WRITE_BEARER_TOKEN`

### 3. 本地构建镜像并导出

在你的本机执行：

```bash
pnpm predeploy:prod
./scripts/build-save.sh
```

该脚本会生成：

- `blog-images.tar`
- `blog-images.release.env`

### 4. 上传到服务器并加载镜像

```bash
scp blog-images.tar user@your-server:/path/to/blog/
scp blog-images.release.env user@your-server:/path/to/blog/
```

服务器上执行：

```bash
cd /path/to/blog
docker load -i blog-images.tar
source blog-images.release.env
```

### 5. 备份、迁移、启动、验证

```bash
./scripts/deploy.sh backup "$RELEASE_TAG"
./scripts/deploy.sh migrate "$RELEASE_TAG"
./scripts/deploy.sh deploy-app primary "$RELEASE_TAG"
./scripts/deploy.sh verify
```

## 日常生产发布

推荐默认流程：

```bash
# 本地
pnpm predeploy:prod
./scripts/build-save.sh

# 服务器
docker load -i blog-images.tar
source blog-images.release.env
./scripts/deploy.sh backup "$RELEASE_TAG"
./scripts/deploy.sh migrate "$RELEASE_TAG"
./scripts/deploy.sh deploy-app primary "$RELEASE_TAG"
./scripts/deploy.sh verify
```

说明：

- `backup` 默认生成压缩 `.dump` 文件，命名为 `backups/prod_<db>_<release>_predeploy.dump`
- `migrate` 使用独立的 `migrate` 服务执行 `prisma migrate deploy`
- `deploy-app primary` 更新主应用容器
- `verify` 会检查健康接口、首页、登录页，以及你在 `.env.prod` 里配置的额外 URL

## 可选的 green 应用发布

适合“想更稳一点，但不想上双数据库”的场景。

### 1. 启动 green 应用

```bash
source blog-images.release.env
./scripts/deploy.sh migrate "$RELEASE_TAG"
./scripts/deploy.sh green-up "$RELEASE_TAG"
```

### 2. 切流量到 green

```bash
./scripts/deploy.sh switch-green
./scripts/deploy.sh verify
```

### 3. 如果没问题，可以保留一会儿观察

确认稳定后，下一次发布前再清理 green：

```bash
./scripts/deploy.sh green-down
./scripts/deploy.sh switch-primary
```

说明：

- green 只复制应用，不复制数据库
- green 与 primary 共用同一个生产库
- nginx 通过 `API_UPSTREAM` / `WEB_UPSTREAM` 环境变量切换 upstream

## 回滚

默认只回滚应用版本，不自动回滚数据库结构。

前提：服务器上还保留旧版本镜像 tag。

```bash
./scripts/deploy.sh rollback <release-tag>
./scripts/deploy.sh verify
```

如果你刚刚切到了 green，而 primary 还在正常运行，则最快回滚是：

```bash
./scripts/deploy.sh switch-primary
```

## 验证清单

每次生产发布后至少验证：

- `/api/health`
- 首页
- `/login`
- 一篇文章详情页
- 一个上传资源 URL
- 一条写接口

脚本支持从 `.env.prod` 读取以下验证配置：

```bash
VERIFY_BASE_URL=https://www.xyan.store
VERIFY_API_HEALTH_URL=https://www.xyan.store/api/health
VERIFY_HOME_URL=https://www.xyan.store/
VERIFY_LOGIN_URL=https://www.xyan.store/login
VERIFY_POST_PATH=/posts/example-slug
VERIFY_UPLOAD_PATH=/uploads/covers/example.png
VERIFY_WRITE_URL=https://www.xyan.store/api/some-write-endpoint
VERIFY_WRITE_METHOD=POST
VERIFY_WRITE_EXPECT=200,201,204
VERIFY_WRITE_BODY={"name":"deploy-check"}
VERIFY_WRITE_BEARER_TOKEN=<token>
```

未配置的可选项会在 `verify` 里被跳过并给出 warning。

## 常用命令

```bash
./scripts/deploy.sh check
./scripts/deploy.sh predeploy
./scripts/deploy.sh backup
./scripts/deploy.sh migrate
./scripts/deploy.sh deploy-app
./scripts/deploy.sh verify
./scripts/deploy.sh status
./scripts/deploy.sh logs api
./scripts/deploy.sh logs web
./scripts/deploy.sh logs nginx
```

green 相关：

```bash
./scripts/deploy.sh green-up <release-tag>
./scripts/deploy.sh switch-green
./scripts/deploy.sh switch-primary
./scripts/deploy.sh green-down
```

## 故障排查

### API 启动了但表不存在

根本原因通常是：新流程里迁移不再跟 API 启动绑在一起，所以你漏跑了：

```bash
./scripts/deploy.sh migrate
```

### nginx 还在指向旧服务

检查当前是不是还没执行：

```bash
./scripts/deploy.sh switch-green
```

或你后来又执行了不带 green upstream 的 `docker compose up -d nginx`，把 upstream 恢复成了默认主服务。

### 回滚失败

根本原因通常是服务器上没有保留旧 tag 镜像。发布时请保留 `build-save.sh` 生成的 release tag，并不要立刻清理旧镜像。

### 2C2G 机器内存吃紧

优先排查：

- 是否在服务器上直接 `docker build`
- 是否长期保留 `api-green` / `web-green`
- 是否 embedding 数据过大、磁盘或内存压力明显增加

## 文件说明

```text
docker-compose.prod.yml         # 服务器 build 路线（兼容保留）
docker-compose.prod.pull.yml    # 推荐：本地 build 后，服务器 load 镜像再运行
scripts/build-save.sh           # 本地构建 + 导出 tar + 生成 release tag 信息
scripts/deploy.sh               # 生产发布 / 迁移 / 验证 / green 切换 / 回滚入口
nginx/nginx.conf.template       # 支持 primary / green upstream 切换的 nginx 模板
```
