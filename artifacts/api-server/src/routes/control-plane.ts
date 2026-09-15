import { Router, type IRouter } from "express";
import {
  ControlServiceBody,
  ControlServiceParams,
  GetServiceLogsParams,
  GetServiceParams,
  GetServiceResponse,
  GetOverviewResponse,
  ListConnectionsResponse,
  ListServicesResponse,
  UpdateServiceBody,
  UpdateServiceParams,
} from "@workspace/api-zod";

type Service = ReturnType<typeof ListServicesResponse.parse>[number];
type LogLine = ReturnType<typeof ListConnectionsResponse.parse>[number] & {
  stream: "system" | "stdout" | "stderr";
  message: string;
};

const services: Service[] = [
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
    connections: 1,
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

const logsByService: Record<string, LogLine[]> = {
  localai: [
    { id: "l1", source: "localai", target: "log", protocol: "internal", status: "connected", detail: "Model loaded", stream: "system", message: "ready · llama-3.1-8b-instruct" },
    { id: "l2", source: "localai", target: "log", protocol: "internal", status: "connected", detail: "Request served", stream: "stdout", message: "POST /v1/chat/completions 200 · 1.84s" },
    { id: "l3", source: "localai", target: "log", protocol: "internal", status: "connected", detail: "Health check", stream: "system", message: "health check passed · 18ms" },
  ],
  opencode: [
    { id: "o1", source: "opencode", target: "log", protocol: "internal", status: "connected", detail: "Session ready", stream: "system", message: "session ready · backend localai" },
    { id: "o2", source: "opencode", target: "log", protocol: "internal", status: "connected", detail: "Workspace watched", stream: "stdout", message: "watching ~/workspace/hermes-console" },
  ],
  n8n: [
    { id: "n1", source: "n8n", target: "log", protocol: "internal", status: "connected", detail: "Credential warning", stream: "stderr", message: "credential not configured · LocalAI" },
    { id: "n2", source: "n8n", target: "log", protocol: "internal", status: "connected", detail: "Workflow loaded", stream: "system", message: "loaded 12 active workflows" },
  ],
};

const connections = [
  { id: "c1", source: "OpenCode", target: "LocalAI", protocol: "OpenAI API", status: "connected" as const, detail: "http://localai:8080/v1" },
  { id: "c2", source: "Open WebUI", target: "LocalAI", protocol: "OpenAI API", status: "connected" as const, detail: "default model: llama-3.1-8b" },
  { id: "c3", source: "n8n", target: "LocalAI", protocol: "HTTP node", status: "needs-config" as const, detail: "Set base URL and model" },
  { id: "c4", source: "Hermes", target: "OpenCode", protocol: "Plugin bridge", status: "pending" as const, detail: "Start Hermes to enable" },
  { id: "c5", source: "Hermes", target: "OpenDesign", protocol: "Plugin bridge", status: "pending" as const, detail: "Service is not installed" },
];

const router: IRouter = Router();

router.get("/overview", (_req, res) => {
  const running = services.filter((service) => service.status === "running").length;
  const healthy = services.filter((service) => service.health === "healthy").length;
  const attention = services.filter((service) => service.health === "degraded" || service.status === "starting").length;
  const result = GetOverviewResponse.parse({
    host: {
      name: "Mac Studio · Studio",
      os: "macOS 15.6",
      architecture: "Apple Silicon",
      docker: "Docker Desktop 4.44",
      cpuPercent: 31,
      memoryPercent: 58,
      memoryUsed: "18.6 GB",
      memoryTotal: "32 GB",
    },
    running,
    total: services.length,
    healthy,
    attention,
    lastUpdated: new Date().toISOString(),
  });
  res.json(result);
});

router.get("/services", (_req, res) => {
  res.json(ListServicesResponse.parse(services));
});

router.get("/services/:serviceId", (req, res) => {
  const params = GetServiceParams.parse(req.params);
  const service = services.find((item) => item.id === params.serviceId);
  if (!service) {
    res.status(404).json({ error: "Service not found" });
    return;
  }
  res.json(GetServiceResponse.parse(service));
});

router.patch("/services/:serviceId", (req, res) => {
  const params = UpdateServiceParams.parse(req.params);
  const input = UpdateServiceBody.parse(req.body);
  const service = services.find((item) => item.id === params.serviceId);
  if (!service) {
    res.status(404).json({ error: "Service not found" });
    return;
  }
  Object.assign(service, input);
  res.json(service);
});

router.post("/services/:serviceId/action", (req, res) => {
  const params = ControlServiceParams.parse(req.params);
  const { action } = ControlServiceBody.parse(req.body);
  const service = services.find((item) => item.id === params.serviceId);
  if (!service) {
    res.status(404).json({ error: "Service not found" });
    return;
  }
  if (action === "start") {
    service.status = "running";
    service.health = service.configured ? "healthy" : "degraded";
    service.uptime = "just now";
  } else if (action === "stop") {
    service.status = "stopped";
    service.health = "offline";
    service.uptime = "—";
    service.cpuPercent = 0;
    service.memory = "—";
  } else {
    service.status = "running";
    service.health = service.configured ? "healthy" : "degraded";
    service.uptime = "just now";
  }
  res.json(service);
});

router.get("/services/:serviceId/logs", (req, res) => {
  const params = GetServiceLogsParams.parse(req.params);
  const service = services.find((item) => item.id === params.serviceId);
  if (!service) {
    res.status(404).json({ error: "Service not found" });
    return;
  }
  res.json(logsByService[params.serviceId] ?? []);
});

router.get("/connections", (_req, res) => {
  res.json(ListConnectionsResponse.parse(connections));
});

export default router;