"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { inputClass, Label } from "@/components/ui/field";
import type { ImportRequest } from "./use-import";

export function TextImport({ initialText = "", onSubmit, translate }: { initialText?: string; onSubmit: (r: ImportRequest) => void; translate: boolean }) {
  const [text, setText] = useState(initialText);
  const id = useId();
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (text.trim().length >= 10) onSubmit({ kind: "text", text, translate });
      }}
    >
      <Label htmlFor={id}>Paste a recipe</Label>
      <textarea
        id={id}
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={12}
        placeholder="Paste anything: a WhatsApp message, an email, text copied from a website…"
        className={`${inputClass} py-3 leading-relaxed`}
      />
      <Button type="submit" size="lg" className="w-full" disabled={text.trim().length < 10}>
        Read this recipe
      </Button>
    </form>
  );
}
