import express from "express";
import { connectRedis, redisClient } from "./async.js";
import { setup } from "./setup.js";
import { runPrompt, doesDirectoryExist } from "./prompt.js";
import { client as opencodeClient, setAuth } from "./client.js";

const app = express();
app.use(express.json());

await connectRedis(redisClient);
await setAuth(opencodeClient, process.env.OPENCODE_API_KEY);

const CODE_DIR = "/code";

const publishEvent = async (event) => {
  await redisClient.publish("events", JSON.stringify(event));
};

app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
  });
});

app.post("/setup", async (req, res) => {
  const { template, sessionId } = req.body;

  if (!template) {
    return res
      .status(400)
      .json({ success: false, error: "template is required" });
  }

  // Respond immediately, process async
  res.json({
    success: true,
    message: "Setup started",
  });

  const eventBody = {
    sessionId,
    type: "setup",
    status: "started",
  };

  try {
    await publishEvent(eventBody);
    await setup(template);
    eventBody.status = "completed";
    await publishEvent(eventBody);
  } catch (error) {
    eventBody.status = "failed";
    eventBody.error = error.message;
    await publishEvent(eventBody);
    console.error("[setup] Error:", error);
  }
});

app.post("/execute", async (req, res) => {
  const codeDirExists = doesDirectoryExist(CODE_DIR);
  if (!codeDirExists) {
    return res.status(400).json({
      success: false,
      error: "Code directory does not exist. Run /setup first.",
    });
  }

  const { prompt, modelId, sessionId } = req.body;

  if (!prompt || !modelId) {
    return res.status(400).json({
      success: false,
      error: "prompt and modelId are required",
    });
  }

  // Respond immediately, process async
  res.json({
    success: true,
    message: "Execution started",
  });

  const eventBody = {
    sessionId,
    type: "execute",
    status: "started",
  };

  try {
    await publishEvent(eventBody);
    await runPrompt(opencodeClient, prompt, modelId);
    eventBody.status = "completed";
    await publishEvent(eventBody);
  } catch (error) {
    eventBody.status = "failed";
    eventBody.error = error.message;
    await publishEvent(eventBody);
    console.error("[execute] Error:", error);
  }
});

app.listen(3000, () => {
  console.log(`[server] Running on port 3000 inside container`);
});
