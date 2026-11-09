import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { db } from "./client";
import { GSI1, k, stripKeys } from "./keys";

export type SessionRecord = {
  /** Public, non-secret id used by the "sign out this device" UI. */
  sessionId: string;
  tokenHash: string;
  userId: string;
  householdId: string;
  userAgent: string;
  createdAt: string;
  lastSeenAt: string;
  /** Epoch seconds; DynamoDB deletes the item after this. */
  ttl: number;
};

export async function putSession(s: SessionRecord): Promise<void> {
  const { doc, table } = db();
  await doc.send(
    new PutCommand({
      TableName: table,
      Item: { ...k.session(s.tokenHash), ...k.sessionGsi(s.userId, s.createdAt), entity: "Session", ...s },
      ConditionExpression: "attribute_not_exists(PK)",
    }),
  );
}

export async function getSession(tokenHash: string): Promise<SessionRecord | null> {
  const { doc, table } = db();
  const res = await doc.send(new GetCommand({ TableName: table, Key: k.session(tokenHash) }));
  if (!res.Item) return null;
  return { ...(stripKeys(res.Item) as Omit<SessionRecord, "ttl">), ttl: res.Item.ttl as number };
}

export async function touchSession(tokenHash: string, lastSeenAt: string, ttl: number): Promise<void> {
  const { doc, table } = db();
  await doc.send(
    new UpdateCommand({
      TableName: table,
      Key: k.session(tokenHash),
      UpdateExpression: "SET lastSeenAt = :l, #ttl = :t",
      ConditionExpression: "attribute_exists(PK)",
      ExpressionAttributeNames: { "#ttl": "ttl" },
      ExpressionAttributeValues: { ":l": lastSeenAt, ":t": ttl },
    }),
  );
}

export async function deleteSession(tokenHash: string): Promise<void> {
  const { doc, table } = db();
  await doc.send(new DeleteCommand({ TableName: table, Key: k.session(tokenHash) }));
}

export async function listSessionsForUser(userId: string): Promise<SessionRecord[]> {
  const { doc, table } = db();
  const res = await doc.send(
    new QueryCommand({
      TableName: table,
      IndexName: GSI1,
      KeyConditionExpression: "GSI1PK = :pk AND begins_with(GSI1SK, :sk)",
      ExpressionAttributeValues: { ":pk": `USER#${userId}`, ":sk": "SESSION#" },
      ScanIndexForward: false,
    }),
  );
  const nowSec = Math.floor(Date.now() / 1000);
  // TTL deletion is lazy (up to ~48h), so hide already-expired sessions.
  return (res.Items ?? [])
    .map((i) => ({ ...(stripKeys(i) as Omit<SessionRecord, "ttl">), ttl: i.ttl as number }))
    .filter((s) => s.ttl > nowSec);
}
