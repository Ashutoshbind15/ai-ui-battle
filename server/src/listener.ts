import { createClient } from "redis";
import {
  createTurn,
  setOpencodeSessionId,
  updateSessionStatus,
  type SessionStatus,
} from "./data/access";

const redisClient = createClient();

await redisClient.connect();

const eventTypes = [
  "opencode.session.created",
  "session.setup.started",
  "session.setup.completed",
  "session.setup.failed",
  "session.prompt.started",
  "session.prompt.completed",
  "session.prompt.failed",
  "session.dev-server.started",
  "session.dev-server.completed",
  "session.dev-server.failed",
];

type BaseSessionEvent = {
  sessionId: number;
  type: string;
};

type BaseSessionFailureEvent = BaseSessionEvent & {
  error: string;
};

const handleOpencodeSessionCreated = async (
  sessionId: number,
  opencodeSessionId: string,
) => {
  await setOpencodeSessionId(sessionId, opencodeSessionId);
};

const handleSessionStatusChange = async (
  sessionId: number,
  status: SessionStatus,
  error?: string,
) => {
  if (error) {
    await updateSessionStatus(sessionId, status, error);
  } else {
    await updateSessionStatus(sessionId, status);
  }
};

const handleTurnCreation = async (sessionId: number) => {
  await createTurn(sessionId, new Date());
};
const listener = (message: string, channel: string) => {
  // Redis pub/sub messages are received as strings, so we need to parse JSON
  const event = JSON.parse(message);
  if (!eventTypes.includes(event.type)) {
    return;
  }

  if (event.type === "opencode.session.created") {
    const sessionId = event.sessionId;
    const opencodeSessionId = event.opencodeSessionId;
    handleOpencodeSessionCreated(sessionId, opencodeSessionId);
    // commented out because as soon as this is triggered,
    // again it will go to prompting state very soon
    // handleSessionStatusChange(sessionId, "ready");
  } else if (event.type === "session.setup.started") {
    const sessionId = event.sessionId;
    handleSessionStatusChange(sessionId, "setup_pending");
  } else if (event.type === "session.setup.completed") {
    // todo: have a different status for this
    const sessionId = event.sessionId;
    // handleSessionStatusChange(sessionId, "ready");
  } else if (event.type === "session.prompt.started") {
    const sessionId = event.sessionId;
    handleTurnCreation(sessionId);
    handleSessionStatusChange(sessionId, "prompting");
  } else if (event.type === "session.prompt.completed") {
    const sessionId = event.sessionId;
    handleSessionStatusChange(sessionId, "completed");
  } else if (
    event.type === "session.prompt.failed" ||
    event.type === "session.setup.failed"
  ) {
    const sessionId = event.sessionId;
    const error = event.error;
    handleSessionStatusChange(sessionId, "failed", error);
  }

  console.log("Event:", event, "Channel:", channel);
};

redisClient.subscribe("events", listener);
