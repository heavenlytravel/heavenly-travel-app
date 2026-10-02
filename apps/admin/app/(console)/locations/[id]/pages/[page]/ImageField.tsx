"use client";

import {
  IMAGE_MAX_MB,
  IMAGE_TYPES,
  PAGE_LIMITS,
  checkImageFile,
  type PageImage,
  type UploadedImage,
} from "@repo/db";
import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/field";
import Image from "next/image";
import { useId, useRef, useState } from "react";
import { LOCATION_IMAGE_UPLOAD_PATH } from "../../../../../_lib/routes";
import { Count } from "./Count";

const FAILED = "The image could not be uploaded. Try again.";

/**
 * One image of a page: upload it, replace it, write its alt text or take it
 * away. The file is stored as soon as it is chosen; the page keeps it once
 * the draft is saved.
 */
export function ImageField({
  label,
  image,
  onChange,
}: {
  /** What the image is, as a screen reader hears the controls: "Hero image". */
  label: string;
  image: PageImage | null;
  onChange: (image: PageImage | null) => void;
}) {
  const altId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      const response = await fetch(LOCATION_IMAGE_UPLOAD_PATH, {
        method: "POST",
        body,
      });
      const answer = (await response.json()) as
        UploadedImage | { error?: string };
      if (!response.ok || !("url" in answer)) {
        setError(("error" in answer && answer.error) || FAILED);
        return;
      }
      onChange({ ...answer, alt: image?.alt ?? "" });
    } catch {
      setError(FAILED);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="grid gap-3">
      {image ? (
        <Image
          src={image.url}
          width={image.width}
          height={image.height}
          alt={image.alt}
          sizes="320px"
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
          {uploading ? "Uploading…" : image ? "Replace" : "Upload image"}
        </Button>
        {image ? (
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
        {image ? (
          <span className="text-xs text-neutral-500 tabular-nums">
            {image.width} × {image.height}
          </span>
        ) : null}
      </div>
      {error ? (
        <p aria-live="polite" className="text-xs text-red-700">
          {error}
        </p>
      ) : null}

      {image ? (
        <div>
          <label
            htmlFor={altId}
            className="mb-1.5 flex items-baseline justify-between gap-3 text-sm font-medium text-neutral-800"
          >
            Alt text
            <Count
              value={image.alt.trim().length}
              limit={PAGE_LIMITS.imageAlt}
            />
          </label>
          <Input
            id={altId}
            autoComplete="off"
            placeholder="What the image shows, for someone who cannot see it"
            value={image.alt}
            onChange={(event) =>
              onChange({ ...image, alt: event.target.value })
            }
          />
        </div>
      ) : null}
    </div>
  );
}
