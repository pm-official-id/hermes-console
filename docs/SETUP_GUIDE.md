# LocAI Console — Setup & Installation Guide

This guide provides step-by-step instructions for setting up, configuring, developing, and deploying **LocAI Console** in your local environment.

---

## 📋 1. Prerequisites

Before setting up LocAI Console, ensure your system meets the following prerequisites:

| Tool / Dependency | Version Requirement | Purpose |
| :--- | :--- | :--- |
| **Node.js** | v20.x or v24.x+ | JavaScript / TypeScript runtime |
| **pnpm** | v9.0+ | Fast, disk space-efficient package manager |
| **Git** | v2.30+ | Source version control |
| **Docker Engine / Desktop** | Optional (for live Docker mode) | Container runtime with socket at `/var/run/docker.sock` |
| **Operating System** | macOS (Apple Silicon / Intel), Linux, WSL2 | Local host target |

---

## 🛠️ 2. Step-by-Step Installation

### Step 1: Clone the Repository

```bash
git clone https://github.com/your-org/locai-console.git
cd locai-console
```

### Step 2: Install Workspace Dependencies

LocAI Console uses `pnpm` workspace packages. Install all dependencies across the monorepo:

```bash
pnpm install
```

> 💡 **Apple Silicon Note**: If you encounter native binary resolution warnings for Rollup or LightningCSS during build on macOS arm64, run:
> ```bash
> pnpm approve-builds --all
> ```

---

## ⚙️ 3. Environment & Host Adapter Setup

LocAI Console can run in two distinct operational modes:

### Mode A: Mock Host Adapter (Default / Offline Demo Mode)
In Mock Adapter mode, the control plane uses an in-memory state engine pre-populated with ecosystem manifests (oMLX, MTPLX, LocalAI, Ollama, Opik, Understand-Anything, etc.). No active Docker daemon is required.

- Set `MOCK_ADAPTER=true` (or leave empty if no Docker socket is present).

### Mode B: Live Docker Socket Adapter
In Live Docker mode, LocAI Console connects directly to your local Docker daemon socket (`/var/run/docker.sock` or `tcp://127.0.0.1:2375`) to list active containers, inspect system resource usage, stream real-time logs, and issue container lifecycle commands (`start`, `stop`, `restart`, `remove`).

- Set environment variable:
  ```bash
  DOCKER_HOST="unix:///var/run/docker.sock"
  ```

---

## 🚀 4. Running the Development Stack

LocAI Console consists of two primary services:
1. **API Server (`@workspace/api-server`)**: Express 5 backend serving host control-plane endpoints at port `5000`.
2. **Web Console UI (`@workspace/hermes-console`)**: React + Vite single page application.

### Running Both Services

Open two terminal tabs:

#### Terminal 1: API Server
```bash
pnpm --filter @workspace/api-server run dev
```

#### Terminal 2: Web Console UI
```bash
pnpm --filter @workspace/hermes-console run dev
```

Navigate to `http://localhost:5000` to interact with the console.

---

## 📜 5. Code Generation & OpenAPI Workflow

LocAI Console treats `lib/api-spec/openapi.yaml` as the **single source of truth** for all API contracts.

Whenever you add or modify API routes, schemas, or manifest structures:

1. Edit [`lib/api-spec/openapi.yaml`](file:///Users/IPRIYANATH/Desktop/hermes-console/lib/api-spec/openapi.yaml).
2. Execute the Orval codegen script:

```bash
pnpm --filter @workspace/api-spec run codegen
```

This automatically updates:
- `@workspace/api-zod`: Zod runtime validation schemas (`lib/api-zod`).
- `@workspace/api-client-react`: React Query hooks for client data fetching (`lib/api-client-react`).

---

## 📦 6. Production Build & Deployment

### Option 1: Docker Container Deployment (Recommended)

LocAI Console includes a multi-stage [`Dockerfile`](file:///Users/IPRIYANATH/Desktop/hermes-console/Dockerfile) and [`docker-compose.yml`](file:///Users/IPRIYANATH/Desktop/hermes-console/docker-compose.yml) ready for single-command production deployment:

```bash
docker compose up -d --build
```

The container automatically mounts `/var/run/docker.sock` from the host machine so LocAI Console can discover and control all host AI containers.

---

### Option 2: Bare Metal Node.js Deployment

To verify TypeScript types across all workspace packages and build static production bundles:

```bash
# Run typecheck across all packages
pnpm run typecheck

# Produce compiled API bundle and web console assets
PORT=5000 BASE_PATH=/ pnpm run build

# Start the production Node server
node artifacts/api-server/dist/index.mjs
```

---

## 🔍 7. Troubleshooting & FAQs

### Q1: Port 5000 is already in use on macOS
On macOS Monterey and later, port `5000` is used by AirPlay Receiver.
- **Fix**: Disable AirPlay Receiver in *System Settings > General > AirDrop & Handoff*, or run the server on a different port:
  ```bash
  PORT=5050 pnpm --filter @workspace/api-server run dev
  ```

### Q2: `Orval` export collision errors in TypeScript
If running `pnpm run typecheck` shows duplicate identifier warnings for generated Zod schemas:
- Ensure `lib/api-zod/src/index.ts` explicitly re-exports types from `./generated/types` while excluding raw object name clashes.

### Q3: How do I add a new tool to the Ecosystem Catalog?
- Open [`docs/OPEN_SOURCE_ECOSYSTEM_CATALOG.md`](file:///Users/IPRIYANATH/Desktop/hermes-console/docs/OPEN_SOURCE_ECOSYSTEM_CATALOG.md) and add your manifest definition.
- Add the manifest payload to the `catalog` array in [`mock-adapter.ts`](file:///Users/IPRIYANATH/Desktop/hermes-console/artifacts/api-server/src/lib/adapters/mock-adapter.ts).
