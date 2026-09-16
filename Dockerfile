# Multi-stage Dockerfile for LocAI Console
FROM oven/bun:1-slim AS builder

WORKDIR /app

# Copy package manifests
COPY package.json bun.lockb* ./
COPY artifacts/api-server/package.json ./artifacts/api-server/
COPY artifacts/locai-console/package.json ./artifacts/locai-console/
COPY artifacts/mockup-sandbox/package.json ./artifacts/mockup-sandbox/
COPY lib/api-spec/package.json ./lib/api-spec/
COPY lib/api-client-react/package.json ./lib/api-client-react/
COPY lib/api-zod/package.json ./lib/api-zod/
COPY lib/db/package.json ./lib/db/
COPY scripts/package.json ./scripts/

# Install workspace dependencies
RUN bun install --frozen-lockfile

# Copy full source tree
COPY . .

# Run full build (API spec codegen + TypeScript typecheck + production bundling)
ENV PORT=5000
ENV BASE_PATH=/
RUN bun run build

# Stage 2: Minimal Production Runtime
FROM oven/bun:1-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000
ENV DOCKER_HOST=unix:///var/run/docker.sock

# Copy bundled Express API server and built static frontend assets from builder
COPY --from=builder /app/artifacts/api-server/dist ./dist
COPY --from=builder /app/artifacts/locai-console/dist/public ./public

# Expose control plane port
EXPOSE 5000

# Start LocAI Console server
CMD ["bun", "run", "dist/index.mjs"]
