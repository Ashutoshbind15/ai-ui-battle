import express from "express";
import "dotenv/config";
import {
  configureSubDirectory,
  createOpencodeSession,
  getProviders,
  prompt,
} from "./utils";
import { client, setAuth } from "./client";
import cors from "cors";
import { createBatch, createSession, createTurn } from "./data/access";

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

app.post("/runagents", async (req, res) => {
  const { modelConfigs, message } = req.body;
  if (!modelConfigs || !message) {
    return res.status(400).json({
      success: false,
      error: "modelConfigs and message are required",
    });
  }

  const batchId = await createBatch(modelConfigs);

  for (const modelConfig of modelConfigs) {
    const subDirectory = `${modelConfig.providerId}-${modelConfig.id}`;
    const finalDirPath = `tmp/${subDirectory}`;
    await configureSubDirectory(finalDirPath);

    const codePath = `${process.cwd()}/tmp/${subDirectory}`;
    const currentTime = new Date();
    const opencodeSession = await createOpencodeSession(client, codePath);
    if (opencodeSession.error) {
      return res.status(500).json({
        success: false,
        error: "Failed to create session",
      });
    }

    const session = await createSession(
      modelConfig.providerId,
      modelConfig.id,
      batchId,
      opencodeSession.data.id,
      codePath,
    );

    await createTurn(session.id, currentTime);

    prompt(
      client,
      opencodeSession.data.id,
      session.id,
      message,
      modelConfig.id,
      modelConfig.providerId,
      codePath,
    ).catch((e) => {
      console.error(e);
    });
  }

  res.json({
    success: true,
    data: "Code generated successfully",
  });
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
