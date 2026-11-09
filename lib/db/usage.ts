import { PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { randomBytes } from "node:crypto";
import { db } from "./client";
import { householdPk, k } from "./keys";

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

export type UsageSummary = {
  calls: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
};

/** Sums AI usage for a household since `sinceIso` (e.g. start of month). */
export async function summarizeUsage(householdId: string, sinceIso: string): Promise<UsageSummary> {
  const { doc, table } = db();
  const sum: UsageSummary = { calls: 0, inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 };
  let ExclusiveStartKey: Record<string, unknown> | undefined;
  do {
    const res = await doc.send(
      new QueryCommand({
        TableName: table,
        KeyConditionExpression: "PK = :pk AND SK >= :from",
        ExpressionAttributeValues: { ":pk": householdPk(householdId), ":from": `USAGE#${sinceIso}` },
        ExclusiveStartKey,
      }),
    );
    for (const i of res.Items ?? []) {
      if (!String(i.SK).startsWith("USAGE#")) continue;
      sum.calls += 1;
      sum.inputTokens += Number(i.inputTokens ?? 0);
      sum.outputTokens += Number(i.outputTokens ?? 0);
      sum.cacheReadTokens += Number(i.cacheReadTokens ?? 0);
      sum.cacheWriteTokens += Number(i.cacheWriteTokens ?? 0);
    }
    ExclusiveStartKey = res.LastEvaluatedKey;
  } while (ExclusiveStartKey);
  return sum;
}
