FROM nginx:alpine

COPY docker/nginx/api.conf /etc/nginx/conf.d/default.conf

# Copy Symfony public directory for static assets
COPY backend/public /var/www/backend/public
