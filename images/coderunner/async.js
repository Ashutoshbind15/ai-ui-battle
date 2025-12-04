import { createClient } from "redis";

export const redisClient = createClient({
  url: process.env.REDIS_URL || "redis://redis:6379",
});

export const connectRedis = async (client) => {
  await client.connect();
};

export const createDuplicateClient = (client) => {
  return client.duplicate();
};
