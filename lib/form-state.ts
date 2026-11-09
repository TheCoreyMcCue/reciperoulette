import type { z } from "zod";

export type FormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  /** Echo of submitted values so forms can repopulate after an error. */
  values?: Record<string, string>;
};

export function fieldErrorsFrom(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    out[key] ??= issue.message;
  }
  return out;
}

export function formValues(fd: FormData, keys: string[]): Record<string, string> {
  return Object.fromEntries(keys.map((k) => [k, String(fd.get(k) ?? "")]));
}

export const GENERIC_ERROR = "Something went wrong on our side. Please try again.";
