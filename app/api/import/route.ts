import { z } from "zod";
import { MAX_IMAGES } from "@/lib/ai/parse-recipe";
import { requireApiSession, UnauthorizedError } from "@/lib/auth/session";
import { importFromImages } from "@/lib/importers/photo";
import { importFromText } from "@/lib/importers/text";
import type { ImportResponse } from "@/lib/importers/types";

export const maxDuration = 60;

/** Stay under Vercel's 4.5 MB request body limit. */
const MAX_BODY_BYTES = 4_300_000;

const ImageSchema = z.object({
  mediaType: z.enum(["image/jpeg", "image/png", "image/webp", "image/gif"]),
  data: z.string().regex(/^[A-Za-z0-9+/=]+$/, "Invalid image data").max(3_000_000),
});

const BodySchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("text"), text: z.string().trim().min(10, "Paste a bit more text").max(200_000), translate: z.boolean().default(false) }),
  z.object({
    kind: z.literal("images"),
    images: z.array(ImageSchema).min(1).max(MAX_IMAGES),
    text: z.string().max(10_000).optional(),
    translate: z.boolean().default(false),
  }),
]);

function json(body: ImportResponse, status = 200) {
  return Response.json(body, { status });
}

export async function POST(req: Request) {
  let session;
  try {
    session = await requireApiSession();
  } catch (err) {
    if (err instanceof UnauthorizedError) return json({ status: "error", message: err.message }, 401);
    throw err;
  }

  const length = Number(req.headers.get("content-length") ?? 0);
  if (length > MAX_BODY_BYTES) {
    return json({ status: "error", message: "Those photos are too large. Try fewer images at a time." }, 413);
  }

  let body: z.infer<typeof BodySchema>;
  try {
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return json({ status: "error", message: parsed.error.issues[0]?.message ?? "Invalid request." }, 400);
    }
    body = parsed.data;
  } catch {
    return json({ status: "error", message: "Invalid request." }, 400);
  }

  const ctx = { householdId: session.householdId, userId: session.userId };
  try {
    switch (body.kind) {
      case "text":
        return json(await importFromText(body.text, body.translate, ctx));
      case "images":
        return json(await importFromImages(body.images, body.text, body.translate, ctx));
    }
  } catch (err) {
    console.error("[import] failed", err);
    return json({ status: "error", message: "Something went wrong reading that recipe. Please try again." }, 500);
  }
}
