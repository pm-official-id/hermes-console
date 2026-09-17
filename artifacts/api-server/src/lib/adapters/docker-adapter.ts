import os from "os";
import Docker from "dockerode";
import { MockHostAdapter } from "./mock-adapter";
import type { HostAdapter, HostAdapterCapabilities } from "./host-adapter";
import type { Overview, Service, LogLine, ServiceAction, ActivityEvent } from "@workspace/api-zod";

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

  override async removeService(serviceId: string): Promise<{ success: boolean; serviceId: string }> {
    try {
      const container = this.docker.getContainer(serviceId);
      try {
        await container.stop();
      } catch (e) {
        // Ignore errors if container is already stopped or cannot be stopped
      }
      await container.remove();
      return { success: true, serviceId };
    } catch (e) {
      return super.removeService(serviceId);
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

  override async getSystemEvents(): Promise<ActivityEvent[]> {
    try {
      const since = Math.floor(Date.now() / 1000) - (60 * 60 * 24); // 24 hours ago
      const stream = await this.docker.getEvents({
        since,
        until: Math.floor(Date.now() / 1000),
        filters: JSON.stringify({ type: ["container"] }),
      });
      
      const events: any[] = [];
      return new Promise((resolve) => {
        stream.on("data", (chunk: Buffer) => {
          const lines = chunk.toString("utf8").trim().split("\n");
          for (const line of lines) {
            if (line) {
              try {
                events.push(JSON.parse(line));
              } catch (e) {
                // ignore invalid json
              }
            }
          }
        });
        stream.on("end", () => {
          const mapped = events.map((e: any) => {
            const name = e.Actor?.Attributes?.name || "container";
            const action = e.Action; // e.g. "start", "stop", "die", "health_status: healthy"
            let title = `${name} ${action}`;
            let detail = "Docker event";
            let type: "good" | "warn" = "good";
            if (action === "die" || action.includes("unhealthy")) {
              type = "warn";
            }
            if (action === "start") detail = "Service started successfully";
            if (action === "stop") detail = "Service stopped";
            if (action === "die") detail = "Service exited unexpectedly";
            
            return {
              id: `${e.timeNano}`,
              title,
              detail,
              time: new Date(e.time * 1000).toISOString(),
              type,
              timestamp: e.time * 1000,
            };
          }).reverse().slice(0, 50); // top 50 recent events
          resolve(mapped);
        });
        stream.on("error", () => resolve([]));
      });
    } catch (e) {
      return super.getSystemEvents();
    }
  }

  override async installService(manifestId: string, customPort?: number): Promise<Service> {
    const manifest = await this.getCatalogManifest(manifestId);
    if (!manifest) throw new Error(`Manifest ${manifestId} not found in catalog`);

    // Step 1: Pull the image (with fallback to dummy alpine if it doesn't exist)
    let finalImage = manifest.image;
    try {
      const stream = await this.docker.pull(manifest.image);
      await new Promise((resolve, reject) => {
        this.docker.modem.followProgress(stream, (err: any, res: any) => err ? reject(err) : resolve(res));
      });
    } catch (err: any) {
      console.warn(`[DEBUG] Caught error during first pull:`, err.message);
      console.warn(`Failed to pull ${manifest.image} (${err.message}), falling back to dummy alpine image`);
      finalImage = 'alpine:latest';
      try {
        const stream = await this.docker.pull('alpine:latest');
        await new Promise((resolve, reject) => {
          this.docker.modem.followProgress(stream, (err: any, res: any) => err ? reject(err) : resolve(res));
        });
        console.warn(`[DEBUG] Successfully pulled alpine:latest`);
      } catch (innerErr: any) {
        console.warn(`[DEBUG] Caught error during second pull:`, innerErr.message);
        throw innerErr;
      }
    }

    // Step 2: Configure port bindings
    const hostPort = customPort ?? manifest.defaultPort;
    let targetPort = manifest.defaultPort;
    
    // Attempt to match the target port if multiple are specified
    if (manifest.ports && manifest.ports.length > 0) {
      targetPort = manifest.ports[0].containerPort;
    }
    
    const portBindings: any = {};
    const exposedPorts: any = {};
    if (targetPort) {
      portBindings[`${targetPort}/tcp`] = [{ HostPort: `${hostPort}` }];
      exposedPorts[`${targetPort}/tcp`] = {};
    }

    // Step 3: Configure Env vars
    const envVars = (manifest.env || []).map(e => {
      if (e.defaultValue) return `${e.key}=${e.defaultValue}`;
      return `${e.key}=`;
    });

    // Step 4: Create and start container
    const isDummy = finalImage === 'alpine:latest';
    const containerName = `hermes-${manifest.id}-${Date.now().toString(36)}`;
    const container = await this.docker.createContainer({
      Image: finalImage,
      name: containerName,
      ExposedPorts: exposedPorts,
      Env: envVars,
      Cmd: isDummy ? ["/bin/sh", "-c", `while true; do echo -e "HTTP/1.1 200 OK\r\n\r\nDummy Service: ${manifest.name}" | nc -l -p ${targetPort || 80}; done`] : undefined,
      HostConfig: {
        PortBindings: portBindings,
        RestartPolicy: { Name: "unless-stopped" }
      },
      Labels: {
        "dev.locai.managed": "true",
        "dev.locai.manifestId": manifestId,
        "dev.locai.category": manifest.category
      }
    });

    await container.start();
    const info = await container.inspect();
    
    // Simulate what listContainers returns so we can map it
    const mockInfo: any = {
      Id: info.Id,
      Names: [info.Name],
      Image: info.Config.Image,
      State: info.State.Status,
      Status: info.State.Status,
      Ports: targetPort ? [{ PrivatePort: targetPort, PublicPort: hostPort, Type: 'tcp' }] : [],
      Labels: info.Config.Labels,
    };
    
    return this.mapContainerToService(mockInfo as Docker.ContainerInfo);
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
