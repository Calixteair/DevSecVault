FROM node:22-alpine

# Install Angular CLI globally
RUN npm install -g @angular/cli@19

WORKDIR /app

# Copy dependency manifests first for layer caching
COPY frontend/package.json frontend/package-lock.json* ./

# Install dependencies (clean install for reproducibility)
RUN npm ci

# Copy the rest of the frontend source
COPY frontend/ .

EXPOSE 4200

# Default command (overridden in docker-compose for dev with --poll)
CMD ["ng", "serve", "--host", "0.0.0.0"]
