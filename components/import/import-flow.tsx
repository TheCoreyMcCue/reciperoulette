"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ComponentType, type SVGProps } from "react";
import { CameraIcon, EditIcon, LinkIcon, TextIcon } from "@/components/icons";
import { RecipeForm } from "@/components/recipes/recipe-form";
import { Button, buttonClass } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { Alert } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import type { ImportSuggestion } from "@/lib/importers/types";
import { PhotoImport } from "./photo-import";
import { TextImport } from "./text-import";
import { UrlImport } from "./url-import";
import { useImport, type ImportRequest } from "./use-import";

export type ImportTab = "photo" | "text" | "url";

const TABS: { id: ImportTab; label: string; Icon: ComponentType<SVGProps<SVGSVGElement>> }[] = [
  { id: "photo", label: "Photo", Icon: CameraIcon },
  { id: "url", label: "Link", Icon: LinkIcon },
  { id: "text", label: "Paste", Icon: TextIcon },
];

export function ImportFlow({
  initialTab = "photo",
  initialUrl,
  initialText,
  autoStart = false,
}: {
  initialTab?: ImportTab;
  initialUrl?: string;
  initialText?: string;
  autoStart?: boolean;
}) {
  const [tab, setTab] = useState<ImportTab>(initialTab);
  const [translate, setTranslate] = useState(false);
  const { state, run, reset } = useImport();
  const started = useRef(false);
  const [lastRequest, setLastRequest] = useState<{ req: ImportRequest; label?: string } | null>(null);

  const submit = (req: ImportRequest, label?: string) => {
    setLastRequest({ req, label });
    void run(req, label);
  };

  useEffect(() => {
    if (!autoStart || started.current) return;
    started.current = true;
    /* eslint-disable react-hooks/set-state-in-effect -- kicking off a shared import once on mount */
    if (initialUrl) submit({ kind: "url", url: initialUrl, translate: false }, "Fetching the page…");
    else if (initialText && initialText.trim().length >= 10) submit({ kind: "text", text: initialText, translate: false });
    /* eslint-enable react-hooks/set-state-in-effect */
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once on mount
  }, []);

  const startOver = () => {
    reset();
    window.scrollTo({ top: 0 });
  };

  if (state.stage === "working") {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-5 text-center" role="status" aria-live="polite">
        <div className="relative">
          <div className="h-20 w-20 rounded-full bg-primary-soft" />
          <Spinner className="absolute inset-0 m-auto h-10 w-10 text-primary" />
        </div>
        <p className="font-display text-2xl font-semibold">{state.label}</p>
        <p className="max-w-xs text-sm text-muted">This usually takes 5 to 15 seconds.</p>
        <Button variant="ghost" onClick={startOver}>
          Cancel
        </Button>
      </div>
    );
  }

  if (state.stage === "done") {
    const r = state.result;
    if (r.status === "ok" || r.status === "partial") {
      return (
        <RecipeForm
          initial={r.recipe}
          rawSourceText={r.rawSourceText}
          submitLabel="Save to recipe box"
          banner={
            <div className="space-y-3">
              <Alert tone={r.status === "ok" ? "success" : "info"}>
                <p className="font-semibold">
                  {r.status === "ok" ? "Here's what we found. Check it over, then save." : "We got part of it. Please check every field."}
                </p>
                {r.note && <p className="mt-1">{r.note}</p>}
                {r.warnings.length > 0 && (
                  <ul className="mt-1 list-disc pl-5">
                    {r.warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                )}
              </Alert>
              <button type="button" onClick={startOver} className="text-sm font-semibold text-primary underline-offset-2 hover:underline">
                ← Start over
              </button>
            </div>
          }
        />
      );
    }
    return (
      <Failure
        message={r.message}
        suggestion={"suggestion" in r ? r.suggestion : undefined}
        limited={r.status === "limited"}
        onRetry={lastRequest ? () => submit(lastRequest.req, lastRequest.label) : undefined}
        onSwitch={(t) => {
          reset();
          setTab(t);
        }}
      />
    );
  }

  return (
    <div className="space-y-5">
      <div role="tablist" aria-label="Import method" className="grid grid-cols-3 gap-2">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            role="tab"
            id={`tab-${id}`}
            aria-selected={tab === id}
            aria-controls={`panel-${id}`}
            onClick={() => setTab(id)}
            className={cn(
              "flex min-h-20 flex-col items-center justify-center gap-1.5 rounded-3xl border text-sm font-bold transition",
              tab === id ? "border-primary bg-primary text-primary-ink shadow-md" : "border-border bg-surface hover:bg-surface-2",
            )}
          >
            <Icon width={28} height={28} />
            {label}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="rounded-3xl border border-border bg-surface p-4 sm:p-5">
        {tab === "photo" && <PhotoImport onSubmit={(r) => submit(r)} translate={translate} />}
        {tab === "text" && <TextImport initialText={initialText} onSubmit={(r) => submit(r)} translate={translate} />}
        {tab === "url" && <UrlImport initialUrl={initialUrl} onSubmit={(r) => submit(r, "Fetching the page…")} translate={translate} />}
      </div>

      <label className="flex min-h-10 items-center gap-3 text-sm font-semibold">
        <input type="checkbox" className="h-5 w-5 accent-[var(--primary)]" checked={translate} onChange={(e) => setTranslate(e.target.checked)} />
        Translate to English
        <span className="font-normal text-muted">(otherwise we keep the original language)</span>
      </label>

      <Link href="/recipes/new" className={buttonClass("ghost", "md", "w-full")}>
        <EditIcon width={20} height={20} /> Or type it in yourself
      </Link>
    </div>
  );
}

function Failure({
  message,
  suggestion,
  limited,
  onRetry,
  onSwitch,
}: {
  message: string;
  suggestion?: ImportSuggestion;
  limited: boolean;
  onRetry?: () => void;
  onSwitch: (t: ImportTab) => void;
}) {
  return (
    <div className="space-y-4 rounded-3xl border border-border bg-surface p-5">
      <h2 className="font-display text-2xl font-semibold">{limited ? "That's enough for today" : "Hmm, that didn't work"}</h2>
      <p>{message}</p>
      {suggestion === "photo" && (
        <Alert tone="info">
          <strong>Tip:</strong> take a screenshot of the post (including the caption) and use the Photo option. It works for almost anything.
        </Alert>
      )}
      <div className="flex flex-wrap gap-2">
        {suggestion === "photo" && (
          <Button onClick={() => onSwitch("photo")}>
            <CameraIcon width={20} height={20} /> Use a screenshot
          </Button>
        )}
        {(suggestion === "photo" || suggestion === "text") && (
          <Button variant="secondary" onClick={() => onSwitch("text")}>
            <TextIcon width={20} height={20} /> Paste the text
          </Button>
        )}
        {!limited && onRetry && (
          <Button variant="secondary" onClick={onRetry}>
            Try again
          </Button>
        )}
        <Button variant="ghost" onClick={() => onSwitch("photo")}>
          Start over
        </Button>
        <Link href="/recipes/new" className={buttonClass("ghost")}>
          Type it in
        </Link>
      </div>
    </div>
  );
}
