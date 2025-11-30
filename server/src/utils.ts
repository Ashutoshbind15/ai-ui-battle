import type { OpencodeClient } from "@opencode-ai/sdk";
import fs from "fs";
import path from "path";
import { spawn, ChildProcess } from "child_process";
import {
  updateSingularTurn,
  updateDevServerStatus,
  getSession,
} from "./data/access";

// Store running dev server processes by session ID
const devServerProcesses = new Map<number, ChildProcess>();

const pwd = process.cwd();

export const createOpencodeSession = async (
  client: OpencodeClient,
  directory: string,
) => {
  const session = await client.session.create({
    body: {
      title: "Client Session",
    },
    query: {
      directory,
    },
  });

  return session;
};

export const getProviders = async (client: OpencodeClient) => {
  const providers = await client.config.providers();
  if (providers.error) {
    throw new Error(providers.error as string);
  }
  return providers.data;
};

export const prompt = async (
  client: OpencodeClient,
  opencodeSessionId: string,
  dbSessionId: number,
  prompt: string,
  modelId: string,
  providerId: string,
  finalDirPath: string,
) => {
  const response = await client.session.prompt({
    body: {
      parts: [
        {
          type: "text",
          text: prompt,
        },
      ],
      model: {
        providerID: providerId,
        modelID: modelId,
      },
    },
    path: {
      id: opencodeSessionId,
    },
    query: {
      directory: finalDirPath,
    },
  });
  if (response.error) {
    await updateSingularTurn(
      dbSessionId,
      "failed",
      response.error.data as string,
    );
    throw new Error(response.error.data as string);
  } else {
    await updateSingularTurn(dbSessionId, "completed", undefined, new Date());
  }
};

export const getSessionMessages = async (
  client: OpencodeClient,
  sessionId: string,
) => {
  const messages = await client.session.messages({
    path: {
      id: sessionId,
    },
  });
  return messages;
};

export const configureSubDirectory = async (subdirPath: string) => {
  const parentDir = path.dirname(subdirPath);
  if (parentDir && parentDir !== "." && !fs.existsSync(parentDir)) {
    fs.mkdirSync(parentDir, { recursive: true });
  }

  await execShellScript(`../starters/scripts/vite-react-ts-tw.sh`, [
    subdirPath,
  ]);
};

export const execShellScript = async (
  scriptPath: string,
  args: string[] = [],
) => {
  // Resolve the script path from the project root so callers can pass
  // either an absolute path or a path relative to the repo.
  const resolvedPath = scriptPath.startsWith("/")
    ? scriptPath
    : `${pwd}/${scriptPath}`;

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Shell script not found at path: ${resolvedPath}`);
  }

  const exitCode = await new Promise<number>((resolve, reject) => {
    const child = spawn("/usr/bin/bash", [resolvedPath, ...args], {
      cwd: pwd,
      stdio: "inherit",
    });

    child.on("close", (code) => {
      resolve(code ?? 1);
    });

    child.on("error", (err) => {
      reject(err);
    });
  });

  if (exitCode !== 0) {
    throw new Error(`Shell script exited with code ${exitCode}`);
  }

  return exitCode;
};

// ==================== DEV SERVER MANAGEMENT ====================

// Start a dev server for a session on a specific port
export const startDevServer = async (
  sessionId: number,
  directory: string,
  port: number,
): Promise<{ success: boolean; error?: string }> => {
  // Check if process already running for this session
  if (devServerProcesses.has(sessionId)) {
    return { success: true }; // Already running
  }

  if (!fs.existsSync(directory)) {
    await updateDevServerStatus(sessionId, "error");
    return { success: false, error: `Directory not found: ${directory}` };
  }

  // Mark dev server as starting NOW (when we actually start it)
  await updateDevServerStatus(sessionId, "starting");

  return new Promise((resolve) => {
    try {
      const child = spawn("pnpm", ["dev", "--port", port.toString()], {
        cwd: directory,
        stdio: ["ignore", "pipe", "pipe"],
        detached: true, // Create own process group so we can kill the whole tree
      });

      devServerProcesses.set(sessionId, child);

      // Track if we've resolved yet
      let resolved = false;

      // Listen for output to detect when server is ready
      child.stdout?.on("data", async (data) => {
        const output = data.toString();
        console.log(`[Session ${sessionId}] stdout:`, output);

        // Vite outputs "Local:" when the server is ready
        if (
          !resolved &&
          (output.includes("Local:") || output.includes("localhost"))
        ) {
          resolved = true;
          await updateDevServerStatus(sessionId, "running", child.pid);
          resolve({ success: true });
        }
      });

      child.stderr?.on("data", (data) => {
        console.error(`[Session ${sessionId}] stderr:`, data.toString());
      });

      child.on("error", async (error) => {
        console.error(`[Session ${sessionId}] Process error:`, error);
        devServerProcesses.delete(sessionId);
        await updateDevServerStatus(sessionId, "error");
        if (!resolved) {
          resolved = true;
          resolve({ success: false, error: error.message });
        }
      });

      child.on("close", async (code) => {
        console.log(`[Session ${sessionId}] Process exited with code ${code}`);
        devServerProcesses.delete(sessionId);
        // Only update to stopped if it was running, not if it errored
        const currentStatus = code === 0 ? "stopped" : "error";
        await updateDevServerStatus(sessionId, currentStatus);
      });

      // Timeout for server startup
      setTimeout(async () => {
        if (!resolved) {
          resolved = true;
          // Assume it's running even if we didn't see the magic string
          await updateDevServerStatus(sessionId, "running", child.pid);
          resolve({ success: true });
        }
      }, 10000); // 10 second timeout
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      resolve({ success: false, error: errorMessage });
    }
  });
};

// Helper to kill a process and its children by PID
const killProcessTree = async (pid: number): Promise<boolean> => {
  return new Promise((resolve) => {
    // Use pkill to kill child processes first, then kill the main process
    const pkill = spawn("pkill", ["-P", pid.toString()], {
      stdio: "ignore",
    });

    pkill.on("close", () => {
      // Now kill the main process
      try {
        process.kill(pid, "SIGTERM");
      } catch (e) {
        // Process might already be dead
      }

      // Give it a moment, then force kill
      setTimeout(() => {
        try {
          process.kill(pid, "SIGKILL");
        } catch (e) {
          // Already dead, which is fine
        }
        resolve(true);
      }, 500);
    });

    pkill.on("error", () => {
      // pkill failed, try direct kill
      try {
        process.kill(pid, "SIGKILL");
      } catch (e) {
        // Already dead
      }
      resolve(true);
    });
  });
};

// Helper to kill any process using a specific port
const killProcessOnPort = async (port: number): Promise<boolean> => {
  return new Promise((resolve) => {
    // Use fuser to find and kill processes on the port
    const fuser = spawn("fuser", ["-k", `${port}/tcp`], {
      stdio: "ignore",
    });

    fuser.on("close", (code) => {
      console.log(`[Port ${port}] fuser exited with code ${code}`);
      resolve(true);
    });

    fuser.on("error", (err) => {
      console.log(`[Port ${port}] fuser error:`, err.message);
      resolve(false);
    });

    // Timeout fallback
    setTimeout(() => resolve(true), 3000);
  });
};

// Stop a dev server for a session
export const stopDevServer = async (sessionId: number): Promise<boolean> => {
  const proc = devServerProcesses.get(sessionId);

  // First, try to get session info from DB for the PID and port
  const session = await getSession(sessionId);
  const dbPid = session?.devServerPid;
  const port = session?.port;

  // Track if we've done cleanup
  let cleanedUp = false;
  const cleanup = async () => {
    if (cleanedUp) return;
    cleanedUp = true;
    devServerProcesses.delete(sessionId);
    await updateDevServerStatus(sessionId, "stopped", null);
  };

  // Strategy 1: Kill the tracked process group if we have it
  if (proc && proc.pid) {
    console.log(
      `[Session ${sessionId}] Killing tracked process group (PID: ${proc.pid})`,
    );
    try {
      // Kill the entire process group (negative PID kills the group)
      // This works because we spawn with detached: true
      process.kill(-proc.pid, "SIGTERM");
    } catch (e) {
      console.log(
        `[Session ${sessionId}] SIGTERM to group failed, trying SIGKILL`,
      );
      try {
        process.kill(-proc.pid, "SIGKILL");
      } catch (e2) {
        // Group might already be dead
      }
    }

    // Give it a moment to die
    await new Promise((r) => setTimeout(r, 500));

    // Force kill if still alive
    try {
      process.kill(-proc.pid, "SIGKILL");
    } catch (e) {
      // Already dead, which is fine
    }
  }

  // Strategy 2: Kill by stored PID from database (for server restarts)
  if (dbPid) {
    console.log(`[Session ${sessionId}] Killing by stored PID: ${dbPid}`);
    await killProcessTree(dbPid);
  }

  // Strategy 3: ALWAYS try to kill any process on the port (safety net)
  // This ensures we clean up even if strategies 1 & 2 missed something
  if (port) {
    console.log(`[Session ${sessionId}] Killing processes on port: ${port}`);
    await killProcessOnPort(port);
  }

  await cleanup();
  return true;
};

// Check if a dev server is running for a session
export const isDevServerRunning = (sessionId: number): boolean => {
  return devServerProcesses.has(sessionId);
};

// Get all running dev server session IDs
export const getRunningDevServerSessions = (): number[] => {
  return Array.from(devServerProcesses.keys());
};
