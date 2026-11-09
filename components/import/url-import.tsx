"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import type { ImportRequest } from "./use-import";

/** Pull the first URL out of whatever was pasted ("Check this out! https://…"). */
export function firstUrl(s: string): string | null {
  const m = s.match(/https?:\/\/[^\s<>"']+/i);
  if (m) return m[0].replace(/[),.!?]+$/, "");
  const bare = s.trim();
  return /^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(bare) ? `https://${bare}` : null;
}

export function UrlImport({ onSubmit, translate, initialUrl = "" }: { onSubmit: (r: ImportRequest) => void; translate: boolean; initialUrl?: string }) {
  const [value, setValue] = useState(initialUrl);
  const url = firstUrl(value);
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (url) onSubmit({ kind: "url", url, translate });
      }}
    >
      <TextField
        label="Recipe link"
        type="url"
        inputMode="url"
        autoComplete="off"
        placeholder="https://…"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        hint="Recipe websites, Instagram, TikTok, YouTube, Facebook and Pinterest."
      />
      <Button type="submit" size="lg" className="w-full" disabled={!url}>
        Get this recipe
      </Button>
    </form>
  );
}
