"use client";

import { PAGE_LIMITS, type PageImage } from "@repo/db";
import { Input } from "@repo/ui/field";
import { useId } from "react";
import { ImageUpload } from "../../../../../_components/ImageUpload";
import { LOCATION_IMAGE_UPLOAD_PATH } from "../../../../../_lib/routes";
import { Count } from "./Count";

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

  return (
    <div className="grid gap-3">
      <ImageUpload
        label={label}
        uploadPath={LOCATION_IMAGE_UPLOAD_PATH}
        src={image?.url ?? null}
        alt={image?.alt ?? ""}
        onChange={(uploaded) =>
          onChange(uploaded ? { ...uploaded, alt: image?.alt ?? "" } : null)
        }
      />

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
