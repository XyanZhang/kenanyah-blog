# 环境变量作用范围说明

本文说明本项目中环境变量在不同场景下的来源、作用范围，以及 Docker Compose、API、Web 各自如何读取。

---

## 一、总览

| 场景 | 变量来源 | 谁在用 |
|------|----------|--------|
| **生产部署（Docker Compose）** | 仓库根目录 `.env.prod`（通过 `--env-file .env.prod` 传入） | Compose 做**变量替换**后注入到各容器的 `environment` / 构建时传给 web 的 `build.args` |
| **API 本地开发** | `apps/api/.env` | API 进程（`env.ts` 的 dotenv + `pnpm dev` 的 `--env-file=.env`） |
| **API 生产（容器内）** | 仅 Compose 注入的 `environment`，**不读** `apps/api/.env`（镜像里也没有该文件） | API 进程（`env.ts` 的 dotenv 找不到文件，全靠 `process.env`） |
| **Web 本地开发** | `apps/web/.env*`（如 `.env.local`） | Next.js（`next dev` 自动加载；`NEXT_PUBLIC_*` 会在构建/热更时内联到前端） |
| **Web 生产（容器内）** | **构建时**：Dockerfile 的 ARG/ENV（由 Compose 的 `build.args` 从 `.env.prod` 提供） | `next build` 把 `NEXT_PUBLIC_*` **写进前端代码**；**运行时**容器里的 `environment` 只影响 Node 服务端，已打包的前端不再读运行时环境变量 |

---

## 二、Docker Compose 时环境变量怎么用

- 你执行的是：
  ```bash
  docker compose -f docker-compose.prod.yml --env-file .env.prod up -d
  ```
- **作用**：
  - Compose 会读取 **`.env.prod`**（以及当前 shell 里已有的环境变量）。
  - 在 `docker-compose.prod.yml` 里，所有 `${VAR}`、`${VAR:-default}`、`${VAR:?error}` 都会用这些值做**替换**。
- **用到的地方**：
  1. **各服务的 `environment:`**  
     替换后的键值对会在**容器运行时**作为该容器的环境变量（`process.env`）。
  2. **web 的 `build.args:`**  
     替换后的值在 **构建镜像** 时作为 Docker build-arg 传给 Dockerfile，用于 `ARG` / `ENV`，进而被 `next build` 读走并写进前端资源。
  3. **postgres 的 `environment`、healthcheck 等**  
     同样来自 `.env.prod` 的替换结果。

因此：**生产环境下，Compose 用的“唯一配置源”就是根目录的 `.env.prod`**（以及你 export 的 shell 环境变量）。  
子项目自己的 `.env`（如 `apps/api/.env`、`apps/web/.env*`）在 Docker 构建/运行时**默认不会被挂载**，所以**不会**参与生产 Compose 的配置。

---

## 三、API（apps/api）环境变量

### 3.1 代码里怎么读

- `apps/api/src/env.ts` 里：
  - 用 `dotenv` 显式加载 **`apps/api/.env`**（路径是相对于 `env.ts` 所在目录的 `../.env`）。
  - 然后用 `zod` 校验 `process.env` 并导出 `env` 对象。
- 因此 API 实际用的是：**先 dotenv 加载 .env 里的变量 → 再和已有的 `process.env` 合并**，最终以 `process.env` 为准（dotenv 不会覆盖已存在的环境变量）。

### 3.2 本地开发

- 你在 `apps/api` 下执行 `pnpm dev` → 实际是 `tsx watch --env-file=.env src/index.ts`。
  - `--env-file=.env` 会再加载 **`apps/api/.env`**（以当前工作目录为基准）。
- 所以本地 API 的变量来源是：**`apps/api/.env`**（既被 tsx 加载，也被 `env.ts` 的 dotenv 加载；若两边都有，通常以先加载的或 process.env 已有为准）。

### 3.3 生产（Docker）

- 镜像构建时 **不会** 把 `apps/api/.env` 打进去（也没有用 `--env-file` 挂载）。
- 容器启动时，**只有** Compose 里 `api` 服务的 `environment:` 会注入到容器内进程的 `process.env`。
- `env.ts` 里的 `config({ path: '.../.env' })` 在容器里找不到该文件，相当于只依赖 **Compose 注入的 `process.env`**。

结论：**生产时 API 的配置 100% 来自 `docker-compose.prod.yml` 里 `api.environment`，而这些值又 100% 来自 `.env.prod` 的替换结果。**

---

## 四、Web（apps/web / Next.js）环境变量

### 4.1 代码里怎么读

- `apps/web/src/lib/env.ts` 只读 `process.env.NEXT_PUBLIC_*`，并做校验。
- Next 约定：
  - **以 `NEXT_PUBLIC_` 开头的变量** 会在 **构建时** 被内联到前端打包结果里（客户端、服务端都能用到这份“写死”的值）。
  - 其它变量只在 Node 服务端存在，不会出现在浏览器里。

### 4.2 本地开发

- 运行 `next dev` 时，Next 会自动加载 `apps/web` 下的 `.env`、`.env.local`、`.env.development` 等。
- 这些文件里若定义了 `NEXT_PUBLIC_*`，会在开发时的“构建”里内联到前端，所以本地改 `.env.local` 后刷新即可生效（有时需重启 dev server）。

### 4.3 生产（Docker）

- **构建阶段（关键）**  
  - `docker-compose.prod.yml` 里 web 的 **`build.args`** 把 `NEXT_PUBLIC_API_URL`、`NEXT_PUBLIC_APP_URL`、`NEXT_PUBLIC_APP_NAME` 传给 Docker。
  - Dockerfile.web 里用 **ARG + ENV** 接收这些值，在 **`pnpm --filter web build`（即 `next build`）之前** 已经设好。
  - 因此 **`next build` 时** 读到的是 `.env.prod` 里配置的（或默认的）公网地址，并把这些值**写进前端 JS**。
- **运行阶段**  
  - 容器里 `environment:` 虽然也有 `NEXT_PUBLIC_*`，但**前端代码已经打包完成**，浏览器里跑的是构建时写死的地址；**运行时环境变量只影响 Next 的 Node 服务端**（若你在服务端代码里读 `process.env.NEXT_PUBLIC_*`，会拿到容器里的值，但前端请求的 API 地址仍是构建时的值）。

所以：**想让生产环境的前端请求正确公网 API，必须在“构建镜像”时** 就通过 `.env.prod` → Compose `build.args` → Dockerfile ARG/ENV 把 `NEXT_PUBLIC_*` 传进去，并**重新 build 一次 web 镜像**；只改 `.env.prod` 再 `up` 而不 rebuild，前端不会变。

---

## 五、小结表

| 变量类型 / 场景 | 本地 API | 生产 API（容器） | 本地 Web | 生产 Web（容器） |
|-----------------|----------|-------------------|----------|-------------------|
| **来源** | `apps/api/.env` | `.env.prod` → Compose `api.environment` | `apps/web/.env*` | `.env.prod` → Compose `web.build.args` → Dockerfile ARG/ENV → **构建时**写进前端 |
| **何时生效** | 改 .env 后重启 dev | 改 .env.prod 后 `up` / `restart` | 改 .env* 后重启 dev | 改 .env.prod 后**重新 build web** 再 up |
| **NEXT_PUBLIC_*** | - | - | 构建/热更时内联 | **仅构建时**内联；运行时 env 只影响 Node 端 |

---

## 六、推荐用法（与本仓库一致）

- **生产**：只维护一份 **根目录 `.env.prod`**；用 `./scripts/setup-env-prod.sh` 根据 `PUBLIC_ORIGIN` 生成其中的 `NEXT_PUBLIC_*`、`CORS_ORIGIN`、`UPLOAD_BASE_URL` 等；Compose 用 `--env-file .env.prod`，不再依赖各子项目自己的 .env。
- **本地开发**：  
  - API：在 **`apps/api/.env`** 里配置数据库、JWT、CORS 等（可参考 `.env.prod.example` 的命名）。  
  - Web：在 **`apps/web/.env.local`** 里配置 `NEXT_PUBLIC_*`（可参考 `apps/web/.env.example`）。

这样“生产用根目录 .env.prod + Compose；本地用各自 .env”的边界清晰，也便于排查问题。
