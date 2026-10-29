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
  PlusIcon,
  XIcon,
} from "@repo/ui/icons";
import Image from "next/image";
import { useRef, useState, type Dispatch, type SetStateAction } from "react";
import { useImageUpload } from "../../../../../_components/use-image-upload";
import { VEHICLE_IMAGE_UPLOAD_PATH } from "../../../../../_lib/routes";
import { FormError } from "@repo/console/FormError";

/**
 * A vehicle's photos, in the order the customer swipes through them: each
 * with its caption, moved left or right, or taken out. The first is the
 * vehicle's cover. "Add photos", the dashed slot after the last, stores
 * each file as soon as it is chosen, several at once, each shown in its
 * place until it lands; files past the limit are left out, and the list
 * says so. The form keeps them once it is saved, and waits for the
 * uploads.
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
  const empty = photos.length === 0 && pending.length === 0;

  return (
    <div className="grid gap-3">
      <ol className="grid grid-cols-[repeat(auto-fill,minmax(min(12rem,100%),1fr))] gap-3">
        {photos.map((photo, i) => (
          <li
            key={photo.url}
            className="grid gap-2 rounded-[10px] border border-hairline p-2"
          >
            <div className="relative aspect-[3/2] overflow-hidden rounded-md bg-shade">
              <Image
                src={photo.url}
                alt={photoAlt(shown, photo)}
                fill
                sizes="12rem"
                className="object-contain"
              />
              {i === 0 ? (
                <span className="absolute top-2 left-2">
                  <Badge tone="brand">Cover</Badge>
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
            className="grid content-start gap-2 rounded-[10px] border border-dashed border-slot p-2"
          >
            <div className="grid aspect-[3/2] animate-pulse place-items-center rounded-md bg-shade text-xs text-muted">
              {i === 0 ? "Uploading…" : "Waiting…"}
            </div>
            <p className="truncate px-1 text-xs text-muted">{file}</p>
          </li>
        ))}
        {room > 0 ? (
          <li className="grid">
            <button
              type="button"
              disabled={uploading}
              onClick={() => input.current?.click()}
              className="grid min-h-36 place-content-center justify-items-center gap-1.5 rounded-[10px] border border-dashed border-slot px-4 py-6 text-center transition-colors hover:bg-hover disabled:pointer-events-none disabled:opacity-60"
            >
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand">
                {empty ? <ImageIcon /> : <PlusIcon />}
                {uploading ? "Uploading…" : "Add photos"}
              </span>
              {empty ? (
                <span className="text-xs text-muted">
                  The outside first: it is the vehicle&apos;s cover.
                </span>
              ) : null}
            </button>
          </li>
        ) : null}
      </ol>
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
      <p className="text-xs text-muted">
        {room > 0
          ? `JPEG, PNG or WebP, at most ${IMAGE_MAX_MB} MB each. Up to ${PHOTO_LIMITS.photos} photos.`
          : `${PHOTO_LIMITS.photos} photos, the most a vehicle holds.`}
      </p>
      <FormError error={error ?? leftOut} size="xs" />
    </div>
  );
}
