import { client, setAuth } from "./client";
import {
  createSession,
  getProviders,
  getSessionMessages,
  prompt,
} from "./utils";
const apiKey = process.env.API_KEY!;
const sessionId = process.env.SESSION_ID!;

await setAuth(client, apiKey);

// const session = await createSession(client);
// console.log(JSON.stringify(session, null, 2));

// const providers = await getProviders(client);
// console.log(JSON.stringify(providers, null, 2));

// const response = await prompt(
//   client,
//   sessionId,
//   "All fine, but i see todos update in local storage, but on refresh, lost persistance"
// );
// console.log(JSON.stringify(response, null, 2));

const messages = await getSessionMessages(client, sessionId);
console.log(JSON.stringify(messages, null, 2));
