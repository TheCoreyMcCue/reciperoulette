"use client";

/* eslint-disable @next/next/no-img-element -- local object-URL previews */
import { useEffect, useRef, useState } from "react";
import { CameraIcon, ChevronLeftIcon, ChevronRightIcon, PlusIcon, XIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { Alert } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { compressImage, type CompressedImage } from "@/lib/images/compress";
import type { ImportRequest } from "./use-import";

const MAX_IMAGES = 6;

export function PhotoImport({ onSubmit, translate }: { onSubmit: (r: ImportRequest) => void; translate: boolean }) {
  const [images, setImages] = useState<CompressedImage[]>([]);
  const [busy, setBusy] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const pickRef = useRef<HTMLInputElement>(null);
  const imagesRef = useRef(images);

  useEffect(() => {
    imagesRef.current = images;
  }, [images]);
  // Free object URLs when leaving.
  useEffect(() => () => imagesRef.current.forEach((i) => URL.revokeObjectURL(i.previewUrl)), []);

  const addFiles = async (files: File[]) => {
    const imgs = files.filter((f) => f.type.startsWith("image/") || /\.(hei[cf]|jpe?g|png|webp|gif)$/i.test(f.name));
    if (!imgs.length) {
      if (files.length) setError("That doesn't look like an image.");
      return;
    }
    setError(null);
    const room = MAX_IMAGES - imagesRef.current.length;
    if (imgs.length > room) setError(`Up to ${MAX_IMAGES} photos per recipe.`);
    const batch = imgs.slice(0, Math.max(room, 0));
    setBusy((b) => b + batch.length);
    for (const file of batch) {
      try {
        const img = await compressImage(file);
        setImages((prev) => (prev.length < MAX_IMAGES ? [...prev, img] : prev));
      } catch (err) {
        console.error(err);
        setError("We couldn't open one of those photos. Try a screenshot or a JPEG instead.");
      } finally {
        setBusy((b) => b - 1);
      }
    }
  };

  // Paste an image from the clipboard (desktop).
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const files = [...(e.clipboardData?.files ?? [])].filter((f) => f.type.startsWith("image/"));
      if (files.length) {
        e.preventDefault();
        void addFiles(files);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  const remove = (id: string) =>
    setImages((prev) => {
      const gone = prev.find((i) => i.id === id);
      if (gone) URL.revokeObjectURL(gone.previewUrl);
      return prev.filter((i) => i.id !== id);
    });

  const move = (idx: number, dir: -1 | 1) =>
    setImages((prev) => {
      const next = [...prev];
      const j = idx + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[idx], next[j]] = [next[j]!, next[idx]!];
      return next;
    });

  const onInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    void addFiles([...(e.target.files ?? [])]);
    e.target.value = "";
  };

  return (
    <div className="space-y-4">
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="sr-only" tabIndex={-1} onChange={onInput} aria-hidden="true" />
      <input ref={pickRef} type="file" accept="image/*,.heic,.heif" multiple className="sr-only" tabIndex={-1} onChange={onInput} aria-hidden="true" />

      {images.length === 0 ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            void addFiles([...e.dataTransfer.files]);
          }}
          className={cn(
            "flex flex-col items-center gap-4 rounded-3xl border-2 border-dashed p-6 text-center transition",
            dragging ? "border-primary bg-primary-soft" : "border-border",
          )}
        >
          <p className="text-muted">
            Snap a cookbook page, or add screenshots of a recipe. Several photos of one recipe are fine.
            <span className="hidden md:inline"> You can also drop images here or paste with ⌘V / Ctrl+V.</span>
          </p>
          <div className="grid w-full gap-3 sm:grid-cols-2">
            <Button size="lg" onClick={() => cameraRef.current?.click()} className="md:hidden">
              <CameraIcon /> Take a photo
            </Button>
            <Button size="lg" variant="secondary" onClick={() => pickRef.current?.click()} className="md:col-span-2">
              <PlusIcon /> Choose photos
            </Button>
          </div>
        </div>
      ) : (
        <>
          <ol className="grid grid-cols-2 gap-3 sm:grid-cols-3" aria-label="Photos, in reading order">
            {images.map((img, i) => (
              <li key={img.id} className="relative overflow-hidden rounded-2xl border border-border bg-surface-2">
                <img src={img.previewUrl} alt={`Photo ${i + 1}`} className="aspect-[3/4] w-full object-cover" />
                <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs font-bold text-white">{i + 1}</span>
                <button
                  type="button"
                  onClick={() => remove(img.id)}
                  aria-label={`Remove photo ${i + 1}`}
                  className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white"
                >
                  <XIcon width={18} height={18} />
                </button>
                {images.length > 1 && (
                  <div className="absolute inset-x-2 bottom-2 flex justify-between">
                    <button type="button" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Move photo ${i + 1} earlier`} className="flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white disabled:opacity-0">
                      <ChevronLeftIcon width={18} height={18} />
                    </button>
                    <button type="button" disabled={i === images.length - 1} onClick={() => move(i, 1)} aria-label={`Move photo ${i + 1} later`} className="flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white disabled:opacity-0">
                      <ChevronRightIcon width={18} height={18} />
                    </button>
                  </div>
                )}
              </li>
            ))}
            {busy > 0 && (
              <li className="flex aspect-[3/4] items-center justify-center rounded-2xl border border-dashed border-border" role="status">
                <Spinner />
                <span className="sr-only">Preparing photo…</span>
              </li>
            )}
            {images.length < MAX_IMAGES && busy === 0 && (
              <li>
                <button
                  type="button"
                  onClick={() => pickRef.current?.click()}
                  className="flex aspect-[3/4] w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border text-sm font-semibold text-muted hover:bg-surface-2"
                >
                  <PlusIcon /> Add another
                </button>
              </li>
            )}
          </ol>
          <Button
            size="lg"
            className="w-full"
            disabled={busy > 0}
            onClick={() => onSubmit({ kind: "images", images: images.map(({ mediaType, data }) => ({ mediaType, data })), translate })}
          >
            Read {images.length === 1 ? "this photo" : `these ${images.length} photos`}
          </Button>
        </>
      )}
      {busy > 0 && images.length === 0 && (
        <p className="flex items-center justify-center gap-2 text-sm text-muted" role="status">
          <Spinner className="h-4 w-4" /> Preparing photos…
        </p>
      )}
      {error && <Alert>{error}</Alert>}
    </div>
  );
}
