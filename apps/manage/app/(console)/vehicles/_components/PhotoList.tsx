"use client";

import {
  IMAGE_MAX_MB,
  IMAGE_TYPES,
  PHOTO_LIMITS,
  photoAlt,
  type Photo,
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
import { useRef, useState, type Dispatch, type SetStateAction } from "react";
import { useImageUpload } from "../../../_components/use-image-upload";
import { VEHICLE_IMAGE_UPLOAD_PATH } from "../../../_lib/routes";
import { FormError } from "@repo/console/FormError";

/**
 * A vehicle's photos, in the order the customer swipes through them: each
 * with its caption, moved left or right, or taken out. The first is the
 * vehicle's cover. "Add photos" stores each file as soon as it is chosen,
 * several at once, each shown in its place until it lands; files past
 * the limit are left out, and the list says so. The form keeps them once
 * it is saved, and waits for the uploads.
 */
export function PhotoList({
  name,
  photos,
  setPhotos,
}: {
  /** What the photos show as typed, "Toyota Alphard", for their alt text. */
  name: string;
  photos: Photo[];
  /** The form's state setter: an upload lands on the list as it is then, edits made meanwhile kept. */
  setPhotos: Dispatch<SetStateAction<Photo[]>>;
}) {
  const input = useRef<HTMLInputElement>(null);
  const { upload, uploading, pending, error } = useImageUpload(
    VEHICLE_IMAGE_UPLOAD_PATH,
    "photo",
  );
  const [leftOut, setLeftOut] = useState<string | null>(null);
  const room = PHOTO_LIMITS.photos - photos.length;

  function add(files: File[]) {
    setLeftOut(
      files.length > room
        ? `A vehicle holds ${PHOTO_LIMITS.photos} photos: the first ${room} of the ${files.length} chosen are added.`
        : null,
    );
    void upload(files.slice(0, room), (image) =>
      setPhotos((current) =>
        current.length < PHOTO_LIMITS.photos
          ? [...current, { url: image.url, caption: "" }]
          : current,
      ),
    );
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

  const shown = name || "the vehicle";

  return (
    <div className="grid gap-4">
      {photos.length === 0 && pending.length === 0 ? (
        <p className="flex items-center gap-2 rounded-lg border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">
          <ImageIcon className="size-5 text-slate-400" />
          No photos yet. The outside first: it is the vehicle&apos;s cover.
        </p>
      ) : (
        <ol className="grid grid-cols-[repeat(auto-fill,minmax(min(12rem,100%),1fr))] gap-4">
          {photos.map((photo, i) => (
            <li
              key={photo.url}
              className="grid gap-2 rounded-lg border border-slate-200 p-2"
            >
              <div className="relative aspect-[3/2] overflow-hidden rounded-md bg-slate-100">
                <Image
                  src={photo.url}
                  alt={photoAlt(shown, photo)}
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
                maxLength={PHOTO_LIMITS.caption}
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
          {pending.map((file, i) => (
            <li
              key={`${file}-${i}`}
              className="grid content-start gap-2 rounded-lg border border-dashed border-slate-300 p-2"
            >
              <div className="grid aspect-[3/2] animate-pulse place-items-center rounded-md bg-slate-100 text-xs text-slate-500">
                {i === 0 ? "Uploading…" : "Waiting…"}
              </div>
              <p className="truncate px-1 text-xs text-slate-600">{file}</p>
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
          aria-label={`Photos of ${shown}: choose files`}
          onChange={(event) => {
            const files = [...(event.target.files ?? [])];
            // Cleared, so choosing the same file again uploads it again.
            event.target.value = "";
            if (files.length > 0) add(files);
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
        <span className="text-xs text-slate-500">
          {room > 0
            ? `JPEG, PNG or WebP, at most ${IMAGE_MAX_MB} MB each. Up to ${PHOTO_LIMITS.photos} photos.`
            : `${PHOTO_LIMITS.photos} photos, the most a vehicle holds.`}
        </span>
      </div>
      <FormError error={error ?? leftOut} size="xs" />
    </div>
  );
}
