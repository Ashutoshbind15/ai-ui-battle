import { Router } from "express";
import {
  configureSubDirectory,
  createOpencodeSession,
  prompt,
  startDevServer,
  stopDevServer,
} from "../utils";
import { client } from "../client";
import {
  createTurn,
  updateSessionStatus,
  setOpencodeSessionId,
  reservePort,
  releasePort,
  getSession,
  getRunningSessions,
  getBatchById,
} from "../data/access";

const router: Router = Router();

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
        `Failed to create opencode session: ${opencodeSession.error}`,
      );
      await releasePort(sessionId);
      return;
    }

    // Step 3: Set opencode session ID and mark session as ready
    await setOpencodeSessionId(sessionId, opencodeSession.data.id);
    await updateSessionStatus(sessionId, "ready");

    // Step 4: Create turn and start prompting
    const currentTime = new Date();
    await createTurn(sessionId, currentTime);
    await updateSessionStatus(sessionId, "prompting");

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
    await updateSessionStatus(sessionId, "failed", errorMessage);
    await releasePort(sessionId);
  }
}

// Get all running sessions (dev server running)
router.get("/sessions/running", async (req, res) => {
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
router.get("/sessions/:id", async (req, res) => {
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
router.post("/sessions/:id/run", async (req, res) => {
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
router.post("/sessions/:id/start-dev", async (req, res) => {
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
router.post("/sessions/:id/stop-dev", async (req, res) => {
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

export default router;
