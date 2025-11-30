import express from "express";
import "dotenv/config";
import {
  configureSubDirectory,
  createOpencodeSession,
  getProviders,
  prompt,
  startDevServer,
  stopDevServer,
} from "./utils";
import { client, setAuth } from "./client";
import cors from "cors";
import {
  createBatch,
  createSession,
  createTurn,
  updateSessionStatus,
  getAvailablePorts,
  getUsedPorts,
  reservePort,
  releasePort,
  getSession,
  getRunningSessions,
  getAllBatches,
  getBatchById,
} from "./data/access";

const OPENCODE_API_KEY = process.env.OPENCODE_API_KEY!;

if (!OPENCODE_API_KEY) {
  throw new Error("OPENCODE_API_KEY is not set");
}

// todo: for now we setting static auth, later take in the providers, and the resp api keys while starting the container
await setAuth(client, OPENCODE_API_KEY);

const app = express();
app.use(express.json());
app.use(cors());

app.get("/", (req, res) => {
  res.send("Hello World");
});

const presetMessages = ["Create a simple todo app"];

app.get("/modelconfigs", async (req, res) => {
  const providersData = await getProviders(client);
  if (!providersData) {
    return res
      .status(500)
      .json({ success: false, error: "Failed to get providers" });
  }
  const response: {
    id: string;
    modelName: string;
    providerId: string;
    providerName: string;
  }[] = [];
  const providers = providersData.providers;
  for (const provider of providers) {
    const providerId = provider.id;
    const providerName = provider.name;
    const models = Object.values(provider.models);
    for (const model of models) {
      response.push({
        id: model.id,
        modelName: model.name,
        providerId,
        providerName,
      });
    }
  }
  res.json({
    success: true,
    data: response,
  });
});

// ==================== PORT MANAGEMENT ====================

// Get available ports
app.get("/ports/available", async (req, res) => {
  try {
    const available = await getAvailablePorts();
    const used = await getUsedPorts();
    res.json({
      success: true,
      data: {
        available,
        used,
        total: available.length + used.length,
      },
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ success: false, error: errorMessage });
  }
});

// ==================== BATCH MANAGEMENT ====================

// Create a batch with sessions (without running the prompt yet)
app.post("/batches", async (req, res) => {
  const { modelConfigs, prompt: batchPrompt } = req.body;
  if (
    !modelConfigs ||
    !Array.isArray(modelConfigs) ||
    modelConfigs.length === 0
  ) {
    return res.status(400).json({
      success: false,
      error: "modelConfigs is required and must be a non-empty array",
    });
  }

  try {
    // Create batch with the prompt
    const batchId = await createBatch(modelConfigs, batchPrompt);

    // Create all sessions upfront in setup_pending state
    const sessionInfos: {
      sessionId: number;
      modelConfig: { providerId: string; id: string };
      directory: string;
    }[] = [];

    for (const modelConfig of modelConfigs) {
      const subDirectory = `${modelConfig.providerId}-${modelConfig.id}`;
      const directory = `${process.cwd()}/tmp/${subDirectory}`;

      const session = await createSession(
        modelConfig.providerId,
        modelConfig.id,
        batchId,
        directory,
      );

      sessionInfos.push({
        sessionId: session.id,
        modelConfig,
        directory,
      });
    }

    res.json({
      success: true,
      data: {
        batchId,
        sessions: sessionInfos.map((s) => ({
          id: s.sessionId,
          modelConfig: s.modelConfig,
          directory: s.directory,
          status: "uninitialized",
          devServerStatus: "stopped",
        })),
      },
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Failed to create batch:", errorMessage);
    res.status(500).json({ success: false, error: errorMessage });
  }
});

// Get all batches
app.get("/batches", async (req, res) => {
  try {
    const batchList = await getAllBatches();
    res.json({
      success: true,
      data: batchList,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ success: false, error: errorMessage });
  }
});

// Get a specific batch by ID
app.get("/batches/:id", async (req, res) => {
  const batchId = parseInt(req.params.id);
  if (isNaN(batchId)) {
    return res.status(400).json({ success: false, error: "Invalid batch ID" });
  }

  try {
    const batch = await getBatchById(batchId);
    if (!batch) {
      return res.status(404).json({ success: false, error: "Batch not found" });
    }
    res.json({
      success: true,
      data: batch,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ success: false, error: errorMessage });
  }
});

// ==================== SESSION MANAGEMENT ====================

// Get all running sessions (dev server running)
app.get("/sessions/running", async (req, res) => {
  try {
    const running = await getRunningSessions();
    res.json({
      success: true,
      data: running,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ success: false, error: errorMessage });
  }
});

// Get a specific session by ID
app.get("/sessions/:id", async (req, res) => {
  const sessionId = parseInt(req.params.id);
  if (isNaN(sessionId)) {
    return res
      .status(400)
      .json({ success: false, error: "Invalid session ID" });
  }

  try {
    const session = await getSession(sessionId);
    if (!session) {
      return res
        .status(404)
        .json({ success: false, error: "Session not found" });
    }
    res.json({
      success: true,
      data: session,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ success: false, error: errorMessage });
  }
});

// Run a session: setup directory, reserve port, run prompt, start dev server
app.post("/sessions/:id/run", async (req, res) => {
  const sessionId = parseInt(req.params.id);
  if (isNaN(sessionId)) {
    return res
      .status(400)
      .json({ success: false, error: "Invalid session ID" });
  }

  const { message } = req.body;

  try {
    const session = await getSession(sessionId);
    if (!session) {
      return res
        .status(404)
        .json({ success: false, error: "Session not found" });
    }

    // Check if session is already running
    if (
      session.devServerStatus === "running" ||
      session.devServerStatus === "starting"
    ) {
      return res.status(400).json({
        success: false,
        error: "Session dev server is already running or starting",
      });
    }

    // Get the batch to retrieve the prompt if not provided
    const batch = session.batchId ? await getBatchById(session.batchId) : null;
    const promptMessage = message || batch?.prompt;

    if (!promptMessage) {
      return res.status(400).json({
        success: false,
        error: "No message provided and batch has no stored prompt",
      });
    }

    // Reserve a port
    const port = await reservePort(sessionId);
    if (!port) {
      return res.status(503).json({
        success: false,
        error: "No available ports",
      });
    }

    // Return immediately with port info
    res.json({
      success: true,
      data: {
        sessionId,
        port,
        status: "starting",
        message: "Session setup started",
      },
    });

    // Run the session asynchronously
    runAgentSessionWithDevServer(
      sessionId,
      { providerId: session.providerId, id: session.modelId },
      promptMessage,
      session.directory,
      port,
    ).catch((e) => {
      console.error(`Unexpected error in session ${sessionId}:`, e);
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ success: false, error: errorMessage });
  }
});

// Start dev server for a session (if already setup)
app.post("/sessions/:id/start-dev", async (req, res) => {
  const sessionId = parseInt(req.params.id);
  if (isNaN(sessionId)) {
    return res
      .status(400)
      .json({ success: false, error: "Invalid session ID" });
  }

  try {
    const session = await getSession(sessionId);
    if (!session) {
      return res
        .status(404)
        .json({ success: false, error: "Session not found" });
    }

    // Check if session is already running
    if (
      session.devServerStatus === "running" ||
      session.devServerStatus === "starting"
    ) {
      return res.json({
        success: true,
        data: {
          sessionId,
          port: session.port,
          status: session.devServerStatus,
        },
      });
    }

    // Reserve a port
    const port = await reservePort(sessionId);
    if (!port) {
      return res.status(503).json({
        success: false,
        error: "No available ports",
      });
    }

    // Start the dev server
    const result = await startDevServer(sessionId, session.directory, port);
    if (!result.success) {
      await releasePort(sessionId);
      return res.status(500).json({
        success: false,
        error: result.error || "Failed to start dev server",
      });
    }

    res.json({
      success: true,
      data: {
        sessionId,
        port,
        status: "running",
      },
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ success: false, error: errorMessage });
  }
});

// Stop dev server for a session
app.post("/sessions/:id/stop-dev", async (req, res) => {
  const sessionId = parseInt(req.params.id);
  if (isNaN(sessionId)) {
    return res
      .status(400)
      .json({ success: false, error: "Invalid session ID" });
  }

  try {
    const session = await getSession(sessionId);
    if (!session) {
      return res
        .status(404)
        .json({ success: false, error: "Session not found" });
    }

    await stopDevServer(sessionId);
    await releasePort(sessionId);

    res.json({
      success: true,
      data: {
        sessionId,
        status: "stopped",
      },
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ success: false, error: errorMessage });
  }
});

/**
 * Runs the full lifecycle for a single agent session with dev server:
 * 1. Setup directory (async, can be slow)
 * 2. Create opencode session
 * 3. Update DB session to ready
 * 4. Create turn and run prompt
 * 5. Start dev server
 *
 * Handles failures at each stage and updates DB accordingly.
 */
async function runAgentSessionWithDevServer(
  sessionId: number,
  modelConfig: { providerId: string; id: string },
  message: string,
  codePath: string,
  port: number,
) {
  try {
    // Get the subdirectory name from codePath
    const subDirectory = codePath.split("/tmp/")[1];

    // Step 1: Setup directory (this can be slow)
    await configureSubDirectory(`tmp/${subDirectory}`);

    // Step 2: Create opencode session
    const opencodeSession = await createOpencodeSession(client, codePath);
    if (opencodeSession.error) {
      await updateSessionStatus(
        sessionId,
        "setup_failed",
        undefined,
        `Failed to create opencode session: ${opencodeSession.error}`,
      );
      await releasePort(sessionId);
      return;
    }

    // Step 3: Mark session as ready with opencode session ID
    await updateSessionStatus(sessionId, "ready", opencodeSession.data.id);

    // Step 4: Create turn and start prompting
    const currentTime = new Date();
    await createTurn(sessionId, currentTime);
    await updateSessionStatus(sessionId, "prompting", opencodeSession.data.id);

    // Step 5: Run the prompt
    await prompt(
      client,
      opencodeSession.data.id,
      sessionId,
      message,
      modelConfig.id,
      modelConfig.providerId,
      codePath,
    );

    // Step 6: Mark session as completed
    await updateSessionStatus(sessionId, "completed");

    // Step 7: Start dev server
    const devServerResult = await startDevServer(sessionId, codePath, port);
    if (!devServerResult.success) {
      console.error(
        `Failed to start dev server for session ${sessionId}:`,
        devServerResult.error,
      );
      // Dev server status is already set to "error" in startDevServer
      // Release the port since the dev server isn't using it
      await releasePort(sessionId);
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error(`Session ${sessionId} failed:`, errorMessage);

    // Update session to failed state and release port
    await updateSessionStatus(sessionId, "failed", undefined, errorMessage);
    await releasePort(sessionId);
  }
}

/**
 * Runs the full lifecycle for a single agent session (without dev server):
 */
async function runAgentSession(
  sessionId: number,
  modelConfig: { providerId: string; id: string },
  message: string,
  codePath: string,
  subDirectory: string,
) {
  try {
    // Step 1: Setup directory (this can be slow)
    await configureSubDirectory(`tmp/${subDirectory}`);

    // Step 2: Create opencode session
    const opencodeSession = await createOpencodeSession(client, codePath);
    if (opencodeSession.error) {
      await updateSessionStatus(
        sessionId,
        "setup_failed",
        undefined,
        `Failed to create opencode session: ${opencodeSession.error}`,
      );
      return;
    }

    // Step 3: Mark session as ready with opencode session ID
    await updateSessionStatus(sessionId, "ready", opencodeSession.data.id);

    // Step 4: Create turn and start prompting
    const currentTime = new Date();
    await createTurn(sessionId, currentTime);
    await updateSessionStatus(sessionId, "prompting", opencodeSession.data.id);

    // Step 5: Run the prompt
    await prompt(
      client,
      opencodeSession.data.id,
      sessionId,
      message,
      modelConfig.id,
      modelConfig.providerId,
      codePath,
    );

    // Step 6: Mark session as completed
    await updateSessionStatus(sessionId, "completed");
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error(`Session ${sessionId} failed:`, errorMessage);

    // Update session to failed state
    await updateSessionStatus(sessionId, "failed", undefined, errorMessage);
  }
}

app.post("/runagents", async (req, res) => {
  const { modelConfigs, message } = req.body;
  if (!modelConfigs || !message) {
    return res.status(400).json({
      success: false,
      error: "modelConfigs and message are required",
    });
  }

  try {
    // Create batch first
    const batchId = await createBatch(modelConfigs);

    // Create all sessions upfront in setup_pending state
    const sessionInfos: {
      sessionId: number;
      modelConfig: { providerId: string; id: string };
      codePath: string;
      subDirectory: string;
    }[] = [];

    for (const modelConfig of modelConfigs) {
      const subDirectory = `${modelConfig.providerId}-${modelConfig.id}`;
      const codePath = `${process.cwd()}/tmp/${subDirectory}`;

      const session = await createSession(
        modelConfig.providerId,
        modelConfig.id,
        batchId,
        codePath,
      );

      sessionInfos.push({
        sessionId: session.id,
        modelConfig,
        codePath,
        subDirectory,
      });
    }

    // Return immediately with batch and session info
    res.json({
      success: true,
      data: {
        batchId,
        sessions: sessionInfos.map((s) => ({
          sessionId: s.sessionId,
          modelConfig: s.modelConfig,
          status: "setup_pending",
        })),
      },
    });

    // Run all agent sessions in parallel (non-blocking)
    for (const info of sessionInfos) {
      runAgentSession(
        info.sessionId,
        info.modelConfig,
        message,
        info.codePath,
        info.subDirectory,
      ).catch((e) => {
        // This shouldn't happen as runAgentSession handles its own errors
        console.error(`Unexpected error in session ${info.sessionId}:`, e);
      });
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Failed to initialize batch:", errorMessage);
    return res.status(500).json({
      success: false,
      error: `Failed to initialize batch: ${errorMessage}`,
    });
  }
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
