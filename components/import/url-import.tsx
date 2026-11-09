"use client";

import type { ImportRequest } from "./use-import";

/** Implemented in the URL import phase. */
export function UrlImport({ onSubmit, translate, initialUrl }: { onSubmit: (r: ImportRequest) => void; translate: boolean; initialUrl?: string }) {
  void onSubmit;
  void translate;
  void initialUrl;
  return <p className="text-muted">Link import is coming soon.</p>;
}
