"use client";

import {
  IMAGE_MAX_MB,
  IMAGE_TYPES,
  checkImageFile,
  type UploadedImage,
} from "@repo/db";
import { Button } from "@repo/ui/button";
import Image from "next/image";
import { useRef, useState } from "react";

const FAILED = "The image could not be uploaded. Try again.";

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
}: {
  /** What the image is, as a screen reader hears the controls: "Hero image". */
  label: string;
  /** The route that stores the file and answers it as an `UploadedImage`. */
  uploadPath: string;
  /** The image there now; null for none. */
  src: string | null;
  alt: string;
  onChange: (image: UploadedImage | null) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Read off the file once it has loaded, for the line beside the buttons.
  const [size, setSize] = useState<string | null>(null);

  async function upload(file: File) {
    const check = checkImageFile(file);
    if (!check.ok) {
      setError(check.error);
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const body = new FormData();
      body.set("file", file);
      const response = await fetch(uploadPath, { method: "POST", body });
      const answer = (await response.json()) as
        UploadedImage | { error?: string };
      if (!response.ok || !("url" in answer)) {
        setError(("error" in answer && answer.error) || FAILED);
        return;
      }
      onChange(answer);
    } catch {
      setError(FAILED);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="grid gap-3">
      {src ? (
        <Image
          src={src}
          width={640}
          height={360}
          alt={alt}
          sizes="320px"
          onLoad={(event) => {
            const { naturalWidth, naturalHeight } = event.currentTarget;
            setSize(`${naturalWidth} × ${naturalHeight}`);
          }}
          className="h-40 w-auto max-w-full rounded-md border border-neutral-200 object-contain"
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
            if (file) void upload(file);
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
          <span className="text-xs text-neutral-500">
            JPEG, PNG or WebP, at most {IMAGE_MAX_MB} MB.
          </span>
        )}
        {src && size ? (
          <span className="text-xs text-neutral-500 tabular-nums">{size}</span>
        ) : null}
      </div>
      {error ? (
        <p aria-live="polite" className="text-xs text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
