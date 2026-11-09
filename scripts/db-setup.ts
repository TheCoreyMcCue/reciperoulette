/**
 * Creates the DynamoDB table (on-demand, TTL on `ttl`, GSI1) if needed.
 * Safe to run repeatedly: each step checks current state first.
 *
 *   pnpm db:setup
 */
import {
  CreateTableCommand,
  DescribeTableCommand,
  DescribeTimeToLiveCommand,
  ResourceNotFoundException,
  UpdateTableCommand,
  UpdateTimeToLiveCommand,
  waitUntilTableExists,
  type TableDescription,
} from "@aws-sdk/client-dynamodb";
import { db } from "@/lib/db/client";
import { GSI1 } from "@/lib/db/keys";

const S = "S" as const;

async function describe(): Promise<TableDescription | null> {
  const { raw, table } = db();
  try {
    return (await raw.send(new DescribeTableCommand({ TableName: table }))).Table ?? null;
  } catch (err) {
    if (err instanceof ResourceNotFoundException) return null;
    throw err;
  }
}

async function waitForActive(): Promise<void> {
  for (let i = 0; i < 120; i++) {
    const t = await describe();
    const gsisActive = (t?.GlobalSecondaryIndexes ?? []).every((g) => g.IndexStatus === "ACTIVE");
    if (t?.TableStatus === "ACTIVE" && gsisActive) return;
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error("Timed out waiting for the table to become ACTIVE");
}

async function main() {
  const { raw, table } = db();
  console.log(`→ Table "${table}" in ${await raw.config.region()}`);

  let t = await describe();
  if (!t) {
    console.log("  creating table (on-demand billing)…");
    await raw.send(
      new CreateTableCommand({
        TableName: table,
        BillingMode: "PAY_PER_REQUEST",
        AttributeDefinitions: [
          { AttributeName: "PK", AttributeType: S },
          { AttributeName: "SK", AttributeType: S },
          { AttributeName: "GSI1PK", AttributeType: S },
          { AttributeName: "GSI1SK", AttributeType: S },
        ],
        KeySchema: [
          { AttributeName: "PK", KeyType: "HASH" },
          { AttributeName: "SK", KeyType: "RANGE" },
        ],
        GlobalSecondaryIndexes: [
          {
            IndexName: GSI1,
            KeySchema: [
              { AttributeName: "GSI1PK", KeyType: "HASH" },
              { AttributeName: "GSI1SK", KeyType: "RANGE" },
            ],
            Projection: { ProjectionType: "ALL" },
          },
        ],
      }),
    );
    await waitUntilTableExists({ client: raw, maxWaitTime: 300 }, { TableName: table });
    await waitForActive();
    console.log("  ✓ table created");
    t = await describe();
  } else {
    console.log("  ✓ table exists");
  }

  const hasGsi = (t?.GlobalSecondaryIndexes ?? []).some((g) => g.IndexName === GSI1);
  if (!hasGsi) {
    console.log(`  adding index ${GSI1}…`);
    await raw.send(
      new UpdateTableCommand({
        TableName: table,
        AttributeDefinitions: [
          { AttributeName: "GSI1PK", AttributeType: S },
          { AttributeName: "GSI1SK", AttributeType: S },
        ],
        GlobalSecondaryIndexUpdates: [
          {
            Create: {
              IndexName: GSI1,
              KeySchema: [
                { AttributeName: "GSI1PK", KeyType: "HASH" },
                { AttributeName: "GSI1SK", KeyType: "RANGE" },
              ],
              Projection: { ProjectionType: "ALL" },
            },
          },
        ],
      }),
    );
    await waitForActive();
    console.log(`  ✓ index ${GSI1} created`);
  } else {
    console.log(`  ✓ index ${GSI1} exists`);
  }

  const ttl = await raw.send(new DescribeTimeToLiveCommand({ TableName: table }));
  const status = ttl.TimeToLiveDescription?.TimeToLiveStatus;
  if (status === "ENABLED" || status === "ENABLING") {
    console.log(`  ✓ TTL ${status.toLowerCase()} on "${ttl.TimeToLiveDescription?.AttributeName}"`);
  } else {
    await raw.send(
      new UpdateTimeToLiveCommand({
        TableName: table,
        TimeToLiveSpecification: { AttributeName: "ttl", Enabled: true },
      }),
    );
    console.log('  ✓ TTL enabled on "ttl"');
  }

  console.log("Done.");
}

main().catch((err) => {
  console.error("✗ db:setup failed:", err instanceof Error ? `${err.name}: ${err.message}` : err);
  process.exit(1);
});
