import express from "express";
import "dotenv/config";
import {
  configureSubDirectory,
  createSession,
  getProviders,
  prompt,
} from "./utils";
import { client, setAuth } from "./client";
import cors from "cors";

const API_KEY = process.env.API_KEY!;

if (!API_KEY) {
  throw new Error("API_KEY is not set");
}

// todo: for now we setting static auth, later take in the providers, and the resp api keys while starting the container
await setAuth(client, API_KEY);

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
  const response = [];
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

  for (const modelConfig of modelConfigs) {
    const subDirectory = `${modelConfig.providerId}-${modelConfig.id}`;
    const finalDirPath = `tmp/${subDirectory}`;
    await configureSubDirectory(finalDirPath);

    const codePath = `${process.cwd()}/tmp/${subDirectory}`;
    const session = await createSession(client, codePath);
    if (session.error) {
      return res.status(500).json({
        success: false,
        error: "Failed to create session",
      });
    }

    await prompt(
      client,
      session.data.id,
      message,
      modelConfig.id,
      modelConfig.providerId,
      codePath
    );
  }

  res.json({
    success: true,
    data: "Code generated successfully",
  });
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
