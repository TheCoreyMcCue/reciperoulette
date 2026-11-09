import type { ParseResult } from "@/lib/ai/parse-recipe";

/** What the import API returns to the client. */
export type ImportResponse =
  | (Extract<ParseResult, { status: "ok" | "partial" }> & { note?: string })
  | { status: "not_recipe"; message: string; suggestion?: ImportSuggestion }
  | { status: "limited"; message: string }
  | { status: "error"; message: string; suggestion?: ImportSuggestion };

/** When a source can't be read, point people at another import method. */
export type ImportSuggestion = "photo" | "text" | "manual";
