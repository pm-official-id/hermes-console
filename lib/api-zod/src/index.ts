export * from "./generated/api";
export type {
  CatalogItem,
  Connection,
  ConnectionStatus,
  EnvVarSpec,
  HealthStatus,
  HostStatus,
  InstallServiceRequest,
  LogLine,
  LogLineStream,
  ManifestDetail,
  Overview,
  PortMapping,
  Service,
  ServiceAction,
  ServiceActionAction,
  ServiceCategory,
  ServiceHealth,
  ServiceStatus,
  ServiceUpdate,
} from "./generated/types";

import * as zod from 'zod';

export const ActivityEventSchema = zod.object({
  id: zod.string(),
  title: zod.string(),
  detail: zod.string(),
  time: zod.string(),
  type: zod.enum(["good", "warn"]),
  timestamp: zod.number(),
});

export type ActivityEvent = zod.infer<typeof ActivityEventSchema>;
