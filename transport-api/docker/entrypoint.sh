#!/bin/sh
set -e

cd /var/www/html

# Generate APP_KEY if missing
if [ -z "$APP_KEY" ] && [ -f .env ]; then
    if ! grep -q "^APP_KEY=base64" .env; then
        echo "Generating APP_KEY..."
        php artisan key:generate --force
    fi
fi

# Wait for MySQL to be reachable (up to 60s)
if [ -n "$DB_HOST" ]; then
    echo "Waiting for database at $DB_HOST:${DB_PORT:-3306}..."
    for i in $(seq 1 60); do
        if php -r "try { new PDO('mysql:host=' . getenv('DB_HOST') . ';port=' . (getenv('DB_PORT') ?: 3306), getenv('DB_USERNAME'), getenv('DB_PASSWORD')); exit(0); } catch (Exception \$e) { exit(1); }" 2>/dev/null; then
            echo "Database is ready."
            break
        fi
        sleep 1
    done
fi

# Run migrations if requested (set RUN_MIGRATIONS=true in compose)
if [ "$RUN_MIGRATIONS" = "true" ]; then
    echo "Running migrations..."
    php artisan migrate --force --no-interaction || true
fi

# Cache config/routes/views in production
if [ "$APP_ENV" = "production" ]; then
    php artisan config:cache || true
    php artisan route:cache || true
    php artisan view:cache || true
fi

# Fix storage permissions (in case of bind mounts)
chown -R www-data:www-data storage bootstrap/cache 2>/dev/null || true

exec "$@"
