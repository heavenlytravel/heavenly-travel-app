"use client";

import {
  IMAGE_MAX_MB,
  IMAGE_TYPES,
  MODEL_LIMITS,
  photoAlt,
  type ModelPhoto,
} from "@repo/db";
import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/field";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ImageIcon,
  XIcon,
} from "@repo/ui/icons";
import Image from "next/image";
import { useRef, type Dispatch, type SetStateAction } from "react";
import { useImageUpload } from "../../_components/use-image-upload";
import { VEHICLE_MODEL_IMAGE_UPLOAD_PATH } from "../../_lib/routes";

/**
 * A model's photos, in the order the customer pages through them: each
 * with its caption, moved left or right, or taken out. The first is the
 * model's cover. "Add photos" stores each file as soon as it is chosen,
 * several at once; the form keeps them once it is saved.
 */
export function PhotoList({
  modelName,
  photos,
  setPhotos,
}: {
  /** The model's name as typed, for the photos' alt text. */
  modelName: string;
  photos: ModelPhoto[];
  /** The form's state setter: an upload lands on the list as it is then, edits made meanwhile kept. */
  setPhotos: Dispatch<SetStateAction<ModelPhoto[]>>;
}) {
  const input = useRef<HTMLInputElement>(null);
  const { upload, uploading, error } = useImageUpload(
    VEHICLE_MODEL_IMAGE_UPLOAD_PATH,
  );
  const room = MODEL_LIMITS.photos - photos.length;

  async function add(files: File[]) {
    // One at a time, so the list grows in the order the files were chosen.
    for (const file of files.slice(0, room)) {
      const image = await upload(file);
      if (!image) break;
      setPhotos((current) =>
        current.length < MODEL_LIMITS.photos
          ? [...current, { url: image.url, caption: "" }]
          : current,
      );
    }
  }

  function move(from: number, to: number) {
    setPhotos((current) => {
      const next = [...current];
      const [photo] = next.splice(from, 1);
      next.splice(to, 0, photo!);
      return next;
    });
  }

  function setCaption(at: number, caption: string) {
    setPhotos((current) =>
      current.map((p, i) => (i === at ? { ...p, caption } : p)),
    );
  }

  const name = modelName || "the model";

  return (
    <div className="grid gap-4">
      {photos.length === 0 ? (
        <p className="flex items-center gap-2 rounded-lg border border-dashed border-neutral-300 px-4 py-6 text-sm text-neutral-500">
          <ImageIcon className="size-5 text-neutral-400" />
          No photos yet. The outside first: it is the model&apos;s cover.
        </p>
      ) : (
        <ol className="grid grid-cols-[repeat(auto-fill,minmax(min(12rem,100%),1fr))] gap-4">
          {photos.map((photo, i) => (
            <li
              key={`${photo.url}-${i}`}
              className="grid gap-2 rounded-lg border border-neutral-200 p-2"
            >
              <div className="relative aspect-[3/2] overflow-hidden rounded-md bg-neutral-100">
                <Image
                  src={photo.url}
                  alt={photoAlt(name, photo)}
                  fill
                  sizes="12rem"
                  className="object-contain"
                />
                {i === 0 ? (
                  <span className="absolute top-2 left-2">
                    <Badge tone="blue">Cover</Badge>
                  </span>
                ) : null}
              </div>
              <Input
                aria-label={`Caption of photo ${i + 1}`}
                placeholder="Caption, such as Interior"
                maxLength={MODEL_LIMITS.caption}
                value={photo.caption}
                onChange={(e) => setCaption(i, e.target.value)}
              />
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Move photo ${i + 1} earlier`}
                  disabled={i === 0}
                  onClick={() => move(i, i - 1)}
                >
                  <ArrowLeftIcon />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Move photo ${i + 1} later`}
                  disabled={i === photos.length - 1}
                  onClick={() => move(i, i + 1)}
                >
                  <ArrowRightIcon />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto"
                  aria-label={`Remove photo ${i + 1}`}
                  onClick={() =>
                    setPhotos((current) => current.filter((_, j) => j !== i))
                  }
                >
                  <XIcon />
                </Button>
              </div>
            </li>
          ))}
        </ol>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={input}
          type="file"
          multiple
          accept={IMAGE_TYPES.join(",")}
          className="sr-only"
          tabIndex={-1}
          aria-label={`Photos of ${name}: choose files`}
          onChange={(event) => {
            const files = [...(event.target.files ?? [])];
            // Cleared, so choosing the same file again uploads it again.
            event.target.value = "";
            if (files.length > 0) void add(files);
          }}
        />
        <Button
          variant="secondary"
          size="sm"
          disabled={uploading || room <= 0}
          onClick={() => input.current?.click()}
        >
          {uploading ? "Uploading…" : "Add photos"}
        </Button>
        <span className="text-xs text-neutral-500">
          {room > 0
            ? `JPEG, PNG or WebP, at most ${IMAGE_MAX_MB} MB each. Up to ${MODEL_LIMITS.photos} photos.`
            : `${MODEL_LIMITS.photos} photos, the most a model holds.`}
        </span>
      </div>
      {error ? (
        <p aria-live="polite" className="text-xs text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
