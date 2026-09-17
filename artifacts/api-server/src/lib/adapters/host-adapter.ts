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

export interface HostAdapterCapabilities {
  dockerAvailable: boolean;
  dockerVersion?: string;
  os: string;
  architecture: string;
  supportsGPU: boolean;
  mcpProtocolVersion: string;
}

export interface HostAdapter {
  getCapabilities(): Promise<HostAdapterCapabilities>;
  getOverview(): Promise<Overview>;
  listServices(): Promise<Service[]>;
  getService(serviceId: string): Promise<Service | undefined>;
  updateService(serviceId: string, update: ServiceUpdate): Promise<Service>;
  controlService(serviceId: string, action: ServiceAction["action"]): Promise<Service>;
  removeService(serviceId: string): Promise<{ success: boolean; serviceId: string }>;
  listCatalog(): Promise<CatalogItem[]>;
  getCatalogManifest(manifestId: string): Promise<ManifestDetail | undefined>;
  installService(manifestId: string, customPort?: number): Promise<Service>;
  getServiceLogs(serviceId: string): Promise<LogLine[]>;
  listConnections(): Promise<Connection[]>;
  getSystemEvents(): Promise<ActivityEvent[]>;
}
