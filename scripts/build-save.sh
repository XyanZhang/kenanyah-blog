#!/bin/bash
# ===========================================
# 本地构建生产镜像并导出为 tar，可选通过 scp 上传到服务器（密码由执行时输入）
# 使用 .env.prod 中的 HOST、NEXT_PUBLIC_* 构建，打本地 tag 并 docker save。
# Usage:
#   ./scripts/build-save.sh                    # 仅构建并导出 tar
#   ./scripts/build-save.sh '' root@服务器IP:/path/to/blog   # 构建、导出并 scp 上传（会提示输入 root 密码）
#   BUILD_SAVE_UPLOAD=root@IP:/path ./scripts/build-save.sh   # 同上，用环境变量指定上传目标
# 默认输出: blog-images.tar（项目根目录，已加入 .gitignore）
# 额外生成同目录 release env 文件，记录本次镜像 tag，便于服务器回滚。
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

OUTPUT_TAR="${1:-$REPO_ROOT/blog-images.tar}"
RELEASE_TAG="${BUILD_SAVE_TAG:-$(date +%Y%m%d-%H%M%S)-$(git rev-parse --short HEAD 2>/dev/null || echo local)}"
IMAGE_API="blog-api:${RELEASE_TAG}"
IMAGE_WEB="blog-web:${RELEASE_TAG}"
IMAGE_ADMIN="blog-admin:${RELEASE_TAG}"
IMAGE_API_LATEST="blog-api:latest"
IMAGE_WEB_LATEST="blog-web:latest"
IMAGE_ADMIN_LATEST="blog-admin:latest"
RELEASE_ENV_FILE="${OUTPUT_TAR%.tar}.release.env"
# 上传目标：第二参数或环境变量 BUILD_SAVE_UPLOAD，如 root@192.168.1.1:/opt/blog
UPLOAD_DEST="${BUILD_SAVE_UPLOAD:-$2}"
# 目标平台：服务器多为 amd64，在 Mac M1/M2(arm64) 上构建时指定此项，避免服务器上平台不匹配
PLATFORM="${BUILD_SAVE_PLATFORM:-linux/amd64}"

log_info "Web build args: NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL, NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL"
log_info "Building for platform: $PLATFORM"

log_info "Release tag: $RELEASE_TAG"
log_info "Building API image: $IMAGE_API"
docker build --platform "$PLATFORM" -f Dockerfile.api -t "$IMAGE_API" .
docker tag "$IMAGE_API" "$IMAGE_API_LATEST"

log_info "Building Web image: $IMAGE_WEB"
docker build --platform "$PLATFORM" -f Dockerfile.web \
  --build-arg NEXT_PUBLIC_API_URL="$NEXT_PUBLIC_API_URL" \
  --build-arg NEXT_PUBLIC_APP_URL="$NEXT_PUBLIC_APP_URL" \
  --build-arg NEXT_PUBLIC_APP_NAME="${NEXT_PUBLIC_APP_NAME:-Blog}" \
  -t "$IMAGE_WEB" .
docker tag "$IMAGE_WEB" "$IMAGE_WEB_LATEST"

log_info "Building Admin image: $IMAGE_ADMIN"
docker build --platform "$PLATFORM" -f Dockerfile.admin \
  --build-arg VITE_API_BASE_URL="/api" \
  --build-arg VITE_SITE_BASE_URL="$NEXT_PUBLIC_APP_URL" \
  -t "$IMAGE_ADMIN" .
docker tag "$IMAGE_ADMIN" "$IMAGE_ADMIN_LATEST"

log_info "Saving images to $OUTPUT_TAR ..."
docker save "$IMAGE_API" "$IMAGE_WEB" "$IMAGE_ADMIN" "$IMAGE_API_LATEST" "$IMAGE_WEB_LATEST" "$IMAGE_ADMIN_LATEST" -o "$OUTPUT_TAR"
log_info "Done. File size: $(du -h "$OUTPUT_TAR" | cut -f1)"

cat >"$RELEASE_ENV_FILE" <<EOF
RELEASE_TAG=$RELEASE_TAG
DOCKER_IMAGE_API=$IMAGE_API
DOCKER_IMAGE_WEB=$IMAGE_WEB
DOCKER_IMAGE_ADMIN=$IMAGE_ADMIN
EOF
log_info "Release metadata saved to $RELEASE_ENV_FILE"

if [ -n "$UPLOAD_DEST" ]; then
  log_info "Uploading to $UPLOAD_DEST (scp 会提示输入 root 密码)..."
  scp "$OUTPUT_TAR" "$UPLOAD_DEST/"
  scp "$RELEASE_ENV_FILE" "$UPLOAD_DEST/"
  REMOTE_PATH="${UPLOAD_DEST#*:}"
  TAR_NAME="$(basename "$OUTPUT_TAR")"
  RELEASE_ENV_NAME="$(basename "$RELEASE_ENV_FILE")"
  log_info "Upload done. On server run:"
  echo "  cd $REMOTE_PATH"
  echo "  docker load -i $TAR_NAME"
  echo "  source $RELEASE_ENV_NAME"
  echo "  ./scripts/deploy.sh backup \$RELEASE_TAG"
  echo "  ./scripts/deploy.sh migrate \$RELEASE_TAG"
  echo "  ./scripts/deploy.sh deploy-app primary \$RELEASE_TAG"
  echo "  ./scripts/deploy.sh verify"
else
  echo ""
  log_info "仅构建完成。若要上传后部署，可执行："
  echo "  scp $OUTPUT_TAR root@服务器IP:/path/to/blog/"
  echo "  scp $RELEASE_ENV_FILE root@服务器IP:/path/to/blog/"
  echo "  或在下次构建时传入上传目标，例如："
  echo "  ./scripts/build-save.sh '' root@服务器IP:/path/to/blog"
  echo "  （scp 会提示输入 root 密码）"
fi
