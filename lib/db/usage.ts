import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { randomBytes } from "node:crypto";
import { db } from "./client";
import { k } from "./keys";

export type UsageRecord = {
  householdId: string;
  userId: string;
  model: string;
  source: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  durationMs: number;
  ok: boolean;
};

const NINETY_DAYS = 90 * 24 * 3600;

export async function logUsage(u: UsageRecord): Promise<void> {
  const iso = new Date().toISOString();
  const { doc, table } = db();
  await doc.send(
    new PutCommand({
      TableName: table,
      Item: {
        ...k.usage(u.householdId, iso, randomBytes(3).toString("hex")),
        entity: "Usage",
        at: iso,
        ...u,
        ttl: Math.floor(Date.now() / 1000) + NINETY_DAYS,
      },
    }),
  );
}
