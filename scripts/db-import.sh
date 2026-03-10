#!/usr/bin/env bash
# 导入备份到 blog_dev 数据库
# 用法: ./scripts/db-import.sh <备份文件路径> [-y]
#   -y: 跳过确认，直接导入（适用于脚本自动化）
# 支持 .sql 或 .dump 格式
# 注意: 导入前会清空现有数据，请先做好备份

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
SKIP_CONFIRM=false

# 解析参数
for arg in "$@"; do
  case "$arg" in
    -y|--yes) SKIP_CONFIRM=true ;;
    -*) ;;
    *) BACKUP_FILE="${BACKUP_FILE:-$arg}" ;;
  esac
done

if [ -z "${BACKUP_FILE:-}" ]; then
  echo "用法: pnpm db:import <备份文件> [ -y ]"
  echo "示例: pnpm db:import backups/blog_dev_20250305_120000.sql"
  exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "错误: 文件不存在: $BACKUP_FILE"
  exit 1
fi

# 检查 Docker 容器是否运行
if ! docker compose -f "$ROOT_DIR/docker-compose.yml" ps postgres 2>/dev/null | grep -q "Up"; then
  echo "错误: PostgreSQL 容器未运行，请先执行 pnpm docker:up"
  exit 1
fi

if [ "$SKIP_CONFIRM" != true ]; then
  echo "警告: 此操作将覆盖 blog_dev 的现有数据"
  echo "备份文件: $BACKUP_FILE"
  read -p "确认导入? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "已取消"
    exit 0
  fi
fi

case "$BACKUP_FILE" in
  *.dump)
    echo "使用 pg_restore 导入自定义格式..."
    cat "$BACKUP_FILE" | docker compose -f "$ROOT_DIR/docker-compose.yml" exec -T postgres pg_restore -U blog_user -d blog_dev --clean --if-exists 2>/dev/null || true
    ;;
  *.sql)
    echo "使用 psql 导入 SQL 文件..."
    cat "$BACKUP_FILE" | docker compose -f "$ROOT_DIR/docker-compose.yml" exec -T postgres psql -U blog_user -d blog_dev -q
    ;;
  *)
    echo "错误: 不支持的文件格式，请使用 .sql 或 .dump 文件"
    exit 1
    ;;
esac

echo "✓ 导入完成"
