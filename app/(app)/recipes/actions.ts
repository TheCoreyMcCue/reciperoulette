"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { NotFoundError } from "@/lib/db/errors";
import * as repo from "@/lib/db/recipes";
import { fieldErrorsFrom } from "@/lib/form-state";
import { MAX_RAW_SOURCE_CHARS, RecipeInputSchema } from "@/lib/recipes/schema";
import { toSummary, type RecipeSummary } from "@/lib/recipes/summary";

/**
 * Recipe mutations. Every action resolves the session first and passes the
 * session's householdId to the repository; ids from the client are only ever
 * used within that household's partition.
 */

const Id = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/);

export type SaveResult = { ok: true; id: string } | { ok: false; error: string; fieldErrors?: Record<string, string> };

export async function saveRecipeAction(payload: {
  id?: string;
  input: unknown;
  rawSourceText?: string;
  addToRotation?: boolean;
}): Promise<SaveResult> {
  const session = await requireSession();
  const parsed = RecipeInputSchema.safeParse(payload.input);
  if (!parsed.success) {
    return { ok: false, error: "Some fields need a look.", fieldErrors: fieldErrorsFrom(parsed.error) };
  }
  try {
    if (payload.id) {
      const id = Id.parse(payload.id);
      await repo.updateRecipe(session.householdId, id, parsed.data);
      refresh();
      return { ok: true, id };
    }
    const raw = typeof payload.rawSourceText === "string" ? payload.rawSourceText.slice(0, MAX_RAW_SOURCE_CHARS) : undefined;
    const recipe = await repo.createRecipe({
      householdId: session.householdId,
      userId: session.userId,
      input: parsed.data,
      rawSourceText: raw,
      inRotation: payload.addToRotation === true,
    });
    return { ok: true, id: recipe.id };
  } catch (err) {
    if (err instanceof NotFoundError) return { ok: false, error: "That recipe no longer exists." };
    console.error("[recipes] save failed", err);
    return { ok: false, error: "Couldn't save the recipe. Please try again." };
  }
}

export async function deleteRecipeAction(id: string): Promise<void> {
  const session = await requireSession();
  await repo.deleteRecipe(session.householdId, Id.parse(id));
  redirect("/");
}

export type MutationResult = { ok: true; recipe: RecipeSummary } | { ok: false; error: string };

async function mutate(fn: () => Promise<import("@/lib/recipes/schema").Recipe>): Promise<MutationResult> {
  try {
    const recipe = await fn();
    refresh();
    return { ok: true, recipe: toSummary(recipe) };
  } catch (err) {
    if (err instanceof NotFoundError) return { ok: false, error: "That recipe no longer exists." };
    console.error("[recipes] update failed", err);
    return { ok: false, error: "Couldn't save that change. Please try again." };
  }
}

export async function setRotationAction(id: string, inRotation: boolean): Promise<MutationResult> {
  const session = await requireSession();
  const rid = Id.parse(id);
  return mutate(() => repo.setRotation(session.householdId, rid, z.boolean().parse(inRotation)));
}

export async function markCookedAction(id: string): Promise<MutationResult> {
  const session = await requireSession();
  const rid = Id.parse(id);
  return mutate(() => repo.markCooked(session.householdId, rid));
}

const SKIP_DAYS = 7;

export async function skipThisWeekAction(id: string): Promise<MutationResult> {
  const session = await requireSession();
  const rid = Id.parse(id);
  const until = new Date(Date.now() + SKIP_DAYS * 86400_000).toISOString();
  return mutate(() => repo.setSkipUntil(session.householdId, rid, until));
}
