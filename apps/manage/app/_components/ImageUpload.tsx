"use client";

import {
  IMAGE_TYPES,
  imageSizeWarning,
  isUploadUrl,
  type ImageSize,
  type UploadedImage,
} from "@repo/db";
import { ImageSizeHint } from "@repo/console/ImageSizeHint";
import { Button } from "@repo/ui/button";
import { cx } from "@repo/ui/cx";
import Image from "next/image";
import { useRef, useState } from "react";
import { useImageUpload } from "@repo/console/use-image-upload";
import { ViewImage } from "@repo/console/ViewImage";
import { FormError } from "@repo/ui/form-error";
import { MediaPicker } from "./MediaPicker";

/**
 * One image of a form: what is there now, and the buttons that upload or
 * replace it, choose one already stored from Media, view it full screen
 * or take it away. The file is stored as soon as it is chosen, at the
 * upload route given; the form keeps it once it is saved. Under the
 * buttons, the size the place wants it at (`size`), and once an image is
 * there, its own size and a warning when it is much smaller or another
 * shape. A page's
 * image adds its alt text under it; a vehicle class's picture is the
 * class's name.
 */
export function ImageUpload({
  label,
  uploadPath,
  src,
  alt,
  onChange,
  look = "picture",
  size: recommended,
}: {
  /** What the image is, as a screen reader hears the controls: "Hero Image". */
  label: string;
  /** The route that stores the file and answers it as an `UploadedImage`. */
  uploadPath: string;
  /** The image there now; null for none. */
  src: string | null;
  alt: string;
  onChange: (image: UploadedImage | null) => void;
  /** How the image shows: a picture, or a small logo on white. */
  look?: "picture" | "logo";
  /** The size the place wants it at, one of IMAGE_SIZES. */
  size: ImageSize;
}) {
  const input = useRef<HTMLInputElement>(null);
  const { upload, uploading, error } = useImageUpload(
    uploadPath,
    label.toLowerCase(),
  );
  // Read off the file once it has loaded, for the lines under the buttons.
  const [natural, setNatural] = useState<{
    src: string;
    width: number;
    height: number;
  } | null>(null);
  // The size read off the image shown, not one replaced since.
  const loaded = natural && natural.src === src ? natural : null;
  const warning = loaded ? imageSizeWarning(recommended, loaded) : null;

  return (
    <div className="grid gap-3">
      {src ? (
        <Image
          src={src}
          width={640}
          height={360}
          alt={alt}
          sizes="320px"
          // One the customer site ships is shown from there, as it is.
          unoptimized={!isUploadUrl(src)}
          onLoad={(event) => {
            const { naturalWidth, naturalHeight } = event.currentTarget;
            setNatural({ src, width: naturalWidth, height: naturalHeight });
          }}
          // A box of its own size, whatever the image's shape, so nothing
          // moves as it loads: the image fits inside it.
          className={cx(
            "max-w-full rounded-md border border-card-edge object-contain",
            look === "logo" ? "h-16 w-56 bg-white p-1" : "aspect-video h-40",
          )}
        />
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={input}
          type="file"
          accept={IMAGE_TYPES.join(",")}
          className="sr-only"
          tabIndex={-1}
          aria-label={`${label}: choose a file`}
          onChange={(event) => {
            const file = event.target.files?.[0];
            // Cleared, so choosing the same file again uploads it again.
            event.target.value = "";
            if (file) void upload([file], onChange);
          }}
        />
        <Button
          variant="secondary"
          size="sm"
          pending={uploading}
          onClick={() => input.current?.click()}
        >
          {uploading ? "Uploading…" : src ? "Replace" : "Upload Image"}
        </Button>
        <MediaPicker
          label={label}
          most={1}
          disabled={uploading}
          onPick={([image]) => {
            if (image) onChange(image);
          }}
        />
        {src ? (
          <>
            <ViewImage src={src} alt={alt} label={label} />
            <Button
              variant="danger"
              size="sm"
              disabled={uploading}
              aria-label={`Remove ${label.toLowerCase()}`}
              onClick={() => onChange(null)}
            >
              Remove
            </Button>
          </>
        ) : null}
      </div>
      <ImageSizeHint size={recommended} loaded={loaded} warning={warning} />
      <FormError error={error} size="xs" />
    </div>
  );
}
