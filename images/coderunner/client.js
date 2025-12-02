import { createOpencodeClient } from "@opencode-ai/sdk";

const client = createOpencodeClient({
  baseUrl: "http://localhost:4096",
});

export const setAuth = async (client, apiKey) => {
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
export default client;
