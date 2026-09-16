# Hermes open-source AI ecosystem catalog

Hermes is not meant to install every AI project that exists. It is a local-first
control plane that makes a useful set of compatible tools easy to discover,
connect, configure, monitor, and operate.

This catalog is the recommended starting universe for Hermes manifests. A tool
being listed does not mean it is installed, trusted, or enabled by default.
Every manifest must be reviewed for license, image provenance, security posture,
hardware needs, maintenance activity, and API compatibility before it becomes a
one-click install.

## Product fit

Hermes should make this stack easy to compose:

```text
models and runtimes
        ↓
routers, gateways, and policy
        ↓
agents, coding tools, and browser tools
        ↓
workflows, memory, retrieval, and interfaces
        ↓
telemetry, evaluation, and safe operations
```

The strongest first-party experience is a small, interoperable path:

```text
Ollama or LocalAI
        → LiteLLM or OmniRouter
        → OpenCode, OpenHands, Goose, or OpenClaw
        → n8n or Dify
        → Open WebUI
        → Langfuse
```

## Tier 1: core manifests

These are the highest-value integrations for the Hermes mission.

| Tool | Role | Why Hermes should support it | Priority |
| --- | --- | --- | --- |
| [LocalAI](https://github.com/mudler/LocalAI) | OpenAI-compatible local inference gateway | Existing core service and a practical backend for local models | Core |
| [Ollama](https://github.com/ollama/ollama) | Local model runner | Simple model lifecycle and a widely used local endpoint | Core |
| [llama.cpp](https://github.com/ggml-org/llama.cpp) | High-performance local inference runtime | Useful low-level runtime for CPU, Metal, CUDA, and edge hosts | Core |
| [oMLX](https://github.com/) | MLX inference server for agentic workflows | High-performance Apple Silicon runner with SSD-backed KV caching | Optional |
| [MTPLX](https://github.com/) | Multi-Token Prediction (MTP) inference engine | Apple Silicon MLX runner with speculative MTP decoding for fast token speeds | Optional |
| [LiteLLM](https://github.com/BerriAI/litellm) | LLM gateway, proxy, routing, budgets, and provider normalization | Mature policy and compatibility layer between agents and model backends | Core |
| [OmniRouter](https://github.com/omnilabs-ai/OmniRouter) | Unified API interface and model switching layer | Directly matches the router portion of the Hermes mission | Optional / experimental |
| [vLLM](https://github.com/vllm-project/vllm) | High-throughput model serving | Important for GPU hosts and multi-user deployments | Optional |
| [SGLang](https://github.com/sgl-project/sglang) | Structured-generation and high-performance serving runtime | Useful when throughput and structured outputs matter | Optional |
| [Open WebUI](https://github.com/open-webui/open-webui) | Browser chat and model interface | Human-facing interface for the same local endpoints | Core |
| [n8n](https://github.com/n8n-io/n8n) | Workflow automation | Connects model actions to webhooks, APIs, schedules, and business tools | Core |
| [Hermes](https://github.com/) | Control-plane orchestration | The product being built; it owns host operations and service topology | Core |

### OmniRouter integration requirements

OmniRouter should be implemented as a router manifest, not as a special-case
frontend integration. The manifest should expose:

- OpenAI-compatible chat, image, and reasoning endpoint capability where
  supported by the installed version.
- Configurable upstream providers and local endpoints.
- Route/model aliases and an explicit default route.
- Health checks for the router and every upstream.
- Request latency, error rate, selected route, and fallback telemetry.
- Safe configuration diff and rollback.
- Secret references for remote provider credentials.
- Compatibility links to LocalAI, Ollama, llama.cpp, vLLM, SGLang, and LiteLLM.

Do not present OmniRouter as a guaranteed replacement for LiteLLM. Let users
choose a router based on their required routing, policy, observability, and
provider features. Record the exact upstream repository and release in the
manifest so the catalog does not hide project maturity or breaking changes.

## Tier 2: coding and autonomous agents

| Tool | Role | Hermes connection |
| --- | --- | --- |
| [OpenCode](https://github.com/anomalyco/opencode) | Terminal-native coding agent | Existing coding service; connect through a local OpenAI-compatible route |
| [OpenHands](https://github.com/All-Hands-AI/OpenHands) | Software-development agent workspace | Run as a managed agent with workspace, model, and permission policies |
| [Goose](https://github.com/block/goose) | Extensible developer agent | Plugin/tool-oriented agent that fits Hermes connection manifests |
| [Aider](https://github.com/Aider-AI/aider) | Terminal pair-programming agent | Lightweight agent for local repositories and scripted workflows |
| [SWE-agent](https://github.com/SWE-agent/SWE-agent) | Issue-to-patch software agent | Optional task worker with explicit repository and execution boundaries |
| [OpenClaw](https://github.com/) | General local agent/orchestration service | Existing requested integration; keep it plugin-oriented |
| [OpenDesign](https://github.com/) | Design-oriented local agent workspace | Existing requested integration; connect it to model routers and artifact workflows |
| [Browser Use](https://github.com/browser-use/browser-use) | Browser automation agent | Run behind a browser sandbox with explicit navigation and secret policies |
| [Understand-Anything](https://github.com/Egonex-AI/Understand-Anything) | Multi-agent codebase understanding & graph visualizer | Provide structural code dependencies, domain maps, and Karpathy wikis to coding agents |

Agent manifests must describe workspace mounts, tool permissions, model
endpoint, network policy, execution timeout, artifact outputs, and whether the
agent can mutate files or external systems. A running agent is never allowed
to imply unrestricted host access.

## Tier 3: interfaces and visual agent builders

| Tool | Role | Hermes connection |
| --- | --- | --- |
| [LibreChat](https://github.com/danny-avila/LibreChat) | Multi-provider chat interface | Connect to LiteLLM, OmniRouter, LocalAI, and Ollama |
| [AnythingLLM](https://github.com/Mintplex-Labs/anything-llm) | Document/RAG and workspace assistant | Pair with a local model route and a vector store |
| [Dify](https://github.com/langgenius/dify) | LLM application and agent workflow platform | Manage as a heavier optional stack with database and worker dependencies |
| [Langflow](https://github.com/langflow-ai/langflow) | Visual flow and agent builder | Offer as an optional design-time tool for composing agent pipelines |
| [Open WebUI](https://github.com/open-webui/open-webui) | Local chat, model management, and tools UI | Keep as the default human-facing interface |

Do not add archived projects to new default manifests. The upstream Flowise
repository currently marks itself archived, so it should remain a historical
reference rather than a default Hermes integration.

## Tier 4: workflows, tools, memory, and retrieval

| Tool | Role | Hermes connection |
| --- | --- | --- |
| [n8n](https://github.com/n8n-io/n8n) | Workflow automation | Core workflow runner with webhook and schedule triggers |
| [FastMCP](https://github.com/jlowin/fastmcp) | MCP server development | Build and register local tool servers with explicit capabilities |
| [Model Context Protocol](https://github.com/modelcontextprotocol) | Tool and resource interoperability | Represent MCP servers as capability-scoped Hermes connections |
| [Qdrant](https://github.com/qdrant/qdrant) | Vector search | Default optional retrieval service for document and memory workflows |
| [Chroma](https://github.com/chroma-core/chroma) | Developer-friendly embedding store | Lightweight retrieval option for single-host deployments |
| [pgvector](https://github.com/pgvector/pgvector) | PostgreSQL vector extension | Prefer when the deployment already uses Hermes PostgreSQL |
| [SearXNG](https://github.com/searxng/searxng) | Self-hosted metasearch | Local research tool for agents with transparent network policy |
| [Playwright](https://github.com/microsoft/playwright) | Browser automation foundation | Use as a sandbox dependency for browser agents and verification flows |
| [Opik MCP](https://github.com/comet-ml/opik-mcp) | MCP server for Opik observability | Expose Opik tracing, metrics, and prompt evaluation tools to AI coding agents |
| [ccsync](https://github.com/comet-ml/ccsync) | Claude Code session sync tool | Background sidecar to sync Claude Code agent histories into Opik |

Memory and retrieval services need a data-retention policy, export/delete
behavior, embedding-model metadata, and tenant/workspace boundaries. They
should not be treated as anonymous sidecars.

## Tier 5: observability, evaluation, and reliability

| Tool | Role | Hermes connection |
| --- | --- | --- |
| [Langfuse](https://github.com/langfuse/langfuse) | LLM tracing, prompts, costs, and evaluation | Recommended observability companion for routers and agents |
| [Opik](https://github.com/comet-ml/opik) | Open-source LLM evaluation, prompt engineering, and tracing platform | Primary open-source observability companion for routers, agents, and local endpoints |
| [Opik OpenClaw](https://github.com/comet-ml/opik-openclaw) | OpenClaw telemetry integration | Native connection plugin exporting OpenClaw agent traces and tool calls to Opik |
| [Arize Phoenix](https://github.com/Arize-ai/phoenix) | Tracing and evaluation | Optional evaluation surface for agent and retrieval quality |
| [OpenTelemetry](https://github.com/open-telemetry/opentelemetry-collector) | Vendor-neutral telemetry pipeline | Standardize metrics, traces, and logs from every adapter |
| [Jaeger](https://github.com/jaegertracing/jaeger) | Trace storage and UI | Lightweight local trace viewer for development |
| [promptfoo](https://github.com/promptfoo/promptfoo) | Prompt and model evaluation | Add repeatable regression checks for route and agent changes |

Observability manifests must never capture raw secrets or unrestricted prompt
content by default. Make payload sampling and redaction explicit.

## Tier 6: multimodal and specialist runtimes

| Tool | Role | Hermes connection |
| --- | --- | --- |
| [ComfyUI](https://github.com/comfyanonymous/ComfyUI) | Node-based image and media generation | Connect through workflow/API endpoints for design and media agents |
| [whisper.cpp](https://github.com/ggml-org/whisper.cpp) | Local speech-to-text | Add transcription capability to local workflows |
| [Piper](https://github.com/rhasspy/piper) | Local text-to-speech | Add voice output without a cloud dependency |
| [Stable Audio Open](https://github.com/Stability-AI/stable-audio-tools) | Open audio generation tooling | Optional GPU-heavy media capability |

These should be opt-in because their image sizes, model downloads, GPU
requirements, and storage needs are materially different from a text-only
control plane.

## Manifest and connection requirements

Every catalog entry must provide:

- Stable ID, display name, upstream repository, documentation URL, and license.
- Supported architectures and GPU/runtime requirements.
- Image references or install instructions with pinned-version support.
- Ports, volumes, health checks, startup order, resource hints, and update policy.
- API protocols and compatible Hermes connection types.
- Required configuration and secret references.
- Data retention, backup, import/export, and uninstall behavior.
- Capability flags: inference, routing, coding, browser, workflow, memory,
  retrieval, UI, media, observability, or evaluation.
- Maturity state: core, optional, experimental, deprecated, or blocked.
- A security review note for host mounts, network access, browser control, and
  arbitrary code execution.

Catalog discovery and installed services must be separate concepts:

1. **Catalog entry:** available to inspect and install.
2. **Install preview:** resolved image, dependencies, ports, resources, and
   configuration before mutation.
3. **Installed service:** managed by the host adapter and shown in the fleet.
4. **Connection:** an explicit, testable route between two capabilities.

Never add every catalog entry to the managed fleet or make catalog presence
look like a successful installation.

## Recommended rollout

1. Core runtimes and interfaces: LocalAI, Ollama, llama.cpp, oMLX/MTPLX (Apple Silicon MLX), LiteLLM, Open WebUI.
2. OmniRouter adapter as an experimental router with clear route telemetry.
3. Core agents: OpenCode, OpenHands, Goose, OpenClaw, and Aider.
4. Workflow and tools: n8n, MCP/FastMCP, Qdrant or pgvector, SearXNG, Understand-Anything, Opik MCP.
5. Observability: Langfuse, Opik, and OpenTelemetry.
6. Optional heavy stacks: vLLM, SGLang, Dify, Langflow, ComfyUI, speech tools.
7. Evaluation, policy, and marketplace-style community manifests only after
   signature, provenance, and compatibility checks exist.

## Operating principle

Hermes should be the safe, legible operating layer. It should not try to
reimplement every agent, model runner, workflow builder, vector database, or
observability product. Hermes wins by making those tools composable, portable,
observable, and safe to operate together on a user's host.