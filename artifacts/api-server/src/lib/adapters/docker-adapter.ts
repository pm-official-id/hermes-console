import os from "os";
import Docker from "dockerode";
import { MockHostAdapter } from "./mock-adapter";
import type { HostAdapter, HostAdapterCapabilities } from "./host-adapter";
import type { Overview, Service, LogLine, ServiceAction } from "@workspace/api-zod";

/**
 * DockerHostAdapter wraps host Docker daemon operations when /var/run/docker.sock or a TCP endpoint is reachable.
 * Falls back to MockHostAdapter if Docker socket is not available in the execution environment.
 */
export class DockerHostAdapter extends MockHostAdapter implements HostAdapter {
  private docker: Docker;
  private dockerEndpoint: string;

  constructor(dockerEndpoint: string = "/var/run/docker.sock") {
    super();
    this.dockerEndpoint = dockerEndpoint;
    this.docker = new Docker({ socketPath: dockerEndpoint });
  }

  override async getCapabilities(): Promise<HostAdapterCapabilities> {
    const parentCaps = await super.getCapabilities();
    let dockerVersion = "Unknown";
    let dockerAvailable = false;
    try {
      const version = await this.docker.version();
      dockerVersion = version.Version || "Unknown";
      dockerAvailable = true;
    } catch (e) {
      // Docker not available
    }

    return {
      ...parentCaps,
      os: os.type() + " " + os.release(),
      architecture: os.arch(),
      dockerAvailable,
      dockerVersion: dockerAvailable ? `Docker Engine ${dockerVersion}` : "Docker not reachable",
    };
  }

  override async getOverview(): Promise<Overview> {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memoryPercent = Math.round((usedMem / totalMem) * 100);
    const cpuLoad = os.loadavg()[0];
    const cpuPercent = Math.min(100, Math.round((cpuLoad / os.cpus().length) * 100));

    let running = 0;
    let total = 0;
    let healthy = 0;
    let attention = 0;

    try {
      const containers = await this.docker.listContainers({ all: true });
      total = containers.length;
      for (const c of containers) {
        if (c.State === "running") running++;
        if (c.Status.includes("healthy")) healthy++;
        if (c.State === "exited" && !c.Status.includes("Exited (0)")) attention++;
      }
    } catch (e) {
      // ignore if docker is down
    }

    const hostCaps = await this.getCapabilities();

    return {
      host: {
        name: os.hostname(),
        os: hostCaps.os,
        architecture: hostCaps.architecture,
        docker: hostCaps.dockerVersion || "Unknown",
        cpuPercent,
        memoryPercent,
        memoryUsed: (usedMem / 1024 / 1024 / 1024).toFixed(1) + " GB",
        memoryTotal: (totalMem / 1024 / 1024 / 1024).toFixed(1) + " GB",
      },
      running,
      total,
      healthy,
      attention,
      lastUpdated: new Date().toISOString(),
    };
  }

  override async listServices(): Promise<Service[]> {
    try {
      const containers = await this.docker.listContainers({ all: true });
      return containers.map((c: Docker.ContainerInfo) => this.mapContainerToService(c));
    } catch (e) {
      return super.listServices();
    }
  }

  override async getService(serviceId: string): Promise<Service | undefined> {
    try {
      const container = this.docker.getContainer(serviceId);
      const data = await container.inspect();
      const c = {
        Id: data.Id,
        Names: [data.Name],
        State: data.State.Status,
        Status: data.State.Health ? data.State.Health.Status : data.State.Status,
        Image: data.Config.Image,
        Created: new Date(data.Created).getTime() / 1000,
        Ports: [], 
      };
      return this.mapContainerToService(c as any);
    } catch (e) {
      return super.getService(serviceId);
    }
  }

  override async controlService(serviceId: string, action: ServiceAction["action"]): Promise<Service> {
    try {
      const container = this.docker.getContainer(serviceId);
      if (action === "start") await container.start();
      if (action === "stop") await container.stop();
      if (action === "restart") await container.restart();
      
      const service = await this.getService(serviceId);
      if (!service) throw new Error("Service not found after action");
      return service;
    } catch (e) {
      return super.controlService(serviceId, action);
    }
  }

  override async getServiceLogs(serviceId: string): Promise<LogLine[]> {
    try {
      const container = this.docker.getContainer(serviceId);
      const logsBuffer = await container.logs({ stdout: true, stderr: true, tail: 100, timestamps: true });
      const logsString = logsBuffer.toString("utf-8");
      
      const lines = logsString.split("\n").filter(Boolean);
      return lines.map((line: string): LogLine => {
        let message = line;
        if (message.charCodeAt(0) <= 2) {
           message = message.slice(8);
        }
        const match = message.match(/^([^ ]+) (.*)$/);
        if (match) {
           return { id: Math.random().toString(), timestamp: match[1], message: match[2], stream: "stdout" };
        }
        return { id: Math.random().toString(), timestamp: new Date().toISOString(), message, stream: "stdout" };
      });
    } catch (e) {
      return super.getServiceLogs(serviceId);
    }
  }

  private mapContainerToService(c: Docker.ContainerInfo): Service {
    let status: "running" | "stopped" | "warning" | "starting" = "stopped";
    let health: "healthy" | "degraded" | "offline" | "unknown" = "unknown";
    
    if (c.State === "running") {
       status = "running";
       if (c.Status.includes("unhealthy")) {
         status = "warning";
         health = "degraded";
       } else if (c.Status.includes("healthy")) {
         health = "healthy";
       }
       if (c.Status.includes("starting")) status = "starting";
    } else {
       health = "offline";
    }

    let port = 0;
    if (c.Ports && c.Ports.length > 0) {
       const mapped = c.Ports.find((p: any) => p.PublicPort);
       if (mapped) port = mapped.PublicPort;
    }

    return {
      id: c.Id,
      name: c.Names[0].replace(/^\//, ""),
      slug: c.Names[0].replace(/^\//, ""),
      description: "Docker container: " + c.Image,
      status,
      health,
      category: "runtime",
      version: "latest",
      port,
      image: c.Image,
      uptime: c.Status,
      cpuPercent: 0,
      memory: "Unknown",
      configured: true,
      connections: 0,
      accent: "bg-blue-500"
    };
  }
}
