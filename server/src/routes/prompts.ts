import { Router } from "express";
import {
  getAllPrompts,
  createPrompt,
  updatePrompt,
  deletePrompt,
} from "../data/access";

const router: Router = Router();

// Get all prompts
router.get("/prompts", async (req, res) => {
  try {
    const promptList = await getAllPrompts();
    res.json({
      success: true,
      data: promptList,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ success: false, error: errorMessage });
  }
});

// Create a new prompt
router.post("/prompts", async (req, res) => {
  const { title, description, isDefault } = req.body;

  if (!title || typeof title !== "string" || !title.trim()) {
    return res.status(400).json({ success: false, error: "Title is required" });
  }

  if (!description || typeof description !== "string" || !description.trim()) {
    return res
      .status(400)
      .json({ success: false, error: "Description is required" });
  }

  try {
    const prompt = await createPrompt(
      title.trim(),
      description.trim(),
      isDefault ?? false,
    );
    res.status(201).json({
      success: true,
      data: prompt,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ success: false, error: errorMessage });
  }
});

// Update an existing prompt
router.put("/prompts/:id", async (req, res) => {
  const promptId = parseInt(req.params.id);
  if (isNaN(promptId)) {
    return res.status(400).json({ success: false, error: "Invalid prompt ID" });
  }

  const { title, description } = req.body;

  if (!title || typeof title !== "string" || !title.trim()) {
    return res.status(400).json({ success: false, error: "Title is required" });
  }

  if (!description || typeof description !== "string" || !description.trim()) {
    return res
      .status(400)
      .json({ success: false, error: "Description is required" });
  }

  try {
    const prompt = await updatePrompt(
      promptId,
      title.trim(),
      description.trim(),
    );
    res.json({
      success: true,
      data: prompt,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ success: false, error: errorMessage });
  }
});

// Delete a prompt
router.delete("/prompts/:id", async (req, res) => {
  const promptId = parseInt(req.params.id);
  if (isNaN(promptId)) {
    return res.status(400).json({ success: false, error: "Invalid prompt ID" });
  }

  try {
    await deletePrompt(promptId);
    res.json({
      success: true,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ success: false, error: errorMessage });
  }
});

export default router;
