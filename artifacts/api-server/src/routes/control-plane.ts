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
  ListCatalogResponse,
  GetCatalogManifestResponse,
  GetCatalogManifestParams,
  InstallServiceBody,
  InstallServiceResponse,
  RemoveServiceParams,
  RemoveServiceResponse,
  UpdateServiceBody,
  UpdateServiceParams,
} from "@workspace/api-zod";
import { DockerHostAdapter } from "../lib/adapters/docker-adapter";
import type { HostAdapter } from "../lib/adapters/host-adapter";

const adapter: HostAdapter = new DockerHostAdapter();

const router: IRouter = Router();

router.get("/overview", async (_req, res) => {
  try {
    const overview = await adapter.getOverview();
    res.json(GetOverviewResponse.parse(overview));
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch overview" });
  }
});

router.get("/catalog", async (_req, res) => {
  try {
    const catalog = await adapter.listCatalog();
    res.json(ListCatalogResponse.parse(catalog));
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to list catalog" });
  }
});

router.get("/catalog/:manifestId", async (req, res) => {
  try {
    const params = GetCatalogManifestParams.parse(req.params);
    const manifest = await adapter.getCatalogManifest(params.manifestId);
    if (!manifest) {
      res.status(404).json({ error: "Manifest not found" });
      return;
    }
    res.json(GetCatalogManifestResponse.parse(manifest));
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Invalid catalog request" });
  }
});

router.post("/services/install", async (req, res) => {
  try {
    const { manifestId, customPort } = InstallServiceBody.parse(req.body);
    const installed = await adapter.installService(manifestId, customPort);
    res.json(InstallServiceResponse.parse(installed));
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Failed to install service" });
  }
});

router.get("/services", async (_req, res) => {
  try {
    const services = await adapter.listServices();
    res.json(ListServicesResponse.parse(services));
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to list services" });
  }
});

router.get("/services/:serviceId", async (req, res) => {
  try {
    const params = GetServiceParams.parse(req.params);
    const service = await adapter.getService(params.serviceId);
    if (!service) {
      res.status(404).json({ error: "Service not found" });
      return;
    }
    res.json(GetServiceResponse.parse(service));
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Invalid service request" });
  }
});

router.patch("/services/:serviceId", async (req, res) => {
  try {
    const params = UpdateServiceParams.parse(req.params);
    const input = UpdateServiceBody.parse(req.body);
    const updated = await adapter.updateService(params.serviceId, input);
    res.json(GetServiceResponse.parse(updated));
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Failed to update service" });
  }
});

router.post("/services/:serviceId/action", async (req, res) => {
  try {
    const params = ControlServiceParams.parse(req.params);
    const { action } = ControlServiceBody.parse(req.body);
    const updated = await adapter.controlService(params.serviceId, action);
    res.json(GetServiceResponse.parse(updated));
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Failed to execute service action" });
  }
});

router.delete("/services/:serviceId", async (req, res) => {
  try {
    const params = RemoveServiceParams.parse(req.params);
    const result = await adapter.removeService(params.serviceId);
    res.json(RemoveServiceResponse.parse(result));
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Failed to remove service" });
  }
});

router.get("/services/:serviceId/logs", async (req, res) => {
  try {
    const params = GetServiceLogsParams.parse(req.params);
    const logs = await adapter.getServiceLogs(params.serviceId);
    res.json(logs);
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Failed to fetch service logs" });
  }
});

router.get("/connections", async (_req, res) => {
  try {
    const connections = await adapter.listConnections();
    res.json(ListConnectionsResponse.parse(connections));
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to list connections" });
  }
});

router.get("/activity", async (_req, res) => {
  try {
    const events = await adapter.getSystemEvents();
    res.json(events);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to list activity events" });
  }
});

export default router;