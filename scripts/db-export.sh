#!/usr/bin/env bash
# 导出 blog_dev 数据库
# 用法: ./scripts/db-export.sh [--custom] [--schema-only]
#   --custom: 使用 pg_dump -Fc 生成压缩格式 (.dump)
#   --schema-only: 仅导出结构，不导出数据

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${ROOT_DIR}/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

CUSTOM=false
SCHEMA_ONLY=false
for arg in "$@"; do
  case $arg in
    --custom) CUSTOM=true ;;
    --schema-only) SCHEMA_ONLY=true ;;
  esac
done

mkdir -p "$BACKUP_DIR"

# 检查 Docker 容器是否运行
if ! docker compose -f "$ROOT_DIR/docker-compose.yml" ps postgres 2>/dev/null | grep -q "Up"; then
  echo "错误: PostgreSQL 容器未运行，请先执行 pnpm docker:up"
  exit 1
fi

EXT="sql"
PGDUMP_OPTS="-U blog_user -d blog_dev"
OUTPUT_FILE="${BACKUP_DIR}/blog_dev_${TIMESTAMP}.${EXT}"

if [ "$SCHEMA_ONLY" = true ]; then
  PGDUMP_OPTS="$PGDUMP_OPTS --schema-only"
fi

if [ "$CUSTOM" = true ]; then
  EXT="dump"
  PGDUMP_OPTS="$PGDUMP_OPTS -Fc"
  OUTPUT_FILE="${BACKUP_DIR}/blog_dev_${TIMESTAMP}.${EXT}"
fi

echo "正在导出 blog_dev 到 $OUTPUT_FILE ..."
docker compose -f "$ROOT_DIR/docker-compose.yml" exec -T postgres pg_dump $PGDUMP_OPTS > "$OUTPUT_FILE"

if [ -s "$OUTPUT_FILE" ]; then
  echo "✓ 导出成功: $OUTPUT_FILE"
  ls -lh "$OUTPUT_FILE"
else
  echo "错误: 导出文件为空"
  rm -f "$OUTPUT_FILE"
  exit 1
fi
