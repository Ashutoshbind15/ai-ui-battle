import { integer, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const sessionStatusEnum = pgEnum("session_status", [
  "uninitialized",
  "setup_pending",
  "setup_failed",
  "ready",
  "prompting",
  "completed",
  "failed",
]);

export const devServerStatusEnum = pgEnum("dev_server_status", [
  "stopped",
  "starting",
  "running",
  "error",
]);

export const batches = pgTable("batches", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: text(),
  prompt: text(), // Store the prompt for the batch
  createdAt: timestamp().notNull().defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  batchId: integer().references(() => batches.id),
  opencodeSessionId: text(),
  directory: text().notNull(),
  modelId: text().notNull(),
  providerId: text().notNull(),
  starterTemplate: text().notNull().default("react-ts-vite-tailwind-v4"),
  status: sessionStatusEnum().notNull().default("uninitialized"),
  error: text(),
  // Port management
  port: integer(), // Assigned port for dev server (null if not assigned)
  devServerStatus: devServerStatusEnum().notNull().default("stopped"),
  devServerPid: integer(), // Process ID of the dev server (for cleanup)
});

export const turns = pgTable("turns", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  startTime: timestamp().notNull(),
  status: text("status", {
    enum: ["pending", "completed", "failed"],
  })
    .notNull()
    .default("pending"),
  error: text(),
  endTime: timestamp(),
  sessionId: integer().references(() => sessions.id),
});

export const providerConfigs = pgTable("provider_configs", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  providerId: text().notNull(),
  apiKey: text().notNull(),
  name: text(),
});

export const conversations = pgTable("conversations", {
  role: text().notNull(),
  message: text().notNull(),
  sessionId: integer().references(() => sessions.id),
  createdAt: timestamp().notNull().defaultNow(),
});
