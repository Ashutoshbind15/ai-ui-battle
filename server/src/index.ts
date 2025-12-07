import express from "express";
import "dotenv/config";
import { client, setAuth } from "./client";
import cors from "cors";
import infoRoutes from "./routes/info";
import batchesRoutes from "./routes/batches";
import sessionsRoutes from "./routes/sessions";
import promptsRoutes from "./routes/prompts";

const OPENCODE_API_KEY = process.env.OPENCODE_API_KEY!;

if (!OPENCODE_API_KEY) {
  throw new Error("OPENCODE_API_KEY is not set");
}

// todo: for now we setting static auth, later take in the providers, and the resp api keys while starting the container
await setAuth(client, OPENCODE_API_KEY);

const app = express();
app.use(express.json());
app.use(cors());

app.get("/", (req, res) => {
  res.send("Hello World");
});

app.use("/", infoRoutes);
app.use("/", batchesRoutes);
app.use("/", sessionsRoutes);
app.use("/", promptsRoutes);

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
