import { Router } from "express";
import {
  createBatch,
  createSession,
  getAllBatches,
  getBatchById,
} from "../data/access";

const router: Router = Router();

// Convert batch name to filesystem-safe slug
const slugify = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-") // Replace spaces with dashes
    .replace(/[^a-z0-9-]/g, ""); // Remove non-alphanumeric chars except dashes
};

// Create a batch with sessions (without running the prompt yet)
router.post("/batches", async (req, res) => {
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
    const batch = await createBatch(modelConfigs, batchPrompt);
    const batchSlug = slugify(batch.name || `batch-${batch.id}`);

    // Create all sessions upfront in setup_pending state
    const sessionInfos: {
      sessionId: number;
      modelConfig: { providerId: string; id: string };
      directory: string;
    }[] = [];

    for (const modelConfig of modelConfigs) {
      const subDirectory = `${batchSlug}/${modelConfig.providerId}-${modelConfig.id}`;
      const directory = `${process.cwd()}/tmp/${subDirectory}`;

      const session = await createSession(
        modelConfig.providerId,
        modelConfig.id,
        batch.id,
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
        batchId: batch.id,
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
router.get("/batches", async (req, res) => {
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
router.get("/batches/:id", async (req, res) => {
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

export default router;
