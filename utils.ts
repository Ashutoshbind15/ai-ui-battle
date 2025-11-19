import type { OpencodeClient } from "@opencode-ai/sdk";

const pwd = process.cwd();

export const createSession = async (client: OpencodeClient) => {
  const session = await client.session.create({
    body: {
      title: "Client Session",
    },
    query: {
      directory: `${pwd}/tmp/client`,
    },
  });

  return session;
};

export const getProviders = async (client: OpencodeClient) => {
  const providers = await client.config.providers();
  return providers;
};

export const prompt = async (
  client: OpencodeClient,
  sessionId: string,
  prompt: string
) => {
  const response = await client.session.prompt({
    body: {
      parts: [
        {
          type: "text",
          text: prompt,
        },
      ],
    },
    path: {
      id: sessionId,
    },
    query: {
      directory: `${pwd}/tmp/client`,
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
