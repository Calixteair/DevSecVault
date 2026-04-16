FROM php:8.4-fpm-alpine

# System dependencies required by PHP extensions
RUN apk add --no-cache \
    icu-dev \
    libpq-dev \
    linux-headers \
    $PHPIZE_DEPS

# PHP extensions
RUN docker-php-ext-install \
    pdo_pgsql \
    intl \
    opcache

# Cleanup build dependencies
RUN apk del $PHPIZE_DEPS linux-headers

# Composer (multi-stage copy from official image)
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# PHP configuration
COPY docker/php/conf.d/app.ini /usr/local/etc/php/conf.d/app.ini

# Entrypoint: runs migrations + fixtures before starting php-fpm
COPY docker/php/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

WORKDIR /var/www/backend

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["php-fpm"]
