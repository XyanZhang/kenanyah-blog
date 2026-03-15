#!/bin/bash
# ===========================================
# 本地构建生产镜像并导出为 tar，便于上传到服务器后 load + up 部署（无需镜像仓库）
# 使用 .env.prod 中的 HOST、NEXT_PUBLIC_* 构建，打本地 tag 并 docker save。
# Usage: ./scripts/build-save.sh [输出 tar 路径]
# 默认输出: blog-images.tar（项目根目录）
# ===========================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

ENV_FILE="${ENV_FILE:-.env.prod}"
if [ ! -f "$ENV_FILE" ]; then
  log_error "Environment file $ENV_FILE not found. Create it from .env.prod.example."
  exit 1
fi

get_env() {
  grep -E "^${1}=" "$ENV_FILE" | sed -E "s/^${1}=['\"]?([^'\"]*)['\"]?/\1/" | head -1
}

HOST="$(get_env HOST)"
NEXT_PUBLIC_APP_NAME="$(get_env NEXT_PUBLIC_APP_NAME)"
NEXT_PUBLIC_API_URL="${HOST:-https://www.xyan.store}/api"
NEXT_PUBLIC_APP_URL="${HOST:-https://www.xyan.store}"

# 本地部署使用固定 tag，与服务器 .env.prod 中的 DOCKER_IMAGE_* 一致
IMAGE_API="blog-api:latest"
IMAGE_WEB="blog-web:latest"
OUTPUT_TAR="${1:-$REPO_ROOT/blog-images.tar}"

log_info "Web build args: NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL, NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL"

log_info "Building API image: $IMAGE_API"
docker build -f Dockerfile.api -t "$IMAGE_API" .

log_info "Building Web image: $IMAGE_WEB"
docker build -f Dockerfile.web \
  --build-arg NEXT_PUBLIC_API_URL="$NEXT_PUBLIC_API_URL" \
  --build-arg NEXT_PUBLIC_APP_URL="$NEXT_PUBLIC_APP_URL" \
  --build-arg NEXT_PUBLIC_APP_NAME="${NEXT_PUBLIC_APP_NAME:-Blog}" \
  -t "$IMAGE_WEB" .

log_info "Saving images to $OUTPUT_TAR ..."
docker save "$IMAGE_API" "$IMAGE_WEB" -o "$OUTPUT_TAR"
log_info "Done. File size: $(du -h "$OUTPUT_TAR" | cut -f1)"

echo ""
log_info "下一步：将 tar 上传到服务器后执行："
echo "  scp $OUTPUT_TAR user@your-server:/path/to/blog/"
echo "  ssh user@your-server"
echo "  cd /path/to/blog && docker load -i blog-images.tar"
echo "  在 .env.prod 中设置: DOCKER_IMAGE_API=$IMAGE_API  DOCKER_IMAGE_WEB=$IMAGE_WEB"
echo "  docker compose -f docker-compose.prod.pull.yml --env-file .env.prod up -d"
