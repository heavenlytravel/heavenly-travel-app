"use client";

import {
  IMAGE_MAX_MB,
  IMAGE_TYPES,
  isUploadUrl,
  type UploadedImage,
} from "@repo/db";
import { Button } from "@repo/ui/button";
import { cx } from "@repo/ui/cx";
import Image from "next/image";
import { useRef, useState } from "react";
import { useImageUpload } from "./use-image-upload";
import { FormError } from "./FormError";

/**
 * One image of a form: what is there now, and the buttons that upload,
 * replace or take it away. The file is stored as soon as it is chosen, at
 * the upload route given; the form keeps it once it is saved. A page's
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
}: {
  /** What the image is, as a screen reader hears the controls: "Hero image". */
  label: string;
  /** The route that stores the file and answers it as an `UploadedImage`. */
  uploadPath: string;
  /** The image there now; null for none. */
  src: string | null;
  alt: string;
  onChange: (image: UploadedImage | null) => void;
  /** How the image shows: a picture, or a small logo on white. */
  look?: "picture" | "logo";
}) {
  const input = useRef<HTMLInputElement>(null);
  const { upload, uploading, error } = useImageUpload(
    uploadPath,
    label.toLowerCase(),
  );
  // Read off the file once it has loaded, for the line beside the buttons.
  const [size, setSize] = useState<string | null>(null);

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
            setSize(`${naturalWidth} × ${naturalHeight}`);
          }}
          className={cx(
            "w-auto max-w-full rounded-md border border-slate-200 object-contain",
            look === "logo" ? "h-16 bg-white p-1" : "h-40",
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
          disabled={uploading}
          onClick={() => input.current?.click()}
        >
          {uploading ? "Uploading…" : src ? "Replace" : "Upload image"}
        </Button>
        {src ? (
          <Button
            variant="ghost"
            size="sm"
            disabled={uploading}
            aria-label={`Remove ${label.toLowerCase()}`}
            onClick={() => onChange(null)}
          >
            Remove
          </Button>
        ) : (
          <span className="text-xs text-slate-500">
            JPEG, PNG or WebP, at most {IMAGE_MAX_MB} MB.
          </span>
        )}
        {src && size ? (
          <span className="text-xs text-slate-500 tabular-nums">{size}</span>
        ) : null}
      </div>
      <FormError error={error} size="xs" />
    </div>
  );
}
