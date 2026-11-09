import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { env } from "@/lib/env";

/**
 * One DynamoDB client per server instance, reused across requests (and across
 * hot reloads in dev, via globalThis). Credentials are passed explicitly from
 * the DYNAMO_* variables because Vercel reserves the AWS_* names.
 */
type Clients = { raw: DynamoDBClient; doc: DynamoDBDocumentClient; table: string };

const globalForDb = globalThis as unknown as { __rrDynamo?: Clients };

function create(): Clients {
  const e = env();
  const credentials =
    e.DYNAMO_ACCESS_KEY_ID && e.DYNAMO_SECRET_ACCESS_KEY
      ? { accessKeyId: e.DYNAMO_ACCESS_KEY_ID, secretAccessKey: e.DYNAMO_SECRET_ACCESS_KEY }
      : e.DYNAMO_ENDPOINT
        ? { accessKeyId: "local", secretAccessKey: "local" } // DynamoDB Local accepts anything
        : undefined; // fall back to the default provider chain (e.g. ~/.aws profile)

  const raw = new DynamoDBClient({
    region: e.DYNAMO_REGION,
    endpoint: e.DYNAMO_ENDPOINT,
    credentials,
    maxAttempts: 3,
  });
  const doc = DynamoDBDocumentClient.from(raw, {
    marshallOptions: { removeUndefinedValues: true },
  });
  return { raw, doc, table: e.DYNAMO_TABLE_NAME };
}

export function db(): Clients {
  globalForDb.__rrDynamo ??= create();
  return globalForDb.__rrDynamo;
}
