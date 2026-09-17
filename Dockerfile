# =============================================================================
# LocAI Console — Multi-stage Dockerfile
# =============================================================================
# Stage 1: builder  — installs all deps and produces production bundles
# Stage 2: runner   — slim image that only carries the compiled artefacts
# =============================================================================

# ── Stage 1: Builder ──────────────────────────────────────────────────────────
FROM oven/bun:1-slim AS builder

WORKDIR /app

# Copy workspace-level manifests first so Docker can cache the install layer.
# Only re-runs `bun install` when a package.json / lockfile changes.
COPY package.json bun.lock ./

# Workspace packages — manifests only (source copied later)
COPY artifacts/api-server/package.json     ./artifacts/api-server/
COPY artifacts/locai-console/package.json  ./artifacts/locai-console/
COPY artifacts/mockup-sandbox/package.json ./artifacts/mockup-sandbox/
COPY lib/api-spec/package.json             ./lib/api-spec/
COPY lib/api-client-react/package.json     ./lib/api-client-react/
COPY lib/api-zod/package.json              ./lib/api-zod/
COPY lib/db/package.json                   ./lib/db/
COPY scripts/package.json                  ./scripts/

# Install all workspace dependencies
RUN bun install --frozen-lockfile

# Copy the full source tree (respects .dockerignore)
COPY . .

# Build environment — PORT and BASE_PATH are needed by the Vite config
ENV PORT=5000
ENV BASE_PATH=/
ENV NODE_ENV=production

# 1. Typecheck libraries
# 2. Bundle the Express API server (esbuild → dist/index.mjs)
# 3. Build the React frontend (Vite → dist/public/)
RUN bun run build

# Copy the built frontend into the API server's public directory
# so the single Express process serves both API and SPA.
RUN cp -r artifacts/locai-console/dist/public/. artifacts/api-server/public/

# ── Stage 2: Runner ───────────────────────────────────────────────────────────
FROM node:22-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000
# Docker socket path — mount the host socket at runtime to enable real adapter
ENV DOCKER_HOST=unix:///var/run/docker.sock

# Only copy what the server needs at runtime:
#   dist/        — compiled Express server (index.mjs + source maps + pino workers)
#   public/      — pre-built React SPA served as static assets
COPY --from=builder /app/artifacts/api-server/dist   ./dist
COPY --from=builder /app/artifacts/api-server/public ./public

# ssh2 uses a native addon; copy the node_modules that contain it so the
# optional SSH adapter works without a full install in the slim image.
# (Falls back gracefully if the addon is missing — docker adapter is primary.)
COPY --from=builder /app/artifacts/api-server/node_modules ./node_modules

# Expose the control-plane port
EXPOSE 5000

# Health check — fast bun one-liner (no extra tooling required)
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:$PORT/api/healthz').then(r=>r.ok?process.exit(0):process.exit(1)).catch(()=>process.exit(1))"

# Start the LocAI Console server
CMD ["node", "--enable-source-maps", "./dist/index.mjs"]
