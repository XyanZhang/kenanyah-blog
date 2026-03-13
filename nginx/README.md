# Nginx Configuration for xyan.store

## Directory Structure

```
nginx/
├── nginx.conf      # Main nginx configuration
├── ssl/            # SSL certificates (mount to container)
│   ├── fullchain.pem
│   └── privkey.pem
└── certbot/        # Certbot webroot for ACME challenge
```

## SSL Certificate Setup

### Option 1: Let's Encrypt with Certbot (Recommended)

1. **Install certbot on your server:**
   ```bash
   # Ubuntu/Debian
   sudo apt update
   sudo apt install certbot

   # CentOS/RHEL
   sudo yum install certbot
   ```

2. **Obtain SSL certificate:**
   ```bash
   # Stop nginx first if running
   docker-compose -f docker-compose.prod.yml down

   # Get certificate (standalone mode)
   sudo certbot certonly --standalone -d xyan.store -d www.xyan.store

   # Or use webroot mode (nginx must be running)
   sudo certbot certonly --webroot -w /var/www/certbot -d xyan.store -d www.xyan.store
   ```

3. **Copy certificates to nginx/ssl:**
   ```bash
   # Copy from Let's Encrypt directory
   sudo cp /etc/letsencrypt/live/xyan.store/fullchain.pem nginx/ssl/
   sudo cp /etc/letsencrypt/live/xyan.store/privkey.pem nginx/ssl/

   # Set permissions
   chmod 644 nginx/ssl/fullchain.pem
   chmod 600 nginx/ssl/privkey.pem
   ```

4. **Set up auto-renewal:**
   ```bash
   # Test renewal
   sudo certbot renew --dry-run

   # Add to crontab for auto-renewal
   sudo crontab -e
   # Add this line (runs at 3am on the 1st of every month)
   0 3 1 * * certbot renew --quiet && cp /etc/letsencrypt/live/xyan.store/fullchain.pem /path/to/blog/nginx/ssl/ && cp /etc/letsencrypt/live/xyan.store/privkey.pem /path/to/blog/nginx/ssl/ && cd /path/to/blog && docker-compose -f docker-compose.prod.yml restart nginx
   ```

### Option 2: Manual Certificate Upload

If you have certificates from another provider:

1. Place your certificates in `nginx/ssl/`:
   - `fullchain.pem` - Full certificate chain
   - `privkey.pem` - Private key

2. Set proper permissions:
   ```bash
   chmod 644 nginx/ssl/fullchain.pem
   chmod 600 nginx/ssl/privkey.pem
   ```

## Deployment

1. **First time setup:**
   ```bash
   # Copy example env file
   cp .env.prod.example .env.prod

   # Edit with your values
   vim .env.prod

   # Build and start services
   docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
   ```

2. **Check logs:**
   ```bash
   docker-compose -f docker-compose.prod.yml logs -f nginx
   ```

3. **Reload nginx after certificate update:**
   ```bash
   docker-compose -f docker-compose.prod.yml restart nginx
   ```

## Architecture

```
                    ┌─────────────────────────────────────┐
                    │           xyan.store                │
                    │         (HTTPS :443)                │
                    └─────────────────┬───────────────────┘
                                      │
                              ┌───────▼───────┐
                              │     Nginx     │
                              │  Reverse Proxy │
                              └───────┬───────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    │                 │                 │
            ┌───────▼───────┐ ┌───────▼───────┐ ┌───────▼───────┐
            │    /api/*     │ │   /uploads/*  │ │      /*       │
            │               │ │               │ │               │
            │  API Server   │ │  API Server   │ │  Next.js Web  │
            │  (Hono:3001)  │ │  (Hono:3001)  │ │  (:3000)      │
            └───────────────┘ └───────────────┘ └───────────────┘
```