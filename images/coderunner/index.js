import client, { setAuth } from "./client.js";
import { createS3Client, downloadS3Folder } from "./storage.js";
import { execSync } from "child_process";

const getModelsInfo = async (client) => {
  const models = await client.config.providers();
  return models;
};

const preDefinedTemplates = ["react-ts-vite-tailwind-v4"];

const resolveTemplateKey = (template) => {
  if (!preDefinedTemplates.includes(template)) {
    throw new Error(`Template ${template} not found`);
  }
  return template;
};

const setupTemplate = async (templateKey) => {
  const bucketName = process.env.S3_BUCKET_NAME;
  const s3Client = createS3Client();
  await downloadS3Folder(s3Client, bucketName, templateKey, "/code");

  // Install dependencies after downloading template
  console.log("Installing dependencies with pnpm...");
  execSync("pnpm install", { cwd: "/code", stdio: "inherit" });
  console.log("Dependencies installed.");

  // todo: [high], along with the templates, ensure to add an instruction
  // to follow the template coding style, and also explaining the structure
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

const tester = async () => {
  const prompt = process.env.PROMPT;
  const modelId = process.env.MODEL_ID;
  const template = process.env.TEMPLATE;

  await setAuth(client, process.env.OPENCODE_API_KEY);

  const availableModelsInfo = await getModelsInfo(client);
  const modelInfo = availableModelsInfo.data.providers[0].models[modelId];
  if (!modelInfo) {
    throw new Error(`Model ${modelId} not found`);
  }

  const templateKey = resolveTemplateKey(template);

  await setupTemplate(templateKey);

  const opencodeSession = await createOpencodeSession(client, "/code");
  if (opencodeSession.error) {
    throw new Error(
      `Failed to create opencode session: ${opencodeSession.error}`,
    );
  }

  console.log(opencodeSession);

  const opencodeSessionId = opencodeSession.data.id;
  await sendPrompt(client, opencodeSessionId, modelId, prompt, "/code");
};

tester();
