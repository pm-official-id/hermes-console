# LocAI Console 🚀

> **Local-First Control Plane for AI Models, Runtimes, Agents, Observability, and Orchestration.**

**LocAI Console** is a local-first operator portal and lifecycle manager designed to run, compose, monitor, and interlink your entire local AI ecosystem. Inspired by Docker Desktop and Portainer, LocAI Console gives AI engineers and developers a unified control plane to manage LLM runtimes (oMLX, MTPLX, LocalAI, Ollama), coding agents (OpenCode, OpenHands), automation platforms (n8n), telemetry tools (Opik, ccsync, Opik OpenClaw), code intelligence engines (Understand-Anything), and MCP servers from a single dashboard.

---

## 🌟 Key Features

- 🏎️ **Apple Silicon & Native MLX Support**: Native catalog manifests and host templates for high-performance MLX inference via **oMLX** and **MTPLX**, alongside standard llama.cpp and vLLM runtimes.
- 📦 **Curated Ecosystem Catalog**: Instantly inspect, configure, and launch pre-packaged manifests for top-tier open-source tools across 5 distinct ecosystem tiers.
- 🔌 **Plug-and-Play Host Adapters**: Decoupled `HostAdapter` domain layer allowing seamless switching between in-memory mock adapters for rapid UI development and real Unix Docker socket (`/var/run/docker.sock`) engine bridges.
- 📊 **Real-Time Fleet Telemetry**: Live host telemetry monitoring CPU utilization, memory pressure, active service counts, container health status, and raw container log streaming.
- 🕸️ **Interactive Connection Topology**: Visual topology view displaying how local runners, coding agents, automation frameworks, frontends, and observability backends communicate with each other.
- 📜 **OpenAPI-First Architecture**: End-to-end type safety using OpenAPI v3 schemas with automated Orval client hook generation and Zod API payload validation.

---

## 🏗️ Supported Ecosystem Tiers

| Tier | Category | Featured Manifests & Tools | Role |
| :--- | :--- | :--- | :--- |
| **Tier 1** | **Apple Silicon & MLX Core** | `oMLX`, `MTPLX`, `LocalAI`, `Ollama` | Local LLM inference & native Apple Silicon acceleration |
| **Tier 2** | **Unified Routers & Runtimes** | `OmniRouter`, `LiteLLM` | Unified API proxying, fallback routing, cost tracking |
| **Tier 3** | **Coding Agents & Automation** | `OpenCode`, `OpenHands`, `n8n`, `Open WebUI` | Autonomous coding, browser automation, visual workflows |
| **Tier 4** | **Tools, Graphs & MCP** | `Understand-Anything`, `Opik MCP`, `ccsync` | Codebase dependency graphs, MCP server integrations, sync bridges |
| **Tier 5** | **Observability & Evaluation** | `Opik`, `Opik OpenClaw` | LLM tracing, prompt evaluations, dataset logging, guardrails |

---

## 🛠️ Architecture

LocAI Console is structured as a pnpm monorepo:

```
locai-console/
├── artifacts/
│   ├── hermes-console/   # React + Vite frontend control plane UI
│   ├── api-server/       # Express 5 Host API server with HostAdapter domain layer
│   └── mockup-sandbox/   # Alternate UI sandbox & component canvas
├── lib/
│   ├── api-spec/         # Source-of-truth OpenAPI 3.0 specification & Orval config
│   ├── api-client-react/ # Auto-generated React Query hooks
│   ├── api-zod/          # Auto-generated Zod validation schemas
│   └── db/               # PostgreSQL schema & Drizzle ORM definitions
├── docs/                 # Detailed setup, catalog, and API function guidebooks
└── scripts/              # Build, typecheck, and development tooling scripts
```

---

## 🚦 Quick Start

### Prerequisites

- **Node.js**: v20 or v24+
- **pnpm**: v9+ (`npm install -g pnpm`)
- **Docker** *(Optional, for real container execution)*: Docker Desktop or OrbStack running with Unix socket active (`/var/run/docker.sock`).

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/your-org/locai-console.git
cd locai-console
pnpm install
```

### Option A: Run via Docker Compose 🐳 (Recommended)

Launch **LocAI Console** in containerized mode with the host Docker socket mounted:

```bash
docker compose up -d --build
```

Access the console at `http://localhost:5000`.

---

### Option B: Run in Local Development Mode 💻

Launch the Express API server and React frontend simultaneously:

```bash
# Terminal 1: Start API Server (Port 5000)
pnpm --filter @workspace/api-server run dev

# Terminal 2: Start Web Console UI
pnpm --filter @workspace/hermes-console run dev
```

Open your browser and navigate to `http://localhost:5000`.

---

## 📚 Documentation & Guidebooks

Explore the dedicated documentation in the [`docs/`](file:///Users/IPRIYANATH/Desktop/hermes-console/docs) directory:

- 📖 **[Setup & Development Guide](file:///Users/IPRIYANATH/Desktop/hermes-console/docs/SETUP_GUIDE.md)**: Detailed step-by-step setup, environment variables, Docker socket configuration, and codegen commands.
- 📗 **[Functions & API Guidebook](file:///Users/IPRIYANATH/Desktop/hermes-console/docs/FUNCTIONS_GUIDEBOOK.md)**: Complete reference manual for all Host Adapter methods, API endpoints, Zod schemas, and UI state functions.
- 🗂️ **[Open-Source Ecosystem Catalog](file:///Users/IPRIYANATH/Desktop/hermes-console/docs/OPEN_SOURCE_ECOSYSTEM_CATALOG.md)**: Exhaustive breakdown of supported open-source AI tools, port conventions, environment keys, and deployment manifests.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
