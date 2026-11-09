"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ImportResponse } from "@/lib/importers/types";

export type ImportRequest =
  | { kind: "text"; text: string; translate: boolean }
  | { kind: "images"; images: { mediaType: string; data: string }[]; text?: string; translate: boolean }
  | { kind: "url"; url: string; translate: boolean };

const PROGRESS = [
  "Reading the recipe…",
  "Finding the ingredients…",
  "Sorting out the steps…",
  "Working out the timings…",
  "Almost there…",
];

export type ImportState =
  | { stage: "idle" }
  | { stage: "working"; label: string }
  | { stage: "done"; result: ImportResponse };

export function useImport() {
  const router = useRouter();
  const [state, setState] = useState<ImportState>({ stage: "idle" });
  const abort = useRef<AbortController | null>(null);
  const ticker = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTicker = () => {
    if (ticker.current) clearInterval(ticker.current);
    ticker.current = null;
  };

  // Note: we deliberately don't abort in-flight requests on unmount (it wouldn't stop the
  // server-side work, and React StrictMode's simulated unmount would kill auto-started imports).
  useEffect(() => () => stopTicker(), []);

  const run = useCallback(async (req: ImportRequest, firstLabel?: string) => {
    abort.current?.abort();
    const ctrl = new AbortController();
    abort.current = ctrl;
    let i = 0;
    const labels = firstLabel ? [firstLabel, ...PROGRESS] : PROGRESS;
    setState({ stage: "working", label: labels[0]! });
    stopTicker();
    ticker.current = setInterval(() => {
      i = Math.min(i + 1, labels.length - 1);
      setState((s) => (s.stage === "working" ? { stage: "working", label: labels[i]! } : s));
    }, 2600);

    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(req),
        signal: ctrl.signal,
      });
      if (res.status === 401) {
        router.push(`/login?next=${encodeURIComponent(location.pathname + location.search)}`);
        return;
      }
      let result: ImportResponse;
      try {
        result = (await res.json()) as ImportResponse;
      } catch {
        result = {
          status: "error",
          message: res.status === 413 ? "Those photos are too large. Try fewer at a time." : "Something went wrong. Please try again.",
        };
      }
      setState({ stage: "done", result });
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setState({ stage: "done", result: { status: "error", message: "Couldn't reach the server. Check your connection and try again." } });
    } finally {
      stopTicker();
    }
  }, [router]);

  const reset = useCallback(() => {
    abort.current?.abort();
    stopTicker();
    setState({ stage: "idle" });
  }, []);

  return { state, run, reset };
}
