# Nginx Configuration for xyan.store

## Directory Structure

```text
nginx/
├── nginx.conf                # Legacy static reference config
├── nginx.conf.template       # Active runtime template used by Docker Compose
├── ssl/                      # SSL certificates (mounted into the container)
│   ├── www.xyan.store.pem
│   └── www.xyan.store.key
└── certbot/                  # Certbot webroot for ACME challenge
```

## Runtime Switching

Production compose now mounts `nginx.conf.template` into the nginx container and
lets the official nginx image render `/etc/nginx/nginx.conf` from environment
variables:

- `API_UPSTREAM` with default `api:3001`
- `WEB_UPSTREAM` with default `web:3000`

That means we can keep nginx on the same container and still switch traffic to
temporary `api-green` / `web-green` services for a safer rollout:

```bash
./scripts/deploy.sh switch-green
./scripts/deploy.sh switch-primary
```

## SSL Certificate Setup

### Option 1: Let's Encrypt with Certbot

```bash
sudo apt update
sudo apt install certbot
```

Obtain certificates:

```bash
docker compose -f docker-compose.prod.pull.yml --env-file .env.prod stop nginx
sudo certbot certonly --standalone -d xyan.store -d www.xyan.store
```

Copy them into the repo:

```bash
sudo cp /etc/letsencrypt/live/www.xyan.store/fullchain.pem nginx/ssl/www.xyan.store.pem
sudo cp /etc/letsencrypt/live/www.xyan.store/privkey.pem nginx/ssl/www.xyan.store.key
chmod 644 nginx/ssl/www.xyan.store.pem
chmod 600 nginx/ssl/www.xyan.store.key
```

### Option 2: Manual Certificate Upload

If you already have a certificate from another provider, place the files at:

- `nginx/ssl/www.xyan.store.pem`
- `nginx/ssl/www.xyan.store.key`

## Common Commands

```bash
docker compose -f docker-compose.prod.pull.yml --env-file .env.prod logs -f nginx
docker compose -f docker-compose.prod.pull.yml --env-file .env.prod restart nginx
./scripts/deploy.sh switch-green
./scripts/deploy.sh switch-primary
```
