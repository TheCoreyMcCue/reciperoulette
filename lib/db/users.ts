import { GetCommand, QueryCommand, TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import { db } from "./client";
import { EmailTakenError, transactionConditionFailedAt } from "./errors";
import { householdPk, k, stripKeys } from "./keys";

export type Role = "owner" | "member";

export type User = {
  userId: string;
  name: string;
  email: string;
  passwordHash: string;
  householdId: string;
  createdAt: string;
};

export type Household = { householdId: string; name: string; createdBy: string; createdAt: string };

export type Member = { userId: string; name: string; email: string; role: Role; joinedAt: string };

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

export async function getUserById(userId: string): Promise<User | null> {
  const { doc, table } = db();
  const res = await doc.send(new GetCommand({ TableName: table, Key: k.user(userId) }));
  return res.Item ? (stripKeys(res.Item) as User) : null;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const { doc, table } = db();
  const res = await doc.send(
    new GetCommand({ TableName: table, Key: k.email(normalizeEmail(email)) }),
  );
  const userId = res.Item?.userId as string | undefined;
  return userId ? getUserById(userId) : null;
}

function userPuts(user: User, role: Role) {
  const { table } = db();
  return [
    // Index 0: claims the email. Must stay first (see EmailTakenError mapping).
    {
      Put: {
        TableName: table,
        Item: { ...k.email(user.email), entity: "Identity", userId: user.userId, kind: "password" },
        ConditionExpression: "attribute_not_exists(PK)",
      },
    },
    {
      Put: {
        TableName: table,
        Item: { ...k.user(user.userId), entity: "User", ...user },
        ConditionExpression: "attribute_not_exists(PK)",
      },
    },
    {
      Put: {
        TableName: table,
        Item: {
          ...k.member(user.householdId, user.userId),
          entity: "Member",
          userId: user.userId,
          name: user.name,
          email: user.email,
          role,
          joinedAt: user.createdAt,
        } satisfies Member & Record<string, unknown>,
      },
    },
  ];
}

/** Creates a household and its owner atomically. */
export async function createHouseholdWithOwner(household: Household, owner: User): Promise<void> {
  const { doc, table } = db();
  try {
    await doc.send(
      new TransactWriteCommand({
        TransactItems: [
          ...userPuts(owner, "owner"),
          {
            Put: {
              TableName: table,
              Item: { ...k.household(household.householdId), entity: "Household", ...household },
              ConditionExpression: "attribute_not_exists(PK)",
            },
          },
        ],
      }),
    );
  } catch (err) {
    if (transactionConditionFailedAt(err, 0)) throw new EmailTakenError();
    throw err;
  }
}

/** Adds a new user to an existing household atomically. */
export async function createMember(user: User): Promise<void> {
  const { doc, table } = db();
  try {
    await doc.send(
      new TransactWriteCommand({
        TransactItems: [
          ...userPuts(user, "member"),
          {
            ConditionCheck: {
              TableName: table,
              Key: k.household(user.householdId),
              ConditionExpression: "attribute_exists(PK)",
            },
          },
        ],
      }),
    );
  } catch (err) {
    if (transactionConditionFailedAt(err, 0)) throw new EmailTakenError();
    throw err;
  }
}

export async function getHousehold(householdId: string): Promise<Household | null> {
  const { doc, table } = db();
  const res = await doc.send(new GetCommand({ TableName: table, Key: k.household(householdId) }));
  return res.Item ? (stripKeys(res.Item) as Household) : null;
}

export async function listMembers(householdId: string): Promise<Member[]> {
  const { doc, table } = db();
  const res = await doc.send(
    new QueryCommand({
      TableName: table,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
      ExpressionAttributeValues: { ":pk": householdPk(householdId), ":sk": "MEMBER#" },
    }),
  );
  return (res.Items ?? [])
    .map((i) => stripKeys(i) as Member)
    .sort((a, b) => Number(b.role === "owner") - Number(a.role === "owner") || a.joinedAt.localeCompare(b.joinedAt));
}

export async function getMember(householdId: string, userId: string): Promise<Member | null> {
  const { doc, table } = db();
  const res = await doc.send(
    new GetCommand({ TableName: table, Key: k.member(householdId, userId) }),
  );
  return res.Item ? (stripKeys(res.Item) as Member) : null;
}
