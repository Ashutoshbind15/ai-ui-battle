import type { OpencodeClient } from "@opencode-ai/sdk";
import fs from "fs";

const pwd = process.cwd();

export const createSession = async (
  client: OpencodeClient,
  directory: string
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
  sessionId: string,
  prompt: string,
  modelId: string,
  providerId: string,
  finalDirPath: string
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
      id: sessionId,
    },
    query: {
      directory: finalDirPath,
    },
  });
  return response;
};

export const getSessionMessages = async (
  client: OpencodeClient,
  sessionId: string
) => {
  const messages = await client.session.messages({
    path: {
      id: sessionId,
    },
  });
  return messages;
};

export const configureSubDirectory = async (subdirPath: string) => {
  await execShellScript(`starters/scripts/vite-react-ts-tw.sh`, [subdirPath]);
};

export const execShellScript = async (
  scriptPath: string,
  args: string[] = []
) => {
  // Resolve the script path from the project root so callers can pass
  // either an absolute path or a path relative to the repo.
  const resolvedPath = scriptPath.startsWith("/")
    ? scriptPath
    : `${pwd}/${scriptPath}`;

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Shell script not found at path: ${resolvedPath}`);
  }

  const proc = Bun.spawn(["/usr/bin/bash", resolvedPath, ...args], {
    cwd: pwd,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });

  const exitCode = await proc.exited;

  if (exitCode !== 0) {
    throw new Error(`Shell script exited with code ${exitCode}`);
  }

  return exitCode;
};
