import { createOpencode } from "@opencode-ai/sdk";

// figure out as to why currently, we need to be signed in to opencode
// on the machine running it as well, inspite of setting up server
// with the api key auth
const opencode = await createOpencode({
  hostname: "127.0.0.1",
  port: 4096,
  config: {
    permission: {
      edit: "allow",
      bash: {
        "bun run lint": "allow",
        "bun run build": "allow",
        "*": "deny",
      },
      webfetch: "allow",
    },
  },
});

console.log(`Server running at ${opencode.server.url}`);

// opencode.server.close();
