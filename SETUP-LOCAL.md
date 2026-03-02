# 本地环境快速配置（从 Git 拉取后）

从 Git 拉取项目后，按以下步骤配置并运行前后端。

## 前置要求

- **Node.js** 20+
- **pnpm** 9+（`npm i -g pnpm`）
- **Docker Desktop**（用于运行 PostgreSQL）

## 一、安装依赖

在项目根目录执行：

```bash
pnpm install
```

## 二、配置后端环境变量

1. 进入后端目录并复制环境示例：

   ```bash
   cd apps/api
   copy .env.example .env
   ```

2. 编辑 `apps/api/.env`，**必须修改**以下两项为随机字符串（至少 32 字符）：

   - `JWT_SECRET`
   - `JWT_REFRESH_SECRET`

   示例（可自行替换为任意 32+ 字符）：

   ```env
   JWT_SECRET=your-super-secret-jwt-key-at-least-32-characters-long
   JWT_REFRESH_SECRET=your-super-secret-refresh-key-at-least-32-chars
   ```

   `DATABASE_URL` 已按 `docker-compose.yml` 写好，无需改（除非改了 Docker 里的账号/库名）。

## 三、启动数据库

在**项目根目录**执行：

```bash
pnpm docker:up
```

等待 PostgreSQL 就绪（约 10–20 秒）。可用下面命令查看容器是否在跑：

```bash
docker ps
```

## 四、生成 Prisma 并执行迁移

在**项目根目录**执行：

```bash
pnpm db:generate
pnpm db:migrate
```

按提示输入迁移名称或直接回车使用默认名。

（可选）写入种子数据（测试账号等）：

```bash
pnpm db:seed
```

## 五、配置前端环境（可选）

前端默认连 `http://localhost:3001`。若 API 端口或域名不同，可复制并修改：

```bash
cd apps/web
copy .env.example .env
```

编辑 `apps/web/.env` 中的 `NEXT_PUBLIC_API_URL`。

## 六、启动前后端

在**项目根目录**执行：

```bash
pnpm dev
```

- 前端：<http://localhost:3000>
- 后端 API：<http://localhost:3001>
- 健康检查：<http://localhost:3001/health>

若已执行过 `pnpm db:seed`，可用种子账号登录（见 README/QUICKSTART 中的默认账号）。

---

## Windows 说明

- 根目录的 `pnpm init` 脚本里用了 `sleep 5`，在 Windows PowerShell 下可能不兼容，建议按上面**二～六**步手动执行。
- 复制文件请用 `copy .env.example .env`，不要用 `cp`。

## 常见问题

| 现象 | 处理 |
|------|------|
| 数据库连接失败 | 确认 `pnpm docker:up` 已执行且 `docker ps` 能看到 `blog-postgres` |
| 后端启动报错 env 校验失败 | 检查 `apps/api/.env` 是否存在，且 `JWT_SECRET`、`JWT_REFRESH_SECRET` 至少 32 字符 |
| Prisma 报错 | 先执行 `pnpm db:generate`，再执行 `pnpm db:migrate` |
| 5432 端口占用 | 关闭本机其它 PostgreSQL 或修改 `docker-compose.yml` 中端口映射 |

完成以上步骤后，前后端即可在本地正常运行。
