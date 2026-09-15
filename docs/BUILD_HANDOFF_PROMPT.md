# Product-ready Hermes Console build prompt

Copy the prompt below into another AI coding tool after giving it access to
this repository.

---

## Prompt

You are the lead product engineer taking over the Hermes Console repository.
Build the product to a production-ready local-first control plane without
throwing away the existing work.

### Product mission

Hermes Console is a Docker/Portainer-like portal for local AI infrastructure.
It should make it easy to install, configure, connect, monitor, and operate
local services such as LocalAI, Ollama-compatible runners, mtplx/olmx, llama.cpp,
LiteLLM, OmniRouter, vLLM, SGLang, OpenCode, OpenHands, Goose, Aider,
OpenDesign, OpenClaw, Browser Use, Open WebUI, LibreChat, AnythingLLM, n8n,
Dify, Langflow, Qdrant, pgvector, SearXNG, Langfuse, OpenTelemetry, ComfyUI,
whisper.cpp, Piper, and Hermes itself.

The core promise is:

> Run local AI services, connect them into useful workflows, and operate the
> entire stack from one clear control plane.

The product must work on different hosts, not just the current development
machine. Design the architecture so a real Docker host adapter can replace the
seeded development model without requiring a rewrite of the frontend.

### Repository context

This is a pnpm TypeScript monorepo with:

- React/Vite web artifact: `artifacts/hermes-console`
- Express API artifact: `artifacts/api-server`
- OpenAPI source contract: `lib/api-spec/openapi.yaml`
- Generated React Query client: `lib/api-client-react`
- Generated Zod/server types: `lib/api-zod`
- Drizzle/PostgreSQL package: `lib/db`
- Component canvas preview artifact: `artifacts/mockup-sandbox`
- Canvas design source: `artifacts/mockup-sandbox/src/components/mockups/hermes/HermesOrbit.tsx`
- Open-source ecosystem catalog: `docs/OPEN_SOURCE_ECOSYSTEM_CATALOG.md`
- Project instructions and commands: `replit.md`

Run the existing checks before changing architecture:

```bash
pnpm install
pnpm run typecheck
pnpm run build
```

The first milestone currently uses a seeded in-memory control-plane model.
That is intentional. Preserve the API boundary and replace the implementation
behind it with real host adapters.

### Important design decisions to preserve

1. Use the existing Hermes Console as the production visual direction.
2. Keep Hermes Orbit as a documented alternate exploration only. Do not
   replace the original console without explicit approval.
3. Use the OpenAPI contract as the source of truth. Regenerate React Query
   hooks and Zod schemas after contract changes.
4. Model lifecycle actions as explicit start, stop, and restart operations.
   Never expose arbitrary shell execution from the UI or public API.
5. Prefer local-first operation. Cloud accounts and external integrations are
   optional, not required for the core control plane.
6. Keep host access behind an adapter interface so the API can support Docker
   Engine socket, Docker over TCP, a local host agent, or a future Podman
   adapter.
7. Do not commit secrets, tokens, `.env` files, private keys, generated
   machine credentials, or local tool caches.

### Current product surface

The existing console includes:

- Overview with host status and telemetry.
- Service catalog and service detail views.
- Service configuration editing.
- Explicit lifecycle controls.
- Recent service logs.
- Connection topology between services.
- Settings for adapter and Docker defaults.
- Responsive Hermes Console styling.
- Curated ecosystem catalog that separates available tools from installed
  services and explicitly marks core, optional, experimental, and deprecated
  integrations.

The existing API includes:

- `GET /api/healthz`
- `GET /api/overview`
- `GET /api/services`
- `GET /api/services/{serviceId}`
- `PATCH /api/services/{serviceId}`
- `POST /api/services/{serviceId}/action`
- `GET /api/services/{serviceId}/logs`
- `GET /api/connections`

Seeded service IDs include:

- `localai`
- `opencode`
- `openwebui`
- `n8n`
- `hermes`
- `opendesign`

### Target architecture

Implement the following layers:

#### 1. Domain model

Define durable types for:

- Host connection and adapter capabilities.
- Service manifest and installed service instance.
- Image, container, port, volume, environment-variable reference, health
  check, dependency, and connection.
- Lifecycle state transition and audit event.
- Log stream cursor and structured log line.
- Resource telemetry sample.

Use discriminated unions for adapter types, service action types, and health
states. Validate API input with Zod. Do not duplicate business rules inside
React components.

#### 2. Host adapter interface

Create a small interface that can support:

- List and inspect containers/services.
- Pull or verify an image.
- Create, update, start, stop, restart, and remove a managed service.
- Read logs with pagination and follow/tail support.
- Read host and container telemetry.
- Subscribe to lifecycle and health events.
- Report capabilities and adapter health.

Implement:

- A deterministic mock/seed adapter for development and automated tests.
- A Docker Engine adapter with a clear configuration boundary.

The Docker implementation must not hardcode a developer's socket path. Make
the endpoint configurable and validate it. Support a local Unix socket first,
then leave a clean extension point for remote Docker and a host agent.

#### 3. Service manifests and catalog

Move service definitions into versioned manifests rather than embedding
service-specific configuration in route handlers. A manifest should describe:

- Stable service ID and display metadata.
- Image and supported versions.
- Default ports and volumes.
- Required and optional environment values.
- Health check.
- Resource hints.
- Dependencies.
- Compatible connections and configuration fields.
- Safe lifecycle capabilities.

Use `docs/OPEN_SOURCE_ECOSYSTEM_CATALOG.md` as the initial catalog source.
Include first-class manifests for LocalAI, Ollama, llama.cpp, LiteLLM,
OpenCode, Open WebUI, n8n, Hermes, and OpenDesign. Add OmniRouter as an
experimental router manifest with route, fallback, latency, and upstream
health telemetry. Add an extension path for OpenHands, Goose, Aider, OpenClaw,
Browser Use, LibreChat, AnythingLLM, Dify, Langflow, Qdrant, pgvector,
SearXNG, Langfuse, OpenTelemetry, ComfyUI, whisper.cpp, Piper, and other
plugin-style services.

Do not install every catalog entry by default. Catalog entries, install
previews, installed services, and connections are separate domain objects.
Every manifest must include the upstream repository, license, version policy,
architecture/GPU requirements, health check, resource profile, ports, volumes,
secret references, capabilities, dependencies, security notes, and compatible
connection types. Do not create default manifests for projects marked
deprecated or archived; Flowise is currently a reference-only example because
its upstream repository is archived.

#### 4. Configuration and secrets

Provide a clear configuration flow that distinguishes:

- Non-sensitive configuration, which can be stored and displayed normally.
- Secret references, which are never returned in plaintext after write.
- Host adapter credentials, which use the platform's secret mechanism or a
  local encrypted store rather than source files.

Never log secrets. Redact sensitive values from logs, error messages, event
payloads, and configuration diffs.

#### 5. API and realtime behavior

Extend the OpenAPI contract for:

- Adapter status and capabilities.
- Service install/preview/update/remove.
- Manifest catalog.
- Lifecycle action history.
- Paginated logs and follow/tail streams.
- Host telemetry.
- Live service events.
- Connection create/update/delete/test.
- Import/export of a portable deployment configuration.

Keep request and response schemas explicit. Return useful error codes and
human-readable error details. Use idempotency for mutating operations where
retries are possible.

Use Server-Sent Events or WebSockets for live telemetry and lifecycle/log
updates. Provide polling fallback for environments where streaming is not
available. Do not fake live state in the UI.

#### 6. Portal workflows

Make these end-to-end workflows reliable:

1. Connect a host and see adapter capabilities.
2. Discover or select a service manifest.
3. Preview required images, ports, volumes, resources, and configuration.
4. Validate configuration before install.
5. Install and show progress.
6. Open the service detail page after install.
7. Start, stop, restart, update, and remove with confirmation where
   destructive.
8. View logs with search, severity, timestamps, copy, download, and follow.
9. Inspect health, resource usage, ports, volumes, and dependencies.
10. Create and test service connections.
11. Export a portable deployment configuration for another host.
12. Recover from an unavailable host or partially completed action.
13. Browse the open-source catalog, compare compatible routers/agents/runtimes,
    and install a selected stack without confusing availability with
    installation.

Every async operation needs visible loading, success, failure, retry, and
cancel/rollback behavior where technically possible.

#### 7. CLI

Add a CLI package with commands equivalent to:

```text
hermes host list
hermes host connect
hermes service catalog
hermes service install localai --with opencode
hermes service start localai
hermes service stop localai
hermes service restart localai
hermes service logs localai --follow
hermes service status
hermes router list
hermes router test omnirouter
hermes agent install openhands --with litellm
hermes connection test
hermes export
```

Also support the requested shorthand style through a documented parser or
alias, for example:

```text
localAI --with opencode
```

The CLI must use the same domain/API contracts as the web portal, provide
machine-readable JSON output, return meaningful exit codes, and never print
secret values.

#### 8. Security

Threat-model host control before enabling real Docker operations. At minimum:

- Authenticate the portal when it is not strictly localhost-only.
- Add authorization boundaries for host and lifecycle operations.
- Require confirmation for remove and destructive volume operations.
- Protect against command injection by avoiding shell concatenation entirely.
- Validate service IDs, image names, ports, mounts, and environment keys.
- Restrict container capabilities and mounts by manifest policy.
- Redact secrets and sensitive host details.
- Add audit events for install, update, start, stop, restart, remove, and
  connection changes.
- Document secure remote-host setup. Do not encourage exposing an unauthenticated
  Docker socket.

#### 9. Reliability and operations

Add:

- Structured server logging with request IDs.
- Health/readiness checks for the API and adapter.
- Retry with bounded backoff for transient host failures.
- Timeouts on all host operations.
- Action state machine for queued/running/succeeded/failed/cancelled.
- Durable action history if a database is used.
- Recovery handling after API restart.
- Database migrations that are safe to run repeatedly.
- Metrics or a diagnostics endpoint for adapter latency and failures.

#### 10. UX and visual quality

Keep the existing Hermes Console design: an editorial operator console with
clear hierarchy, dark navy command surfaces, warm neutral panels, teal health
accents, compact monospace metadata, and responsive layouts.

Use the canvas handoff at `docs/CANVAS_DESIGN_HANDOFF.md` and
`HermesOrbit.tsx` as a visual reference only. The production app should:

- Make host health and service state understandable at a glance.
- Make the next safe action obvious.
- Preserve context while opening logs/configuration/connection details.
- Clearly separate healthy, degraded, stopped, unavailable, and unknown.
- Avoid dashboards made only of decorative cards.
- Remain usable on narrow screens.
- Meet keyboard navigation, focus, contrast, and reduced-motion expectations.

### Testing requirements

Add automated coverage for:

- Manifest validation.
- Adapter contract against the mock adapter.
- Lifecycle state transitions and invalid transitions.
- Configuration validation and secret redaction.
- Connection compatibility and test failures.
- API authorization and error responses.
- CLI parsing and exit codes.
- Log pagination/follow behavior.
- Import/export round trips.
- Catalog filtering, install previews, compatibility checks, and deprecated
  entry handling.
- React UI happy paths and error states.

Run at minimum:

```bash
pnpm run typecheck
pnpm run build
pnpm test
```

If the repository does not yet have a test command, add one using the
project's existing toolchain and document it in `replit.md`.

### Delivery sequence

Work in vertical slices. Keep the app runnable after each slice:

1. Establish domain types, adapter interface, mock adapter, and contract tests.
2. Add real Docker adapter behind the interface.
3. Add manifests and install/preview workflows.
4. Add the catalog and separate discovery, install, installed-service, and
   connection states.
5. Add durable actions, logs, telemetry, and realtime updates.
6. Add connection management and portable export/import.
7. Add CLI using shared contracts.
8. Add authentication, authorization, audit events, and threat-model findings.
9. Polish responsive UX, accessibility, tests, and operational docs.

Before each major slice, inspect the current code rather than assuming this
prompt is newer than the repository. Prefer small compatible changes over
rewrites. Preserve working generated files by regenerating them from the
OpenAPI source when needed.

### Definition of done

Do not call this product-ready until:

- A user can connect a supported host, install a manifest-backed service, and
  operate it from the portal.
- A user can discover the supported open-source ecosystem, compare compatible
  tools, and install a selected router/agent/runtime stack without receiving
  a misleading list of fake installed services.
- The same operations work through the CLI.
- The mock adapter provides deterministic development and test behavior.
- Docker host access is isolated behind a validated adapter boundary.
- Logs, health, telemetry, and lifecycle progress are real and recoverable.
- Connections between services can be created, tested, inspected, and removed.
- Secrets are never returned or leaked in logs.
- Destructive actions are guarded and audited.
- The portal works on desktop and mobile layouts.
- API, CLI, adapter, and UI tests cover success and failure paths.
- The repository contains clear local development, host setup, security,
  troubleshooting, and deployment documentation.
- All typechecks, builds, and tests pass.

At the end, summarize changed files, migrations, new commands, known limits,
verification results, and the next smallest production-hardening step.

---