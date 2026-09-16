# LocAI Console — Functions & API Guidebook

This guidebook provides an exhaustive technical reference for all **Host Adapter domain methods**, **REST API endpoints**, **generated React Query hooks**, and **UI view components** within LocAI Console.

---

## 🗂️ Table of Contents

1. [Host Adapter Interface (`HostAdapter`)](#1-host-adapter-interface-hostadapter)
2. [Control Plane REST API Endpoints](#2-control-plane-rest-api-endpoints)
3. [React Data-Fetching Hooks (`@workspace/api-client-react`)](#3-react-data-fetching-hooks-workspaceapi-client-react)
4. [Frontend Component & Page Functions (`artifacts/hermes-console/src/App.tsx`)](#4-frontend-component--page-functions)

---

## 🔌 1. Host Adapter Interface (`HostAdapter`)

The `HostAdapter` interface ([`artifacts/api-server/src/lib/adapters/host-adapter.ts`](file:///Users/IPRIYANATH/Desktop/hermes-console/artifacts/api-server/src/lib/adapters/host-adapter.ts)) decouples the control-plane REST API from host process execution. All implementations (`MockHostAdapter` and `DockerHostAdapter`) satisfy this contract.

```typescript
export interface HostAdapter {
  getOverview(): Promise<Overview>;
  listServices(): Promise<Service[]>;
  getService(id: string): Promise<Service | null>;
  updateService(id: string, patch: Partial<Service>): Promise<Service>;
  controlService(id: string, action: ServiceAction): Promise<Service>;
  removeService(id: string): Promise<void>;
  listCatalog(): Promise<EcosystemManifest[]>;
  getCatalogManifest(id: string): Promise<EcosystemManifest | null>;
  installService(manifestId: string): Promise<Service>;
  getServiceLogs(id: string, tail?: number): Promise<ServiceLogs>;
  listConnections(): Promise<ConnectionTopology>;
}
```

### Method Descriptions

#### `getOverview(): Promise<Overview>`
Returns real-time host machine metrics and fleet summary status.
- **Returns**: `Overview` object containing:
  - `host`: Host details (`name`, `os`, `architecture`, `cpuCores`, `memoryGb`, `dockerVersion`, `status`).
  - `metrics`: Live metrics (`cpuUsagePercent`, `memoryUsagePercent`, `activeServices`, `totalServices`, `uptimeSeconds`).
  - `recentActivity`: Array of recent system audit logs (`timestamp`, `message`, `type`, `serviceId`).

#### `listServices(): Promise<Service[]>`
Retrieves all managed services currently installed in the operator's fleet.
- **Returns**: Array of `Service` items (`id`, `name`, `category`, `status`, `port`, `image`, `memoryMb`, `cpuPercent`, `configured`, `description`, `docsUrl`, `environment`).

#### `getService(id: string): Promise<Service | null>`
Fetches detailed state for a single service by ID.
- **Parameters**: `id` (string) — Service ID (e.g., `'localai'`, `'opik'`, `'omlx'`).
- **Returns**: `Service` object or `null` if not found.

#### `updateService(id: string, patch: Partial<Service>): Promise<Service>`
Patches configuration settings for a specific service.
- **Parameters**:
  - `id` (string) — Service ID.
  - `patch` (object) — Key/value updates (`port`, `image`, `configured`, `environment`).
- **Returns**: Updated `Service` object.

#### `controlService(id: string, action: 'start' | 'stop' | 'restart'): Promise<Service>`
Issues an explicit container lifecycle action to a managed service.
- **Parameters**:
  - `id` (string) — Target service ID.
  - `action` ('start' \| 'stop' \| 'restart') — Desired lifecycle command.
- **Returns**: Updated `Service` object with new status.

#### `removeService(id: string): Promise<void>`
Uninstalls and removes a managed service container from the fleet.
- **Parameters**: `id` (string) — Service ID to remove.

#### `listCatalog(): Promise<EcosystemManifest[]>`
Discovers available open-source manifests in the Ecosystem Catalog across all 5 tiers.
- **Returns**: Array of `EcosystemManifest` definitions (`id`, `name`, `category`, `tier`, `description`, `repositoryUrl`, `recommendedImage`, `defaultPort`, `exposedPorts`, `environmentVariables`, `dependencies`, `securityNotes`).

#### `getCatalogManifest(id: string): Promise<EcosystemManifest | null>`
Fetches detailed manifest requirements for a specific catalog tool.
- **Parameters**: `id` (string) — Manifest ID (e.g., `'opik'`, `'omlx'`, `'understand-anything'`).
- **Returns**: `EcosystemManifest` object or `null`.

#### `installService(manifestId: string): Promise<Service>`
Installs a new service container into the active fleet using its catalog manifest.
- **Parameters**: `manifestId` (string) — Manifest ID to deploy.
- **Returns**: Newly provisioned `Service` object.

#### `getServiceLogs(id: string, tail?: number): Promise<ServiceLogs>`
Fetches recent stdout/stderr log lines for a service.
- **Parameters**:
  - `id` (string) — Service ID.
  - `tail` (number, optional) — Number of log lines to retrieve (default: `100`).
- **Returns**: `ServiceLogs` object (`serviceId`, `logs`: string[]).

#### `listConnections(): Promise<ConnectionTopology>`
Retrieves inter-service topology connections and active communications.
- **Returns**: `ConnectionTopology` (`nodes`: TopologyNode[], `edges`: TopologyEdge[]).

---

## 🌐 2. Control Plane REST API Endpoints

All API routes are served by `@workspace/api-server` under the `/api` prefix:

| HTTP Method | Endpoint Path | Host Adapter Method | Description |
| :--- | :--- | :--- | :--- |
| **GET** | `/api/overview` | `getOverview()` | Host telemetry and summary state |
| **GET** | `/api/services` | `listServices()` | List installed managed fleet services |
| **GET** | `/api/services/:id` | `getService(id)` | Get detailed service configuration |
| **PATCH** | `/api/services/:id` | `updateService(id, body)` | Update service port/image/config |
| **POST** | `/api/services/:id/action` | `controlService(id, action)` | Trigger `start`, `stop`, or `restart` |
| **DELETE**| `/api/services/:id` | `removeService(id)` | Uninstall service container from fleet |
| **GET** | `/api/services/:id/logs` | `getServiceLogs(id, tail)` | Stream service container logs |
| **GET** | `/api/catalog` | `listCatalog()` | List available ecosystem manifests |
| **GET** | `/api/catalog/:id` | `getCatalogManifest(id)` | Get manifest details and env specs |
| **POST** | `/api/services/install` | `installService(manifestId)` | Deploy manifest into active fleet |
| **GET** | `/api/connections` | `listConnections()` | Visual connection topology |
| **GET** | `/api/health` | - | Healthcheck ping (`status: 'ok'`) |

---

## 🎣 3. React Data-Fetching Hooks (`@workspace/api-client-react`)

Generated via Orval from `openapi.yaml`. Available for import in React frontend components:

### Overview & Telemetry Hooks
- `useGetOverview(options)`: Queries `/api/overview` for host health and metrics.
- `useHealthCheck(options)`: Queries `/api/health` for host adapter availability.

### Fleet & Service Management Hooks
- `useListServices(options)`: Fetches installed fleet services.
- `useGetService(serviceId, options)`: Fetches single service details.
- `useUpdateService(options)`: Mutation hook for updating service properties.
- `useControlService(options)`: Mutation hook for issuing `start`/`stop`/`restart` commands.
- `useRemoveService(options)`: Mutation hook for uninstalling a service container.
- `useGetServiceLogs(serviceId, params, options)`: Fetches container logs.

### Ecosystem Catalog Hooks
- `useListCatalog(options)`: Queries `/api/catalog` for available manifests.
- `useGetCatalogManifest(manifestId, options)`: Queries `/api/catalog/:id` for manifest details.
- `useInstallService(options)`: Mutation hook for deploying a catalog manifest into the fleet.

### Topology Hooks
- `useListConnections(options)`: Queries `/api/connections` for topology nodes and edges.

---

## 🎨 4. Frontend Component & Page Functions (`artifacts/hermes-console/src/App.tsx`)

### Core Layout Components
- `AppShell({ children })`: Primary operator layout with dark topbar nav, health status indicator, quick launch triggers, and route rendering.
- `PageHeader({ eyebrow, title, description, actions })`: Reusable page heading block with actions slot.
- `StatusDot({ status, label })`: Visual status indicator dot (`running`, `stopped`, `pending`, `offline`).

### Page Views
- `OverviewPage()`: Dashboard view featuring live host card, memory/CPU meters, recent audit log panel, mini topology preview, and fleet quick links.
- `ServicesPage()`: Fleet management view with search bar, status/category filter pills, and service status cards.
- `ServiceDetailPage()`: Deep inspection view for a single service, including real-time log viewer, container config form, lifecycle control buttons (`Start`, `Stop`, `Restart`), and service uninstall button.
- `CatalogPage()`: Ecosystem Catalog view allowing operators to browse tools across 5 tiers, filter by category/installed status, and trigger the manifest inspection modal.
- `ManifestModal({ manifest, onClose })`: Interactive modal inspecting container image, default port, environment variables (highlighting secret fields), security advisories, and single-click "Install Service to Fleet" action.
- `ConnectionsPage()`: Comprehensive connection topology view mapping local runners, agents, workflow automation, frontends, and telemetry pipelines.
- `SettingsPage()`: Control plane configuration page for local host adapter label, Docker socket endpoint, safety confirmation toggles, and refresh interval settings.
