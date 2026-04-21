#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

ENV_FILE="${ENV_FILE:-.env.prod}"
RUN_DOCKER_BUILD=false

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

for arg in "$@"; do
  case "$arg" in
    --docker)
      RUN_DOCKER_BUILD=true
      ;;
    *)
      log_error "Unknown argument: $arg"
      echo "Usage: bash scripts/predeploy-prod-check.sh [--docker]"
      exit 1
      ;;
  esac
done

if ! command -v pnpm >/dev/null 2>&1; then
  log_error "pnpm is not installed."
  exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
  log_error "Environment file $ENV_FILE not found."
  log_info "Copy .env.prod.example to .env.prod and fill it first."
  exit 1
fi

log_info "Validating production compose config..."
docker compose -f docker-compose.prod.yml --env-file "$ENV_FILE" config >/dev/null

log_info "Type-checking API..."
pnpm --filter @blog/api type-check

log_info "Type-checking Web..."
rm -rf apps/web/.next
pnpm --filter web exec tsc --noEmit

log_info "Type-checking Admin..."
pnpm --filter admin exec tsc --noEmit

log_info "Building Web locally to catch Next.js production build errors early..."
pnpm --filter web build

log_info "Building Admin locally to catch production build errors early..."
pnpm --filter admin build

if [ "$RUN_DOCKER_BUILD" = true ]; then
  log_warn "Running Docker production build verification for api, web, and admin..."
  docker compose -f docker-compose.prod.yml --env-file "$ENV_FILE" build api web admin
fi

echo ""
log_info "Production preflight passed."
log_info "You can deploy with:"
echo "  docker compose -f docker-compose.prod.yml --env-file $ENV_FILE up -d --build"
