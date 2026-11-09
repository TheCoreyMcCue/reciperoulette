import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  TransactWriteCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { newId, nowIso } from "@/lib/ids";
import {
  MAX_RAW_SOURCE_CHARS,
  RecipeInputSchema,
  RecipeSchema,
  type Recipe,
  type RecipeInput,
} from "@/lib/recipes/schema";
import { db } from "./client";
import { isConditionalCheckFailed, NotFoundError } from "./errors";
import { householdPk, k, stripKeys } from "./keys";

/**
 * Recipe repository. Every function takes the householdId (from the session)
 * as part of the key, so one household can never address another's recipes.
 */

function toRecipe(item: Record<string, unknown>): Recipe | null {
  const parsed = RecipeSchema.safeParse(stripKeys(item));
  if (!parsed.success) {
    console.error("[db] skipping malformed recipe", item.SK, parsed.error.issues[0]);
    return null;
  }
  return parsed.data;
}

export async function listRecipes(householdId: string): Promise<Recipe[]> {
  const { doc, table } = db();
  const out: Recipe[] = [];
  let ExclusiveStartKey: Record<string, unknown> | undefined;
  do {
    const res = await doc.send(
      new QueryCommand({
        TableName: table,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
        ExpressionAttributeValues: { ":pk": householdPk(householdId), ":sk": "RECIPE#" },
        ExclusiveStartKey,
      }),
    );
    for (const item of res.Items ?? []) {
      const r = toRecipe(item);
      if (r) out.push(r);
    }
    ExclusiveStartKey = res.LastEvaluatedKey;
  } while (ExclusiveStartKey);
  return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getRecipe(householdId: string, recipeId: string): Promise<Recipe | null> {
  const { doc, table } = db();
  const res = await doc.send(
    new GetCommand({ TableName: table, Key: k.recipe(householdId, recipeId) }),
  );
  return res.Item ? toRecipe(res.Item) : null;
}

export async function getRawSource(householdId: string, recipeId: string): Promise<string | null> {
  const { doc, table } = db();
  const res = await doc.send(
    new GetCommand({ TableName: table, Key: k.recipeSource(householdId, recipeId) }),
  );
  return (res.Item?.rawSourceText as string | undefined) ?? null;
}

export async function createRecipe(params: {
  householdId: string;
  userId: string;
  input: RecipeInput;
  rawSourceText?: string;
  inRotation?: boolean;
}): Promise<Recipe> {
  const { householdId, userId } = params;
  const input = RecipeInputSchema.parse(params.input);
  const now = nowIso();
  const recipe: Recipe = {
    ...input,
    id: newId(),
    householdId,
    inRotation: params.inRotation ?? false,
    timesCooked: 0,
    lastCookedAt: null,
    skipUntil: null,
    createdBy: userId,
    createdAt: now,
    updatedAt: now,
  };
  const { doc, table } = db();
  const recipePut = {
    Put: {
      TableName: table,
      Item: { ...k.recipe(householdId, recipe.id), entity: "Recipe", ...recipe },
      ConditionExpression: "attribute_not_exists(PK)",
    },
  };
  const raw = params.rawSourceText?.slice(0, MAX_RAW_SOURCE_CHARS);
  if (raw) {
    await doc.send(
      new TransactWriteCommand({
        TransactItems: [
          recipePut,
          {
            Put: {
              TableName: table,
              Item: {
                ...k.recipeSource(householdId, recipe.id),
                entity: "RecipeSource",
                recipeId: recipe.id,
                rawSourceText: raw,
                createdAt: now,
              },
            },
          },
        ],
      }),
    );
  } else {
    await doc.send(new PutCommand(recipePut.Put));
  }
  return recipe;
}

const EDITABLE_FIELDS = Object.keys(RecipeInputSchema.shape) as (keyof RecipeInput)[];

export async function updateRecipe(
  householdId: string,
  recipeId: string,
  input: RecipeInput,
): Promise<Recipe> {
  const parsed = RecipeInputSchema.parse(input);
  const names: Record<string, string> = {};
  const values: Record<string, unknown> = { ":u": nowIso() };
  const sets = EDITABLE_FIELDS.map((f, i) => {
    names[`#f${i}`] = f;
    values[`:v${i}`] = parsed[f];
    return `#f${i} = :v${i}`;
  });
  return update(householdId, recipeId, `SET ${sets.join(", ")}, updatedAt = :u`, names, values);
}

export async function setRotation(householdId: string, recipeId: string, inRotation: boolean) {
  return update(householdId, recipeId, "SET inRotation = :r, updatedAt = :u", {}, {
    ":r": inRotation,
    ":u": nowIso(),
  });
}

export async function markCooked(householdId: string, recipeId: string, at: string = nowIso()) {
  return update(
    householdId,
    recipeId,
    "SET lastCookedAt = :at, updatedAt = :u, skipUntil = :null ADD timesCooked :one",
    {},
    { ":at": at, ":u": nowIso(), ":one": 1, ":null": null },
  );
}

export async function setSkipUntil(householdId: string, recipeId: string, until: string | null) {
  return update(householdId, recipeId, "SET skipUntil = :s", {}, { ":s": until });
}

async function update(
  householdId: string,
  recipeId: string,
  UpdateExpression: string,
  names: Record<string, string>,
  values: Record<string, unknown>,
): Promise<Recipe> {
  const { doc, table } = db();
  try {
    const res = await doc.send(
      new UpdateCommand({
        TableName: table,
        Key: k.recipe(householdId, recipeId),
        UpdateExpression,
        ConditionExpression: "attribute_exists(PK)",
        ...(Object.keys(names).length ? { ExpressionAttributeNames: names } : {}),
        ExpressionAttributeValues: values,
        ReturnValues: "ALL_NEW",
      }),
    );
    const r = res.Attributes ? toRecipe(res.Attributes) : null;
    if (!r) throw new NotFoundError("Recipe");
    return r;
  } catch (err) {
    if (isConditionalCheckFailed(err)) throw new NotFoundError("Recipe");
    throw err;
  }
}

export async function deleteRecipe(householdId: string, recipeId: string): Promise<void> {
  const { doc, table } = db();
  await Promise.all([
    doc.send(new DeleteCommand({ TableName: table, Key: k.recipe(householdId, recipeId) })),
    doc.send(new DeleteCommand({ TableName: table, Key: k.recipeSource(householdId, recipeId) })),
  ]);
}
