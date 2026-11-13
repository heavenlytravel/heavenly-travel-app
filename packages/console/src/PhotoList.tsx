"use client";

import {
  IMAGE_MAX_MB,
  IMAGE_SIZES,
  imageSizeText,
  IMAGE_TYPES,
  PHOTO_LIMITS,
  photoAlt,
  titleCase,
  type Photo,
  type UploadedImage,
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
import {
  useRef,
  useState,
  type ComponentType,
  type Dispatch,
  type SetStateAction,
} from "react";
import { useImageUpload } from "./use-image-upload";
import { ViewImage } from "./ViewImage";
import { FormError } from "@repo/ui/form-error";

/**
 * What an app's "Choose from Media" takes, beside an image field's upload:
 * the admin's picker over the files already stored. Connect has none: a
 * vendor never sees the staff's files.
 */
export type MediaPickerProps = {
  /** What the images are for, as the picker names them: "Photos of Toyota Alphard". */
  label: string;
  /** How many may be picked at once: 1 for one image, the room a list has left. */
  most: number;
  disabled?: boolean;
  /** The files picked, in the order picked, as an upload answers each. */
  onPick: (images: UploadedImage[]) => void;
};
export type MediaPicker = ComponentType<MediaPickerProps>;

/** What a list is of, as its words and its recommended size differ. */
const LISTS = {
  vehicle: {
    one: "photo",
    many: "photos",
    whose: "A vehicle",
    size: IMAGE_SIZES.vehiclePhoto,
    first: "The outside first: it is the vehicle's cover.",
    captions: true,
  },
  class: {
    one: "picture",
    many: "pictures",
    whose: "A class",
    size: IMAGE_SIZES.classPicture,
    first: "The whole vehicle first: it is the class's cover.",
    // A class's pictures are decorative beside its name: no caption.
    captions: false,
  },
} as const;

/**
 * A vehicle's photos or a class's pictures (`of`), in order: each with
 * its caption (a vehicle's), viewed full screen, moved left or right, or
 * taken out. The first is the cover. "Add Photos", the dashed slot after the last, stores each file
 * as soon as it is chosen, several at once, each shown in its place until
 * it lands; files past the limit are left out, and the list says so. In
 * the admin, "Choose from Media" adds files already stored. The form
 * keeps them once it is saved, and waits for the uploads.
 */
export function PhotoList({
  of = "vehicle",
  name,
  photos,
  setPhotos,
  uploadPath,
  mediaPicker: Picker,
}: {
  /** A vehicle's photos, or a class's pictures. */
  of?: keyof typeof LISTS;
  /** The app's upload route for one of them. */
  uploadPath: string;
  /** What the photos show as typed, "Toyota Alphard", for their alt text. */
  name: string;
  photos: Photo[];
  /** The form's state setter: an upload lands on the list as it is then, edits made meanwhile kept. */
  setPhotos: Dispatch<SetStateAction<Photo[]>>;
  /** The admin's "Choose from Media"; absent in Connect. */
  mediaPicker?: MediaPicker;
}) {
  const input = useRef<HTMLInputElement>(null);
  const list = LISTS[of];
  const { upload, uploading, pending, error } = useImageUpload(
    uploadPath,
    list.one,
  );
  const [leftOut, setLeftOut] = useState<string | null>(null);
  const room = PHOTO_LIMITS.photos - photos.length;

  function add(files: File[]) {
    setLeftOut(
      files.length > room
        ? `${list.whose} holds ${PHOTO_LIMITS.photos} ${list.many}: the first ${room} of the ${files.length} chosen are added.`
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

  /** Files picked from Media go last, one already on the list once. */
  function addPicked(images: UploadedImage[]) {
    setLeftOut(null);
    setPhotos((current) => {
      const on = new Set(current.map((photo) => photo.url));
      const added = images
        .filter((image) => !on.has(image.url))
        .map((image) => ({ url: image.url, caption: "" }));
      return [...current, ...added].slice(0, PHOTO_LIMITS.photos);
    });
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

  const shown = name || `the ${of}`;
  const empty = photos.length === 0 && pending.length === 0;

  return (
    <div className="grid gap-3">
      <ol className="grid grid-cols-[repeat(auto-fill,minmax(min(12rem,100%),1fr))] gap-3">
        {photos.map((photo, i) => (
          <li
            key={photo.url}
            className="grid gap-2 rounded-control border border-hairline p-2"
          >
            {/* Cropped to fill, whatever the photo's shape; the full-screen view shows all of it. */}
            <div className="relative aspect-[3/2] overflow-hidden rounded-md bg-shade">
              <Image
                src={photo.url}
                alt={photoAlt(shown, photo)}
                fill
                sizes="12rem"
                className="object-cover"
              />
              {i === 0 ? (
                <span className="absolute top-2 left-2">
                  <Badge tone="brand">Cover</Badge>
                </span>
              ) : null}
            </div>
            {list.captions ? (
              <Input
                aria-label={`Caption of photo ${i + 1}`}
                placeholder="Caption, such as Interior"
                maxLength={PHOTO_LIMITS.caption}
                value={photo.caption}
                onChange={(e) => setCaption(i, e.target.value)}
              />
            ) : null}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                aria-label={`Move ${list.one} ${i + 1} earlier`}
                disabled={i === 0}
                onClick={() => move(i, i - 1)}
              >
                <ArrowLeftIcon />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                aria-label={`Move ${list.one} ${i + 1} later`}
                disabled={i === photos.length - 1}
                onClick={() => move(i, i + 1)}
              >
                <ArrowRightIcon />
              </Button>
              <ViewImage
                look="icon"
                src={photo.url}
                alt={photoAlt(shown, photo)}
                label={`${list.one === "photo" ? "Photo" : "Picture"} ${i + 1}`}
              />
              <Button
                variant="ghost-danger"
                size="sm"
                className="ml-auto"
                aria-label={`Remove ${list.one} ${i + 1}`}
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
            className="grid content-start gap-2 rounded-control border border-dashed border-slot p-2"
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
              className="grid min-h-36 place-content-center justify-items-center gap-1.5 rounded-control border border-dashed border-slot px-4 py-6 text-center transition-colors hover:bg-hover focus-ring disabled:pointer-events-none disabled:opacity-60"
            >
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand">
                {empty ? <ImageIcon /> : <PlusIcon />}
                {uploading ? "Uploading…" : titleCase(`Add ${list.many}`)}
              </span>
              {empty ? (
                <span className="text-xs text-muted">{list.first}</span>
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
        aria-label={`${list.many === "photos" ? "Photos" : "Pictures"} of ${shown}: choose files`}
        onChange={(event) => {
          const files = [...(event.target.files ?? [])];
          // Cleared, so choosing the same file again uploads it again.
          event.target.value = "";
          if (files.length > 0) add(files);
        }}
      />
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {Picker && room > 0 ? (
          <Picker
            label={`${list.many === "photos" ? "Photos" : "Pictures"} of ${shown}`}
            most={room}
            disabled={uploading}
            onPick={addPicked}
          />
        ) : null}
        <p className="text-xs text-muted">
          {room > 0
            ? `${imageSizeText(list.size)} ${list.size.note} JPEG, PNG or WebP, at most ${IMAGE_MAX_MB} MB each. Up to ${PHOTO_LIMITS.photos} ${list.many}.`
            : `${PHOTO_LIMITS.photos} ${list.many}, the most ${list.whose.toLowerCase()} holds.`}
        </p>
      </div>
      <FormError error={error ?? leftOut} size="xs" />
    </div>
  );
}
