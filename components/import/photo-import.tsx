"use client";

import type { ImportRequest } from "./use-import";

/** Implemented in the photo import phase. */
export function PhotoImport({ onSubmit, translate }: { onSubmit: (r: ImportRequest) => void; translate: boolean }) {
  void onSubmit;
  void translate;
  return <p className="text-muted">Photo import is coming next.</p>;
}
