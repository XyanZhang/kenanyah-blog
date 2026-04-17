#!/bin/bash
# ===========================================
# Blog Production Deployment Script
# Usage: ./scripts/deploy.sh [command]
# Default flow for a 2C2G single-host deployment:
#   1. ./scripts/deploy.sh predeploy        # local preflight
#   2. ./scripts/build-save.sh              # local image build + tar export
#   3. On server: docker load -i blog-images.tar
#   4. ./scripts/deploy.sh backup
#   5. ./scripts/deploy.sh migrate
#   6. ./scripts/deploy.sh deploy-app
#   7. ./scripts/deploy.sh verify
# Optional safer rollout:
#   ./scripts/deploy.sh green-up <release-tag>
#   ./scripts/deploy.sh switch-green
#   ./scripts/deploy.sh verify
#   ./scripts/deploy.sh switch-primary      # fast rollback if needed
# ===========================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

BUILD_COMPOSE_FILE="docker-compose.prod.yml"
PULL_COMPOSE_FILE="docker-compose.prod.pull.yml"
ENV_FILE="${ENV_FILE:-.env.prod}"
BACKUP_DIR="${REPO_ROOT}/backups"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
  echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

get_env_var() {
  local key="$1"
  if [ ! -f "$ENV_FILE" ]; then
    return 0
  fi

  local line
  line="$(grep -E "^${key}=" "$ENV_FILE" | head -1 || true)"
  if [ -z "$line" ]; then
    return 0
  fi

  line="${line#*=}"
  line="${line%\"}"
  line="${line#\"}"
  line="${line%\'}"
  line="${line#\'}"
  printf '%s' "$line"
}

default_db_user() {
  local value
  value="${DB_USER:-$(get_env_var DB_USER)}"
  printf '%s' "${value:-blog_user}"
}

default_db_name() {
  local value
  value="${DB_NAME:-$(get_env_var DB_NAME)}"
  printf '%s' "${value:-blog_prod}"
}

default_host() {
  local value
  value="${HOST:-$(get_env_var HOST)}"
  printf '%s' "${value:-https://www.xyan.store}"
}

resolve_runtime_compose_file() {
  local env_api env_web
  env_api="${DOCKER_IMAGE_API:-$(get_env_var DOCKER_IMAGE_API)}"
  env_web="${DOCKER_IMAGE_WEB:-$(get_env_var DOCKER_IMAGE_WEB)}"

  if [ -n "${1:-}" ]; then
    printf '%s' "$PULL_COMPOSE_FILE"
    return 0
  fi

  if [ -n "$env_api" ] && [ -n "$env_web" ]; then
    printf '%s' "$PULL_COMPOSE_FILE"
  else
    printf '%s' "$BUILD_COMPOSE_FILE"
  fi
}

compose_cmd() {
  local compose_file="$1"
  shift
  docker compose -f "$compose_file" --env-file "$ENV_FILE" "$@"
}

compose_runtime() {
  local release_tag="${1:-}"
  shift || true
  local compose_file
  compose_file="$(resolve_runtime_compose_file "$release_tag")"

  if [ -n "$release_tag" ]; then
    DOCKER_IMAGE_API="blog-api:${release_tag}" \
      DOCKER_IMAGE_WEB="blog-web:${release_tag}" \
      docker compose -f "$compose_file" --env-file "$ENV_FILE" "$@"
  else
    docker compose -f "$compose_file" --env-file "$ENV_FILE" "$@"
  fi
}

runtime_compose_file() {
  resolve_runtime_compose_file "${1:-}"
}

check_prerequisites() {
  log_info "Checking prerequisites..."

  if ! command -v docker >/dev/null 2>&1; then
    log_error "Docker is not installed."
    exit 1
  fi

  if ! docker compose version >/dev/null 2>&1; then
    log_error "Docker Compose is not installed."
    exit 1
  fi

  if [ ! -f "$ENV_FILE" ]; then
    log_error "Environment file $ENV_FILE not found."
    log_info "Copy .env.prod.example to .env.prod and fill in values:"
    log_info "  cp .env.prod.example .env.prod"
    exit 1
  fi

  log_info "Prerequisites check passed."
}

ensure_postgres() {
  local release_tag="${1:-}"
  compose_runtime "$release_tag" up -d postgres
}

build() {
  check_prerequisites
  log_info "Building Docker images on the server using $BUILD_COMPOSE_FILE ..."
  compose_cmd "$BUILD_COMPOSE_FILE" build
  log_info "Build complete."
}

predeploy() {
  check_prerequisites
  if ! command -v pnpm >/dev/null 2>&1; then
    log_error "pnpm is required for predeploy checks."
    exit 1
  fi
  log_info "Running production preflight..."
  pnpm predeploy:prod
}

backup() {
  check_prerequisites
  ensure_postgres
  mkdir -p "$BACKUP_DIR"

  local label="${1:-$(date +%Y%m%d-%H%M%S)}"
  local db_user db_name output_file
  db_user="$(default_db_user)"
  db_name="$(default_db_name)"
  output_file="${BACKUP_DIR}/prod_${db_name}_${label}_predeploy.dump"

  log_info "Creating production backup: $output_file"
  compose_runtime "" exec -T postgres pg_dump -Fc -U "$db_user" "$db_name" >"$output_file"

  if [ ! -s "$output_file" ]; then
    log_error "Backup file is empty: $output_file"
    rm -f "$output_file"
    exit 1
  fi

  log_info "Backup complete."
  ls -lh "$output_file"
}

migrate() {
  check_prerequisites
  local release_tag="${1:-}"
  ensure_postgres "$release_tag"
  log_info "Running Prisma migrations with a dedicated one-off task..."
  compose_runtime "$release_tag" --profile ops run --rm migrate
  log_info "Migrations complete."
}

deploy_app() {
  check_prerequisites
  local target="${1:-primary}"
  local release_tag="${2:-}"

  if [ "$target" = "green" ]; then
    log_info "Starting temporary green app services..."
    compose_runtime "$release_tag" --profile green up -d api-green web-green
    log_info "Green services are up. Switch traffic with: ./scripts/deploy.sh switch-green"
    return 0
  fi

  log_info "Deploying primary app services..."
  compose_runtime "$release_tag" up -d api web nginx
  log_info "Primary app services updated."
}

switch_upstreams() {
  check_prerequisites
  local web_upstream="$1"
  local api_upstream="$2"

  log_info "Switching nginx upstreams to web=${web_upstream}, api=${api_upstream}"
  WEB_UPSTREAM="$web_upstream" \
    API_UPSTREAM="$api_upstream" \
    docker compose -f "$(runtime_compose_file)" --env-file "$ENV_FILE" up -d nginx
}

switch_primary() {
  switch_upstreams "web:3000" "api:3001"
}

switch_green() {
  switch_upstreams "web-green:3000" "api-green:3001"
}

green_down() {
  check_prerequisites
  log_info "Stopping temporary green app services..."
  compose_runtime "" --profile green stop api-green web-green || true
  compose_runtime "" --profile green rm -sf api-green web-green || true
  log_info "Green services removed."
}

verify_url() {
  local label="$1"
  local url="$2"
  local expected_csv="${3:-200}"
  local method="${4:-GET}"
  local body="${5:-}"
  local bearer="${6:-}"

  local code curl_args
  curl_args=(-k -sS -o /dev/null -w '%{http_code}' -X "$method")

  if [ -n "$bearer" ]; then
    curl_args+=(-H "Authorization: Bearer $bearer")
  fi

  if [ -n "$body" ]; then
    curl_args+=(-H 'Content-Type: application/json' --data "$body")
  fi

  code="$(curl "${curl_args[@]}" "$url")"
  IFS=',' read -r -a expected_codes <<<"$expected_csv"

  for expected in "${expected_codes[@]}"; do
    if [ "$code" = "$expected" ]; then
      log_info "Verified ${label}: ${url} -> ${code}"
      return 0
    fi
  done

  log_error "Verification failed for ${label}: ${url} -> ${code} (expected ${expected_csv})"
  exit 1
}

verify() {
  check_prerequisites

  local base_url api_health_url home_url login_url
  local post_path upload_path write_url write_method write_expect write_body write_bearer

  base_url="${VERIFY_BASE_URL:-$(get_env_var VERIFY_BASE_URL)}"
  base_url="${base_url:-$(default_host)}"
  api_health_url="${VERIFY_API_HEALTH_URL:-$(get_env_var VERIFY_API_HEALTH_URL)}"
  home_url="${VERIFY_HOME_URL:-$(get_env_var VERIFY_HOME_URL)}"
  login_url="${VERIFY_LOGIN_URL:-$(get_env_var VERIFY_LOGIN_URL)}"
  post_path="${VERIFY_POST_PATH:-$(get_env_var VERIFY_POST_PATH)}"
  upload_path="${VERIFY_UPLOAD_PATH:-$(get_env_var VERIFY_UPLOAD_PATH)}"
  write_url="${VERIFY_WRITE_URL:-$(get_env_var VERIFY_WRITE_URL)}"
  write_method="${VERIFY_WRITE_METHOD:-$(get_env_var VERIFY_WRITE_METHOD)}"
  write_expect="${VERIFY_WRITE_EXPECT:-$(get_env_var VERIFY_WRITE_EXPECT)}"
  write_body="${VERIFY_WRITE_BODY:-$(get_env_var VERIFY_WRITE_BODY)}"
  write_bearer="${VERIFY_WRITE_BEARER_TOKEN:-$(get_env_var VERIFY_WRITE_BEARER_TOKEN)}"

  api_health_url="${api_health_url:-${base_url%/}/api/health}"
  home_url="${home_url:-${base_url%/}/}"
  login_url="${login_url:-${base_url%/}/login}"
  write_method="${write_method:-POST}"
  write_expect="${write_expect:-200,201,204}"

  log_info "Running production verification checks..."
  verify_url "API health" "$api_health_url" "200"
  verify_url "Home page" "$home_url" "200"
  verify_url "Login page" "$login_url" "200"

  if [ -n "$post_path" ]; then
    verify_url "Post page" "${base_url%/}${post_path}" "200"
  else
    log_warn "VERIFY_POST_PATH is not configured; skipping post detail verification."
  fi

  if [ -n "$upload_path" ]; then
    verify_url "Upload asset" "${base_url%/}${upload_path}" "200"
  else
    log_warn "VERIFY_UPLOAD_PATH is not configured; skipping upload verification."
  fi

  if [ -n "$write_url" ]; then
    verify_url "Configured write endpoint" "$write_url" "$write_expect" "$write_method" "$write_body" "$write_bearer"
  else
    log_warn "VERIFY_WRITE_URL is not configured; skipping write endpoint verification."
  fi

  log_info "Verification complete."
}

rollback() {
  check_prerequisites
  local release_tag="${1:-}"
  if [ -z "$release_tag" ]; then
    log_error "Usage: ./scripts/deploy.sh rollback <release-tag>"
    exit 1
  fi

  log_warn "Rollback only switches the app version. Database schema is NOT rolled back automatically."
  deploy_app primary "$release_tag"
  switch_primary
  log_info "Rollback complete. Consider running ./scripts/deploy.sh verify next."
}

start() {
  check_prerequisites
  ensure_postgres
  migrate
  deploy_app primary
}

stop() {
  check_prerequisites
  compose_runtime "" down
}

restart() {
  check_prerequisites
  compose_runtime "" restart api web nginx
}

status() {
  check_prerequisites
  compose_runtime "" ps --all
}

logs() {
  check_prerequisites
  shift || true
  compose_runtime "" logs -f "$@"
}

update() {
  log_warn "The legacy update command still performs a git pull and server-side build."
  git pull
  build
  start
}

reset() {
  log_warn "This will DELETE all production data and containers. Are you sure? (yes/no)"
  read -r confirm
  if [ "$confirm" != "yes" ]; then
    log_info "Cancelled."
    return 0
  fi

  compose_runtime "" down -v
  compose_runtime "" up -d postgres
  log_warn "Production data has been reset. Run migrate and deploy-app before serving traffic."
}

help() {
  cat <<'EOF'
Blog Production Deployment Script

Usage: ./scripts/deploy.sh [command] [args]

Commands:
  check                    Check Docker and env prerequisites
  predeploy                Run pnpm predeploy:prod locally
  build                    Build production images on the server (legacy)
  start                    Start postgres, run migrations, then start api/web/nginx
  stop                     Stop the current production stack
  restart                  Restart api/web/nginx
  status                   Show container status
  logs [service]           Tail logs
  backup [label]           Create a compressed production backup in backups/
  migrate [release-tag]    Run prisma migrate deploy via the dedicated migrate task
  deploy-app [target] [release-tag]
                           target: primary (default) or green
  green-up [release-tag]   Shortcut for: deploy-app green [release-tag]
  green-down               Stop and remove temporary green services
  switch-primary           Point nginx back to the primary app services
  switch-green             Point nginx to temporary green services
  verify                   Run HTTP checks against configured production URLs
  rollback <release-tag>   Roll back app images only (no automatic DB rollback)
  update                   Legacy git pull + build + start flow
  reset                    Destructive reset (removes data volumes)
  help                     Show this help
EOF
}

case "${1:-help}" in
  check)
    check_prerequisites
    ;;
  predeploy)
    predeploy
    ;;
  build)
    build
    ;;
  start)
    start
    ;;
  stop)
    stop
    ;;
  restart)
    restart
    ;;
  status)
    status
    ;;
  logs)
    logs "$@"
    ;;
  backup)
    backup "${2:-}"
    ;;
  migrate)
    migrate "${2:-}"
    ;;
  deploy-app)
    deploy_app "${2:-primary}" "${3:-}"
    ;;
  green-up)
    deploy_app green "${2:-}"
    ;;
  green-down)
    green_down
    ;;
  switch-primary)
    switch_primary
    ;;
  switch-green)
    switch_green
    ;;
  verify)
    verify
    ;;
  rollback)
    rollback "${2:-}"
    ;;
  update)
    update
    ;;
  reset)
    reset
    ;;
  help|*)
    help
    ;;
esac
