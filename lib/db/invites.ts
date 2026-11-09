import { DeleteCommand, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { db } from "./client";
import { k } from "./keys";

export type InviteRecord = {
  codeHash: string;
  householdId: string;
  createdBy: string;
  createdAt: string;
  expiresAt: string;
  ttl: number;
};

export async function putInvite(invite: InviteRecord): Promise<void> {
  const { doc, table } = db();
  await doc.send(
    new PutCommand({
      TableName: table,
      Item: { ...k.invite(invite.codeHash), entity: "Invite", ...invite },
      ConditionExpression: "attribute_not_exists(PK)",
    }),
  );
}

export async function getInvite(codeHash: string): Promise<InviteRecord | null> {
  const { doc, table } = db();
  const res = await doc.send(new GetCommand({ TableName: table, Key: k.invite(codeHash) }));
  if (!res.Item) return null;
  const invite = res.Item as InviteRecord;
  // TTL deletion is lazy; enforce expiry ourselves.
  return new Date(invite.expiresAt).getTime() > Date.now() ? invite : null;
}

export async function deleteInvite(codeHash: string): Promise<void> {
  const { doc, table } = db();
  await doc.send(new DeleteCommand({ TableName: table, Key: k.invite(codeHash) }));
}
