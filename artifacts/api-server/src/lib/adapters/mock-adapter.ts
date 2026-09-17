import type {
  Overview,
  Service,
  CatalogItem,
  ManifestDetail,
  LogLine,
  Connection,
  ServiceAction,
  ServiceUpdate,
  ActivityEvent,
} from "@workspace/api-zod";
import type { HostAdapter, HostAdapterCapabilities } from "./host-adapter";

const CATALOG_MANIFESTS: Record<string, ManifestDetail> = {
  opik: {
    id: "opik",
    name: "Opik",
    tier: "Tier 5: Observability",
    category: "observability",
    description: "Open-source LLM evaluation, prompt engineering, and tracing platform by Comet.",
    upstreamUrl: "https://github.com/comet-ml/opik",
    license: "Apache-2.0",
    image: "comet-ml/opik:latest",
    defaultPort: 5173,
    ports: [
      { containerPort: 5173, hostPort: 5173, label: "Web Dashboard" },
      { containerPort: 8080, hostPort: 8080, label: "Telemetry API" },
    ],
    env: [
      { key: "OPIK_USAGE_ANALYTICS_ENABLED", description: "Enable usage statistics", required: false, defaultValue: "true", secret: false },
      { key: "DATABASE_URL", description: "PostgreSQL storage connection", required: false, defaultValue: "postgresql://opik:opik@postgres:5432/opik", secret: true },
    ],
    capabilities: ["observability", "evaluation", "tracing", "prompts"],
    compatibleConnections: ["localai", "litellm", "omnirouter", "opencode", "openhands", "openclaw"],
    securityNote: "Telemetry data is stored locally. Ensure secret keys are redacted before exporting traces.",
  },
  omlx: {
    id: "omlx",
    name: "oMLX",
    tier: "Tier 1: Core Runtimes",
    category: "runtime",
    description: "MLX inference server for agentic coding workflows with SSD-backed tiered KV caching.",
    upstreamUrl: "https://github.com/mlx-ai/omlx",
    license: "MIT",
    image: "ghcr.io/mlx-ai/omlx:latest",
    defaultPort: 8000,
    ports: [{ containerPort: 8000, hostPort: 8000, label: "OpenAI/Anthropic Endpoint" }],
    env: [
      { key: "MLX_MODEL_PATH", description: "Local model directory or HuggingFace ID", required: true, defaultValue: "mlx-community/Qwen2.5-Coder-32B-Instruct-4bit", secret: false },
      { key: "KV_CACHE_SSD_DIR", description: "Directory for SSD KV cache persistence", required: false, defaultValue: "~/.omlx/cache", secret: false },
    ],
    capabilities: ["inference", "kv-cache-persistence", "apple-silicon"],
    compatibleConnections: ["opencode", "openhands", "litellm", "omnirouter", "openwebui"],
    securityNote: "Requires Apple Silicon host with Metal GPU support.",
  },
  mtplx: {
    id: "mtplx",
    name: "MTPLX",
    tier: "Tier 1: Core Runtimes",
    category: "runtime",
    description: "Multi-Token Prediction (MTP) inference engine using speculative decoding on Apple Silicon.",
    upstreamUrl: "https://github.com/mlx-ai/mtplx",
    license: "MIT",
    image: "ghcr.io/mlx-ai/mtplx:latest",
    defaultPort: 8001,
    ports: [{ containerPort: 8001, hostPort: 8001, label: "MTP Inference API" }],
    env: [
      { key: "MODEL_ID", description: "Qwen MTP-supported model ID", required: true, defaultValue: "Qwen/Qwen2.5-Coder-7B-Instruct", secret: false },
      { key: "MTP_HEADS", description: "Number of speculative draft heads", required: false, defaultValue: "2", secret: false },
    ],
    capabilities: ["inference", "multi-token-prediction", "speculative-decoding"],
    compatibleConnections: ["opencode", "openhands", "litellm", "omnirouter"],
    securityNote: "Optimized for models with native MTP heads.",
  },
  "understand-anything": {
    id: "understand-anything",
    name: "Understand-Anything",
    tier: "Tier 2: Coding Agents & Knowledge",
    category: "coding",
    description: "Multi-agent codebase understanding engine generating interactive dependency graphs & Karpathy wikis.",
    upstreamUrl: "https://github.com/Egonex-AI/Understand-Anything",
    license: "Apache-2.0",
    image: "ghcr.io/egonex-ai/understand-anything:latest",
    defaultPort: 3030,
    ports: [{ containerPort: 3030, hostPort: 3030, label: "Graph UI & API" }],
    env: [
      { key: "WORKSPACE_PATH", description: "Target codebase directory path to analyze", required: true, defaultValue: "/workspace", secret: false },
    ],
    capabilities: ["codebase-analysis", "dependency-graph", "karpathy-wiki", "mcp-server"],
    compatibleConnections: ["opencode", "openhands", "aider", "goose"],
    securityNote: "Requires read access to mounted codebase repository.",
  },
  "opik-mcp": {
    id: "opik-mcp",
    name: "Opik MCP Server",
    tier: "Tier 4: Tools & MCP",
    category: "tool",
    description: "Model Context Protocol server connecting AI coding agents directly to Opik tracing & evaluation.",
    upstreamUrl: "https://github.com/comet-ml/opik-mcp",
    license: "Apache-2.0",
    image: "ghcr.io/comet-ml/opik-mcp:latest",
    defaultPort: 8090,
    ports: [{ containerPort: 8090, hostPort: 8090, label: "MCP stdio/HTTP transport" }],
    env: [
      { key: "OPIK_URL_OVERRIDE", description: "URL of local Opik service", required: true, defaultValue: "http://opik:5173/api", secret: false },
    ],
    capabilities: ["mcp-server", "telemetry-query", "prompt-eval"],
    compatibleConnections: ["opik", "opencode", "openhands", "aider"],
    securityNote: "Exposes prompt evaluation tools over MCP protocol.",
  },
  ccsync: {
    id: "ccsync",
    name: "ccsync",
    tier: "Tier 4: Agent Utilities",
    category: "tool",
    description: "Background exporter syncing Claude Code sessions & conversation logs directly into Opik.",
    upstreamUrl: "https://github.com/comet-ml/ccsync",
    license: "Apache-2.0",
    image: "ghcr.io/comet-ml/ccsync:latest",
    defaultPort: 8095,
    ports: [{ containerPort: 8095, hostPort: 8095, label: "Sync Monitor" }],
    env: [
      { key: "OPIK_API_KEY", description: "Opik API Key (if remote) or local project slug", required: false, defaultValue: "local-dev", secret: true },
    ],
    capabilities: ["claude-code-export", "session-sync"],
    compatibleConnections: ["opik", "opencode"],
    securityNote: "Monitors local Claude Code session logs.",
  },
  "opik-openclaw": {
    id: "opik-openclaw",
    name: "Opik OpenClaw Telemetry",
    tier: "Tier 5: Observability Plugin",
    category: "observability",
    description: "Native connection plugin exporting OpenClaw agent execution traces & tool calls to Opik.",
    upstreamUrl: "https://github.com/comet-ml/opik-openclaw",
    license: "Apache-2.0",
    image: "ghcr.io/comet-ml/opik-openclaw:latest",
    defaultPort: 8096,
    ports: [{ containerPort: 8096, hostPort: 8096, label: "Telemetry Exporter" }],
    env: [
      { key: "OPIK_PROJECT_NAME", description: "Target Opik telemetry project name", required: false, defaultValue: "openclaw-agents", secret: false },
    ],
    capabilities: ["openclaw-tracing", "agent-telemetry"],
    compatibleConnections: ["openclaw", "opik"],
    securityNote: "Intercepts OpenClaw tool calls and LLM prompts.",
  },
  ollama: {
    id: "ollama",
    name: "Ollama",
    tier: "Tier 1: Core Runtimes",
    category: "llm",
    description: "Lightweight local model runner with simple model management CLI and REST API.",
    upstreamUrl: "https://github.com/ollama/ollama",
    license: "MIT",
    image: "ollama/ollama:latest",
    defaultPort: 11434,
    ports: [{ containerPort: 11434, hostPort: 11434, label: "Ollama REST API" }],
    env: [{ key: "OLLAMA_MODELS", description: "Model storage location", required: false, defaultValue: "/root/.ollama/models", secret: false }],
    capabilities: ["inference", "model-pull"],
    compatibleConnections: ["litellm", "omnirouter", "openwebui", "opencode"],
    securityNote: "Exposes HTTP API without default auth on localhost.",
  },
  litellm: {
    id: "litellm",
    name: "LiteLLM Proxy",
    tier: "Tier 1: Core Routers",
    category: "orchestration",
    description: "OpenAI-compatible LLM proxy with load balancing, budget tracking, and provider normalization.",
    upstreamUrl: "https://github.com/BerriAI/litellm",
    license: "MIT",
    image: "ghcr.io/berriai/litellm:main-latest",
    defaultPort: 4000,
    ports: [{ containerPort: 4000, hostPort: 4000, label: "LiteLLM Proxy" }],
    env: [{ key: "LITELLM_MASTER_KEY", description: "Master API key for proxy access", required: false, defaultValue: "sk-litellm-master", secret: true }],
    capabilities: ["routing", "rate-limiting", "budget-tracking"],
    compatibleConnections: ["localai", "ollama", "opencode", "openwebui", "opik"],
    securityNote: "Proxy keys should be kept secure.",
  },
};

export class MockHostAdapter implements HostAdapter {
  private services: Service[] = [
    {
      id: "localai",
      name: "LocalAI",
      slug: "localai",
      description: "OpenAI-compatible inference gateway for local models.",
      category: "llm",
      status: "running",
      health: "healthy",
      version: "v2.25.1",
      port: 8080,
      image: "localai/localai:latest-aio-cpu",
      uptime: "2d 04h",
      cpuPercent: 18.4,
      memory: "6.2 GB",
      configured: true,
      connections: 3,
      accent: "violet",
    },
    {
      id: "opencode",
      name: "OpenCode",
      slug: "opencode",
      description: "Terminal-native coding agent with a local model backend.",
      category: "coding",
      status: "running",
      health: "healthy",
      version: "0.1.14",
      port: 4096,
      image: "ghcr.io/anomalyco/opencode:latest",
      uptime: "2d 04h",
      cpuPercent: 6.8,
      memory: "412 MB",
      configured: true,
      connections: 2,
      accent: "cyan",
    },
    {
      id: "openwebui",
      name: "Open WebUI",
      slug: "openwebui",
      description: "A friendly browser interface for models and conversations.",
      category: "interface",
      status: "running",
      health: "healthy",
      version: "0.6.30",
      port: 3000,
      image: "ghcr.io/open-webui/open-webui:main",
      uptime: "2d 04h",
      cpuPercent: 4.1,
      memory: "688 MB",
      configured: true,
      connections: 2,
      accent: "blue",
    },
    {
      id: "n8n",
      name: "n8n",
      slug: "n8n",
      description: "Workflow automation for prompts, webhooks, and agents.",
      category: "automation",
      status: "warning",
      health: "degraded",
      version: "1.109.2",
      port: 5678,
      image: "docker.n8n.io/n8nio/n8n:latest",
      uptime: "5h 12m",
      cpuPercent: 12.7,
      memory: "1.1 GB",
      configured: false,
      connections: 2,
      accent: "orange",
    },
    {
      id: "hermes",
      name: "Hermes",
      slug: "hermes",
      description: "Orchestration layer that coordinates local AI services.",
      category: "orchestration",
      status: "stopped",
      health: "offline",
      version: "0.4.0",
      port: 8787,
      image: "ghcr.io/hermes-ai/hermes:latest",
      uptime: "—",
      cpuPercent: 0,
      memory: "—",
      configured: false,
      connections: 0,
      accent: "green",
    },
    {
      id: "opendesign",
      name: "OpenDesign",
      slug: "opendesign",
      description: "Design agent workspace for local-first creative tasks.",
      category: "coding",
      status: "stopped",
      health: "offline",
      version: "0.3.8",
      port: 4173,
      image: "ghcr.io/opendesign-ai/opendesign:latest",
      uptime: "—",
      cpuPercent: 0,
      memory: "—",
      configured: false,
      connections: 0,
      accent: "pink",
    },
  ];

  private logs: Record<string, LogLine[]> = {
    localai: [
      { id: "l1", timestamp: new Date().toISOString(), stream: "system", message: "ready · llama-3.1-8b-instruct" },
      { id: "l2", timestamp: new Date().toISOString(), stream: "stdout", message: "POST /v1/chat/completions 200 · 1.84s" },
      { id: "l3", timestamp: new Date().toISOString(), stream: "system", message: "health check passed · 18ms" },
    ],
    opencode: [
      { id: "o1", timestamp: new Date().toISOString(), stream: "system", message: "session ready · backend localai" },
      { id: "o2", timestamp: new Date().toISOString(), stream: "stdout", message: "watching ~/workspace/locai-console" },
    ],
    opik: [
      { id: "op1", timestamp: new Date().toISOString(), stream: "system", message: "Opik telemetry collector listening on :8080" },
      { id: "op2", timestamp: new Date().toISOString(), stream: "stdout", message: "Trace logged: session_id=sess_4912 prompt_tokens=1420" },
    ],
  };

  private connections: Connection[] = [
    { id: "c1", source: "OpenCode", target: "LocalAI", protocol: "OpenAI API", status: "connected", detail: "http://localai:8080/v1" },
    { id: "c2", source: "Open WebUI", target: "LocalAI", protocol: "OpenAI API", status: "connected", detail: "default model: llama-3.1-8b" },
    { id: "c3", source: "OpenCode", target: "Opik", protocol: "OTLP / REST", status: "connected", detail: "Telemetry trace export: http://opik:8080" },
  ];

  async getCapabilities(): Promise<HostAdapterCapabilities> {
    return {
      dockerAvailable: true,
      dockerVersion: "Docker Engine 27.3.1",
      os: "macOS Sonoma (Darwin arm64)",
      architecture: "arm64",
      supportsGPU: true,
      mcpProtocolVersion: "2024-11-05",
    };
  }

  async getOverview(): Promise<Overview> {
    const caps = await this.getCapabilities();
    const running = this.services.filter((s) => s.status === "running").length;
    const healthy = this.services.filter((s) => s.health === "healthy").length;
    const attention = this.services.filter((s) => s.health === "degraded" || s.status === "warning").length;

    return {
      host: {
        name: "local-apple-silicon",
        os: caps.os,
        architecture: caps.architecture,
        docker: caps.dockerVersion || "Mock Adapter Engine",
        cpuPercent: 24.6,
        memoryPercent: 54.2,
        memoryUsed: "34.7 GB",
        memoryTotal: "64.0 GB",
      },
      running,
      total: this.services.length,
      healthy,
      attention,
      lastUpdated: "Just now",
    };
  }

  async listServices(): Promise<Service[]> {
    return this.services;
  }

  async getService(serviceId: string): Promise<Service | undefined> {
    return this.services.find((s) => s.id === serviceId);
  }

  async updateService(serviceId: string, update: ServiceUpdate): Promise<Service> {
    const service = this.services.find((s) => s.id === serviceId);
    if (!service) throw new Error(`Service ${serviceId} not found`);

    if (update.port) service.port = update.port;
    if (update.image) service.image = update.image;
    if (update.configured !== undefined) service.configured = update.configured;

    return service;
  }

  async controlService(serviceId: string, action: ServiceAction["action"]): Promise<Service> {
    const service = this.services.find((s) => s.id === serviceId);
    if (!service) throw new Error(`Service ${serviceId} not found`);

    if (action === "start") {
      service.status = "running";
      service.health = "healthy";
      service.uptime = "Just started";
    } else if (action === "stop") {
      service.status = "stopped";
      service.health = "offline";
      service.uptime = "—";
      service.cpuPercent = 0;
      service.memory = "—";
    } else if (action === "restart") {
      service.status = "running";
      service.health = "healthy";
      service.uptime = "Restarted just now";
    }

    return service;
  }

  async removeService(serviceId: string): Promise<{ success: boolean; serviceId: string }> {
    const index = this.services.findIndex((s) => s.id === serviceId);
    if (index === -1) throw new Error(`Service ${serviceId} not found`);

    this.services.splice(index, 1);
    return { success: true, serviceId };
  }

  async listCatalog(): Promise<CatalogItem[]> {
    const installedIds = new Set(this.services.map((s) => s.id));

    return Object.values(CATALOG_MANIFESTS).map((m) => ({
      id: m.id,
      name: m.name,
      tier: m.tier,
      category: m.category,
      description: m.description,
      upstreamUrl: m.upstreamUrl,
      license: m.license,
      image: m.image,
      defaultPort: m.defaultPort,
      installed: installedIds.has(m.id),
      accent: m.category === "observability" ? "amber" : m.category === "runtime" ? "purple" : "teal",
    }));
  }

  async getCatalogManifest(manifestId: string): Promise<ManifestDetail | undefined> {
    return CATALOG_MANIFESTS[manifestId];
  }

  async installService(manifestId: string, customPort?: number): Promise<Service> {
    const manifest = CATALOG_MANIFESTS[manifestId];
    if (!manifest) throw new Error(`Manifest ${manifestId} not found in catalog`);

    const existing = this.services.find((s) => s.id === manifestId);
    if (existing) return existing;

    const newService: Service = {
      id: manifest.id,
      name: manifest.name,
      slug: manifest.id,
      description: manifest.description,
      category: manifest.category as Service["category"],
      status: "running",
      health: "healthy",
      version: "1.0.0",
      port: customPort || manifest.defaultPort,
      image: manifest.image,
      uptime: "Just installed",
      cpuPercent: 2.5,
      memory: "256 MB",
      configured: true,
      connections: 1,
      accent: manifest.category === "observability" ? "amber" : "teal",
    };

    this.services.push(newService);

    this.logs[manifestId] = [
      { id: `${manifestId}-1`, timestamp: new Date().toISOString(), stream: "system", message: `Pulling image ${manifest.image}...` },
      { id: `${manifestId}-2`, timestamp: new Date().toISOString(), stream: "system", message: `Container initialized on port ${newService.port}` },
      { id: `${manifestId}-3`, timestamp: new Date().toISOString(), stream: "stdout", message: `Service ${manifest.name} is ready` },
    ];

    return newService;
  }

  async getServiceLogs(serviceId: string): Promise<LogLine[]> {
    return this.logs[serviceId] || [
      { id: "def-1", timestamp: new Date().toISOString(), stream: "system", message: `Log stream attached for ${serviceId}` },
    ];
  }

  async getSystemEvents(): Promise<ActivityEvent[]> {
    return [
      {
        id: "mock-1",
        title: "locai-console is running",
        detail: "health check passing",
        time: new Date().toISOString(),
        type: "good",
        timestamp: Date.now(),
      },
    ];
  }

  async listConnections(): Promise<Connection[]> {
    return this.connections;
  }
}
