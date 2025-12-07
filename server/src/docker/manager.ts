import docker from "dockerode";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { db } from "../data/db";
import { containerMetadata } from "../data/db/schema";

const dockerClient = new docker();

// Get project root directory (server/ -> project root)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "../../..");

const SERVER_PORT_RANGE = [3005, 3025];
const CLIENT_PORT_RANGE = [5173, 5183];

export const getContainerPorts = async (containerId: string) => {
  const containers = await dockerClient.listContainers({
    filters: {
      id: [containerId],
    },
  });

  if (containers.length === 0) return null;

  const container = containers[0];

  const hostPorts = container?.Ports
    ? [
        ...new Set(
          container.Ports.map((port) => port.PublicPort).filter(Boolean),
        ),
      ]
    : [];

  return hostPorts;
};

export const getContainerStatus = async (containerId: string) => {
  const container = dockerClient.getContainer(containerId);
  const containerInfo = await container.inspect();
  return containerInfo.State;
};

export const extractServerPort = (ports: number[]) => {
  const serverPort = ports.find((port) => SERVER_PORT_RANGE.includes(port));
  return serverPort;
};

export const extractClientPort = (ports: number[]) => {
  const clientPort = ports.find((port) => CLIENT_PORT_RANGE.includes(port));
  return clientPort;
};

export const getAvailablePorts = async () => {
  const containers = await dockerClient.listContainers({
    filters: {
      ancestor: ["ai-ui-battle-coderunner"],
    },
    all: true,
  });

  const clientPorts: Set<string> = new Set();
  const serverPorts: Set<string> = new Set();

  for (const container of containers) {
    const containerId = container.Id;
    const containerRef = await dockerClient.getContainer(containerId);
    const containerMeta = await containerRef.inspect();
    const portBindings = containerMeta.HostConfig.PortBindings;

    if (portBindings && typeof portBindings === "object") {
      for (const [containerPort, bindings] of Object.entries(portBindings)) {
        if (bindings && Array.isArray(bindings) && bindings.length > 0) {
          for (const binding of bindings) {
            if (binding && binding.HostPort) {
              const hostPort = parseInt(binding.HostPort, 10);

              if (!isNaN(hostPort)) {
                // Check if port is in server range (3005-3025)
                const serverStart = SERVER_PORT_RANGE[0];
                const serverEnd = SERVER_PORT_RANGE[1];
                if (serverStart !== undefined && serverEnd !== undefined) {
                  if (hostPort >= serverStart && hostPort <= serverEnd) {
                    serverPorts.add(binding.HostPort);
                  }
                }

                // Check if port is in client range (5173-5183)
                const clientStart = CLIENT_PORT_RANGE[0];
                const clientEnd = CLIENT_PORT_RANGE[1];
                if (clientStart !== undefined && clientEnd !== undefined) {
                  if (hostPort >= clientStart && hostPort <= clientEnd) {
                    clientPorts.add(binding.HostPort);
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  return {
    clientPorts: Array.from(clientPorts),
    serverPorts: Array.from(serverPorts),
  };
};

const readEnvFile = (): Record<string, string> => {
  const envPath = path.join(PROJECT_ROOT, ".env");
  const envVars: Record<string, string> = {};

  if (!fs.existsSync(envPath)) {
    console.warn(`.env file not found at ${envPath}`);
    return envVars;
  }

  const envContent = fs.readFileSync(envPath, "utf-8");
  const lines = envContent.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const equalIndex = trimmed.indexOf("=");
    if (equalIndex === -1) {
      continue;
    }

    const key = trimmed.substring(0, equalIndex).trim();
    const value = trimmed.substring(equalIndex + 1).trim();

    // Remove quotes if present
    const unquotedValue = value.replace(/^["']|["']$/g, "");

    if (key) {
      envVars[key] = unquotedValue;
    }
  }

  return envVars;
};

const calculateAvailablePorts = (
  usedClientPorts: string[],
  usedServerPorts: string[],
): { clientPort: number | null; serverPort: number | null } => {
  const usedClientSet = new Set(usedClientPorts.map((p) => parseInt(p, 10)));
  const usedServerSet = new Set(usedServerPorts.map((p) => parseInt(p, 10)));

  // Find first available client port
  let clientPort: number | null = null;
  for (
    let port = CLIENT_PORT_RANGE[0]!;
    port <= CLIENT_PORT_RANGE[1]!;
    port++
  ) {
    if (!usedClientSet.has(port)) {
      clientPort = port;
      break;
    }
  }

  // Find first available server port
  let serverPort: number | null = null;
  for (
    let port = SERVER_PORT_RANGE[0]!;
    port <= SERVER_PORT_RANGE[1]!;
    port++
  ) {
    if (!usedServerSet.has(port)) {
      serverPort = port;
      break;
    }
  }

  return { clientPort, serverPort };
};

export const createContainer = async (sessionId: number) => {
  const { clientPorts: usedClientPorts, serverPorts: usedServerPorts } =
    await getAvailablePorts();

  const { clientPort, serverPort } = calculateAvailablePorts(
    usedClientPorts,
    usedServerPorts,
  );

  if (!clientPort || !serverPort) {
    return null;
  }

  // Read environment variables from .env file
  const envVars = readEnvFile();

  // Build environment array for container
  const envArray = Object.entries(envVars).map(
    ([key, value]) => `${key}=${value}`,
  );

  // Create container with port bindings
  const container = await dockerClient.createContainer({
    Image: "ai-ui-battle-coderunner",
    Env: envArray,
    HostConfig: {
      PortBindings: {
        "3000/tcp": [
          {
            HostPort: `${serverPort}`,
          },
        ],
        "5173/tcp": [
          {
            HostPort: `${clientPort}`,
          },
        ],
      },
    },
    ExposedPorts: {
      "3000/tcp": {},
      "5173/tcp": {},
    },
  });

  await db.insert(containerMetadata).values({
    sessionId,
    containerId: container.id,
  });

  // Start container asynchronously and create DB row on completion
  container
    .start()
    .then(async () => {
      // Create DB row for container metadata after container starts successfully
      console.log(`Container ${container.id} started successfully`);
    })
    .catch((error) => {
      console.error(
        `Failed to start container for session ${sessionId}:`,
        error,
      );
    });

  return {
    containerId: container.id,
    clientPort,
    serverPort,
  };
};
