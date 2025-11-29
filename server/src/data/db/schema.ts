import { integer, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const batches = pgTable("batches", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: text(),
});

export const sessions = pgTable("sessions", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  batchId: integer().references(() => batches.id),
  opencodeSessionId: text().notNull(),
  directory: text().notNull(),
  modelId: text().notNull(),
  providerId: text().notNull(),
  starterTemplate: text().notNull().default("react-ts-vite-tailwind-v4"),
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
