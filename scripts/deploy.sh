#!/bin/bash
# ===========================================
# Blog Deployment Script
# Usage: ./scripts/deploy.sh [command]
# ===========================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env.prod"

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."

    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        log_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi

    if [ ! -f "$ENV_FILE" ]; then
        log_error "Environment file $ENV_FILE not found!"
        log_info "Copy .env.prod.example to .env.prod and fill in values:"
        log_info "  cp .env.prod.example .env.prod"
        exit 1
    fi

    log_info "Prerequisites check passed!"
}

# Build images
build() {
    log_info "Building Docker images..."
    docker-compose -f $COMPOSE_FILE --env-file $ENV_FILE build
    log_info "Build complete!"
}

# Start services
start() {
    log_info "Starting services..."
    docker-compose -f $COMPOSE_FILE --env-file $ENV_FILE up -d
    log_info "Services started!"
    log_info "Checking health..."
    sleep 5
    docker-compose -f $COMPOSE_FILE --env-file $ENV_FILE ps
}

# Stop services
stop() {
    log_info "Stopping services..."
    docker-compose -f $COMPOSE_FILE --env-file $ENV_FILE down
    log_info "Services stopped!"
}

# Restart services
restart() {
    stop
    start
}

# View logs
logs() {
    docker-compose -f $COMPOSE_FILE --env-file $ENV_FILE logs -f "$@"
}

# Show status
status() {
    docker-compose -f $COMPOSE_FILE --env-file $ENV_FILE ps
}

# Run database migrations
migrate() {
    log_info "Running database migrations..."
    docker-compose -f $COMPOSE_FILE --env-file $ENV_FILE exec api npx prisma migrate deploy
    log_info "Migrations complete!"
}

# Reset everything (WARNING: destructive)
reset() {
    log_warn "This will DELETE all data! Are you sure? (yes/no)"
    read -r confirm
    if [ "$confirm" = "yes" ]; then
        log_info "Resetting..."
        docker-compose -f $COMPOSE_FILE --env-file $ENV_FILE down -v
        docker-compose -f $COMPOSE_FILE --env-file $ENV_FILE up -d
        log_info "Reset complete!"
    else
        log_info "Cancelled."
    fi
}

# Backup database
backup() {
    BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
    log_info "Creating backup: $BACKUP_FILE"
    docker-compose -f $COMPOSE_FILE --env-file $ENV_FILE exec postgres pg_dump -U blog_user blog_prod > "backups/$BACKUP_FILE"
    log_info "Backup complete!"
}

# Pull latest code and redeploy
update() {
    log_info "Pulling latest code..."
    git pull
    build
    restart
    migrate
    log_info "Update complete!"
}

# Show help
help() {
    echo "Blog Deployment Script"
    echo ""
    echo "Usage: ./scripts/deploy.sh [command]"
    echo ""
    echo "Commands:"
    echo "  check     Check prerequisites"
    echo "  build     Build Docker images"
    echo "  start     Start all services"
    echo "  stop      Stop all services"
    echo "  restart   Restart all services"
    echo "  logs      View logs (optional: service name)"
    echo "  status    Show service status"
    echo "  migrate   Run database migrations"
    echo "  backup    Backup database"
    echo "  update    Pull code and redeploy"
    echo "  reset     Reset everything (WARNING: deletes all data)"
    echo "  help      Show this help message"
}

# Main
case "${1:-help}" in
    check)
        check_prerequisites
        ;;
    build)
        check_prerequisites
        build
        ;;
    start)
        check_prerequisites
        start
        ;;
    stop)
        stop
        ;;
    restart)
        check_prerequisites
        restart
        ;;
    logs)
        shift
        logs "$@"
        ;;
    status)
        status
        ;;
    migrate)
        migrate
        ;;
    backup)
        mkdir -p backups
        backup
        ;;
    update)
        check_prerequisites
        update
        ;;
    reset)
        reset
        ;;
    help|*)
        help
        ;;
esac