import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { db } from "./client";
import { k } from "./keys";

export type RateLimitResult = {
  allowed: boolean;
  count: number;
  limit: number;
  /** Seconds until the current window resets. */
  retryAfter: number;
};

/**
 * Fixed-window counter: atomically increments RATE#<bucket>/WINDOW#<n> and
 * reports whether the caller is still under `limit`. Counter items expire via
 * TTL shortly after their window ends.
 */
export async function hitRateLimit(
  bucket: string,
  limit: number,
  windowSeconds: number,
  now: Date = new Date(),
): Promise<RateLimitResult> {
  const nowSec = Math.floor(now.getTime() / 1000);
  const window = Math.floor(nowSec / windowSeconds);
  const windowEnd = (window + 1) * windowSeconds;
  const { doc, table } = db();
  const res = await doc.send(
    new UpdateCommand({
      TableName: table,
      Key: k.rate(bucket, window),
      UpdateExpression: "ADD #c :one SET #ttl = if_not_exists(#ttl, :ttl), entity = :e",
      ExpressionAttributeNames: { "#c": "count", "#ttl": "ttl" },
      ExpressionAttributeValues: { ":one": 1, ":ttl": windowEnd + 3600, ":e": "RateLimit" },
      ReturnValues: "UPDATED_NEW",
    }),
  );
  const count = (res.Attributes?.count as number | undefined) ?? 1;
  return { allowed: count <= limit, count, limit, retryAfter: windowEnd - nowSec };
}
