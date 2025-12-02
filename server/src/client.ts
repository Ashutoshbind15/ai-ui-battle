import { createOpencodeClient, type OpencodeClient } from "@opencode-ai/sdk";

export const client = createOpencodeClient({
  baseUrl: "http://localhost:4096",
});

export const setAuth = async (client: OpencodeClient, apiKey: string) => {
  await client.auth.set({
    path: {
      id: "opencode",
    },
    body: {
      type: "api",
      key: apiKey,
    },
  });
  await client.auth.set({
    path: {
      id: "zen",
    },
    body: {
      type: "api",
      key: apiKey,
    },
  });
};
