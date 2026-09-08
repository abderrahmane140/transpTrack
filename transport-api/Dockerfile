# syntax=docker/dockerfile:1.6

# ---------- Builder: install PHP dependencies ----------
FROM composer:2.7 AS vendor

WORKDIR /app

# Copy only composer files first to leverage Docker layer cache
COPY composer.json composer.lock ./

# Install dependencies (no dev for production builds; include dev for local dev)
ARG APP_ENV=production
RUN if [ "$APP_ENV" = "production" ]; then \
        composer install --no-dev --no-scripts --no-autoloader --prefer-dist --no-interaction; \
    else \
        composer install --no-scripts --no-autoloader --prefer-dist --no-interaction; \
    fi

# Copy the rest of the application
COPY . .

# Re-dump autoload now that the full source is available
RUN composer dump-autoload --optimum --no-interaction


# ---------- Runtime: PHP-FPM ----------
FROM php:8.2-fpm-bookworm AS runtime

ARG APP_ENV=production

# System dependencies needed by Laravel + common PHP extensions
RUN apt-get update && apt-get install -y --no-install-recommends \
        git \
        curl \
        unzip \
        libzip-dev \
        libicu-dev \
        libonig-dev \
        libpng-dev \
        libjpeg-dev \
        libfreetype6-dev \
        default-mysql-client \
    && rm -rf /var/lib/apt/lists/*

# Install PHP extensions required by Laravel + MySQL
RUN docker-php-ext-install \
        pdo_mysql \
        mysqli \
        zip \
        bcmath \
        intl \
        opcache \
        pcntl

# Install Composer (in case it's needed at runtime for post-install scripts)
COPY --from=composer:2.7 /usr/bin/composer /usr/bin/composer

# Set working directory
WORKDIR /var/www/html

# Copy application from vendor stage
COPY --from=vendor /app /var/www/html

# Copy entrypoint script
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# Ensure Laravel directories are writable
RUN mkdir -p \
        storage/framework/cache/data \
        storage/framework/sessions \
        storage/framework/views \
        storage/framework/testing \
        storage/logs \
        bootstrap/cache \
    && chown -R www-data:www-data \
        storage \
        bootstrap/cache

# Expose PHP-FPM port
EXPOSE 9000

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["php-fpm"]
