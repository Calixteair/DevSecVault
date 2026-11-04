FROM node:22-alpine

# pnpm (version de packageManager dans package.json) via corepack ; ng vient des dépendances du projet
RUN corepack enable

WORKDIR /app

# Copy dependency manifests first for layer caching
COPY frontend/package.json frontend/pnpm-lock.yaml ./

# Install dependencies (lockfile exact, reproducible)
RUN pnpm install --frozen-lockfile

# Copy the rest of the frontend source
COPY frontend/ .

EXPOSE 4200

# Default command (overridden in docker-compose for dev with --poll)
CMD ["pnpm", "exec", "ng", "serve", "--host", "0.0.0.0"]
