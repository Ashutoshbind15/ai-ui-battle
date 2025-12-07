import fs from "fs";
import { redisClient } from "./async.js";

const CODE_DIR = "/code";

const publishEvent = async (event) => {
  await redisClient.publish("events", JSON.stringify(event));
};

const getModelsInfo = async (client) => {
  const models = await client.config.providers();
  return models;
};

const createOpencodeSession = async (client, directory) => {
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

const sendPrompt = async (client, sessionId, modelId, prompt, directory) => {
  await client.session.prompt({
    body: {
      parts: [
        {
          type: "text",
          text: prompt,
        },
      ],
      model: {
        // support other providers later
        providerID: "opencode",
        modelID: modelId,
      },
    },
    path: {
      id: sessionId,
    },
    query: {
      directory,
    },
  });
};

export const createOpencodeSessionAndPublishEvent = async (
  client,
  sessionId,
  modelId,
) => {
  const availableModelsInfo = await getModelsInfo(client);
  const modelInfo = availableModelsInfo.data.providers[0].models[modelId];
  if (!modelInfo) {
    throw new Error(`Model ${modelId} not found`);
  }

  const opencodeSession = await createOpencodeSession(client, CODE_DIR);
  if (opencodeSession.error) {
    throw new Error(
      `Failed to create opencode session: ${opencodeSession.error}`,
    );
  }

  const opencodeSessionId = opencodeSession.data.id;

  // Publish opencode.session.created event
  await publishEvent({
    sessionId,
    opencodeSessionId,
    type: "opencode.session.created",
  });

  return { opencodeSessionId };
};

export const runPrompt = async (client, prompt, modelId, opencodeSessionId) => {
  await sendPrompt(client, opencodeSessionId, modelId, prompt, CODE_DIR);
};

export const doesDirectoryExist = (directory) => {
  return fs.existsSync(directory);
};
