import { stem } from "@/lib/units/classify";
import type { MappedRecipe } from "./map";

const STOP = new Set(["with", "and", "the", "a", "an", "in", "of", "on", "for", "en", "met", "de", "het", "van", "&"]);

function words(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .split(" ")
      .filter((w) => w && !STOP.has(w))
      .map(stem),
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

export type DuplicatePair = { a: string; b: string; titleSimilarity: number; ingredientOverlap: number; reason: string };

const ingredientSet = (r: { input: { ingredients: { item: string }[] } }) => new Set(r.input.ingredients.map((i) => [...words(i.item)].join(" ")).filter(Boolean));

/** Pairs with near-identical titles or heavily overlapping ingredient lists. */
export function findPossibleDuplicates(recipes: Pick<MappedRecipe, "title" | "input">[], { titleMin = 0.5, ingredientMin = 0.6 } = {}): DuplicatePair[] {
  const out: DuplicatePair[] = [];
  for (let i = 0; i < recipes.length; i++) {
    for (let j = i + 1; j < recipes.length; j++) {
      const a = recipes[i]!;
      const b = recipes[j]!;
      const t = jaccard(words(a.title), words(b.title));
      const ia = ingredientSet(a);
      const ib = ingredientSet(b);
      const g = ia.size >= 3 && ib.size >= 3 ? jaccard(ia, ib) : 0;
      if (t >= titleMin || g >= ingredientMin) {
        out.push({
          a: a.title,
          b: b.title,
          titleSimilarity: t,
          ingredientOverlap: g,
          reason: [t >= titleMin && `titles ${Math.round(t * 100)}% alike`, g >= ingredientMin && `${Math.round(g * 100)}% of ingredients shared`].filter(Boolean).join(", "),
        });
      }
    }
  }
  return out.sort((x, y) => Math.max(y.titleSimilarity, y.ingredientOverlap) - Math.max(x.titleSimilarity, x.ingredientOverlap));
}

/** Titles of existing household recipes that look like an incoming one. */
export function similarExisting(title: string, existingTitles: string[], min = 0.6): string[] {
  const w = words(title);
  return existingTitles.filter((t) => jaccard(w, words(t)) >= min);
}

export type ReportInput = {
  mapped: (MappedRecipe & { status: "new" | "exists" | "overwrite"; knownIssues: string[]; similarTo: string[] })[];
  duplicatesDropped: { legacyId: string; title: string }[];
  parseErrors: { index: number; message: string; snippet: string }[];
  possibleDuplicates: DuplicatePair[];
  mode: "dry-run" | "commit";
  email: string;
  householdName: string;
};

const yn = (b: boolean) => (b ? "yes" : "no");

export function formatReport(r: ReportInput): string {
  const lines: string[] = [];
  const pad = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s.padEnd(n));
  lines.push(`Legacy import (${r.mode}) → ${r.householdName} as ${r.email}`);
  lines.push(`${r.mapped.length} recipes parsed, ${r.duplicatesDropped.length} duplicate record(s) dropped, ${r.parseErrors.length} unreadable record(s).`);
  lines.push("");
  lines.push(`${pad("Title", 44)} ${pad("Ingr", 4)} ${pad("Steps", 5)} ${pad("Rotation", 8)} ${pad("Needs", 5)} ${pad("Status", 9)} Tags`);
  lines.push("─".repeat(110));
  for (const m of r.mapped) {
    lines.push(
      `${pad(m.title, 44)} ${pad(String(m.input.ingredients.length), 4)} ${pad(String(m.input.steps.length), 5)} ${pad(yn(m.inRotation), 8)} ${pad(yn(m.incomplete), 5)} ${pad(m.status === "exists" ? "skip" : m.status, 9)} ${m.input.tags.join(", ") || "-"}`,
    );
  }

  lines.push("", "Totals:");
  lines.push(`  in rotation: ${r.mapped.filter((m) => m.inRotation).length}`);
  lines.push(`  needs-details: ${r.mapped.filter((m) => m.incomplete).map((m) => m.title).join("; ") || "none"}`);
  lines.push(`  steps look unfinished (kept out of rotation): ${r.mapped.filter((m) => m.unfinishedSteps).map((m) => m.title).join("; ") || "none"}`);
  const skips = r.mapped.filter((m) => m.status === "exists");
  if (skips.length) lines.push(`  already imported (skipped; use --overwrite to replace): ${skips.length}`);
  const unclassified = [...new Set(r.mapped.flatMap((m) => m.unclassified))];
  lines.push(`  ingredients not in the density table${r.mode === "dry-run" ? " (would be classified by AI on --commit)" : ""}: ${unclassified.length}${unclassified.length ? ` (${unclassified.join(", ")})` : ""}`);

  if (r.duplicatesDropped.length) {
    lines.push("", "Duplicate records dropped (same _id):");
    for (const d of r.duplicatesDropped) lines.push(`  - ${d.title} (${d.legacyId})`);
  }
  if (r.parseErrors.length) {
    lines.push("", "Unreadable records (NOT imported):");
    for (const e of r.parseErrors) lines.push(`  - #${e.index + 1}: ${e.message} near: ${e.snippet.replace(/\s+/g, " ")}`);
  }

  lines.push("", "Flagged issues (imported as written):");
  let any = false;
  for (const m of r.mapped) {
    const items = [...m.knownIssues.map((k) => `[known] ${k}`), ...m.flags.map((f) => `[${f.kind}] ${f.message}`)];
    if (m.incomplete) items.unshift(`[needs-details] ${m.incompleteReasons.join(", ")}`);
    if (!items.length) continue;
    any = true;
    lines.push(`  ${m.title}`);
    for (const it of items) lines.push(`    - ${it}`);
  }
  if (!any) lines.push("  none");

  lines.push("", "Possible duplicates:");
  if (!r.possibleDuplicates.length && !r.mapped.some((m) => m.similarTo.length)) lines.push("  none");
  for (const d of r.possibleDuplicates) lines.push(`  - "${d.a}" ↔ "${d.b}" (${d.reason})`);
  for (const m of r.mapped) for (const t of m.similarTo) lines.push(`  - "${m.title}" ↔ existing recipe "${t}"`);
  return lines.join("\n");
}
