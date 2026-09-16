# LocAI Console

LocAI Console is a local-first control plane for launching, connecting, configuring, and monitoring AI services from one Docker-style portal.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/locai-console run dev` — run the web console
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/locai-console/src/App.tsx` — console routes, service views, connection inspector, and settings
- `artifacts/locai-console/src/index.css` — LocAI Console visual tokens and responsive styles
- `artifacts/api-server/src/routes/control-plane.ts` — control-plane API state model and lifecycle endpoints
- `lib/api-spec/openapi.yaml` — source-of-truth API contract for overview, services, logs, and connections

## Architecture decisions

- The first slice uses a host-adapter-shaped API contract so a Docker Engine/socket implementation can replace the seeded control-plane state without changing the UI.
- Service lifecycle actions are modeled as explicit start/stop/restart commands rather than arbitrary shell execution.
- The web console uses generated React Query hooks from the shared OpenAPI contract.

## Product

- Live overview of host telemetry and managed service health
- Service catalog with lifecycle controls and configuration
- Curated open-source ecosystem catalog for routers, agents, runtimes, workflows,
  memory, observability, and multimodal tools
- Recent service logs
- Connection topology between runners, coding tools, automation, interfaces, and orchestration
- Settings surface for local adapter and Docker defaults

## User preferences

The user wants the product to make local AI services easy to run, configure, monitor, and interlink from one portal, with a simple command-driven path such as `localAI -opencode`. The ecosystem should include OmniRouter and complementary open-source tools without treating every catalog entry as installed by default.

## Gotchas

- Re-run `pnpm --filter @workspace/api-spec run codegen` after changing `lib/api-spec/openapi.yaml`.
- The API server currently exposes a seeded control-plane model; host-level Docker process control is the next adapter boundary.
- The recommended tool universe and rollout priorities are documented in `docs/OPEN_SOURCE_ECOSYSTEM_CATALOG.md`.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
