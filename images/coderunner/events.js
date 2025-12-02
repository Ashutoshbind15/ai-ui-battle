import client, { setAuth } from "./client.js";

const DIRECTORY = "/code";

const listenToEvents = async () => {
  console.log(
    `[events] Subscribing to event stream for directory: ${DIRECTORY}`,
  );

  try {
    const events = await client.event.subscribe({
      query: {
        directory: DIRECTORY,
      },
    });

    console.log("[events] Connected to event stream");

    for await (const event of events.stream) {
      console.log(
        "[events] Event:",
        event.type,
        JSON.stringify(event.properties, null, 2),
      );
    }
  } catch (error) {
    console.error("[events] Error subscribing to events:", error);
    throw error;
  }
};

const main = async () => {
  const apiKey = process.env.OPENCODE_API_KEY;

  if (!apiKey) {
    console.error("[events] OPENCODE_API_KEY environment variable is required");
    process.exit(1);
  }

  await setAuth(client, apiKey);
  console.log("[events] Authentication set");

  // Keep retrying on disconnect
  while (true) {
    try {
      await listenToEvents();
    } catch (error) {
      console.error(
        "[events] Connection lost, reconnecting in 5s...",
        error.message,
      );
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
};

main();
