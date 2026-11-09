import { createHash } from "node:crypto";
import JSON5 from "json5";

/**
 * Parses MongoDB shell output (`db.recipes.find()` style): unquoted keys,
 * single-quoted strings, ObjectId()/ISODate()/NumberInt() wrappers, records
 * separated by blank lines or glued together as `}{`.
 */

export type LegacyRecord = Record<string, unknown>;

export type ParsedExport = {
  records: (LegacyRecord & { _legacyId: string; _idWasMissing: boolean })[];
  duplicatesDropped: { legacyId: string; title: string }[];
  errors: { index: number; message: string; snippet: string }[];
};

/** Zero-width spaces/joiners, word joiner, BOM, soft hyphen. */
const INVISIBLE = /[​-‍⁠﻿­]/g;

export function cleanString(s: string): string {
  return s.replace(INVISIBLE, "").trim();
}

/** Recursively strips invisible characters and trims every string. */
export function deepClean<T>(v: T): T {
  if (typeof v === "string") return cleanString(v) as T;
  if (Array.isArray(v)) return v.map(deepClean) as T;
  if (v && typeof v === "object") {
    return Object.fromEntries(Object.entries(v as Record<string, unknown>).map(([k, x]) => [k, deepClean(x)])) as T;
  }
  return v;
}

/** Replaces shell wrappers with plain JSON5 values. */
export function unwrapShellValues(text: string): string {
  return text
    .replace(/\b(?:ObjectId|ISODate|UUID)\s*\(\s*(['"])(.*?)\1\s*\)/g, "'$2'")
    .replace(/\bnew\s+Date\(\s*(['"])(.*?)\1\s*\)/g, "'$2'")
    .replace(/\b(?:NumberInt|NumberLong|NumberDecimal|NumberDouble)\(\s*(['"]?)(-?[\d.]+)\1\s*\)/g, "$2");
}

/** Splits top-level `{…}` objects, respecting quotes, regardless of separators. */
export function splitTopLevelObjects(text: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let start = -1;
  let quote: string | null = null;
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (quote) {
      if (c === "\\") i++;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === "'" || c === '"' || c === "`") quote = c;
    else if (c === "{") {
      if (depth === 0) start = i;
      depth++;
    } else if (c === "}") {
      depth--;
      if (depth === 0 && start >= 0) {
        out.push(text.slice(start, i + 1));
        start = -1;
      }
      if (depth < 0) depth = 0;
    }
  }
  return out;
}

export function fallbackId(title: string): string {
  const norm = title.toLowerCase().replace(INVISIBLE, "").replace(/\s+/g, " ").trim();
  return `noid-${createHash("sha1").update(norm).digest("hex").slice(0, 16)}`;
}

export function parseMongoExport(text: string): ParsedExport {
  const chunks = splitTopLevelObjects(unwrapShellValues(text));
  const records: ParsedExport["records"] = [];
  const duplicatesDropped: ParsedExport["duplicatesDropped"] = [];
  const errors: ParsedExport["errors"] = [];
  const seen = new Set<string>();

  chunks.forEach((chunk, index) => {
    let rec: LegacyRecord;
    try {
      rec = deepClean(JSON5.parse(chunk) as LegacyRecord);
    } catch (err) {
      errors.push({ index, message: err instanceof Error ? err.message : String(err), snippet: chunk.slice(0, 120) });
      return;
    }
    const title = typeof rec.title === "string" ? rec.title : "";
    const rawId = typeof rec._id === "string" && rec._id ? rec._id : null;
    const legacyId = rawId ?? fallbackId(title || `record-${index}`);
    if (seen.has(legacyId)) {
      duplicatesDropped.push({ legacyId, title });
      return;
    }
    seen.add(legacyId);
    records.push({ ...rec, _legacyId: legacyId, _idWasMissing: !rawId });
  });
  return { records, duplicatesDropped, errors };
}
