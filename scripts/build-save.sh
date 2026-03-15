#!/bin/bash
# ===========================================
# 本地构建生产镜像并导出为 tar，可选通过 scp 上传到服务器（密码由执行时输入）
# 使用 .env.prod 中的 HOST、NEXT_PUBLIC_* 构建，打本地 tag 并 docker save。
# Usage:
#   ./scripts/build-save.sh                    # 仅构建并导出 tar
#   ./scripts/build-save.sh '' root@服务器IP:/path/to/blog   # 构建、导出并 scp 上传（会提示输入 root 密码）
#   BUILD_SAVE_UPLOAD=root@IP:/path ./scripts/build-save.sh   # 同上，用环境变量指定上传目标
# 默认输出: blog-images.tar（项目根目录，已加入 .gitignore）
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
# 上传目标：第二参数或环境变量 BUILD_SAVE_UPLOAD，如 root@192.168.1.1:/opt/blog
UPLOAD_DEST="${BUILD_SAVE_UPLOAD:-$2}"
# 目标平台：服务器多为 amd64，在 Mac M1/M2(arm64) 上构建时指定此项，避免服务器上平台不匹配
PLATFORM="${BUILD_SAVE_PLATFORM:-linux/amd64}"

log_info "Web build args: NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL, NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL"
log_info "Building for platform: $PLATFORM"

log_info "Building API image: $IMAGE_API"
docker build --platform "$PLATFORM" -f Dockerfile.api -t "$IMAGE_API" .

log_info "Building Web image: $IMAGE_WEB"
docker build --platform "$PLATFORM" -f Dockerfile.web \
  --build-arg NEXT_PUBLIC_API_URL="$NEXT_PUBLIC_API_URL" \
  --build-arg NEXT_PUBLIC_APP_URL="$NEXT_PUBLIC_APP_URL" \
  --build-arg NEXT_PUBLIC_APP_NAME="${NEXT_PUBLIC_APP_NAME:-Blog}" \
  -t "$IMAGE_WEB" .

log_info "Saving images to $OUTPUT_TAR ..."
docker save "$IMAGE_API" "$IMAGE_WEB" -o "$OUTPUT_TAR"
log_info "Done. File size: $(du -h "$OUTPUT_TAR" | cut -f1)"

if [ -n "$UPLOAD_DEST" ]; then
  log_info "Uploading to $UPLOAD_DEST (scp 会提示输入 root 密码)..."
  scp "$OUTPUT_TAR" "$UPLOAD_DEST/"
  REMOTE_PATH="${UPLOAD_DEST#*:}"
  TAR_NAME="$(basename "$OUTPUT_TAR")"
  log_info "Upload done. On server run: cd $REMOTE_PATH && docker load -i $TAR_NAME && docker compose -f docker-compose.prod.pull.yml --env-file .env.prod up -d"
else
  echo ""
  log_info "仅构建完成。若要上传后部署，可执行："
  echo "  scp $OUTPUT_TAR root@服务器IP:/path/to/blog/"
  echo "  或在下次构建时传入上传目标，例如："
  echo "  ./scripts/build-save.sh '' root@服务器IP:/path/to/blog"
  echo "  （scp 会提示输入 root 密码）"
fi
