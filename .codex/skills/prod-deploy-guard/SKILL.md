---
name: prod-deploy-guard
description: Use when the user asks about production deployment, docker-compose.prod.yml, .env.prod, production release checks, migrations, or release verification for this repo. Before suggesting or running a production deploy, run the local preflight command `pnpm predeploy:prod`. When Dockerfiles, native dependencies, or build-time environment issues are involved, prefer `pnpm predeploy:prod:docker` for a closer production check.
---

# Prod Deploy Guard

For production deploy work in this repo, follow this order:

1. Run `pnpm predeploy:prod`.
2. If the change touches Dockerfiles, build-time env vars, native runtime tools, or anything that may fail only inside containers, run `pnpm predeploy:prod:docker`.
3. Confirm Prisma migrations exist in `apps/api/prisma/migrations` when schema changes are part of the release.
4. Only after preflight passes, use:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

After deploy, verify with:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod ps
docker compose -f docker-compose.prod.yml --env-file .env.prod logs -f api
```

Notes for this repo:

- `api` startup runs `npx prisma migrate deploy`, so migration files must already exist in the repo.
- `web` production failures often appear during `next build`, so local `pnpm --filter web build` is part of the required preflight.
- Voice transcription depends on production image contents, so Docker-level preflight is preferred when `Dockerfile.api` changes.
